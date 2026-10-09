/** Production label rendering. Copyright 2016-2026 Jason R. Grant. Apache-2.0. */
import {packOrdered} from './LabelGeometry';
import {CleanIndex} from './LabelPlacementIndex';

const TAU = Math.PI * 2;
// Fixed geometry from the former balanced preset; capacity is still measured per view.
const OVAL_VIEWPORT_FRACTION = 0.87;
const MAX_CLEAN_ROWS = 3;
const MAX_LABELS = Infinity;
const clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
const median = values => values.sort((a, b) => a - b)[Math.floor(values.length / 2)] || 1;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const drain = steps => { let next; do { next = steps.next(); } while (!next.done); return next.value; };
const indexes = new WeakMap();
const positionCaches = new WeakMap();

/** Ordered Oval/local guides and cooperative collision checks. Input geometry is read-only. @private */
export default class AdaptiveLabelLayout {
  constructor(candidates, map, options = {}, previous, work = {}) {
    this.map = map;
    this.candidates = candidates;
    this.options = options;
    this.gap = options.gap ?? 3;
    this.lineWidth = options.lineWidth ?? 1;
    this.padding = options.viewportPadding ?? Math.max(6, this.lineWidth / 2 + 1);
    this.maxLabels = MAX_LABELS;
    this.constrainToViewport = options.constrainToViewport !== false;
    this.placed = [];
    this.obstacles = [];
    this.revision = 1;
    this.done = true;
    this.attempts = 0;
    this.mode = this._mode(previous?.mode);
    // Retention affects selection, not coordinates. Geometry is always solved
    // from the current projection, so repeated draws cannot slowly drift.
    this.retained = new Map(previous?.placed.map(n => [n.id, n.placement.row]) || []);
    this.retainRows = previous?.mode === this.mode;
    this.candidates = candidates;
    this.displayedFeatures = work.displayedFeatures;
    const usable = candidates.filter(n => n.width > 0 && n.height > 0 &&
      [n.width, n.height, n.preferred].every(Number.isFinite) && (!this.constrainToViewport ||
      (n.width + 2 * this.padding < map.width && n.height + 2 * this.padding < map.height)));
    this.nodes = this._shortlist(usable).map(({node, rank, score}) => ({...node, rank, score, root: this.point(node.preferred)}));
    this.placed = []; this.attempts = 0; this.done = false;
    if (!work.deferred) { drain(this.steps()); }
  }

  point(a) {
    const m = this.map;
    return m.circular ? {x: m.x + m.radius * Math.cos(a), y: m.y + m.radius * Math.sin(a)} : {x: a, y: m.y};
  }

  _bestOf(values, solve) {
    let best = this.placed;
    const score = placed => placed.length + placed.filter(n => n.favorite).length;
    for (const value of values) {
      this.placed = [];
      solve(value);
      if (score(this.placed) > score(best)) { best = this.placed; }
    }
    this.placed = best;
  }

  // Equal population bins retain labels in dense clusters as well as across
  // sparse regions. Favorites are reserved first; ties use annotation priority.
  _select(ordered, count) {
    count = Math.max(0, Math.min(ordered.length, Math.floor(count)));
    if (count === ordered.length) { return ordered.slice(); }
    const chosen = new Set(ordered.filter(n => n.favorite).sort((a, b) => b.score - a.score).slice(0, count));
    const remaining = ordered.filter(n => !chosen.has(n));
    const slots = count - chosen.size;
    for (let i = 0; i < slots; i++) {
      const bin = remaining.slice(Math.floor(i * remaining.length / slots), Math.floor((i + 1) * remaining.length / slots));
      chosen.add(bin.reduce((best, n) => n.score > best.score ? n : best));
    }
    return ordered.filter(n => chosen.has(n));
  }

