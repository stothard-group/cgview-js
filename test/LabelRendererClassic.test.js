import Viewer from '../src/Viewer';
import {packClassicLabels} from '../src/LabelRendererClassic';

const overlap = (a, b, gap = 3) => a.x < b.x + b.width + gap - 1e-7 && b.x < a.x + a.width + gap - 1e-7 &&
  a.y < b.y + b.height + gap - 1e-7 && b.y < a.y + a.height + gap - 1e-7;
const options = {width: 600, height: 400, step: 10, labelDensity: 1, constrainToViewport: true, gap: 3};
function nodes(count = 200) {
  return Array.from({length: count}, (_, id) => {
    const angle = id * Math.PI * 2 / count;
    return {label: id, rect: {x: 280 + Math.cos(angle) * 100, y: 195 + Math.sin(angle) * 100, width: 40, height: 10},
      direction: {x: Math.cos(angle), y: Math.sin(angle)}};
  });
}

test.each([true, false])('all slider values have stable, nested selections and repeatable geometry (bounded %s)', bounded => {
  const input = nodes(), settings = {...options, constrainToViewport: bounded};
  let previous = [];
  for (let percent = 0; percent <= 100; percent++) {
    const result = packClassicLabels(input, {...settings, labelDensity: percent / 100});
    expect(result.placed.slice(0, previous.length)).toEqual(previous);
    if (bounded) {
      for (const {rect} of result.placed) {
        expect(rect.x).toBeGreaterThanOrEqual(settings.gap - 1e-6); expect(rect.y).toBeGreaterThanOrEqual(settings.gap - 1e-6);
        expect(rect.x + rect.width).toBeLessThanOrEqual(settings.width - settings.gap + 1e-6);
        expect(rect.y + rect.height).toBeLessThanOrEqual(settings.height - settings.gap + 1e-6);
      }
    }
    previous = result.placed;
  }
  const clean = packClassicLabels(input, {...settings, labelDensity: 0});
  expect(clean.placed.every(node => node.row === 0)).toBe(true);
  expect(clean.placed.length).toBeLessThan(previous.length);
  expect(packClassicLabels(input, settings).placed).toEqual(previous);
  const diagonal = Math.hypot(settings.width, settings.height);
  expect(previous.every(node => node.row * settings.step <= diagonal)).toBe(true);
});

test.each([0, 0.5, 3, 12])('indexed interval skipping agrees with an exhaustive search at gap %s', gap => {
  for (const input of [nodes(100), nodes(220)]) {
    const expected = [], remaining = new Set(input);
    const high = Math.floor(Math.hypot(options.width, options.height) / options.step);
    for (let row = 0; row <= high; row++) {
      for (const node of remaining) {
        const rect = {...node.rect, x: node.rect.x + row * options.step * node.direction.x,
          y: node.rect.y + row * options.step * node.direction.y};
        if (!expected.some(other => overlap(rect, other.rect, gap))) {
          expected.push({...node, rect, row}); remaining.delete(node);
        }
      }
    }
    const actual = packClassicLabels(input, {...options, gap, constrainToViewport: false});
    expect(actual.placed.map(node => ({...node, rect: {x: node.rect.x, y: node.rect.y,
      width: node.rect.width, height: node.rect.height}}))).toEqual(expected);
    for (let i = 0; i < actual.placed.length; i++) {
      expect(actual.placed.slice(0, i).some(other => overlap(actual.placed[i].rect, other.rect, gap))).toBe(false);
    }
  }
});

test('Clean has no candidate cap, and oversized or inward-entering text cannot be clamped into it', () => {
  const input = Array.from({length: 100}, (_, label) => ({label,
    rect: {x: 10 + label * 5, y: 100, width: 1, height: 3}, direction: {x: 0, y: -1}}));
  expect(packClassicLabels(input, {...options, labelDensity: 0}).placed).toHaveLength(100);
  expect(packClassicLabels([{...input[0], rect: {x: 0, y: 0, width: 601, height: 10}}], options).placed).toEqual([]);
  const entering = [{label: 'offscreen', rect: {x: -25, y: 100, width: 20, height: 10}, direction: {x: 1, y: 0}}];
  expect(packClassicLabels(entering, {...options, labelDensity: 0}).placed).toEqual([]);
  expect(packClassicLabels(entering, options).placed[0].row).toBe(3);
  expect(packClassicLabels([], options).placed).toEqual([]);
});

