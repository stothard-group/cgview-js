/**
 * Classic: Classic straight leaders in bounded outward levels.
 * Copyright 2026 Jason R. Grant. Apache-2.0.
 */
import Rect from './Rect';
import utils from './Utils';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const overlaps = (a, b, gap) => a.x < b.x + b.width + gap - 1e-7 && b.x < a.x + a.width + gap - 1e-7 &&
  a.y < b.y + b.height + gap - 1e-7 && b.y < a.y + a.height + gap - 1e-7;

// Only nearby text boxes participate in exact collision tests. Oversized custom
// labels use the overflow set, preserving correctness without huge cell loops.
class BoxIndex {
  constructor(gap) { this.gap = gap; this.cells = new Map(); this.all = []; this.overflow = []; this.serial = 0; }
  cellsFor(rect, padding, visit) {
    const left = Math.floor((rect.x - padding) / 32), right = Math.floor((rect.x + rect.width + padding) / 32);
    const top = Math.floor((rect.y - padding) / 32), bottom = Math.floor((rect.y + rect.height + padding) / 32);
    if ((right - left + 1) * (bottom - top + 1) > 4096) { return false; }
    for (let x = left; x <= right; x++) {
      for (let y = top; y <= bottom; y++) { if (visit(`${x},${y}`)) { return true; } }
    }
    return true;
  }
  add(rect) {
    const entry = {rect, seen: 0}; this.all.push(entry);
    if (!this.cellsFor(rect, 0, key => {
      if (!this.cells.has(key)) { this.cells.set(key, []); }
      this.cells.get(key).push(entry);
    })) { this.overflow.push(entry); }
  }
  collision(rect) {
    const serial = ++this.serial;
    let hit;
    const visit = entry => {
      if (entry.seen === serial) { return false; }
      entry.seen = serial;
      if (overlaps(rect, entry.rect, this.gap)) { hit = entry.rect; return true; }
      return false;
    };
    if (this.overflow.some(visit)) { return hit; }
    if (!this.cellsFor(rect, this.gap, key => this.cells.get(key)?.some(visit))) { this.all.some(visit); }
    return hit;
  }
}

function rowRange(node, width, height, step, bounded, gap) {
  let low = 0, high = Math.hypot(width, height);
  if (bounded) {
    for (const [axis, size, extent] of [['x', 'width', width], ['y', 'height', height]]) {
      const start = node.rect[axis], direction = node.direction[axis], available = extent - node.rect[size] - gap;
      if (available < gap) { return; }
      if (Math.abs(direction) < 1e-9) {
        if (start < gap || start > available) { return; }
      } else {
        const a = (gap - start) / direction, b = (available - start) / direction;
        low = Math.max(low, Math.min(a, b)); high = Math.min(high, Math.max(a, b));
      }
    }
  }
  const first = Math.max(0, Math.ceil((low - 1e-7) / step)), last = Math.floor((high + 1e-7) / step);
  return last >= first ? {first, last} : undefined;
}

// Skip directly beyond a blocking rectangle along this label's straight ray.
function nextRow(rect, hit, direction, row, step, gap) {
  let exit = Infinity;
  for (const [axis, size] of [['x', 'width'], ['y', 'height']]) {
    const d = direction[axis];
    if (d > 1e-9) { exit = Math.min(exit, (hit[axis] + hit[size] + gap - rect[axis]) / d); }
    else if (d < -1e-9) { exit = Math.min(exit, (hit[axis] - rect[axis] - rect[size] - gap) / d); }
  }
  return row + Math.max(1, Math.ceil((exit - 1e-7) / step));
}

/**
 * Pack Classic boxes level by level, preserving each lower-density prefix.
 * @param {Object[]} nodes - Priority-ordered {label, rect, root, direction} records.
 * @param {Object} options - width, height, step, labelDensity (0..1), constrainToViewport, gap (pixels, default 3).
 * @returns {Object} Selected placements and level/search counts. Inputs are not mutated.
 * @example packClassicLabels(nodes, {width: 800, height: 600, step: 12, labelDensity: 0.5, constrainToViewport: true});
 */
