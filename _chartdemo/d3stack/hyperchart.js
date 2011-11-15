function Hyperchart() {
  this.init.apply(this, arguments);
  return this;
}

Hyperchart.extend = function(proto) {
  var fn = (function() { return Hyperchart.apply(this, arguments); });
  fn.prototype = $.extend({}, Hyperchart.prototype, proto);
  return fn;
};

Hyperchart.prototype = {
  // The element.
  el: null,

  // The D3 SVG instance.
  chart: null,

  // Options. Set on constructor.
  options: {},

  // Defaults. Override me.
  defaults: {},

  // The data.
  data: [],

  width: function() {
    return $(this.el).width();
  },

  height: function() {
    return $(this.el).height();
  },

  init: function(el, options) {
    // Set options based on defaults + given options.
    this.options = $.extend({}, this.defaults, options);
    this.el = el;

    var chart = this.chart = d3.select(el[0])
         .append("svg:svg")
         .attr("class", 'hyperchart')
         .attr("width", this.width())
         .attr("height", this.height());
  },

  // Returns pixel dimensions for left/top/height/width of the chart area.
  // TODO: Cache this for faster access. This doesn't need to be recomputed if
  // w/h remains the same.
  getDims: function() {
    var o = this.options;
    var w = this.width();
    var h = this.height();
    return {
      left:  (o.paddingLeft||0),
      width: this.width() - (o.paddingLeft||0) - (o.paddingRight||0),
      right: this.width() - (o.paddingRight||0),
      top:   (o.paddingTop || 0),
      height: this.height() - (o.paddingTop||0) - (o.paddingBottom||0),
      bottom: this.height() - (o.paddingBottom||0)
    }
  },

  setData: function(data) {
    // Override me
  },

  addPoint: function() {
    // Override me
  }
};