test.each([0, 3, 12])('gap %s is a single minimum separation, including at viewport edges', gap => {
  const input = [
    {label: 'edge', rect: {x: gap, y: gap, width: 20, height: 10}, direction: {x: 1, y: 0}},
    {label: 'neighbor', rect: {x: gap * 2 + 20, y: gap, width: 20, height: 10}, direction: {x: 1, y: 0}}
  ];
  expect(packClassicLabels(input, {...options, gap, labelDensity: 0}).placed).toHaveLength(2);
  input[1].rect.x -= 0.1;
  expect(packClassicLabels(input, {...options, gap, labelDensity: 0}).placed).toHaveLength(1);
  input[0].rect.x -= 0.1;
  expect(packClassicLabels(input.slice(0, 1), {...options, gap, labelDensity: 0}).placed).toHaveLength(0);
  expect(packClassicLabels(input, {...options, gap: 250}).placed).toHaveLength(0);
});

describe.each(['circular', 'linear'])('%s Classic integration', format => {
  let viewer;
  beforeEach(() => {
    document.body.innerHTML = '<div id="map"></div>';
    viewer = new Viewer('#map', {width: 700, height: 600, sequence: {length: 10000},
      annotation: {labelPosition: 'outside', font: 'monospace,plain,6'}, legend: {visible: false},
      features: Array.from({length: 120}, (_, i) => ({name: `gene ${i}`, start: 1 + i * 80, stop: 50 + i * 80,
        source: 'test', legend: 'Genes', favorite: i % 17 === 0}))});
    viewer.format = format;
    viewer.addTracks({dataType: 'feature', dataMethod: 'source', dataKeys: ['test'], position: 'outside'});
    viewer.drawFull();
  });
  afterEach(() => { viewer.stopAnimate(); clearTimeout(viewer.layout._slotTimeoutID); viewer.annotation._externalLabels.destroy(); });
  const geometry = () => viewer.annotation.externalLabelPlacements.map(({label, rect, bp, points}) => ({
    name: label.name, rect: [rect.x, rect.y, rect.width, rect.height], bp, points}));
  const select = (density, gap = 3) => {
    viewer.annotation.update({labelMethod: 'classic',
      labelDensity: density, keepLabelsInView: false, labelSpacing: gap});
    viewer.drawFull();
  };

  test('Clean uses one level with straight leaders; increasing density adds levels with stable fast/full draws', () => {
    select(0);
    const clean = geometry();
    expect(clean.length).toBeGreaterThan(0);
    expect(viewer.annotation._externalLabels.renderer.layout.placed.every(n => n.row === 0)).toBe(true);
    for (const node of viewer.annotation._externalLabels.renderer.layout.placed) {
      const [root, end] = viewer.annotation.externalLabelPlacements.find(p => p.label === node.label).points;
      const dx = end.x - root.x, dy = end.y - root.y;
      expect(Math.abs(dx * node.direction.y - dy * node.direction.x)).toBeLessThan(1e-6);
    }
    select(1); const maximum = geometry();
    expect(maximum.length).toBeGreaterThan(clean.length);
    viewer.drawFast(); expect(geometry()).toEqual(maximum);
    viewer.drawFull(); expect(geometry()).toEqual(maximum);
    expect(viewer.annotation._externalLabels.renderer.stats.cached).toBe(true);
    viewer.annotation.update({onlyDrawFavorites: true}); viewer.drawFull();
    expect(viewer.annotation.externalLabelPlacements.every(n => n.label.feature.favorite)).toBe(true);
  });

  test('JSON restores density, viewport and gap; export preserves live hit geometry', () => {
    select(0.6, 8);
    const json = viewer.io.toJSON(), before = geometry();
    const ids = viewer.annotation._visibleLabels.map(label => label.rect);
    viewer.layout._exporting = true; viewer.drawFull(); viewer.layout._exporting = false;
    expect(geometry()).toEqual(before);
    expect(viewer.annotation._visibleLabels.map(label => label.rect)).toEqual(ids);
    viewer.io.loadJSON(json); viewer.drawFull();
    expect(viewer.annotation.labelMethod).toBe('classic');
    expect(viewer.annotation.toJSON()).toMatchObject({labelDensity: 0.6, keepLabelsInView: false, labelSpacing: 8});
    expect(geometry()).toEqual(before);
  });
});
