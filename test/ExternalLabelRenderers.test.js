import Viewer from '../src/Viewer';
import Rect from '../src/Rect';
import settleExternalLabels from './helpers/settleExternalLabels';
import {externalLabelRenderers, registerExternalLabelRenderer} from '../src/ExternalLabelRenderers';

// A contract probe, deliberately not a new placement method shipped in the UI.
class ProbeRenderer {
  constructor(annotation, options) { this.annotation = annotation; this.options = options; this.draws = 0; }
  draw(frame) {
    this.frame = frame;
    this.draws++;
    const label = frame.labels[0];
    frame.context.fillText('probe renderer', 20, 30);
    if (label) { frame.publish([{label, rect: {x: 20, y: 20, width: label.width, height: label.height},
      bp: label.bpDefault, points: [{x: 25, y: 50}, {x: 25, y: 35}]}]); }
    this.pending = frame.requestFrame(() => { this.ticks = (this.ticks || 0) + 1; });
    ProbeRenderer.lastDraw = {renderer: this, frame};
  }
  reset(reason) { this.lastReset = reason; }
  destroy() { this.destroyed = true; }
}
registerExternalLabelRenderer('test-probe', ProbeRenderer, {label: 'Contract probe'});

describe('external label renderer boundary', () => {
  let viewer;
  beforeEach(() => {
    document.body.innerHTML = '<div id="map"></div><div id="other"></div>';
    viewer = new Viewer('#map', {width: 700, height: 600, sequence: {length: 10000},
      annotation: {labelPosition: 'outside'}, legend: {visible: false},
      features: Array.from({length: 30}, (_, i) => ({name: `gene ${i}`, start: 1 + i * 300, stop: 240 + i * 300,
        source: 'test', legend: 'Genes'}))});
    viewer.addTracks({dataType: 'feature', dataMethod: 'source', dataKeys: ['test'], position: 'outside'});
    viewer.layout.updateLayout(true);
    viewer.drawFull();
  });
  afterEach(() => {
    viewer.stopAnimate();
    clearTimeout(viewer.layout._slotTimeoutID);
    viewer.annotation._externalLabels.destroy();
  });
  const select = viewer => {
    viewer.annotation.update({labelMethod: 'test-probe'}); viewer.drawFull();
    return viewer.annotation._externalLabels.renderer;
  };

  test('registry exposes Adaptive and Classic, validates classes, and protects existing entries', () => {
    expect(externalLabelRenderers().map(n => n.id)).toEqual(['adaptive', 'classic', 'test-probe']);
    const choices = externalLabelRenderers(); choices[0].label = 'changed';
    expect(externalLabelRenderers()[0].label).toBe('Adaptive');
    expect(() => registerExternalLabelRenderer('classic', ProbeRenderer)).toThrow('already registered');
    expect(() => registerExternalLabelRenderer('bad id', ProbeRenderer)).toThrow('Invalid');
    expect(() => registerExternalLabelRenderer('bad-class', class {})).toThrow('draw(frame)');
    for (const method of ['missing', 'default', 'angled']) {
      expect(() => viewer.annotation.labelMethod = method).toThrow('Unknown');
    }
    expect(viewer.annotation.labelMethod).toBe('adaptive');
  });

  test('one renderer handles both fast and full draws without legacy placement objects', () => {
    expect(viewer.annotation.labelMethod).toBe('adaptive');
    for (const method of ['classic', 'adaptive']) {
      viewer.annotation.update({labelMethod: method});
      const renderer = viewer.annotation._externalLabels.renderer;
      const draw = jest.spyOn(renderer, 'draw');
      viewer.drawFast(); viewer.drawFull();
      expect(draw.mock.calls.map(([frame]) => frame.fast)).toEqual([true, false]);
      expect(viewer.annotation._externalLabels.renderer).toBe(renderer);
      draw.mockRestore();
    }
    for (const key of ['labelPlacement', 'labelPlacementFast', 'labelPlacementFull', 'priorityMax', 'externalLabelRenderer', 'externalLabelRendererOptions']) {
      expect(viewer.annotation).not.toHaveProperty(key);
      expect(viewer.annotation.toJSON()).not.toHaveProperty(key);
    }
  });

  test('renderer owns drawing and selection; published geometry drives hits and highlight leaders', () => {
    const renderer = select(viewer), label = viewer.annotation._visibleLabels[0];
    expect(renderer.frame.labels.length).toBeGreaterThan(1);
    expect(viewer.annotation._visibleLabels).toHaveLength(1);
    expect(label.rect).toBeInstanceOf(Rect);
    expect(label.rect.containsPt(25, 25)).toBe(true);
    expect(viewer.annotation.externalLabelPlacements[0].points).toEqual([{x: 25, y: 50}, {x: 25, y: 35}]);
    const context = viewer.canvas.context('ui');
    viewer.annotation.drawLabelLine(label, context, 3);
    expect(context.lineTo).toHaveBeenLastCalledWith(25, 35);
    expect(renderer.frame.layer).toBe('labels');
    expect(viewer.canvas.context('labels').fillText).toHaveBeenCalledWith('probe renderer', 20, 30);
  });

  test('stale callbacks cannot publish after switching, and invalid geometry is rejected atomically', () => {
    const renderer = select(viewer), frame = renderer.frame, previous = viewer.annotation._visibleLabels;
    expect(() => frame.publish([{label: frame.labels[0], rect: {x: NaN, y: 0, width: 10, height: 10}}])).toThrow('invalid');
    expect(viewer.annotation._visibleLabels).toBe(previous);
    viewer.annotation.update({labelMethod: 'classic'}); viewer.drawFull();
    const current = viewer.annotation._visibleLabels;
    frame.publish([]);
    expect(frame.isCurrent()).toBe(false);
    expect(frame.requestFrame(() => {})).toBeUndefined();
    expect(viewer.annotation._visibleLabels).toBe(current);
    expect(renderer.destroyed).toBe(true);
    expect(viewer.annotation._externalLabels.frames.size).toBe(0);
  });

  test('a transient invalid camera clears hits and resumes rendering when the projection is ready', () => {
    const renderer = select(viewer), draws = renderer.draws, y = viewer.scale.y.domain();
    viewer.scale.y.domain([NaN, NaN]);
    viewer.annotation._externalLabels.draw(renderer.frame.labels, 0, 100, false);
    expect(renderer.draws).toBe(draws);
    expect(viewer.annotation._visibleLabels).toHaveLength(0);
    expect(viewer.annotation._externalLabels.frames.size).toBe(0);
    viewer.scale.y.domain(y);
    viewer.drawFull();
    expect(renderer.draws).toBe(draws + 1);
    expect(viewer.annotation._visibleLabels).toHaveLength(1);
  });

  test.each(['hide', 'inline', 'load', 'refresh'])('%s cancels pending animation and clears old hit geometry', action => {
    const renderer = select(viewer), host = viewer.annotation._externalLabels;
    expect(host.frames.size).toBeGreaterThan(0);
    if (action === 'load') { viewer.io.loadJSON({cgview: {version: '1.9.0', sequence: {length: 1000}}}); }
    else if (action === 'refresh') { viewer.annotation.refresh(); }
    else { viewer.annotation.update(action === 'hide' ? {visible: false} : {labelPosition: 'inline'}); viewer.drawFull(); }
    expect(host.frames.size).toBe(0);
    expect(renderer.frame.isCurrent()).toBe(false);
    expect(host.placements).toHaveLength(0);
    if (action === 'load') { expect(renderer.destroyed).toBe(true); }
  });

  test('leader thickness is saved under its new name with no old-name alias', () => {
    expect(viewer.annotation.labelLineThickness).toBe(1);
    viewer.annotation.update({labelLineThickness: 0.5});
    const json = viewer.io.toJSON();
    expect(json.cgview.annotation.labelLineThickness).toBe(0.5);
    expect(json.cgview.annotation).not.toHaveProperty('labelLineWidth');
    viewer.io.loadJSON(json);
    expect(viewer.annotation.labelLineThickness).toBe(0.5);
    expect(viewer.annotation).not.toHaveProperty('labelLineWidth');

    delete json.cgview.annotation.labelLineThickness;
    json.cgview.annotation.labelLineWidth = 3;
    viewer.io.loadJSON(json);
    expect(viewer.annotation.labelLineThickness).toBe(1);
    expect(viewer.annotation.toJSON()).not.toHaveProperty('labelLineWidth');
  });

  test('flat settings configure independent custom renderers and round trip with JSON', () => {
    const first = select(viewer);
    viewer.annotation.update({labelSpacing: 7, labelLineThickness: 2});
    viewer.drawFull();
    const renderer = viewer.annotation._externalLabels.renderer;
    expect(renderer).not.toBe(first);
    expect(first.destroyed).toBe(true);
    expect(renderer.frame.options).toEqual({labelDensity: 0, gap: 7, constrainToViewport: true});
    renderer.frame.options.gap = 100;
    expect(viewer.annotation.labelSpacing).toBe(7);
    const json = viewer.io.toJSON(); viewer.io.loadJSON(json); viewer.drawFull();
    expect(viewer.annotation.toJSON()).toMatchObject({labelMethod: 'test-probe',
      labelDensity: 0, labelSpacing: 7, keepLabelsInView: true, labelLineThickness: 2});
    const other = new Viewer('#other', {annotation: {labelMethod: 'test-probe'}});
    expect(other.annotation._externalLabels.renderer).not.toBe(renderer);
    other.stopAnimate(); clearTimeout(other.layout._slotTimeoutID); other.annotation._externalLabels.destroy();
  });

  test.each(['classic', 'adaptive'])('%s accepts flat constructor settings and serializes only the public fields', method => {
    const shared = {labelMethod: method, labelDensity: 0.6, labelSpacing: 7, keepLabelsInView: false};
    const options = {...shared, maxLabels: 8, animate: false, density: 'airy',
      externalLabelRenderer: 'test-probe', externalLabelRendererOptions: {gap: 99}};
    const original = JSON.parse(JSON.stringify(options));
    const other = new Viewer('#other', {annotation: options});
    try {
      expect(other.annotation).toMatchObject(shared);
      expect(other.annotation.toJSON()).toMatchObject(shared);
      other.annotation.update({labelSpacing: 9});
      const saved = other.io.toJSON().cgview.annotation;
      expect(saved).toMatchObject({...shared, labelSpacing: 9});
      for (const key of ['maxLabels', 'animate', 'density', 'externalLabelRenderer', 'externalLabelRendererOptions']) {
        expect(other.annotation).not.toHaveProperty(key);
        expect(saved).not.toHaveProperty(key);
      }
      expect(options).toEqual(original);
    } finally {
      other.stopAnimate();
      clearTimeout(other.layout._slotTimeoutID);
      other.annotation._externalLabels.destroy();
    }
  });

  test.each(['classic', 'adaptive'])('%s partial updates preserve other settings and the live renderer', method => {
    viewer.annotation.update({labelMethod: method, labelDensity: 0.6, labelSpacing: 7, keepLabelsInView: false});
    const renderer = viewer.annotation._externalLabels.renderer;
    const onUpdate = jest.fn();
    viewer.on('annotation-update.flat-label-settings', onUpdate);
    viewer.annotation.update({labelSpacing: 9});
    expect(viewer.annotation.toJSON()).toMatchObject({labelMethod: method, labelDensity: 0.6, labelSpacing: 9, keepLabelsInView: false});
    expect(onUpdate).toHaveBeenLastCalledWith({attributes: {labelSpacing: 9}});
    viewer.annotation.update({labelDensity: 0});
    viewer.annotation.update({keepLabelsInView: true});
    expect(viewer.annotation.toJSON()).toMatchObject({labelMethod: method, labelDensity: 0, labelSpacing: 9, keepLabelsInView: true});
    viewer.annotation.labelSpacing = 0;
    viewer.annotation.keepLabelsInView = false;
    viewer.annotation.labelDensity = 1;
    expect(viewer.annotation._externalLabels.renderer).toBe(renderer);
    expect(renderer.labelDensity).toBe(1);
    expect(renderer.geometry?.options ?? {gap: renderer.gap, constrainToViewport: renderer.constrainToViewport})
      .toMatchObject({gap: 0, constrainToViewport: false});
    viewer.annotation.labelMethod = method === 'classic' ? 'adaptive' : 'classic';
    expect(viewer.annotation.toJSON()).toMatchObject({labelDensity: 1, labelSpacing: 0, keepLabelsInView: false});
  });

  test.each([
    ['labelDensity', undefined, 0], ['labelDensity', -1, 0], ['labelDensity', 2, 1],
    ['labelDensity', '0.4', 0.4], ['labelDensity', Infinity, 0],
    ['labelSpacing', undefined, 3], ['labelSpacing', -1, 0], ['labelSpacing', '0.5', 0.5],
    ['labelSpacing', Infinity, 3], ['keepLabelsInView', undefined, true], ['keepLabelsInView', false, false],
  ])('%s normalizes %s to %s before serialization', (key, value, expected) => {
    viewer.annotation.update({[key]: value});
    expect(viewer.annotation[key]).toBe(expected);
    expect(viewer.annotation.toJSON()[key]).toBe(expected);
  });

  test('export uses a disposable renderer and labels, preserving live animation, state and hit boxes', () => {
    const renderer = select(viewer), host = viewer.annotation._externalLabels;
    clearTimeout(viewer.layout._slotTimeoutID); viewer.layout._slotTimeoutID = undefined;
    const state = {labels: viewer.annotation._visibleLabels, placements: host.placements, frames: [...host.frames],
      stats: host.stats, draws: renderer.draws, rect: viewer.annotation._visibleLabels[0].rect};
    viewer.externals.SVGContext = function() {
      const context = document.createElement('canvas').getContext('2d');
      context.getSerializedSvg = () => '<svg></svg>';
      return context;
    };
    expect(viewer.io.getSVG()).toBe('<svg></svg>');
    expect(ProbeRenderer.lastDraw.renderer).not.toBe(renderer);
    expect(ProbeRenderer.lastDraw.renderer.destroyed).toBe(true);
    expect(ProbeRenderer.lastDraw.frame.exporting).toBe(true);
    expect(ProbeRenderer.lastDraw.frame.labels[0]).not.toBe(renderer.frame.labels[0]);
    expect(host.renderer).toBe(renderer);
    expect(host.stats).toBe(state.stats);
    expect(host.placements).toBe(state.placements);
    expect([...host.frames]).toEqual(state.frames);
    expect(renderer.draws).toBe(state.draws);
    expect(viewer.annotation._visibleLabels).toBe(state.labels);
    expect(state.labels[0].rect).toBe(state.rect);
  });

  test.each(['classic', 'adaptive'])('%s exports preserve live rectangles and highlights follow published leaders', async method => {
    viewer.annotation.update({labelMethod: method}); viewer.drawFull();
    await settleExternalLabels(viewer);
    const labels = viewer.annotation._visibleLabels, boxes = labels.map(n => n.rect);
    viewer.drawExport();
    expect(viewer.annotation._visibleLabels).toBe(labels);
    expect(labels.map(n => n.rect)).toEqual(boxes);
    expect(viewer.annotation._visibleLabels.length).toBeGreaterThan(0);
    expect(viewer.annotation._visibleLabels.every(n => n.feature && n.rect)).toBe(true);
    const {label, points} = viewer.annotation.externalLabelPlacements[0];
    const ctx = viewer.canvas.context('ui');
    viewer.annotation.drawLabelLine(label, ctx, 3);
    expect(ctx.moveTo).toHaveBeenLastCalledWith(points[0].x, points[0].y);
    expect(ctx.lineTo).toHaveBeenLastCalledWith(points.at(-1).x, points.at(-1).y);
  });

  test('failed renderer cleanup during export restores live drawing mode', () => {
    const renderer = select(viewer);
    const destroy = jest.spyOn(ProbeRenderer.prototype, 'destroy').mockImplementation(() => { throw new Error('cleanup failed'); });
    try { expect(() => viewer.drawExport()).toThrow('cleanup failed'); }
    finally { destroy.mockRestore(); }
    expect(viewer.layout._exporting).toBeFalsy();
    expect(viewer.layout._exportLabelTasks).toBeUndefined();
    viewer.drawFull();
    expect(renderer.frame.exporting).toBe(false);
    expect(viewer.annotation._visibleLabels).toHaveLength(1);
  });
});
