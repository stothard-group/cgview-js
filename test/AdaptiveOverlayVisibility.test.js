import Renderer from '../src/LabelRendererAdaptive';

function setup(kind = 'legend', options = {}) {
  const overlay = {visible: true, box: {x: 60, y: 20, width: 80, height: 40, refresh: jest.fn()}};
  const annotation = {labelLineThickness: 1, viewer: {
    settings: {backgroundColor: {copy: () => ({rgbaString: 'white'})}},
    legend: kind === 'legend' ? overlay : {visible: false}, captions: () => kind === 'caption' ? [overlay] : []
  }};
  const renderer = new Renderer(annotation, options);
  const label = {feature: {color: {rgbaString: 'blue'}}, name: 'covered label', font: {css: '12px sans-serif'}};
  const placement = {label, bp: 50, opacity: 1, rect: {x: 70, y: 30, width: 40, height: 12},
    points: [{x: 40, y: 36}, {x: 66, y: 36}]};
  const frame = {context: document.createElement('canvas').getContext('2d'),
    clear: jest.fn(), publish: jest.fn(), requestFrame: jest.fn()};
  return {renderer, overlay, placement, frame};
}

test.each(['legend', 'caption'])('%s immediately hides text, leader, hits, and highlight together', kind => {
  const {renderer, overlay, placement, frame} = setup(kind, {constrainToViewport: false});
  renderer._paint(frame, [placement]);
  expect(frame.publish).toHaveBeenLastCalledWith([]);
  expect(renderer.displayed.size).toBe(0);
  renderer.drawLabelLine(placement.label, frame.context, 3);
  expect(frame.context.fillText).not.toHaveBeenCalled();
  expect(frame.context.stroke).not.toHaveBeenCalled();

  overlay.visible = false;
  renderer._paint(frame, [placement]);
  expect(frame.publish).toHaveBeenLastCalledWith([placement]);
  expect(renderer.displayed.get(placement.label.feature)).toBe(placement);

  overlay.visible = true;
  overlay.box.x = 150;
  renderer._paint(frame, [placement]);
  expect(frame.publish).toHaveBeenLastCalledWith([placement]);
});

test('overlay spacing allows equality and hides closer text', () => {
  const {renderer, placement, frame} = setup();
  placement.rect.x = 17; // Right edge at 57, exactly three pixels from the legend.
  renderer._paint(frame, [placement]);
  expect(frame.publish).toHaveBeenLastCalledWith([placement]);
  placement.rect.x += 0.1;
  renderer._paint(frame, [placement]);
  expect(frame.publish).toHaveBeenLastCalledWith([]);
});

test('export omits covered labels without publishing or changing live hit targets', () => {
  const {renderer, placement, frame} = setup();
  renderer.displayed.set(placement.label.feature, placement);
  renderer._paint(frame, [placement], false);
  expect(frame.context.fillText).not.toHaveBeenCalled();
  expect(frame.context.stroke).not.toHaveBeenCalled();
  expect(frame.publish).not.toHaveBeenCalled();
  expect(renderer.displayed.get(placement.label.feature)).toBe(placement);
});

test('a moving label stays hidden until it clears the legend, with accurate visible counts', () => {
  const {renderer, placement, frame} = setup();
  const target = {...placement, rect: {...placement.rect, x: 150}, points: [placement.points[0], {x: 146, y: 36}]};
  const state = {...placement.rect, label: placement.label, bp: 50, root: placement.points[0], target,
    vx: 0, vy: 0, angle: Math.PI, va: 0, gap: 4, vg: 0, opacity: 1, vo: 0};
  renderer.motion.set(placement.label.feature, state);
  renderer.layout = {map: {width: 220, height: 100}, padding: 3, constrainToViewport: true, placed: [{id: placement.label}]};
  renderer.lastTime = 0;
  renderer._tick(frame, 0);
  expect(frame.publish).toHaveBeenLastCalledWith([]);
  expect(renderer.stats.visible).toBe(0);
  expect(state.x).toBe(70);
  renderer._tick(frame, 1000);
  expect(frame.publish.mock.calls.at(-1)[0]).toHaveLength(1);
  expect(renderer.stats.visible).toBe(1);
});