  _contour(capacityScale = 1, omittedTips = []) {
    const m = this.map, p = this.padding;
    const fontHeight = median(this.nodes.map(n => n.height));
    // Grow the shared ellipse only as much as the selected rows require.
    const maxRy = Math.max(m.radius + 24, m.height * OVAL_VIEWPORT_FRACTION / 2);
    // When the opposite pole is clipped, use the free space beyond the visible
    // pole. Independent half-ellipses retain the side contour and meet smoothly
    // at the equator. The extension ramps with clipping, avoiding a mode jump.
    const apexVisible = m.x >= p && m.x <= m.width - p;
    let topBoundary = p, bottomBoundary = m.height - p;
    for (const box of this.options.obstacles || []) {
      if (box.x > m.x || box.x + box.width < m.x) { continue; }
      // A title/footer across the pole is the edge of the usable space. Ending
      // the ellipse under it would discard every narrow-view label at that pole.
      if (box.y <= p && box.y + box.height < m.y - m.radius) {
        topBoundary = Math.max(topBoundary, box.y + box.height + this.gap);
      }
      if (box.y + box.height >= m.height - p && box.y > m.y + m.radius) {
        bottomBoundary = Math.min(bottomBoundary, box.y - this.gap);
      }
    }
    const topExtension = apexVisible ? Math.max(0, m.y - maxRy - topBoundary) *
      clamp((m.y + m.radius - m.height) / (m.radius * 0.5), 0, 1) : 0;
    const bottomExtension = apexVisible ? Math.max(0, bottomBoundary - m.y - maxRy) *
      clamp((m.radius - m.y) / (m.radius * 0.5), 0, 1) : 0;
    // Protect overlays when opening this extra space, while preserving the
    // existing side-arc and row behavior.
    this.obstacles = topExtension > 0 || bottomExtension > 0 ? this.options.obstacles || [] : [];
    const guideLow = m.y - maxRy - topExtension, guideHigh = m.y + maxRy + bottomExtension;
    const low = this.constrainToViewport ? Math.max(topExtension > 0 ? topBoundary : p, guideLow) : guideLow;
    const high = this.constrainToViewport ? Math.min(bottomExtension > 0 ? bottomBoundary : m.height - p, guideHigh) : guideHigh;
    // Releasing the viewport lets the contour extend past its edges, but must
    // not scale the selection budget with a huge zoomed circle's full diameter.
    const capacityHeight = this.constrainToViewport ? high - low : Math.min(high - low, Math.max(0, m.height - 2 * p));
    const perSide = Math.floor(capacityScale * capacityHeight / (fontHeight + this.gap));
    const tips = [];
    if (apexVisible && this.mode === 'contour') {
      // Reserve the feature nearest each pole before selecting either flank.
      // Its vertical leader then sits between the two ordered side sequences.
      for (const outward of [-1, 1]) {
        const pole = m.y + outward * m.radius;
        if (omittedTips.includes(outward) || pole < 0 || pole > m.height || tips.length >= this.maxLabels) { continue; }
        const tip = this._tipCandidate(outward, fontHeight, tips);
        if (tip) { tips.push({...tip, outward}); }
      }
    }
    const tipIds = new Set(tips.map(t => t.node.id));
    const remainingMax = this.maxLabels - tips.length;
    const flanks = [-1, 1].map(side => {
      const group = this.nodes.filter(n => !tipIds.has(n.id) && (Math.cos(n.preferred) < 0 ? -1 : 1) === side)
        .sort((a, b) => a.root.y - b.root.y || a.rank - b.rank);
      const share = Number.isFinite(remainingMax) ?
        Math.min(perSide, Math.ceil(remainingMax * group.length / Math.max(1, this.nodes.length - tips.length))) : perSide;
      const selected = this._select(group, share);
      const ry = Math.min(maxRy, Math.max(m.radius + 24, selected.length * (fontHeight + this.gap) / 1.7));
      const span = group.length ? group[group.length - 1].root.y - group[0].root.y : 0;
      const crowded = clamp(group.length * (fontHeight + this.gap) / (span + fontHeight) - 0.5, 0, 1);
      return {side, selected, topRy: ry + topExtension * crowded, bottomRy: ry + bottomExtension * crowded};
    });
    for (const tip of tips) {
      const {node, outward, anchor} = tip;
      const extent = Math.max(...flanks.map(f => outward < 0 ? f.topRy : f.bottomRy));
      let y = m.y + outward * (extent + node.height / 2 + this.gap - 2);
      if (this.constrainToViewport) { y = clamp(y, topBoundary + node.height / 2, bottomBoundary - node.height / 2); }
      const root = this.point(anchor);
      const rect = {x: root.x - node.width / 2, y: y - node.height / 2, width: node.width, height: node.height};
      const end = {x: root.x, y: y - outward * (node.height / 2 + 4)};
      const blocked = (this.options.obstacles || []).some(b => rect.x < b.x + b.width + this.gap &&
        rect.x + rect.width + this.gap > b.x && rect.y < b.y + b.height + this.gap && rect.y + rect.height + this.gap > b.y);
      if (!this._boxFits(rect) || blocked || outward * (end.y - root.y) < 0 ||
        root.x < 0 || root.x > m.width || root.y < 0 || root.y > m.height) {
        return this._contour(capacityScale, [...omittedTips, outward]);
      }
      Object.assign(tip, {rect, end,
        row: outward < 0 ? 'top-tip' : 'bottom-tip', attachment: outward < 0 ? 'bottom' : 'top'});
    }
    const beforeTips = this.placed.length;
    for (const tip of tips) {
      if (!this._accept(tip)) {
        // A rejected tip must release its feature and reserved space back to
        // the flanks. Each pole can be omitted only once, bounding the retry.
        this.placed.length = beforeTips;
        return this._contour(capacityScale, [...omittedTips, tip.outward]);
      }
    }
    const topTip = tips.find(t => t.outward < 0), bottomTip = tips.find(t => t.outward > 0);
    const all = [];
    for (const {side, topRy, bottomRy, selected: chosen} of flanks) {
      let selected = chosen;
      const rx = m.radius + 24;
      // Retry once without infeasible wide/offscreen labels so they do not
      // consume packing space or push the rest of the contour outward.
      for (let pass = 0; pass < 2; pass++) {
        const centers = packOrdered(selected.map(n => {
          const sine = Math.sin(n.preferred);
          return {size: n.height, desired: m.y + (sine < 0 ? topRy : bottomRy) * sine};
        }), Math.max(low, m.y - topRy + 2, topTip ? topTip.rect.y + topTip.rect.height + this.gap : -Infinity),
        Math.min(high, m.y + bottomRy - 2, bottomTip ? bottomTip.rect.y - this.gap : Infinity), this.gap);
        if (!centers) { selected = selected.slice(0, -1); pass--; continue; }
        const placements = selected.map((n, i) => {
          const y = centers[i];
          const pole = m.y + (y < m.y ? -m.radius : m.radius);
          const closeTip = apexVisible && pole >= 0 && pole <= m.height;
          const halfRy = y < m.y ? topRy : bottomRy;
          let offset = rx * Math.sqrt(Math.max(0, 1 - ((y - m.y) / halfRy) ** 2));
          if (closeTip) {
            const tip = y < m.y ? topTip : bottomTip;
            const apex = tip ? Math.abs(tip.rect.y + tip.rect.height / 2 - m.y) : halfRy + fontHeight / 2 + this.gap - 2;
            const join = halfRy * 0.8;
            if (Math.abs(y - m.y) > join && apex > join) {
              // Join the ellipse smoothly to a quadratic pointed tip. The
              // first flank labels stay on either side of its central apex.
              const t = clamp((Math.abs(y - m.y) - join) / (apex - join), 0, 1);
              const bend = 1 - join * (apex - join) / (halfRy * halfRy - join * join);
              offset = rx * 0.6 * (1 - t) * (1 + bend * t);
            }
            // Leave room for the two leaders and keep large text outside the
            // map even when there is too little vertical room to close fully.
            const dy = Math.max(0, Math.abs(y - m.y) - n.height / 2);
            const mapClearance = Math.sqrt(Math.max(0, (m.radius + 2.01) ** 2 - dy ** 2)) - 4;
            offset = Math.max(offset, this.lineWidth + 1, this.gap / 2, mapClearance);
          }
          const x = m.x + side * offset;
          const end = {x, y};
          const rect = {x: side < 0 ? x - 4 - n.width : x + 4, y: y - n.height / 2, width: n.width, height: n.height};
          return {node: n, rect, end, row: side};
        });
        if (pass === 0) { selected = placements.filter(v => this._boxFits(v.rect)).map(v => v.node); }
        else { all.push(...placements); }
      }
    }
    // Preserve high-priority labels when the opposite flanks compete at a pole.
    all.sort((a, b) => b.node.score - a.node.score);
    this.proposed = all.length + tips.length;
    for (const p of all) { this._accept(p); }
  }

