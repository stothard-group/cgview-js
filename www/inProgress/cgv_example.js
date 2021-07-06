const cgv = new CGV.Viewer('#cgview', {
  height: 500,
  width: 500,
  debug: {sections: ['time', 'position']},
  sequence: {
    length: 1000
  }
});

new CGV.Feature(cgv, {
  type: 'CDS',
  label: 'My Feature Name',
  start: 100,
  stop: 250,
  strand: 1,
  source: 'genome-features',
  legend: 'CDS'
});

new CGV.Feature(cgv, {
  type: 'CDS',
  label: 'Another Feature',
  start: 400,
  stop: 750,
  strand: -1,
  source: 'genome-features',
  legend: 'CDS'
});

let positions = [];
let scores = [];
let currentScore = 0.5;
for (let i = 1, len = 1000; i < len; i++) {
  positions.push(i);
  currentScore += (currentScore > Math.random()) ? -0.01 : 0.01;
  scores.push( currentScore );
}

positions = [50, 200, 400, 500, 600, 800];
scores = [0.4, 0.75, 0.25, 0.5, 0.6, 0.1];
// positions = [1, 50, 200, 400, 500, 600, 800]
// scores = [0.6, 0.4, 0.75, 0.25, 0.5, 0.6, 0.1]

let p = new CGV.Plot(cgv, {
  positions: positions,
  scores: scores,
  baseline: 0.5,
  source: 'genome-plot'
});

// p.legendItem = new CGV.LegendItem(cgv.legend, {swatchColor: 'blue', text: 'Plot'});
p.legendItemPositive = new CGV.LegendItem(cgv.legend, {swatchColor: 'blue', text: '+ Plot'});
p.legendItemNegative = new CGV.LegendItem(cgv.legend, {swatchColor: 'red', text: '- Plot'});

new CGV.Track(cgv.layout, {
  name: 'My track',
  readingFrame: 'combined',
  strand: 'separated',
  position: 'both',
  contents: {
    type: 'feature',
    form: 'source',
    extract: 'genome-features'
  }
});

new CGV.Track(cgv.layout, {
  name: 'My Plot Track',
  position: 'inside',
  contents: {
    type: 'plot',
    form: 'source',
    extract: 'genome-plot'
  }
});

cgv.drawFull();
cgv.canvas._testDrawRange = true;
