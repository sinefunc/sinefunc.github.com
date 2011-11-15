
var spd = 500;


function yoChart(id) {
  $c = $("#"+id);
  w = $c.width();
  h = $c.height();

  var data = [];
  for (i=0; i<20; ++i) data.push(Math.random() * 100);

  var paper = Raphael(id, w, h);
  var chart = paper.barchart(25, 25, w-50, h-50, [data]);

  //chart.transit({ 'opacity': '0.5' }, 500, function() { console.log('ok'); });
  //chart.transit({ 'rotate': '30' }, 500);

  var addPoint = function(n) {
    // Make a new chart.
    data.shift();
    data.push(n);
    var chart2 = paper.barchart(25, 25, w-50, h-50, [data]);
    chart2.hide();

    var disp = 12;

    // Old ones disappear.
    chart.bars[0][0].animate({ opacity: 0, transform: "T"+(-disp)+",0" }, spd);

    // Transition each of the members of the old chart to the new chart's data.
    chart.bars[0].forEach(function(e, i) {
      if (i > 0) {
        var d = chart2[0][0][i-1].attr('path');
        e.animate({ path: d }, spd);
      }
    });

    // For the new one...
    var barz = chart2[0][0];
    var noo = barz[barz.length-1].clone();
    noo.animate({ opacity: 0, transform: "T"+(disp)+",0" }, 0, function() {
      noo.animate({ opacity: 1, transform: "T0,0" }, spd);
    });

    window.setTimeout(function() {
      chart.hide();
      chart2.show();
      chart = chart2;
      noo.hide().remove();

      window.setTimeout(function() {
        addPoint(Math.random() * 500);
      }, 200);
    }, spd);
  };

  addPoint(Math.random() * 500);
}

function spawn() {
  var i = Math.random().toString().substr(3);
  $("<div id='c"+i+"' class='container'>").appendTo($("body"));
  yoChart('c'+i);
}

for (var c=0; c<12; c++) {
  spawn();
}

 // chart.forEach(function(el) {
//   el.transit({ 'translate': '-24,0' });
// });
// chart[0][0].forEach(function(e) { 
//   e.transit({ 'translate': '-24,0' });
// });