  _tipCandidate(outward, height, reserved) {
    const target = outward * Math.PI / 2, m = this.map;
    let best;
    for (const node of this.nodes) {
      if (reserved.some(t => t.node.id === node.id)) { continue; }
      for (const [lo, hi] of node.ranges) {
        const pole = target + Math.round(((lo + hi) / 2 - target) / TAU) * TAU;
        const anchor = clamp(pole, lo, hi), error = Math.abs(anchor - pole);
        if (error * m.radius > Math.min(m.radius * 0.1, height)) { continue; }
        if (!best || error < best.error - 1e-9 || (Math.abs(error - best.error) < 1e-9 && node.score > best.node.score)) {
          best = {node, anchor, error};
        }
      }
    }
    return best;
  }

  _boxFits(rect) {
    const m = this.map, p = this.padding;
    if (this.constrainToViewport && (rect.x < p || rect.y < p || rect.x + rect.width > m.width - p || rect.y + rect.height > m.height - p)) { return false; }
    if (this.obstacles.some(b => rect.x < b.x + b.width + this.gap && rect.x + rect.width + this.gap > b.x &&
      rect.y < b.y + b.height + this.gap && rect.y + rect.height + this.gap > b.y)) { return false; }
    if (m.circular) {
      const x = clamp(m.x, rect.x, rect.x + rect.width), y = clamp(m.y, rect.y, rect.y + rect.height);
      return Math.hypot(x - m.x, y - m.y) >= m.radius + 2;
    }
    return rect.y + rect.height < m.y - 2;
  }

