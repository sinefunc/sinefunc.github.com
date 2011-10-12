// ## ChartNavigator [view]
// A widget to navigate dates visually using a chart.
// It draws a time navigator and emits a `change` event.
//
// Available options (to be passed onto ctor):
//
//  * `el`   - The element. It will be given an ID if it doesn't have one.
//  * `data` - An array of `[ date, value ]` tuples. The dates are in UNIX time.
//
// Events emitted:
//
//  * `change(start, end)` - Triggered when the data changes. `start` and `end`
//  are Date objects.
//
// Example:
//
//     x = new ChartNavigator({ el: $('#container'), data: ... });
//
//     x.bind('change', function(start, end) {
//       ...
//     });
//
//     x.render();
//
var ChartNavigator = Backbone.View.extend({

  // ### chart [attribute]
  // The HighCharts.Chart instance. This will be populated on `render()`.
  chart: null,

  // ### start/end [attribute]
  // Start time as a `Date`.  To change these values, use `setStart()` /
  // `setEnd()` / `setRange()`.
  start: null,
  end: null,

  // ### min/max [attribute]
  // The minimum/maximum available data points. These are `Date` objects.
  // These are automatically set when you provide data.
  min: null,
  max: null,

  // ### setStart() [method]
  // Sets the start date of the selected range.
  setStart: function(start) {
    this.setRange(start, this.end);
  },

  // ### setEnd() [method]
  // Sets the end date of the selected range.
  setEnd: function(end) {
    this.setRange(this.start, end);
  },

  // ### setRange(start, end, [silent]) [method]
  // Sets the range of selector from the given `start` and `end`.
  // `start` and `end` can be either Numbers or Date objects.
  //
  // If `silent` is true, the `change` event will not be triggered.
  //
  setRange: function(start, end, silent) {
    if ((+start < +this.min) || (+end > +this.max)) {
      console.warn("setRange(): Out of range");
    } else {
      if (silent) {
        this._silent = true;
      }

      this.chart.xAxis[0].setExtremes(
          +start, +end,
          true  /* redraw */, 
          false /* animation */);
    }
  },

  // ### defaults [attribute]
  // The default chart attributes.
  defaults: {
    chart: {
      marginLeft: 1,
      marginRight: 15,
      marginBottom: 20,
      marginTop: 10
    },
    legend: { enabled: false },
    rangeSelector: { enabled: false },
    credits: { enabled: false },
    navigator: { },
    scrollbar: {
      height: 12,
      barBorderRadius: 6,
      barBorderColor: '#aaa',
      buttonBorderRadius: 6,
      trackBackgroundColor: '#eee',
      trackBorderWidth: 0,
      buttonBackgroundColor: 'transparent',
      buttonBorderColor: 'transparent',
      rifleColor: '#aaa'
    }
  },

  // ### getChartOptions() [method]
  // Build chart options based on defaults and the options given at the
  // view's constructor.
  getChartOptions: function() {
    var self    = this;
    var options = _.extend({}, this.defaults);
    
    _.extend(options.chart, {
      renderTo: this.getID(),
      events: {
        redraw: function() { self._onchange(); }
      }
    });

    // Make the navigator extend over the entire chart area.
    // Also, compensate for scrollbars.
    _.extend(options.navigator, {
      height: this.getHeight() - 12
    });

    options.series = [{ data: this.options.data }];
    return options;
  },

  render: function() {
    this.chart = new Highcharts.StockChart(this.getChartOptions());
    this._updateExtremes();

    return this;
  },

  // ### getID() [method]
  // Returns the ID of the chart element area (`el`). If it doesn't have an
  // ID, one will be assigned to it.
  getID: function() {
    var id = $(this.el).attr('id');
    if (!id) {
      id = "_" + Math.floor(Math.random() * 1000000000);
      $(this.el).attr('id', id);
    }

    return id;
  },

  // ### _onchange() [method]
  // This is triggered on every change. No need to call/override this, just
  // bind to the change event.
  _onchange: function() {
    var last = { start: this.start, end: this.end };
    this._updateExtremes();

    // Suppress the event if `setRange()` was triggered as a silent call.
    if (this._silent) {
      delete this._silent;
      return;
    }

    // Ensure that something actually changed.
    if ((+last.start != +this.start) || (+last.end != +this.end)) {
      this.trigger('change', this.start, this.end);
    }
  },

  // ### _updateExtremes() [method]
  // Updates the `start` and `end` attributes.
  _updateExtremes: function() {
    var extremes = this.chart.xAxis[0].getExtremes();

    this.start = new Date(extremes.min);
    this.end   = new Date(extremes.max);
    this.min   = new Date(extremes.dataMin);
    this.max   = new Date(extremes.dataMax);
  },

  getHeight: function() {
    return $(this.el).height();
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

    for (i=0; i<300; i++) {
      last += Math.random() * 20 - 10;
      data.push([ (start + i*int), last ]);
    }

    return data;
  };

  var data = junkData();

  var ch = new ChartNavigator({
    el:   $('.container'),
    data: data
  });

  ch.bind('change', function(start, end) {
    $("#messages").append("Changed: " + start + " to " + end + "<br>");
  });

  ch.render();

  var d = data[0][0];
  ch.setRange(d, d+(10 * 86400* 1000), true);

  // Expose it for Firebug debugging.
  window.chart = ch;
});