export function packClassicLabels(nodes, {width, height, step, labelDensity, constrainToViewport, gap = 3}) {
  const buckets = [], index = new BoxIndex(gap), placed = [];
  let maximumLevel = 0, attempts = 0, clean = 0;
  nodes.forEach((node, rank) => {
    const range = rowRange(node, width, height, step, constrainToViewport, gap);
    if (!range) { return; }
    maximumLevel = Math.max(maximumLevel, range.last);
    (buckets[range.first] ||= []).push({node, rank, last: range.last});
  });
  const depth = maximumLevel * labelDensity, fullLevels = Math.floor(depth + 1e-9);
  const lastLevel = Math.ceil(depth - 1e-9), fraction = depth - fullLevels;
  for (let row = 0; row <= lastLevel; row++) {
    const additions = [];
    for (const item of (buckets[row] || []).sort((a, b) => a.rank - b.rank)) {
      const {node} = item, offset = row * step;
      const rect = new Rect(node.rect.x + node.direction.x * offset, node.rect.y + node.direction.y * offset,
        node.rect.width, node.rect.height);
      attempts++;
      const hit = index.collision(rect);
      if (hit) {
        const next = nextRow(rect, hit, node.direction, row, step, gap);
        if (next <= item.last && next <= lastLevel) { (buckets[next] ||= []).push(item); }
      } else {
        index.add(rect); additions.push({...node, rect, row});
      }
    }
    if (row === 0) { clean = additions.length; }
    placed.push(...(row > fullLevels ? additions.slice(0, Math.floor(additions.length * fraction)) : additions));
  }
  return {placed, clean, maximumLevel, levels: new Set(placed.map(node => node.row)).size, attempts};
}

/**
 * Classic geometry/painting with a density budget; no animation or priority cap.
 * @private
 */
export default class LabelRendererClassic {
  constructor(annotation, options = {}) {
    this.annotation = annotation;
    this.layer = 'map';
    this.updateOptions(options);
  }

  /** Replace renderer options and invalidate layout; no annotation changes. @private */
  updateOptions(options = {}) {
    const density = Number(options.labelDensity ?? 0);
    this.labelDensity = Number.isFinite(density) ? clamp(density, 0, 1) : 0;
    const gap = Number(options.gap);
    this.gap = Number.isFinite(gap) ? Math.max(0, gap) : 3;
    this.constrainToViewport = options.constrainToViewport !== false;
    this.reset();
  }

  reset() { this.layout = undefined; this.stats = {phase: 'ready'}; }
  destroy() { this.reset(); }

  /** Place, paint and publish synchronous Classic labels on the original map layer. @private */
  draw(frame) {
    const a = this.annotation, ctx = frame.context, started = performance.now();
    a._calculatePositions(frame.labels);
    const base = frame.outerCenterOffset + a._labelLineMarginInner;
    const offset = base + a.labelLineLength + a._labelLineMarginOuter;
    const nodes = Array.from(frame.labels, label => {
      const point = a.canvas.pointForBp(label.bp, offset), next = a.canvas.pointForBp(label.bp, offset + 1);
      const origin = utils.rectOriginForAttachementPoint(point, label.lineAttachment, label.width, label.height);
      return {label, bp: label.bp, attachment: label.lineAttachment,
        rect: {x: origin.x, y: origin.y, width: label.width, height: label.height},
        root: a.canvas.pointForBp(label.bp, base), direction: {x: next.x - point.x, y: next.y - point.y}};
    }).filter(node => node.label.feature.visible);
    const options = {width: frame.width, height: frame.height, step: Math.max(3, a.font.height + this.gap), gap: this.gap,
      labelDensity: this.labelDensity, constrainToViewport: this.constrainToViewport};
    const old = this.layout;
    const cached = old && Object.keys(options).every(key => old.options[key] === options[key]) &&
      old.nodes.length === nodes.length && nodes.every((node, i) => {
        const prev = old.nodes[i];
        return node.label === prev.label && node.bp === prev.bp && node.attachment === prev.attachment &&
          ['x', 'y', 'width', 'height'].every(key => node.rect[key] === prev.rect[key]) &&
          ['x', 'y'].every(key => node.direction[key] === prev.direction[key] && node.root[key] === prev.root[key]);
      });
    const layout = cached ? old : {nodes, options, ...packClassicLabels(nodes, options)};
    this.layout = layout;
    const placements = layout.placed.map(node => ({label: node.label, bp: node.bp, rect: node.rect,
      points: [node.root, node.rect.ptForClockPosition(node.attachment)]}));
    ctx.font = a.font.css; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.lineCap = a.lineCap; ctx.lineWidth = a.labelLineThickness;
    for (const {label, points: [root, end]} of placements) {
      ctx.beginPath(); ctx.moveTo(root.x, root.y); ctx.lineTo(end.x, end.y);
      ctx.strokeStyle = (a.color || label.feature.color).rgbaString; ctx.stroke();
    }
    const background = a.viewer.settings.backgroundColor.copy(); background.opacity = 0.75;
    for (const {label, rect} of placements) {
      ctx.fillStyle = background.rgbaString; ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      ctx.fillStyle = (a.color || label.feature.color).rgbaString;
      ctx.fillText(label.name, rect.x, rect.y + rect.height - 1);
    }
    frame.publish(placements);
    this.stats = {phase: 'ready', layoutMs: performance.now() - started, cached,
      density: {value: this.labelDensity, clean: layout.clean, maximum: this.labelDensity === 1 ? placements.length : null,
        selected: placements.length, straight: placements.length, levels: layout.levels, attempts: cached ? 0 : layout.attempts}};
  }
}