  _anchors(node, end) {
    const m = this.map;
    const target = m.circular ? Math.atan2(end.y - m.y, end.x - m.x) : end.x;
    const nearby = node.ranges.flatMap(([a, b]) => {
      const angle = m.circular ? target + Math.round(((a + b) / 2 - target) / TAU) * TAU : target;
      return [clamp(angle, a, b), a, b];
    });
    return [node.preferred, ...nearby.sort((a, b) => Math.abs(a - node.preferred) - Math.abs(b - node.preferred))];
  }

  _mode(previous) {
    const m = this.map;
    if (!m.circular) { return 'linear'; }
    const clipped = Math.max(m.radius - m.x, m.x + m.radius - m.width,
      m.radius - m.y, m.y + m.radius - m.height);
    // Keep the complete Oval whenever the circle fits. A small screen-space
    // tolerance prevents repeated switches while a pole grazes the viewport.
    return clipped <= (previous === 'contour' ? 24 : 0) ? 'contour' : 'compact-contour';
  }

  // Text width matters on diagonal bands; font size sets the normal allowance.
  // Limits are in screen pixels, so zoom cannot stretch a leader with the map.
  _leaderLimit(node) { return Math.max(48, node.height * 8, node.width / 2); }

  // Counts and favorites dominate. On equal counts, choose the shorter layout.
  _quality(nodes) {
    return nodes.length + nodes.filter(n => n.favorite).length -
      nodes.reduce((sum, n) => sum + distance(...n.placement.points) / this._leaderLimit(n), 0) / Math.max(1, nodes.length) * 0.1;
  }

  _localPosition(node, row, step, shift) {
    const m = this.map;
    // The projected text footprint keeps the entire box outside the tangent
    // at its own guide position, even on a strongly curved flank.
    const a = m.circular ? node.preferred - Math.sign(Math.sin(node.preferred)) * shift / (m.radius + 24 + row * step) : 0;
    const nx = m.circular ? Math.cos(a) : 0, ny = m.circular ? Math.sin(a) : -1;
    const depth = 24 + row * step + (Math.abs(nx) * node.width + Math.abs(ny) * node.height) / 2;
    const x = m.circular ? m.x + (m.radius + depth) * nx : node.root.x + shift;
    const y = m.circular ? m.y + (m.radius + depth) * ny : node.root.y - depth;
    const rect = {x: x - node.width / 2, y: y - node.height / 2, width: node.width, height: node.height};
    const vertical = Math.abs(ny) >= Math.abs(nx);
    const end = vertical ? {x, y: y - Math.sign(ny) * (node.height / 2 + 4)} :
      {x: x - Math.sign(nx) * (node.width / 2 + 4), y};
    return {node, rect, end, row, attachment: vertical ? (ny < 0 ? 'bottom' : 'top') : (nx < 0 ? 'right' : 'left')};
  }

