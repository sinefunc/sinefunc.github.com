function junkData() {
  var t    = 1297110663,
      r    = function() { return Math.random() * 100; },
      item = function() { return [ ++t, r(), r() * 1.5, r(), r() * 0.4, r() ]; },
      re   = d3.range(60).map(item);

  re.spawn = item;
  return re;
}

spawn('atlantis');
spawn('bamboo');

function spawn(theme) {
// Spawn an element.
var chart = new Hyperchart.Bar($("<div class='chart "+theme+"'>").appendTo("body"), {
  stacked: true,
  metrics: ['CPU', 'Writes', 'Reads', 'Network', 'Locks']
});

// Set initial data.
chart.setData(junkData());

// Use #addPoint to add data. [ timestamp, v1, v2, v3 ]
window.setInterval(function() {
  var point = chart.data.spawn();
  chart.addPoint(point);
}, 3600);
}
