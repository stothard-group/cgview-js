import AdaptiveLabelLayout from '../src/labels/AdaptiveLabelLayout';
import LabelRendererAdaptive from '../src/LabelRendererAdaptive';
import LabelRendererClassic from '../src/LabelRendererClassic';

function setup(Renderer = LabelRendererAdaptive, options = {}) {
  const annotation = {labelLineThickness: 1, viewer: {legend: {visible: false}, captions: () => [],
    settings: {backgroundColor: {copy: () => ({rgbaString: 'white'})}}}};
  const renderer = new Renderer(annotation, options);
  const feature = {color: {rgbaString: 'blue'}};
  const label = {feature, name: 'edge label', font: {css: '12px sans-serif'}};
  const state = {label, bp: 50, root: {x: 100, y: 50}, x: 60, y: 30, width: 40, height: 10,
    vx: 0, vy: 0, angle: -Math.PI / 2, va: 0, gap: 4, vg: 0, opacity: 1, vo: 0};
  const place = (x, y) => {
    state.x = x; state.y = y;
    state.target = {label, bp: 50, opacity: 1, rect: {x, y, width: 40, height: 10},
      points: [state.root, {x: x + 20, y: y - 4}]};
  };
  place(60, 30);
  renderer.motion.set(feature, state);
  renderer.layout = {map: {width: 200, height: 100}, padding: 6, constrainToViewport: true,
    pending: true, placed: [{id: label}]};
  renderer.lastTime = 0;
  const frame = {context: document.createElement('canvas').getContext('2d'),
    clear: jest.fn(), publish: jest.fn(), requestFrame: jest.fn()};
  const tick = (time, immediate = false) => { renderer._tick(frame, time, immediate); return frame.publish.mock.calls.at(-1)[0]; };
  return {renderer, feature, label, state, frame, place, tick};
}

test.each([['left', -20, 30], ['right', 170, 30], ['top', 60, -20], ['bottom', 60, 95], ['corner', -20, -20]])(
  'immediate %s suppression hides text, leader and hits without clamping motion', (edge, x, y) => {
    const {renderer, state, feature, frame, place, tick} = setup();
    place(x, y); state.vx = 7; state.vy = -4;
    expect(tick(0)).toEqual([]);
    expect(state).toMatchObject({x, y, vx: 7, vy: -4, opacity: 1});
    expect(renderer.motion.get(feature)).toBe(state);
    expect(renderer.displayed.has(feature)).toBe(false);
    expect(frame.context.fillText).not.toHaveBeenCalled();
    expect(frame.context.stroke).not.toHaveBeenCalled();
    expect(renderer.stats.edge.suppressed).toBe(1);
  });

test('edge jitter stays hidden until the extra re-entry margin fits, then fades in', () => {
  const {renderer, feature, place, tick} = setup();
  let time = 0;
  for (const x of [-5, 6.1, 7.9, 5.8, 6.5]) { place(x, 30); expect(tick(time += 16)).toEqual([]); }
  place(8, 30);
  const shown = tick(time += 16);
  expect(shown).toHaveLength(1);
  expect(shown[0].opacity).toBeGreaterThan(0);
  expect(shown[0].opacity).toBeLessThan(1);
  expect(renderer.edgeVisibility.get(feature).hidden).toBe(false);
  place(7, 30);
  expect(tick(time += 16)).toHaveLength(1);
  place(5.9, 30);
  expect(tick(time += 16)).toEqual([]);
  expect(renderer.edgeVisibility.get(feature).opacity).toBe(0);
});

test('fresh settled targets at the normal padding return and stop scheduling frames', () => {
  const {renderer, frame, place, tick} = setup();
  place(-10, 30); expect(tick(0)).toEqual([]);
  place(6, 30); renderer.layout.pending = false;
  expect(tick(16)[0].opacity).toBeLessThan(1);
  frame.requestFrame.mockClear();
  expect(tick(416)[0].opacity).toBe(1);
  expect(renderer.stats.phase).toBe('ready');
  expect(frame.requestFrame).not.toHaveBeenCalled();
});