  _shortlist(usable) {
    const height = usable.reduce((h, n) => Math.min(h, n.height), Infinity);
    const budget = 64 * Math.ceil(Math.max(512, 8 * this.map.height / (height + this.gap)) / 64);
    const bins = Array.from({length: 64}, () => []);
    usable.forEach((node, rank) => {
      const fraction = this.map.circular ? ((node.preferred % TAU) + TAU) % TAU / TAU : node.preferred / this.map.width;
      const score = (node.favorite ? 10000 : 0) + (this.retained.has(node.id) ? 200 : 0) + 1 - rank / Math.max(1, this.candidates.length);
      bins[clamp(Math.floor(fraction * 64), 0, 63)].push({node, rank, score});
    });
    const priority = entry => entry.score + (this.displayedFeatures?.has(entry.node.id.feature) ? 100 : 0);
    for (const bin of bins) { bin.sort((a, b) => priority(b) - priority(a) || a.rank - b.rank); }
    const selected = [], count = Math.min(usable.length, budget);
    // Water filling: sparse/off-screen sectors donate their unused slots. The
    // same selection policy applies on both sides of the total candidate budget.
    for (let row = 0; selected.length < count; row++) {
      for (const bin of bins) {
        if (bin[row]) { selected.push(bin[row]); }
        if (selected.length === count) { break; }
      }
    }
    return selected.sort((a, b) => a.rank - b.rank);
  }

  /** Advance a bounded candidate/row search between yields; returns this layout. */
  *steps() {
    if (this.done) { return this; }
    this.obstacles = this.options.obstacles || [];
    if (this.mode === 'linear') {
      let best = this.placed;
      const quality = nodes => nodes.length + nodes.filter(n => n.favorite).length;
      for (let limit = 1; limit <= MAX_CLEAN_ROWS; limit++) {
        for (const ordered of [false, true]) {
          this.placed = [];
          yield* this._localSteps(limit, ordered);
          if (quality(this.placed) > quality(best)) { best = this.placed; }
        }
      }
      this.placed = best;
    } else if (this.mode === 'compact-contour') {
      for (const side of [-1, 1]) { yield* this._sideSteps(side); }
      for (const outward of [-1, 1]) { yield* this._poleSteps(outward); }
      this.proposed = this.placed.length;
    } else {
      // The overview Oval is a small ordered packing, retained intact. This is
      // one indivisible stage; the frame budget is cooperative, not a deadline.
      this._contour(); yield;
      if (this.placed.length < this.proposed * 0.7) {
        this._bestOf([0.65, 0.4], scale => this._contour(scale)); yield;
      }
    }
    this.done = true;
    return this;
  }

  _index() {
    let cache = indexes.get(this);
    // Contour retries can roll back a prefix or swap the entire placed array.
    if (!cache || cache.placed !== this.placed || cache.length > this.placed.length) {
      cache = {placed: this.placed, length: 0, index: new CleanIndex(this)};
      indexes.set(this, cache);
    }
    while (cache.length < this.placed.length) { cache.index.add(this.placed[cache.length++]); }
    return cache.index;
  }

  _positions(node, limit, step, height, compact) {
    let cache = positionCaches.get(this);
    if (!cache) { positionCaches.set(this, cache = new Map()); }
    let rows = cache.get(node);
    if (!rows) { cache.set(node, rows = []); }
    const reach = compact ? Math.min(node.width + this.gap, this._leaderLimit(node)) : node.width + this.gap;
    const spacing = Math.max(6, compact ? node.height : height, reach / 12);
    const shifts = [0];
    for (let t = spacing; t <= reach; t += spacing) { shifts.push(-t, t); }
    const previousRow = this.retainRows ? this.retained.get(node.id) : undefined;
    for (let row = rows.length; row < limit; row++) {
      rows[row] = [];
      for (const shift of shifts) {
        const item = this._localPosition(node, row, step, shift);
        if (!this._boxFits(item.rect)) { continue; }
        const length = distance(node.root, item.end);
        if (compact && length > this._leaderLimit(node)) { continue; }
        rows[row].push({...item, cost: length + Math.abs(shift) * 0.35 - (row === previousRow ? height * 0.6 : 0)});
      }
    }
    return rows.slice(0, limit).flat().sort((a, b) => a.cost - b.cost);
  }

