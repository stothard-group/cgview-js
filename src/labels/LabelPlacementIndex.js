/** Production label rendering. Copyright 2016-2026 Jason R. Grant. Apache-2.0. */
import {segmentsIntersect, segmentsTooClose} from './LabelGeometry';

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

const overlap = (a, b, gap = 0) => a.x < b.x + b.width + gap - 1e-7 && a.x + a.width + gap > b.x + 1e-7 &&
  a.y < b.y + b.height + gap - 1e-7 && a.y + a.height + gap > b.y + 1e-7;

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Broad-phase cells follow the segment through each column, rather than filling
// its entire bounding rectangle. Long diagonal leaders remain cheap to index.
class ShapeGrid {
  constructor() { this.columns = new Map(); this.overflow = new Set(); }

  _cells(rect, points, padding, visit) {
    const size = 32;
    let left = rect.x - padding, right = rect.x + rect.width + padding;
    let low = rect.y - padding, high = rect.y + rect.height + padding;
    let a, b;
    if (points) {
      [a, b] = points[0].x <= points[1].x ? points : [points[1], points[0]];
      left = a.x - padding; right = b.x + padding;
      low = Math.min(a.y, b.y) - padding; high = Math.max(a.y, b.y) + padding;
    }
    // Protect custom inputs with extreme coordinates. Overflow entries always
    // participate in queries, so this bound cannot discard a possible conflict.
    const columns = (right - left) / size + 2, rows = (high - low) / size + 2;
    if (columns + rows > 4096 || (!points && columns * rows > 4096)) { return undefined; }
    for (let x = Math.floor(left / size); x <= Math.floor(right / size); x++) {
      let bottom = low, top = high;
      if (points && b.x - a.x > 1e-9) {
        const y1 = a.y + (b.y - a.y) * clamp((x * size - padding - a.x) / (b.x - a.x), 0, 1);
        const y2 = a.y + (b.y - a.y) * clamp(((x + 1) * size + padding - a.x) / (b.x - a.x), 0, 1);
        bottom = Math.min(y1, y2) - padding; top = Math.max(y1, y2) + padding;
      }
      for (let y = Math.floor(bottom / size); y <= Math.floor(top / size); y++) {
        if (visit(x, y)) { return true; }
      }
    }
    return false;
  }

  add(entry, points) {
    const memberships = [];
    const traversed = this._cells(entry.node.placement.rect, points, 0, (x, y) => {
      let column = this.columns.get(x);
      if (!column) { this.columns.set(x, column = new Map()); }
      let cell = column.get(y);
      if (!cell) { column.set(y, cell = new Set()); }
      cell.add(entry); memberships.push(cell);
    });
    if (traversed === undefined) { this.overflow.add(entry); memberships.push(this.overflow); }
    entry.cells.push(...memberships);
  }

  some(rect, points, padding, visit) {
    for (const entry of this.overflow) { if (visit(entry)) { return true; } }
    const result = this._cells(rect, points, padding, (x, y) => {
      const cell = this.columns.get(x)?.get(y);
      if (cell) { for (const entry of cell) { if (visit(entry)) { return true; } } }
      return false;
    });
    if (result !== undefined) { return result; }
    for (const column of this.columns.values()) {
      for (const cell of column.values()) { for (const entry of cell) { if (visit(entry)) { return true; } } }
    }
    return false;
  }
}

function conflict(a, b, options) {
  if (overlap(a.rect, b.rect, options.gap)) { return true; }
  const [p, q] = a.points, [s, t] = b.points, margin = options.lineWidth + 0.75 + 1e-7;
  if (Math.max(p.x, q.x) + margin < Math.min(s.x, t.x) || Math.max(s.x, t.x) + margin < Math.min(p.x, q.x) ||
    Math.max(p.y, q.y) + margin < Math.min(s.y, t.y) || Math.max(s.y, t.y) + margin < Math.min(p.y, q.y)) { return false; }
  const gap = Math.min(options.lineWidth + 0.75, distance(a.points[0], b.points[0]) * 0.75);
  return segmentsTooClose(a.points[0], a.points[1], b.points[0], b.points[1], gap);
}