Hyperchart.Bar = Hyperchart.extend({
  bars: null,
  barsX: null,
  barsY: null,

  // The chart area.
  area: null,

  // The sum of values from each of the series.
  sums: [],

  defaults: {
    // Describes how close the bars are together.
    bandPadding: 0.4,

    // Speed of animation.
    speed: 3500,

    // The animation easing style.
    easing: 'linear',

    // Paddings.
    paddingBottom: 50,
    paddingTop: 10,
    paddingLeft: 0,
  },

  init: function(el, options) {
    Hyperchart.prototype.init.apply(this, arguments); // Super

    // Initialize elements.
    var chart  = this.chart;
    var offset = 30; // Investigate this. Why do we need to compensate for rangeRoundBands?
    this.bars  = chart.selectAll('rect.bar');
    var dims   = this.getDims();
    this.barsX = d3.scale.ordinal().rangeRoundBands([dims.left-offset, dims.right+offset], this.options.bandPadding);
    this.barsY = d3.scale.linear().range([dims.top, dims.bottom]);

    chart.attr('class', 'hyperchart bar');

    // Build the chart area.
    var area = this.area = chart.append('svg:g')
      .attr('class', 'area')
      .attr('x', 0)
      .attr('y', dims.top)
      .attr('width', dims.width)
      .attr('height', dims.height);

    this.text = chart.append('svg:text')
      .attr('x', 40)
      .attr('y', dims.height + 15);

    // Use data if it's passed.
    if (this.options.data) this.setData(this.options.data);
  },

  setData: function(data) {
    this.data = data;

    var times = _.map(data, function(d) { return d[0]; });
    var max   = d3.max(_.map(data, function(d) { return _sum(d.slice(1)); }));

    // Count of number of serieses.
    var count = this.options.metrics.length;

    // Reorient bars.
    var self   = this;
    var chart  = self.chart;
    var area   = self.area;
    var barsX  = self.barsX = self.barsX.domain(times);
    var barsY  = self.barsY = self.barsY.domain([0, max]);
    var opts   = this.options;
    var speed  = opts.speed;
    var dims   = this.getDims();

    var bandWidth = parseInt(dims.width / data.length);

    // Key is data index, value is stack
    var stacks = {};

    for (var idx=(count); idx>0; idx--) {
      var bars = area.selectAll('rect.bar.series-'+idx)
        .data(data, function(d) { return d[0]; });

      function getHeight(idx) {
        return function(d, i) { return barsY(d[idx]) - opts.paddingTop + 4; };
      };

      function getY(idx) {
        return function(d, i) { return dims.top + dims.height - barsY(_sumSlice(d, 1, idx)); }
      }

      bars.enter()
        .insert('svg:rect')
          .attr('class', 'bar series-'+idx)
          .attr('width', barsX.rangeBand())

          // Transition from these when starting out.
          //.attr('height', 0)
          .attr('height', getHeight(idx))
          .attr('y', getY(idx))
          .attr('x', function(d,i) { return barsX(d[0]) + bandWidth; })
          .attr('rx', 1)
          .attr('ry', 1)
          //.attr('y', dims.height + dims.top);

      bars.transition()
        // .ease('cubic-out')
        // .duration(speed * 0.4)
        // .attr('height', getHeight(idx))
        // .attr('y', getY(idx))
        
      // .transition()
        .ease(this.options.easing)
        .duration(speed)
        .attr('opacity', 1)
        .attr('x', function(d,i) { return barsX(d); });

      bars.exit().transition()
        .ease(this.options.easing)
        .duration(speed)
        .attr('x', function(d, i) { return -barsX.rangeBand() - 1; })
        // .attr('opacity', 0)
        .remove();
    }

    // Add sums on first load.
    if (this.sums.length == 0) {
      this.sums = _sumZip(data);
    }

    this.updateLegend();

    return this;
  },

  updateLegend: function() {
    var self    = this;
    var metrics = self.options.metrics;
    var dims    = self.getDims();
    var chart   = self.chart;
    var total = _sum(self.sums);

    // Create the legends chart if it doesn't exist.
    if (!this.legends) {
      this.legends = [];
      var count = metrics.length;

      _.each(metrics, function(metric, i) {
        var x = dims.left + 20 + ((dims.width - 40) * i / count);
        var y = dims.bottom + 20;

        self.legends.push(self._spawnLegend(metric, x, y, i));
      });
    }

    var percs = _.map(metrics, function(metric, i) { return parseInt(self.sums[i]*100/total); });
    var maxPercent = d3.max(percs);

    _.each(metrics, function(metric, i) {
      var perc = percs[i];
      self.legends[i].value.text(perc + "%");

      self.legends[i].bar
        .transition()
        .ease('bounce')
        .duration(self.options.speed * 0.5)
        .attr('width', perc * 50 / maxPercent);
    });
  },

  _spawnLegend: function(metric, x, y, i) {
    var chart = this.chart;

      var g = chart.append('svg:g')
        .attr('x', x)
        .attr('y', y);

      var value = g.append('svg:text')
        .attr('class', 'legend value')
        .attr('x', x)
        .attr('y', y + 10);

      var name = g.append('svg:text')
        .attr('class', 'legend name')
        .attr('x', x + 50)
        .attr('y', y)
        .text(metric);

      var bar = g.append('svg:rect')
        .attr('class', 'legend bar series-'+(i+1))
        .attr('x', x + 50)
        .attr('y', y + 8)
        .attr('width', 0)
        .attr('height', 8);

      return {
        g: g,
        value: value,
        name: name,
        bar: bar
      };
  },

  addPoint: function(point) {
    var data = this.data;

    var old = data.shift();
    data.push(point);

    for (var i=1; i<point.length; i++) {
      this.sums[i-1] += point[i] - old[i];
    }

    this.setData(data);
    return this;
  },
});


// Helpers
function _add(a,b) { return a + b; }
function _sum(arr) { return _.inject(arr, _add); }

function _sumSlice(array, start, end) {
  var re = 0;
  for (var i=start; i<=end; i++) { re += array[i]; }
  return re;
}

function _average(arr) {
  return _sum(arr) / arr.length;
}

function _sumZip(array) {
  var sums = [];
  var count = array[0].length-1;

  for (i=0; i<count; ++i) {
    sums.push(0);
  }

  for (i=1; i<=count; ++i) {
    for (j=0; j<array.length; ++j) {
      var row = array[j];
      sums[i-1] += row[i];
    }
  }

  return sums;
}
