// ## ChartNavigator [view]
// Yes.
//
// Events:
//
//  * `change` - When selection is changed
//
// Options:
//
//  * `data` - List of tuples
//  * `verticalPadding` - Padding (default 10)

var ChartNavigator = Backbone.View.extend({

  // ### chartID [attribute]
  // The ID of the chart DOM element.
  chartID: null,

  // ### paper [attribute]
  // The Raphael object.
  paper: null,

  // ### pointRange [attribute]
  // A dictionary object holding the min/max/range for the data points.
  pointRange: {
    min: null,
    max: null,
    range: null
  },

  // ### timeRange [attribute]
  // A dictionary object holding the min/max/range for the time range of the dataset.
  timeRange: {
    min: null,
    max: null,
    range: null
  },

  // ### selection [attribute]
  // Start and end of selection. These are date objects.
  selection: {
    start: null,
    end: null
  },

  // ### $start
  // Start slider element
  $start: null,

  // ### $end
  // End slider element
  $end: null,

  // ### $selection
  // Selection range element
  $selection: null,

  // ### $area
  // Chart area element
  $area: null,

  events: {
    //'click svg': 'onChartClick',
    'dragstart .end.slider':   'onEndSliderDrag',
    'drag .end.slider':        'onEndSliderDrag',
    'dragstart .start.slider': 'onStartSliderDrag',
    'drag .start.slider':      'onStartSliderDrag',
    'dragend .slider':   'onSliderDragEnd',
  },

  // ### HTML template
  template: _.template(
    "<div class='chartarea' id='<%= this.chartID %>'></div>" + 
    "<div class='start slider'>" +
      "<div class='line'></div>" +
      "<div class='handle'></div>" +
    "</div>" + 
    "<div class='end slider'>" +
      "<div class='line'></div>" +
      "<div class='handle'></div>" +
    "</div>" +
    "<div class='selection'></div>"
  ),

  colors:
    ["#3491bf", "#9ec529", "#f2dfc6", "#a2c0cd", "#c9266c"],

  // ### Constructor
  initialize: function() {
    this._initRanges();

    // Initialize some default options.
    this.options.verticalPadding = this.options.verticalPadding || 10;
    this.options.minRange = this.options.minRange || 60 * 15 * 1000;
    this.chartID = "_" + Math.floor(Math.random() * 1000000000);

    this.render();

    _.bindAll(this,
        'onChartClick', 'onSliderDrag', 'onSliderDragEnd', 'onStartSliderDrag', 'onEndSliderDrag');
  },

  render: function() {
    var data = this.options.data[0];

    // Draw the chrome.
    var html = this.template(this);
    $(this.el).html(html);

    // Draw the chart.
    this._initChart("#"+this.chartID);

    // Initialize element shortcuts.
    this.$start     = $(this.el).find('.start.slider');
    this.$end       = $(this.el).find('.end.slider');
    this.$selection = $(this.el).find('.selection');
    this.$area      = $(this.el).find('.chartarea');

    // Set default selection.
    this.setSelection(
      this.timeRange.min + this.timeRange.range * 0.2,
      this.timeRange.min + this.timeRange.range * 0.25,
      { silent: true }
    );

    return this;
  },

  // ### setSelection(startDate, endDate, [options={}])
  // Sets the selection range.
  //
  // If invoked with `{ silent: true }`, don't trigger the `change` event.
  //
  // If invoked with `{ priority: 'start|end' }`, in the event that one of the
  // ranges has to move, ensure that the start (or end) is retained in the input.
  //
  // You may pass a `{ minRange: 100000 }` to specify the number of seconds. This overrides
  // the `minRange` option.
  //
  setSelection: function(start, end, options) {
    if (!options) options = {};
    if (!options.minRange) options.minRange = this.options.minRange;

    // Ensure that they are in the right order.
    if (start > end) {
      if (options.priority == 'start') end = start;
      else start = end;
    }

    // if ((end - start) < options.minRange) {
    //   if (options.priority == 'start') end = (start + options.minRange);
    //   else start = (end - options.minRange);
    // }

    // Ensure that the range is inside the max range.
    if (+start < +this.timeRange.start) { start = +this.timeRange.start; }
    if (+end   < +this.timeRange.end)   { end = +this.timeRange.end; }

    var x = {
      start: this.timeToX(start),
      end:   this.timeToX(end)
    };

    var dates = {
      start: new Date(+start),
      end:   new Date(+end)
    };

    // Move the elements.
    this.$start.css({ left: x.start });
    this.$end  .css({ left: x.end });
    this.$selection.css({ left: x.start + 1, width: x.end - x.start });

    // Remember the selection start.
    this.selection.start = dates.start;
    this.selection.end   = dates.end;

    if (!options.silent) { this._triggerChange(); }
  },

  _triggerChange: function() {
    var dates = this.selection;
    return this.trigger('change', dates.start, dates.end);
  },

  // ### setSelectionStart(start, [options])
  // Sets the start of the selection. `options` is the same options as `setSelection()`.
  setSelectionStart: function(start, options) {
    var options = _.extend({}, options, { priority: 'start' });

    return this.setSelection(start, this.selection.end, options);
  },

  // ### setSelectionEnd(end, [options])
  // Sets the end of the selection. `options` is the same options as `setSelection()`.
  setSelectionEnd: function(end, options) {
    var options = _.extend({}, options, { priority: 'end' });

    return this.setSelection(this.selection.start, end, options);
  },

  onChartClick: function(e) {
  },

  onSliderDrag: function(e, $el, fn) {
    e.preventDefault();
    e.stopPropagation();

    var x;

    // Compute the displacement from the last update.
    if (this._lastX) x = e.clientX - this._lastX;
    else x = 0;
    this._lastX = e.clientX;

    // Compute the equivalent X coordinate that the user wants to drag to.
    x += parseInt($el.css('left'));

    // Convert the time, the set selection.
    var d = this.xToTime(x);
    fn.apply(this, [d, { silent: true, animating: true }]);
  },

  onStartSliderDrag: function(e) {
    return this.onSliderDrag(e,
      this.$start,
      this.setSelectionStart);
  },

  onEndSliderDrag: function(e) {
    return this.onSliderDrag(e,
      this.$end,
      this.setSelectionEnd);
  },


  onSliderDragEnd: function(e) {
    this._lastX = null;
    this._triggerChange();
  },

  // ### timeToX(time)
  // Converts given `time` to an x attribute.
  // X attribute refers to the X of the entire area, not just the chart area.
  //
  // Returns the X coordinate as a number.
  //
  timeToX: function(time) {
    var left = this.$area.position().left;
    var x    = (+time - this.timeRange.min) * this.$area.width() / this.timeRange.range;
    x += left;

    return x;
  },

  // ### xToTime(x)
  // Gets timestamp from `x` attribute.
  // X attribute refers to the X of the entire area, not just the chart area.
  //
  // Returns a Date object.
  //
  xToTime: function(x) {
    var left = this.$area.position().left;
    var time = (x - left) * this.timeRange.range / this.$area.width() + this.timeRange.min;

    if (time < +this.timeRange.min) { time = this.timeRange.min; }
    if (time > +this.timeRange.max) { time = this.timeRange.max; }

    return new Date(time);
  },

  // ### _initRanges()
  // Determines the maximum/minimums of data.
  _initRanges: function() {
    // Combine all serieses to one megaseries.
    var data = _.inject(this.options.data, function(a, b) { return a.concat(b); });

    var times  = _.map(data, function(tuple) { return +tuple[0]; }),
        points = _.map(data, function(tuple) { return +tuple[1]; });

    var timeRange = {
      max: Math.max.apply(this, times),
      min: Math.min.apply(this, times)
    };

    var pointRange = {
      min: Math.min(Math.min.apply(this, points), 0),
      max: Math.max.apply(this, points)
    };

    pointRange.range = pointRange.max - pointRange.min;
    timeRange.range  = timeRange.max - timeRange.min;

    this.timeRange  = timeRange;
    this.pointRange = pointRange;
  },

  // Draws the chart.
  _initChart: function(sel) {
    var w    = $(this.el).width(),
        h    = $(this.el).height(),
        self = this;

    this.paper = Raphael(this.chartID, w, h);

    _.each(this.options.data, function(data, i) {
      var pd1 = self._getGraphData(data, w, h, 0);
      var pd2 = self._getGraphData(data, w, h);

      var path = self.paper.path(pd1).
        attr({ 'stroke': self._getColor(i), 'stroke-width': 2 });

      path.animate({ path: pd2 }, 500, '<>');
    });
  },

  _getColor: function(i) {
    return this.colors[i % this.colors.length];
  },

  _getGraphData: function(data, w, h, scale) {
    var scale      = (scale == undefined) ? 1.0 : scale,
        timeRange  = this.timeRange,
        pointRange = this.pointRange,
        pad        = this.options.verticalPadding,
        re         = '';

    _.each(data, function(d, i) {
      var time  = d[0];
      var point = d[1];

      var x = (time - timeRange.min) * w / timeRange.range;
      var y = h - (point - pointRange.min) * scale * (h - pad*2) / pointRange.range - pad;

      x = Math.floor(x);
      y = Math.floor(y);

      if (re == '') {
        re = "M" + x + "," + y;
      } else {
        re += "L" + x + "," + y;
      }
    });

    return re;
  }
});


// # Usage example
$(function() {

  // Build some garbage data.
  // This generates an array of tuples of `[ date, number ]`. Date is in UNIX time. It looks like:
  //
  //     [
  //       [ 1318422000000, 83.4 ]
  //       [ 1318423000000, 48.2 ]
  //       [ 1318424000000, 22.5 ]
  //       ...
  //     ]
  //
  function junkData() {
    var start = +new Date - (30 * 86400 * 1000);
    var data  = [];
    var last  = 50;
    var int   = (1000 * 86400 / 12);

    for (i=0; i<350; i++) {
      last += Math.random() * 20 - 10;
      data.push([ (start + i*int), last ]);
    }

    return data;
  };

  // ### Instanciating
  // Let's instanciate the chart navigator and render it.
  var chart = new ChartNavigator({
    el:       $('.container'),
    data:     [ junkData(), junkData() ]
  });

  chart.bind('change', function(start, end) {
    log("Changed: " + start + " to " + end);
  });
});

function log(str) {
  $("#messages").append(str + "<br>");
}
