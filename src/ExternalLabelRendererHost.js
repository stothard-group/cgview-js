/** Renderer lifecycle and interaction boundary. Copyright 2026 Jason R. Grant. Apache-2.0. */
import CGArray from './CGArray';
import Rect from './Rect';
import {externalLabelRendererDefinition} from './ExternalLabelRenderers';

const clone = value => Object.assign(Object.create(Object.getPrototypeOf(value)), value);

/**
 * Per-Annotation host. Renderer algorithms and painting stay in their own files.
 * @private
 */
class ExternalLabelRendererHost {
  constructor(annotation, id) {
    this.annotation = annotation;
    this.generation = 0;
    this.frames = new Set();
    this.placements = [];
    this.lines = new Map();
    this.stats = {visible: 0, candidates: 0, drawMs: 0};
    this.select(id ?? 'adaptive');
  }

  /** Apply options without discarding motion when the renderer supports it. @private */
  updateOptions(options) {
    if (typeof this.renderer?.updateOptions === 'function') {
      this.clear();
      this.renderer.updateOptions(options);
    } else { this.select(this.id, true); }
  }

  /** Select an independent renderer instance, disposing the previous one. @private */
  select(id, force = false) {
    const definition = externalLabelRendererDefinition(id);
    if (id === this.id && !force) { return; }
    const renderer = new definition.Renderer(this.annotation, this.annotation._labelRendererOptions);
    this.destroy();
    this.id = id;
    this.renderer = renderer;
  }

  /** Invalidate pending frames and hit geometry; reset caches on data/hide changes. @private */
  clear(reason = 'redraw') {
    this.generation++;
    for (const id of this.frames) { cancelAnimationFrame(id); }
    this.frames.clear();
    this.placements = [];
    this.lines.clear();
    this.annotation._visibleLabels = new CGArray();
    this.stats = {...this.stats, visible: 0};
    if (reason !== 'redraw') { this.renderer?.reset?.(reason); }
  }

  /** Cancel managed animation and release renderer-owned resources. @private */
  destroy() {
    this.clear();
    this.renderer?.destroy?.();
    this.renderer = undefined;
  }

  /**
   * Dispatch one external-label draw and own its publication/animation lifetime.
   * @param {Label[]} labels - Eligible labels; the renderer chooses a visible subset.
   * @param {Number} innerCenterOffset - Inner map boundary.
   * @param {Number} outerCenterOffset - Outer map boundary.
   * @param {Boolean} fast - Interactive preview draw.
   * @returns {void} Updates live geometry/stats; exports use disposable instances.
   */
  draw(labels, innerCenterOffset, outerCenterOffset, fast) {
    const a = this.annotation, viewer = a.viewer, exporting = !!viewer.layout._exporting;
    const started = performance.now();
    if (!exporting) { this.clear(); }
    // Loading a map can briefly draw a queued move from an unfinished layout.
    // Wait for a valid projection before invoking a renderer or publishing hits.
    if (![...viewer.scale.x.domain(), ...viewer.scale.y.domain()].every(Number.isFinite)) { return; }
    const generation = this.generation;
    const current = () => !exporting && generation === this.generation && viewer.annotation === a &&
      a.visible && ['outside', 'auto'].includes(a.labelPosition);
    const renderer = exporting ? new (externalLabelRendererDefinition(this.id).Renderer)(a, a._labelRendererOptions) : this.renderer;
    const layer = renderer.layer === 'map' ? 'map' : 'labels';
    const context = a.canvas.context(layer);
    const candidates = new Set(labels);
    const frame = {
      annotation: a, viewer, canvas: a.canvas, context, layer, exporting, fast: !!fast,
      width: a.canvas.width, height: a.canvas.height, format: viewer.format,
      innerCenterOffset, outerCenterOffset, visibleRange: a._visibleRange,
      options: a._labelRendererOptions,
      reducedMotion: typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
      // Export labels are disposable; publication and animation are disabled.
      labels: exporting ? new CGArray(Array.from(labels, clone)) : labels,
      publish: placements => {
        if (!current()) { return; }
        const seen = new Set();
        const prepared = placements.map(({label, rect, points = [], bp = label?.bp}) => {
          if (!candidates.has(label) || seen.has(label) || !rect ||
            ![rect.x, rect.y, rect.width, rect.height, bp].every(Number.isFinite) || rect.width < 0 || rect.height < 0 ||
            points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) {
            throw new TypeError('Renderer published invalid label geometry');
          }
          seen.add(label);
          return {label, rect: rect instanceof Rect ? rect : new Rect(rect.x, rect.y, rect.width, rect.height),
            points: points.map(p => ({x: p.x, y: p.y})), bp};
        });
        for (const {label, rect, points, bp} of prepared) {
          label.rect = rect;
          label.bp = bp;
          if (points.length) { label.attachementPt = points.at(-1); }
        }
        this.placements = prepared;
        this.lines = new Map(prepared.map(n => [n.label, n.points]));
        a._visibleLabels = new CGArray(prepared.map(n => n.label));
        this.stats = {...this.stats, renderer: this.id, candidates: labels.length, visible: prepared.length};
        if (viewer.debug?.data.n) { viewer.debug.data.n.labels = prepared.length; }
      },
      requestFrame: callback => {
        if (!current()) { return undefined; }
        const id = requestAnimationFrame(time => {
          this.frames.delete(id);
          if (current()) {
            const frameStarted = performance.now();
            callback(time);
            this.stats = {...this.stats, frameMs: performance.now() - frameStarted};
          }
        });
        this.frames.add(id);
        return id;
      },
      clear: () => {
        if (layer !== 'labels') { throw new Error('Only the labels layer can be cleared independently'); }
        if (current()) { context.clearRect(0, 0, frame.width, frame.height); }
      },
      isCurrent: current,
    };
    // SVG shares one drawing context across layers. Defer the labels layer
    // until map features are complete so its compositing matches Canvas/PNG.
    if (exporting && layer === 'labels') {
      viewer.layout._exportLabelTasks.push({draw: () => renderer.draw(frame), destroy: () => renderer.destroy?.()});
      return;
    }
    try { renderer.draw(frame); }
    finally { if (exporting) { renderer.destroy?.(); } }
    if (!exporting) { this.stats = {...this.stats, candidates: labels.length, drawMs: performance.now() - started}; }
  }

  drawLabelLine(label, context, width) {
    if (this.renderer?.drawLabelLine) { this.renderer.drawLabelLine(label, context, width); return; }
    const points = this.lines.get(label);
    if (!points?.length) { return; }
    context.save();
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) { context.lineTo(point.x, point.y); }
    context.strokeStyle = (this.annotation.color || label.feature.color).rgbaString;
    context.lineWidth = width || this.annotation.labelLineThickness;
    context.lineCap = this.annotation.lineCap;
    context.stroke();
    context.restore();
  }
}

export default ExternalLabelRendererHost;
