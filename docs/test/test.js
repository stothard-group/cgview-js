// Settings
const defaultMap = 'small';
const defaultSize = 600; // 6oo is the size to run perfance test at
// From maps.js: maps = {}
console.log(maps)

// Add CGView
cgv = new CGV.Viewer('#my-viewer', {
  height: defaultSize,
  width: defaultSize,
  // debug: {sections: ['time', 'position']}
});
loadMapFromID(defaultMap);

// Add maps from maps.js to Select
// Using global variable 'maps' from maps.js
const mapSelect = document.getElementById('map-select');
let options = '';
for (const map of Object.keys(maps)) {
  const selected = (map === defaultMap) ? 'selected' : '';
  options += `<option value='${map}' ${selected}>${maps[map].name}</option>`;
}
mapSelect.innerHTML = options;

// Load map when select changes
mapSelect.addEventListener('change', (e) => {
  const id = e.target.value;
  loadMapFromID(id);
});

// Start Performance Test
const resultsDiv = document.getElementById('results');
const perfBtn = document.getElementById('performance-start');
perfBtn.addEventListener('click', (e) => {
  const iterationSelect = document.getElementById('iterations-select');
  const iterations = Number(iterationSelect.value);
  let performance = new CGVPerformance(cgv, cgv.name, iterations);
  console.log(performance.results);
  setTimeout(function() {
    resultsDiv.innerHTML = performance.report();
  }, 1000);
});
// Clear Test Results
const clearBtn = document.getElementById('performance-clear');
clearBtn.addEventListener('click', (e) => {
  resultsDiv.innerHTML = '';
});

// Load map method
function loadMapFromID(id) {
  const url = maps[id].url
  console.log(`Loading Map: ${url}`);
  var request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.onload = function() {
    const json = JSON.parse(request.responseText);
    cgv.io.loadJSON(json);
    cgv.name = maps[id].name;
    cgv.drawFull();
  };
  request.send();
}

function myResize() {
  const width = window.innerWidth;
  const height = window.innerHeight
  cgv.resize(width-438, height-100);

  const testDrawRange = document.getElementById('test-draw-range').checked;
  testDrawRange && (cgv.canvas._testDrawRange = testDrawRange);
}

const fullSize = document.getElementById('option-full-size');
fullSize.addEventListener('click', (e) => {
  if (e.target.checked) {
    window.addEventListener('resize', myResize)
    myResize();
  } else {
    window.removeEventListener('resize', myResize)
    cgv.resize(defaultSize, defaultSize);
  }
});

const drawRange = document.getElementById('test-draw-range');
drawRange.addEventListener('click', (e) => {
  const testOn = e.target.checked;
  cgv.canvas._testDrawRange = testOn;
  cgv.drawFull();
});

const debugMode = document.getElementById('option-debug');
debugMode.addEventListener('click', (e) => {
  if (e.target.checked) {
    cgv.debug = true;
  } else {
    cgv.debug = false;
    cgv.canvas.clear('debug');
  }
  cgv.drawFull();
});

// SVG Test (Not done)
// $('#download-svg').on('click', function() { cgv.io.downloadImage(600,600); return false });

