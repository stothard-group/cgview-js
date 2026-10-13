/* Production label comparison harness. Method choices come from the CGView registry. */
(() => {
  const $ = id => document.getElementById(id);
  const sides = ['left', 'right'], containers = ['new-map', 'old-map'];
  const viewers = [];
  const labelControls = [
    {key: 'labelDensity', type: 'range', label: 'Label density', defaultValue: 0, min: 0, max: 1, step: 0.01,
      minLabel: 'Clean', maxLabel: 'Maximum'},
    {key: 'keepLabelsInView', type: 'checkbox', label: 'Keep in view', defaultValue: true},
    {key: 'labelSpacing', type: 'number', label: 'Spacing, px', defaultValue: 3, min: 0, step: 0.5,
      description: 'Minimum spacing between labels and padding from the viewport edges.'}
  ];
  const panelSettings = sides.map(() => Object.fromEntries(labelControls.map(control => [control.key, control.defaultValue])));
  let source, request = 0, viewSerial = 0, syncing = false, syncTimer, lastMoved;
  const audits = new WeakMap();
  let auditActivity = 0, pointerActive = false;
  const noteActivity = () => { auditActivity = performance.now(); };
  window.addEventListener('pointerdown', () => { pointerActive = true; noteActivity(); }, {passive: true});
  for (const event of ['pointerup', 'pointercancel', 'blur']) {
    window.addEventListener(event, () => { pointerActive = false; noteActivity(); }, {passive: true});
  }
  window.addEventListener('wheel', noteActivity, {passive: true});
  const names = ['dnaA', 'DNA helicase', 'response regulator', 'ATP synthase subunit B', 'rpoB',
    'hypothetical protein', 'ABC transporter permease', 'gyrA', 'DNA repair protein RecN', 'tRNA-Lys'];

  function synthetic(kind) {
    if (kind === 'fan' || kind === 'fan-groups' || kind === 'fan-dense') {
      const centers = kind === 'fan' ? [50000] : kind === 'fan-groups' ? [20000, 50000, 80000] : [];
      const positions = centers.length ? centers.flatMap(center => [-2, -1, 0, 1, 2].map(i => center + i * 700)) :
        Array.from({length: 120}, (_, i) => 10000 + i * 660);
      const shortNames = ['dnaA', 'rpoB', 'gyrA', 'recN', 'tRNA-Lys'];
      return {cgview: {version: '1.9.0', sequence: {length: 100000}, legend: {visible: false},
        features: positions.map((start, i) => ({name: shortNames[i % shortNames.length], start, stop: start + 250,
          strand: 1, source: 'trial', legend: 'Genes'})),
        tracks: [{name: 'Genes', dataType: 'feature', dataMethod: 'source', dataKeys: ['trial'], position: 'outside'}]}};
    }
    const count = kind === 'plasmid' ? 48 : ['large', 'mixed'].includes(kind) ? 1000 : kind === 'clustered' ? 160 : 240;
    const length = 100000;
    const features = Array.from({length: count}, (_, i) => {
      const bp = kind === 'plasmid' ? (i < 35 ? 1 + i / 35 * 42000 : 65000 + (i - 35) / 13 * 34000) :
        kind === 'mixed' ? (i < 24 ? 40000 + i / 24 * 58000 : 1000 + (i - 24) / 976 * 28000) :
          kind === 'clustered' ? 80000 + (i / count) * 18500 : 1 + (i / count) * (length - 300);
      return {name: `${names[i % names.length]}${i % 7 === 0 ? ` ${i + 1}` : ''}`,
        start: Math.round(bp), stop: Math.round(bp + 80 + (i % 5) * 23), strand: i % 3 ? 1 : -1,
        source: 'trial', legend: `Group ${i % 4 + 1}`, favorite: i % 23 === 0};
    });
    return {cgview: {version: '1.9.0', sequence: {length}, features, annotation: {font: 'sans-serif, plain, 12'},
      legend: {visible: false, items: ['#36755a', '#5187a6', '#b47d36', '#8e72a5'].map((swatchColor, i) =>
        ({name: `Group ${i + 1}`, swatchColor, decoration: 'arrow'}))},
      tracks: [{name: 'Genes', dataType: 'feature', dataMethod: 'source', dataKeys: ['trial'], separateFeaturesBy: 'strand', position: 'outside'}]}};
  }


  const dimensions = id => ({width: Math.floor($(id).clientWidth), height: Math.floor($(id).clientHeight)});
  const draw = viewer => viewer.drawFull();
  const showError = error => { $('message').textContent = error.message; $('message').hidden = false; };
  function sizedFont(value) {
    const font = new CGView.Font(value || 'sans-serif,plain,12');
    font.size = Number($('font-size').value);
    return font.string;
  }
  function setFormat(format) {
    $('format').value = format;
    $('format').setAttribute('aria-pressed', String(format === 'linear'));
    $('format').title = `Switch to ${format === 'linear' ? 'circular' : 'linear'} map`;
    $('format').setAttribute('aria-label', $('format').title);
  }
  function updateRendererControls(i) {
    const side = sides[i];
    const container = $(`renderer-options-${side}`);
    container.hidden = false;
    container.replaceChildren(...labelControls.map(control => {
      const range = control.type === 'range', numeric = range || control.type === 'number';
      const label = document.createElement('label');
      label.className = range ? 'renderer-range' : numeric ? 'renderer-number' : 'check'; label.title = control.description || '';
      const input = document.createElement('input'); input.type = control.type;
      input.id = `renderer-${side}-${control.key}`;
      const output = document.createElement('output'); output.htmlFor = input.id;
      const updateOutput = () => {
        const percent = Math.round((input.valueAsNumber - control.min) / (control.max - control.min) * 100);
        output.value = `${percent}%`;
        input.setAttribute('aria-valuetext', `${percent}%${percent === 0 && control.minLabel ? `, ${control.minLabel}` :
          percent === 100 && control.maxLabel ? `, ${control.maxLabel}` : ''}`);
      };
      if (numeric) {
        input.min = control.min; if (control.max !== undefined) { input.max = control.max; }
        input.step = control.step; input.value = panelSettings[i][control.key];
        input.required = true;
      }
      input.setAttribute('aria-label', `${side === 'left' ? 'Left' : 'Right'} ${control.label.toLowerCase()}`);
      if (range) {
        const title = document.createElement('span'); title.className = 'range-title'; title.append(control.label, output);
        const track = document.createElement('span'); track.className = 'range-track';
        const min = document.createElement('span'), max = document.createElement('span');
        min.textContent = control.minLabel || control.min; max.textContent = control.maxLabel || control.max;
        track.append(min, input, max); label.append(title, track); updateOutput();
      } else if (numeric) { label.append(document.createTextNode(control.label), input); }
      else { input.checked = panelSettings[i][control.key]; label.append(input, document.createTextNode(control.label)); }
      input.addEventListener(range ? 'input' : 'change', () => {
        if (!input.validity.valid || (numeric && !Number.isFinite(input.valueAsNumber))) { return; }
        if (range) { updateOutput(); }
        const attributes = {[control.key]: numeric ? input.valueAsNumber : input.checked};
        Object.assign(panelSettings[i], attributes);
        viewers[i].annotation.update(attributes);
        draw(viewers[i]); updateMetrics();
      });
      return label;
    }));
  }
  function refreshRenderers() {
    const renderers = CGView.externalLabelRenderers();
    for (const side of sides) {
      const select = $(`renderer-${side}`), previous = select.value;
      select.replaceChildren(...renderers.map(({id, label, description}) => {
        const option = new Option(label, id); option.title = description; return option;
      }));
      if ([...select.options].some(n => n.value === previous)) { select.value = previous; }
    }
    sides.forEach((side, i) => updateRendererControls(i));
  }
  function syncView(viewer, full = false) {
    if (syncing || !window.labelTesting.viewReady || !$('sync-views').checked) { return; }
    const other = viewers[viewer === viewers[0] ? 1 : 0];
    clearTimeout(syncTimer);
    syncing = true;
    try {
      if (other.zoomFactor !== viewer.zoomFactor) { other.zoomFactor = viewer.zoomFactor; }
      other.scale.x.domain(viewer.scale.x.domain());
      other.scale.y.domain(viewer.scale.y.domain());
      full ? draw(other) : other.drawFast();
    } finally { syncing = false; }
    if (!full) { syncTimer = setTimeout(() => syncView(viewer, true), 180); }
  }
  function configured(original, i) {
    const json = viewers[0].io.updateJSON(original.cgview ? structuredClone(original) : {cgview: structuredClone(original)});
    const data = json.cgview;
    for (const caption of data.captions || []) { caption.visible = false; }
    data.settings = {...data.settings, format: $('format').value};
    data.annotation = {...data.annotation, font: sizedFont(data.annotation?.font), visible: true,
      labelPosition: $('position').value, labelMethod: $(`renderer-${sides[i]}`).value, ...panelSettings[i],
      labelLineThickness: Number($('line-width').value)};
    return json;
  }
  async function applyView() {
    const serial = ++viewSerial;
    window.labelTesting.viewReady = false;
    clearTimeout(syncTimer);
    const preset = $('view').value;
    const zoom = preset === 'overview' ? 1 : Math.max(0.5, Number($('zoom-factor').value) || 1.75);
    const fractions = {top: 0, right: 0.25, bottom: 0.5, left: 0.75};
    await Promise.all(viewers.map(viewer => new Promise(resolve => {
      const bp = ['overview', 'centered'].includes(preset) ? 0 : Math.max(1, viewer.sequence.length * fractions[preset]);
      // Loading tracks may queue a recenter before their backbone is ready.
      // Cancel queued camera moves before applying this explicit test view.
      viewer.stopAnimate();
      viewer.zoomTo(bp, zoom, {duration: 0, callback: () => { draw(viewer); resolve(); }});
    })));
    if (serial === viewSerial) {
      window.labelTesting.viewReady = true;
      window.labelTesting.currentView = {preset, zoom};
      updateMetrics();
    }
  }
  async function loadBoth() {
    if (!source) { return; }
    window.labelTesting.viewReady = false;
    clearTimeout(syncTimer);
    viewers.forEach((viewer, i) => {
      viewer.io.loadJSON(configured(source, i));
      updateRendererControls(i);
      viewer.layout._adjustProportions({duration: 0});
      viewer.layout.updateLayout(true);
    });
    await applyView();
  }
  async function chooseMap() {
    const serial = ++request, key = $('map-select').value;
    $('message').hidden = true;
    try {
      const json = key.endsWith('.json') ? await fetch(`maps/${key}`).then(response => {
        if (!response.ok) { throw new Error(`Could not load map (${response.status}).`); }
        return response.json();
      }) : synthetic(key);
      if (serial !== request) { return; }
      source = json;
      window.labelTesting.loadedMap = key;
      await loadBoth();
    } catch (error) { showError(error); }
  }
  function selectRenderer(i, id) {
    const annotation = viewers[i].annotation;
    annotation.update({labelMethod: id});
    $(`renderer-${sides[i]}`).value = id;
    updateRendererControls(i);
    draw(viewers[i]);
    updateMetrics();
  }
  function crossings(a, b, c, d) {
    const cross = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
    // Count proper crossings; touching feature roots are not a crossing.
    return cross(a, b, c) * cross(a, b, d) < -1e-8 && cross(c, d, a) * cross(c, d, b) < -1e-8;
  }
  function audit(placements) {
    // Independent display audit for settled geometry, across all renderers.
    const hits = (a, b, r) => {
      let low = 0, high = 1;
      for (const [axis, size] of [['x', 'width'], ['y', 'height']]) {
        const delta = b[axis] - a[axis];
        if (Math.abs(delta) < 1e-12) {
          if (a[axis] < r[axis] || a[axis] > r[axis] + r[size]) { return false; }
        } else {
          const p = (r[axis] - a[axis]) / delta, q = (r[axis] + r[size] - a[axis]) / delta;
          low = Math.max(low, Math.min(p, q)); high = Math.min(high, Math.max(p, q));
          if (low > high) { return false; }
        }
      }
      return true;
    };
    const obscured = (path, rect) => path.slice(1).some((end, i) => hits(path[i], end, rect));
    let overlaps = 0, lines = 0, leaderText = 0;
    for (let i = 0; i < placements.length; i++) {
      const a = placements[i];
      for (let j = i + 1; j < placements.length; j++) {
        const b = placements[j], r = a.rect, s = b.rect;
        if (r.x < s.x + s.width && r.x + r.width > s.x && r.y < s.y + s.height && r.y + r.height > s.y) { overlaps++; }
        if (obscured(a.points, s)) { leaderText++; }
        if (obscured(b.points, r)) { leaderText++; }
        for (let p = 1; p < a.points.length; p++) {
          for (let q = 1; q < b.points.length; q++) {
            if (crossings(a.points[p - 1], a.points[p], b.points[q - 1], b.points[q])) { lines++; }
          }
        }
      }
    }
    return `${overlaps} text overlaps · ${lines} leader crossings · ${leaderText} leaders through text`;
  }
  function updateMetrics() {
    const now = performance.now();
    viewers.forEach((viewer, i) => {
      const side = sides[i], annotation = viewer.annotation, stats = annotation.externalLabelStats;
      const placements = annotation.externalLabelPlacements;
      $(`${side}-count`).textContent = annotation.labelPosition === 'inline' ? 0 : placements.filter(({rect: r}) =>
        r.x < viewer.width && r.y < viewer.height && r.x + r.width > 0 && r.y + r.height > 0).length;
      $(`${side}-total`).textContent = annotation.labelStats.drawn;
      $(`${side}-available`).textContent = annotation.labelStats.total;
      $(`${side}-candidates`).textContent = annotation.labelPosition === 'inline' ? 0 : stats.candidates;
      $(`${side}-time`).textContent = annotation.labelPosition === 'inline' ? '0.0' : stats.drawMs.toFixed(1);
      const detail = annotation._externalLabels.renderer.stats, capacity = detail?.capacity;
      let state = audits.get(viewer);
      if (!state || state.placements !== placements) {
        state = {placements, changed: now, checked: false};
        audits.set(viewer, state);
      }
      const auditElement = $(`audit-${side}`);
      if (annotation.labelPosition === 'inline') {
        auditElement.textContent = 'Inline labels only.';
        auditElement.dataset.state = 'internal';
      } else if (!state.checked) {
        // The pairwise diagnostic is deliberately outside the interaction and
        // animation path. Wait for stable published geometry and a quiet camera.
        if (!pointerActive && !detail?.moving && !detail?.planning?.pending && now - Math.max(state.changed, auditActivity) >= 300) {
          auditElement.textContent = audit(placements);
          state.checked = true;
          auditElement.dataset.state = 'ready';
        } else {
          auditElement.textContent = 'Checking after movement settles…';
          auditElement.dataset.state = 'pending';
        }
      }
      const diagnostics = $(`diagnostics-${side}`);
      diagnostics.hidden = !(Number.isFinite(capacity?.demand) || detail?.density) || !annotation.visible || annotation.labelPosition === 'inline';
      if (!diagnostics.hidden) {
        const name = CGView.externalLabelRenderers().find(method => method.id === annotation.labelMethod)?.label;
        diagnostics.textContent = `${name} ${detail.mode || ''} · ${detail.phase}${detail.moving ? ` (${detail.moving} moving)` : ''}` +
          (capacity ? ` · ${capacity.demand} eligible · ~${capacity.singleRowCapacity} in one row/contour` +
          ` · ~${capacity.totalCapacity} across up to ${capacity.maxRows} rows` +
          (capacity.peakRegion ? ` · Busiest: ${capacity.peakRegion}, ${capacity.peakDemand} labels / ~${capacity.peakCapacity} single-row spaces` : '') :
            ` · ${stats.candidates} eligible`);
        if (detail.density) {
          const d = detail.density;
          diagnostics.textContent += ` · Density ${Math.round(d.value * 100)}%: ${d.selected} targets (Clean ${d.clean}, Maximum ${d.maximum ?? 'not calculated'})` +
            ` · ${d.straight} perpendicular/radial` + (d.levels !== undefined ? ` · ${d.levels} occupied levels` : '') +
            (d.value === 1 && d.retainedOval ? ` · ${d.retainedOval} Oval-style placements` : '');
        }
        if (detail.pressure) {
          const p = detail.pressure;
          diagnostics.textContent += ` · Pressure ${p.ratio.toFixed(1)}×: ${p.crowded ? 'crowded, straight by 95%' : 'Oval allowed'}` +
            ` · ${p.retainedClean} Clean identities retained`;
        }
        if (detail.planning) {
          const p = detail.planning;
          diagnostics.textContent += p.pending ? ' · Updating layout in frame slices' :
            ` · Layout ${(p.cpuMs || 0).toFixed(1)} ms across ${p.slices || 0} slices (longest ${(p.maxSliceMs || 0).toFixed(1)} ms)`;
        }
        if (detail.edge?.suppressed) {
          diagnostics.textContent += ` · ${detail.edge.suppressed} labels temporarily hidden at edges`;
        }
        diagnostics.title = 'Geometric estimates for this viewport, based on measured text sizes and visible obstacles. ' +
          'They do not guarantee collision-free leaders or maximum label count. Capacity estimates describe visible space even when Keep in view is off.';
      }
    });
  }

  refreshRenderers();
  $('renderer-left').value = 'adaptive';
  $('renderer-right').value = 'classic';
  const query = new URLSearchParams(window.location.search);
  setFormat(query.get('format') === 'circular' ? 'circular' : 'linear');
  for (const [parameter, id] of [['map', 'map-select'], ['view', 'view'], ['left', 'renderer-left'], ['right', 'renderer-right']]) {
    const value = query.get(parameter);
    if ([...$(id).options].some(option => option.value === value)) { $(id).value = value; }
  }
  sides.forEach((side, i) => updateRendererControls(i));
  const zoom = Number(query.get('zoom'));
  if (zoom >= 0.5 && zoom <= 1000) { $('zoom-factor').value = zoom; }
  for (const id of containers) { viewers.push(new CGView.Viewer(`#${id}`, dimensions(id))); }
  window.labelTesting = {viewers, viewer: viewers[0], comparison: viewers[1], synthetic,
    reload: loadBoth, applyView, selectRenderer, refreshRenderers, viewReady: false};
  for (const viewer of viewers) {
    viewer.on('zoom.label-testing', () => {
      noteActivity();
      if (syncing || !window.labelTesting.viewReady) { return; }
      lastMoved = viewer;
      syncView(viewer);
    });
    viewer.on('zoom-end.label-testing', () => { noteActivity(); syncView(viewer, true); });
  }
  $('controls').addEventListener('submit', event => event.preventDefault());
  $('map-select').addEventListener('change', chooseMap);
  sides.forEach((side, i) => {
    $(`renderer-${side}`).addEventListener('change', event => selectRenderer(i, event.target.value));
  });
  for (const id of ['font-size', 'line-width']) {
    $(id).addEventListener('input', event => {
      if (!event.target.validity.valid) { return; }
      viewers.forEach(viewer => {
        viewer.annotation.update(id === 'font-size' ? {font: sizedFont(viewer.annotation.font.string)} : {labelLineThickness: event.target.valueAsNumber});
        draw(viewer);
      });
      updateMetrics();
    });
  }
  $('position').addEventListener('change', () => {
    viewers.forEach(viewer => { viewer.annotation.update({labelPosition: $('position').value}); draw(viewer); }); updateMetrics();
  });
  $('sync-views').addEventListener('change', () => {
    clearTimeout(syncTimer); if ($('sync-views').checked) { syncView(lastMoved || viewers[0], true); }
  });
  $('format').addEventListener('click', () => {
    setFormat($('format').value === 'linear' ? 'circular' : 'linear'); loadBoth().catch(showError);
  });
  for (const id of ['view', 'zoom-factor']) { $(id).addEventListener('change', () => applyView().catch(showError)); }
  for (const side of ['top', 'bottom']) {
    $(`${side}-space`).addEventListener('click', () => {
      setFormat('circular'); $('view').value = side; $('zoom-factor').value = 1.75; loadBoth().catch(showError);
    });
  }
  $('replay').addEventListener('click', () => { viewers.forEach(draw); updateMetrics(); });
  $('reset').addEventListener('click', () => { $('view').value = 'overview'; applyView().catch(showError); });
  for (const format of ['svg', 'png']) {
    $(`export-${format}`).addEventListener('click', () => {
      const viewer = viewers[Number($('export-panel').value)];
      const filename = `cgview-labels-${viewer.annotation.labelMethod}.${format}`;
      format === 'svg' ? viewer.io.downloadSVG(filename) : viewer.io.downloadImage(undefined, undefined, filename);
    });
  }
  $('open-json').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) { return; }
    try {
      const json = JSON.parse(await file.text());
      source = json; request++;
      window.labelTesting.loadedMap = file.name;
      $('message').textContent = `Opened ${file.name}`; $('message').hidden = false;
      await loadBoth();
    } catch (error) { showError(error); }
    event.target.value = '';
  });
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => containers.forEach((id, i) => {
      const {width, height} = dimensions(id);
      if (viewers[i].width !== width || viewers[i].height !== height) { viewers[i].resize(width, height); }
    }), 150);
  });
  setInterval(updateMetrics, 100);
  chooseMap();
})();