  *_localSteps(limit, orderedSeed) {
    const m = this.map, height = median(this.nodes.map(n => n.height));
    const step = height + Math.max(10, this.gap * 2);
    this.obstacles = this.options.obstacles || [];
    const ordered = this.nodes.slice().sort((a, b) => a.root.x - b.root.x || a.rank - b.rank);
    const capacity = Math.max(1, Math.floor((m.width - 2 * this.padding) * limit /
      (median(ordered.map(n => n.width)) + this.gap + 8)));
    const chosen = this._select(ordered, Math.min(capacity, this.maxLabels));
    const selected = new Set(chosen);
    if (orderedSeed) {
      // A small cluster can fit together on one band even when accepting its
      // first label at the ideal center would block its neighbors. Pack the
      // whole ordered group before falling back to individual local choices.
      const centers = packOrdered(chosen.map(n => ({size: n.width,
        desired: this._localPosition(n, 0, step, 0).rect.x + n.width / 2})),
      this.constrainToViewport ? this.padding : -Infinity,
      this.constrainToViewport ? m.width - this.padding : Infinity, this.gap + 8);
      if (!centers) { return; }
      for (const [i, node] of chosen.entries()) {
        let shift = 0, item;
        for (let pass = 0; pass < 3; pass++) {
          item = this._localPosition(node, 0, step, shift);
          shift += (centers[i] - item.rect.x - node.width / 2) /
            (m.circular ? Math.max(0.3, Math.abs(Math.sin(node.preferred))) : 1);
        }
        if (Math.abs(shift) <= Math.max(2 * node.width, 8 * height)) {
          this._acceptLocal(this._localPosition(node, 0, step, shift));
        }
        yield;
      }
    }
    // Start with a spatially distributed selection, then fill local holes from
    // the remaining shortlist. Favor displayed identities across camera moves.
    const queue = [...chosen.sort((a, b) => b.score - a.score),
      ...ordered.filter(n => !selected.has(n)).sort((a, b) => b.score - a.score)];
    for (const node of queue) {
      if (this.placed.length >= Math.min(capacity, this.maxLabels)) { break; }
      if (this._index().entries.has(node.id)) { continue; }
      const positions = this._positions(node, limit, step, height, false);
      for (const item of positions) {
        if (this._acceptLocal(item)) { break; }
        yield;
      }
      yield;
    }
  }

  *_sideSteps(side) {
    const m = this.map;
    const nodes = this.nodes.filter(n => Math.abs(Math.cos(n.preferred)) > Math.abs(Math.sin(n.preferred)) &&
      Math.sign(Math.cos(n.preferred)) === side).sort((a, b) => a.root.y - b.root.y || a.rank - b.rank);
    if (!nodes.length) { return; }
    const height = median(nodes.map(n => n.height)), radius = m.radius + Math.max(12, height * 2);
    const desired = n => m.y + radius * Math.sin(n.preferred);
    const low = Math.max(m.y - radius * Math.SQRT1_2, desired(nodes[0]) - height,
      this.constrainToViewport ? this.padding + height / 2 : -Infinity);
    const high = Math.min(m.y + radius * Math.SQRT1_2, desired(nodes.at(-1)) + height,
      this.constrainToViewport ? m.height - this.padding - height / 2 : Infinity);
    const capacity = Math.max(0, Math.floor((high - low) / (height + this.gap)));
    const reserved = this.placed.slice(); let best = reserved;
    for (const scale of [1, 0.8, 0.6]) {
      this.placed = reserved.slice();
      const selected = this._select(nodes, Math.min(Math.floor(capacity * scale), this.maxLabels - reserved.length));
      const centers = packOrdered(selected.map(n => ({size: n.height, desired: desired(n)})), low, high, this.gap);
      if (!centers) { continue; }
      for (const [i, node] of selected.entries()) {
        const y = centers[i], x = m.x + side * Math.sqrt(Math.max(0, radius ** 2 - (y - m.y) ** 2));
        const rect = {x: side < 0 ? x - 4 - node.width : x + 4, y: y - node.height / 2,
          width: node.width, height: node.height};
        this._acceptLocal({node, rect, end: {x, y}, row: side < 0 ? 'compact-left' : 'compact-right',
          attachment: side < 0 ? 'right' : 'left'});
        yield;
      }
      if (this._quality(this.placed) > this._quality(best)) { best = this.placed; }
    }
    this.placed = best;
  }