/**
 * Conservative broad phase for box/box and leader/leader collision searches.
 * Exact collision rules still decide every match. IDs identify replacements.
 * @example const index = new PlacementIndex(clean); index.add(node); index.conflicts(target);
 */
export class PlacementIndex {
  /** @param {Object} options - gap and lineWidth in pixels; no input mutation. */
  constructor(options) {
    this.options = options;
    this.boxes = new ShapeGrid(); this.lines = new ShapeGrid();
    this.entries = new Map(); this.serial = 0;
  }

  /** @param {Object} node - Placed node. Replaces the indexed ID; returns void. */
  add(node) {
    this.remove(node.id);
    const entry = {node, cells: [], seen: 0};
    this.entries.set(node.id, entry);
    this.boxes.add(entry); this.lines.add(entry, node.placement.points);
  }

  /** @param {*} id - Node identity to remove. Missing IDs are harmless; returns void. */
  remove(id) {
    const entry = this.entries.get(id);
    if (!entry) { return; }
    for (const cell of entry.cells) { cell.delete(entry); }
    this.entries.delete(id);
  }

  /**
   * @param {Object} node - Candidate placement, excluding its own indexed ID.
   * @returns {Boolean} True only for an exact box/leader conflict; no geometry changes.
   */
  conflicts(node) {
    const serial = ++this.serial, p = node.placement;
    const visit = entry => {
      if (entry.seen === serial || entry.node.id === node.id) { return false; }
      entry.seen = serial;
      return conflict(p, entry.node.placement, this.options);
    };
    return this.boxes.some(p.rect, undefined, this.options.gap + 1e-7, visit) ||
      this.lines.some(p.rect, p.points, this.options.lineWidth + 0.75 + 1e-7, visit);
  }
}

const strictOverlap = (a, b, gap) => a.x < b.x + b.width + gap && a.x + a.width + gap > b.x &&
  a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;

function hitsText(a, b, rect) {
  const p = 1, x = rect.x - p, y = rect.y - p, right = rect.x + rect.width + p, bottom = rect.y + rect.height + p;
  if (Math.max(a.x, b.x) < x || Math.min(a.x, b.x) > right ||
    Math.max(a.y, b.y) < y || Math.min(a.y, b.y) > bottom) { return false; }
  const corners = [{x, y}, {x: right, y}, {x: right, y: bottom}, {x, y: bottom}];
  return corners.some((c, i) => segmentsIntersect(a, b, c, corners[(i + 1) % 4])) ||
    (a.x >= x && a.x <= right && a.y >= y && a.y <= bottom);
}

// The local Clean solver also checks leaders against text. Broad-phase queries
// retain the strict box comparison used by that solver, including cell edges.
export class CleanIndex extends PlacementIndex {
  some(grid, rect, points, padding, test) {
    const serial = ++this.serial;
    return this[grid].some(rect, points, padding, entry => {
      if (entry.seen === serial) { return false; }
      entry.seen = serial;
      return test(entry.node.placement);
    });
  }

  boxesOverlap(rect) {
    return this.some('boxes', rect, undefined, this.options.gap, p => strictOverlap(rect, p.rect, this.options.gap));
  }

  linesHit(rect) { return this.some('lines', rect, undefined, 1.0000001, p => hitsText(...p.points, rect)); }
  hitsBoxes(points) { return this.some('boxes', {}, points, 1.0000001, p => hitsText(...points, p.rect)); }
  linesConflict(points) {
    return this.some('lines', {}, points, this.options.lineWidth + 0.7500001, p =>
      segmentsTooClose(...points, ...p.points, Math.min(this.options.lineWidth + 0.75, distance(points[0], p.points[0]) * 0.75)));
  }
}