test('fading-out labels also disappear immediately outside the viewport and release their state', () => {
  const {renderer, feature, state, frame, place, tick} = setup();
  place(-20, 30); state.target = undefined; state.opacity = 0.8; renderer.layout.placed = [];
  expect(tick(16)).toEqual([]);
  expect(renderer.motion.has(feature)).toBe(true);
  frame.requestFrame.mockClear();
  expect(tick(516)).toEqual([]);
  expect(renderer.motion.has(feature)).toBe(false);
  expect(renderer.edgeVisibility.has(feature)).toBe(false);
  expect(frame.requestFrame).not.toHaveBeenCalled();
});

test('Keep in viewport off shows the natural position immediately, without an extra fade', () => {
  const {renderer, place, tick} = setup();
  place(-20, 30); expect(tick(0)).toEqual([]);
  renderer.layout.constrainToViewport = false;
  expect(tick(16)[0]).toMatchObject({rect: {x: -20, y: 30}, opacity: 1});
  expect(renderer.stats.edge).toEqual({suppressed: 0, returning: 0});
});

test.each(['immediate', 'reduced-motion'])('%s re-entry does not add a fade', mode => {
  const {frame, place, tick} = setup();
  place(-20, 30); expect(tick(0)).toEqual([]);
  if (mode === 'reduced-motion') { frame.reducedMotion = true; }
  place(8, 30);
  expect(tick(16, mode === 'immediate')[0].opacity).toBe(1);
});

test('the retired animate option cannot disable the re-entry fade', () => {
  const {place, tick} = setup(LabelRendererAdaptive, {animate: false});
  place(-20, 30); expect(tick(0)).toEqual([]);
  place(8, 30);
  const [shown] = tick(16);
  expect(shown.opacity).toBeGreaterThan(0);
  expect(shown.opacity).toBeLessThan(1);
});

test('reset clears edge history along with motion and pending work', () => {
  const {renderer, place, tick} = setup();
  place(-20, 30); tick(0);
  renderer.reset();
  expect(renderer.edgeVisibility.size).toBe(0);
  expect(renderer.motion.size).toBe(0);
  expect(renderer.job).toBeUndefined();
});

test.each([[undefined, 3], [0, 0], [0.5, 0.5], [12, 12], [-1, 0], [Infinity, 3], ['invalid', 3]])(
  'both methods normalize gap %s to %s, and Adaptive uses it for every viewport phase', (gap, expected) => {
    const {renderer, place, tick} = setup(LabelRendererAdaptive, {gap});
    renderer.geometry._obstacles = () => [];
    const options = renderer._layoutOptions(), map = renderer.layout.map;
    expect(options.gap).toBe(expected);
    expect(options.viewportPadding).toBe(expected);
    expect(new LabelRendererClassic(renderer.annotation, {gap}).gap).toBe(expected);
    const clean = new AdaptiveLabelLayout([], {...map, circular: false, y: 50}, options);
    expect(clean.padding).toBe(expected);
    const projected = renderer._project(undefined, {map, options, candidates: [], amount: 1});
    expect(projected.padding).toBe(expected);
    renderer.layout.padding = projected.padding;
    place(expected - 0.1, 30); expect(tick(0)).toEqual([]);
    place(expected, 30); renderer.layout.pending = false;
    expect(tick(0, true)).toHaveLength(1);
  });

test.each(['airy', 'balanced', 'dense'])('retired density %s and maxLabels cannot alter Clean or Maximum layouts', density => {
  const map = {circular: true, x: 250, y: 175, radius: 80, width: 500, height: 350};
  const candidates = Array.from({length: 200}, (_, i) => {
    const preferred = i / 200 * Math.PI * 2;
    return {id: {feature: {index: i}}, width: 35, height: 10, inFrame: true,
      preferred, ranges: [[preferred, preferred]]};
  });
  const solve = (settings, amount) => {
    const {renderer} = setup(LabelRendererAdaptive, settings);
    renderer.geometry._obstacles = () => [];
    const options = renderer._layoutOptions();
    const steps = renderer._steps({candidates, map, options, amount, bp: a => a + 1});
    let result; do { result = steps.next(); } while (!result.done);
    return result.value;
  };
  for (const amount of [0, 1]) {
    const expected = solve({}, amount);
    const actual = solve({density, maxLabels: 8}, amount);
    expect(actual.clean.maxLabels).toBe(Infinity);
    expect(actual.placed.length).toBeGreaterThan(8);
    expect(actual.placed).toEqual(expected.placed);
  }
});