  *_poleSteps(outward) {
    const nodes = this.nodes.filter(n => Math.abs(Math.sin(n.preferred)) >= Math.abs(Math.cos(n.preferred)) &&
      Math.sign(Math.sin(n.preferred)) === outward).sort((a, b) => a.root.x - b.root.x || a.rank - b.rank);
    if (!nodes.length) { return; }
    const height = median(nodes.map(n => n.height)), width = median(nodes.map(n => n.width));
    const step = height + Math.max(10, this.gap * 2), span = nodes.at(-1).root.x - nodes[0].root.x;
    const reserved = this.placed.slice(); let best = reserved;
    const maxRows = MAX_CLEAN_ROWS;
    for (let limit = 1; limit <= maxRows; limit++) {
      this.placed = reserved.slice();
      const capacity = Math.max(1, Math.floor((Math.min(this.map.width, span) + width) * limit / (width + this.gap + 8)));
      const chosen = this._select(nodes, Math.min(capacity, this.maxLabels - reserved.length)), selected = new Set(chosen);
      const queue = [...chosen.sort((a, b) => b.score - a.score),
        ...nodes.filter(n => !selected.has(n)).sort((a, b) => b.score - a.score)];
      for (const node of queue) {
        if (this.placed.length >= Math.min(this.maxLabels, reserved.length + capacity)) { break; }
        const positions = this._positions(node, limit, step, height, true);
        for (const item of positions) { if (this._acceptLocal(item)) { break; } yield; }
        yield;
      }
      if (this._quality(this.placed) > this._quality(best)) { best = this.placed; }
    }
    this.placed = best;
  }

  _acceptLocal(item) {
    const {node, rect, end, attachment} = item;
    const index = this._index();
    if (index.boxesOverlap(rect) || index.linesHit(rect)) { return false; }
    const vertical = attachment === 'top' || attachment === 'bottom';
    const ends = [end];
    if (vertical) {
      const x = clamp(node.root.x, rect.x + rect.width * 0.2, rect.x + rect.width * 0.8);
      if (Math.abs(x - end.x) > 1) { ends.push({...end, x}); }
    }
    for (const endpoint of ends) {
      for (const anchor of new Set(this._anchors(node, endpoint))) {
        const root = this.point(anchor);
        if (index.hitsBoxes([root, endpoint])) { continue; }
        if (this._accept({...item, end: endpoint, anchor})) { return true; }
      }
    }
    return false;
  }

  _accept(item, alternativeSide = false) {
    if (this.mode === 'compact-contour' && distance(this.point(item.anchor ?? item.node.preferred), item.end) > this._leaderLimit(item.node)) {
      return false;
    }
    if (this.placed.length >= this.maxLabels || !this._boxFits(item.rect)) { return false; }
    const {node, rect, row} = item, index = this._index();
    if (index.boxesOverlap(rect)) { return false; }
    const ends = [item.end];
    if (alternativeSide) { ends.push({x: item.end.x < rect.x ? rect.x + rect.width + 4 : rect.x - 4, y: item.end.y}); }
    for (const end of ends) {
      if (this.constrainToViewport && (end.x < this.padding || end.x > this.map.width - this.padding)) { continue; }
      for (const a of item.anchor === undefined ? this._anchors(node, end) : [item.anchor]) {
        this.attempts++;
        const root = this.point(a);
        if (root.x < -1e-6 || root.y < -1e-6 || root.x > this.map.width + 1e-6 || root.y > this.map.height + 1e-6) { continue; }
        if (this.map.circular && (root.x - this.map.x) * (end.x - root.x) + (root.y - this.map.y) * (end.y - root.y) < -1e-6) { continue; }
        if (index.linesConflict([root, end])) { continue; }
        const placement = {a, rect, points: [root, end], row};
        if (item.attachment) { placement.attachment = item.attachment; }
        this.placed.push({...node, placement});
        return true;
      }
    }
    return false;
  }
}
