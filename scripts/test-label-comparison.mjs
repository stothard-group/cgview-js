/** Browser regression checks for the production label comparison page. Build first. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docs = path.join(root, 'docs'), output = path.join(root, '.agents/artifacts/adaptive-labels');
await mkdir(output, {recursive: true});
const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = path.resolve(docs, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
  if (!file.startsWith(docs + path.sep)) { response.writeHead(403).end(); return; }
  try {
    response.setHeader('Content-Type', {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
      '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.md': 'text/plain'}[path.extname(file)] || 'application/octet-stream');
    response.end(await readFile(file));
  } catch { response.writeHead(404).end(); }
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const base = `http://127.0.0.1:${server.address().port}`;
const results = [], errors = [];
const record = (check, details = {}) => { results.push({check, ...details}); console.log(`PASS ${check}`); };
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
let browser;
try {
  browser = await chromium.launch({headless: true});
  const page = await browser.newPage({viewport: {width: 1800, height: 1100}});
  await page.route('https://stats.stothardresearch.ca/**', route => route.fulfill({body: ''}));
  page.on('pageerror', error => { errors.push(error.message); });
  page.on('response', response => {
    if (response.url().startsWith(base) && response.status() >= 400) { errors.push(`${response.status()} ${response.url()}`); }
  });
  const ready = () => page.waitForFunction(() => window.labelTesting?.viewReady && labelTesting.viewers.every(v =>
    !v.layout.fullDrawInProgress && v.tracks().every(t => t.dataMethod !== 'sequence' || !v.sequence.hasSeq || t.loadProgress === 100) &&
    (v.annotation.labelPosition === 'inline' || v.annotation._externalLabels.renderer.stats.phase === 'ready')),
  null, {timeout: 60000});
  const open = async (query = '') => { await page.goto(`${base}/test/external-labels.html${query}`); await ready(); };
  const choose = async value => {
    await page.selectOption('#map-select', value);
    await page.waitForFunction(key => labelTesting.loadedMap === key, value);
    await ready();
  };
  const setControl = async (id, value, event = 'input') => {
    await page.locator(`#${id}`).evaluate((input, data) => {
      input.value = data.value; input.dispatchEvent(new Event(data.event, {bubbles: true}));
    }, {value: String(value), event});
    await ready();
  };
  const annotations = () => page.evaluate(() => labelTesting.viewers.map(v => v.annotation.toJSON()));
  const geometry = () => page.evaluate(() => labelTesting.viewers.map(v => v.annotation.externalLabelPlacements.map(p => ({
    name: p.label.name, bp: p.bp, rect: [p.rect.x, p.rect.y, p.rect.width, p.rect.height], points: p.points
  })))).then(values => JSON.parse(JSON.stringify(values, (key, value) => typeof value === 'number' ? +value.toFixed(5) : value)));
  const assertMatching = async () => {
    const [left, right] = await geometry();
    assert.ok(left.length > 0); assert.equal(hash(left), hash(right));
    return left.length;
  };

  await page.goto(`${base}/test/`);
  await page.waitForFunction(() => window.cgv?.features().length > 0);
  await page.check('#option-show-labels');
  assert.equal(await page.locator('.section-labels #compare-label-methods').isVisible(), true);
  await page.click('#compare-label-methods');
  await ready();
  record('normal test page labels section opens comparison');

  const choices = await page.evaluate(() => CGView.externalLabelRenderers().map(r => r.id));
  assert.deepEqual(choices, ['adaptive', 'classic']);
  assert.deepEqual((await annotations()).map(a => a.labelMethod), choices);
  for (const side of ['left', 'right']) {
    assert.deepEqual(await page.locator(`#renderer-${side} option`).evaluateAll(options => options.map(o => o.value)), choices);
    assert.equal(await page.inputValue(`#renderer-${side}-labelDensity`), '0');
    assert.equal(await page.inputValue(`#renderer-${side}-labelSpacing`), '3');
    assert.equal(await page.isChecked(`#renderer-${side}-keepLabelsInView`), true);
  }
  assert.equal(await page.locator('[id^="priority-"], [id$="-animate"]').count(), 0);
  assert.equal(await page.locator('.experiment-record').count(), 2);
  record('only current methods and shared flat controls');

  const fixtureNames = await page.locator('#map-select option').evaluateAll(options => options.map(o => o.value).filter(v => v.endsWith('.json')));
  for (const fixture of fixtureNames) {
    const response = await page.request.get(`${base}/test/maps/${fixture}`);
    assert.equal(response.status(), 200, fixture);
    const json = await response.json(); assert.ok(json.cgview?.sequence, fixture);
  }
  const notes = await page.request.get(`${base}/test/external-labels.md`);
  assert.equal(notes.status(), 200);
  record('all map fixtures and notes available', {fixtures: fixtureNames.length});

  await page.emulateMedia({reducedMotion: 'reduce'});
  for (const format of ['circular', 'linear']) {
    await open(`?map=large&format=${format}&left=adaptive&right=adaptive`);
    const clean = await assertMatching();
    await setControl('font-size', 6);
    for (const side of ['left', 'right']) { await setControl(`renderer-${side}-labelDensity`, 1); }
    await page.evaluate(() => labelTesting.reload()); await ready();
    const maximum = await assertMatching();
    assert.ok(maximum >= clean);
    record(`matching Adaptive panels in ${format}`, {clean, maximum});
  }
  await page.emulateMedia({reducedMotion: 'no-preference'});

  await open('?map=large&format=circular');
  await setControl('font-size', 6);
  const cleanCounts = await page.evaluate(() => labelTesting.viewers.map(v => v.annotation.labelStats.drawn));
  for (const side of ['left', 'right']) { await setControl(`renderer-${side}-labelDensity`, 1); }
  const denseCounts = await page.evaluate(() => labelTesting.viewers.map(v => v.annotation.labelStats.drawn));
  assert.ok(denseCounts.every((count, i) => count > cleanCounts[i]));
  const bounded = await geometry();
  for (const side of ['left', 'right']) { await page.uncheck(`#renderer-${side}-keepLabelsInView`); await ready(); }
  const unbounded = await geometry();
  assert.ok(unbounded.every((placements, i) => hash(placements) !== hash(bounded[i])));
  assert.ok(await page.evaluate(() => labelTesting.viewers.every(v => v.annotation.externalLabelPlacements.some(({rect: r}) =>
    r.x < 0 || r.y < 0 || r.x + r.width > v.width || r.y + r.height > v.height))));
  await setControl('renderer-left-labelDensity', 0.37);
  await setControl('renderer-left-labelSpacing', 7, 'change');
  await page.selectOption('#renderer-left', 'classic'); await ready();
  let settings = await annotations();
  assert.equal(settings[0].labelMethod, 'classic');
  assert.equal(settings[0].labelDensity, 0.37);
  assert.equal(settings[0].labelSpacing, 7);
  assert.equal(settings[0].keepLabelsInView, false);
  assert.equal(settings[1].labelDensity, 1);
  assert.equal(settings[1].labelSpacing, 3);
  await page.selectOption('#renderer-left', 'adaptive'); await ready();
  assert.equal(await page.inputValue('#renderer-left-labelDensity'), '0.37');
  await choose('labels_s_cerevisiae_mitochondrion.json');
  await page.click('#format'); await ready();
  settings = await annotations();
  assert.equal(settings[0].labelDensity, 0.37);
  assert.equal(settings[0].labelSpacing, 7);
  assert.equal(settings[0].keepLabelsInView, false);
  for (const a of settings) {
    for (const key of ['externalLabelRenderer', 'externalLabelRendererOptions', 'priorityMax', 'animate', 'maxLabels']) {
      assert.equal(Object.hasOwn(a, key), false, key);
    }
  }
  record('density and viewport behavior, independent settings persist across methods/maps/formats', {cleanCounts, denseCounts});

  await open('?map=mixed&format=circular');
  await page.click('#bottom-space'); await ready();
  assert.deepEqual(await page.evaluate(() => labelTesting.currentView), {preset: 'bottom', zoom: 1.75});
  const view = () => page.evaluate(() => labelTesting.viewers.map(v => ({zoom: v.zoomFactor, x: v.scale.x.domain(), y: v.scale.y.domain()})));
  let views = await view(); assert.deepEqual(views[0], views[1]);
  const box = await page.locator('#new-map').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -240);
  await page.waitForFunction(zoom => labelTesting.viewer.zoomFactor !== zoom, views[0].zoom);
  await ready();
  views = await view(); assert.deepEqual(views[0], views[1]);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2 + 45, {steps: 8});
  await page.mouse.up(); await ready();
  views = await view(); assert.deepEqual(views[0], views[1]);
  await page.uncheck('#sync-views');
  const before = await view();
  await page.evaluate(() => new Promise(resolve => labelTesting.viewer.zoomTo(25000, 2.5,
    {duration: 0, callback: () => resolve()}))); await ready();
  views = await view(); assert.deepEqual(views[1], before[1]); assert.notDeepEqual(views[0], views[1]);
  await page.check('#sync-views'); await ready();
  views = await view(); assert.deepEqual(views[0], views[1]);
  await page.click('#reset'); await ready();
  assert.equal(await page.evaluate(() => labelTesting.viewer.zoomFactor), 1);
  record('view presets, real wheel/drag navigation, sync toggle, and reset');

  const imported = {cgview: {version: '1.8.0', sequence: {length: 10000}, legend: {visible: false},
    annotation: {labelPlacement: 'angled'}, features: [
      {name: 'alpha', start: 1, stop: 4000, source: 'import', legend: 'Genes'},
      {name: 'beta', start: 5000, stop: 9000, source: 'import', legend: 'Genes'}
    ], tracks: [{dataType: 'feature', dataMethod: 'source', dataKeys: ['import']}]}};
  await page.setInputFiles('#open-json', {name: 'imported-labels.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(imported))});
  await page.waitForFunction(() => labelTesting.loadedMap === 'imported-labels.json'); await ready();
  assert.deepEqual(await page.evaluate(() => labelTesting.viewers.map(v => v.features().map(f => f.name))), [['alpha', 'beta'], ['alpha', 'beta']]);
  assert.deepEqual((await annotations()).map(a => a.labelMethod), ['adaptive', 'classic']);
  await page.selectOption('#position', 'inline'); await ready();
  await page.waitForFunction(() => ['left', 'right'].every(side => Number(document.getElementById(`${side}-total`).textContent) > 0));
  for (const side of ['left', 'right']) {
    assert.equal(await page.textContent(`#${side}-count`), '0');
    assert.equal(await page.textContent(`#${side}-available`), '2');
    assert.equal(await page.textContent(`#${side}-candidates`), '0');
  }
  await page.selectOption('#position', 'auto'); await ready();
  await page.selectOption('#position', 'outside'); await ready();
  await setControl('line-width', 1.75);
  assert.ok((await annotations()).every(a => a.labelLineThickness === 1.75));
  record('legacy JSON import, inline/auto/outside modes, live counts, and line thickness');

  const beforeExport = await geometry();
  for (const [panel, format] of [['0', 'svg'], ['1', 'png']]) {
    await page.selectOption('#export-panel', panel);
    const pending = page.waitForEvent('download');
    await page.click(`#export-${format}`);
    const download = await pending;
    assert.equal(await download.failure(), null);
    assert.equal(download.suggestedFilename(), `cgview-labels-${panel === '0' ? 'adaptive' : 'classic'}.${format}`);
    const file = path.join(output, download.suggestedFilename()); await download.saveAs(file);
    const content = await readFile(file); assert.ok(content.length > 256);
    if (format === 'svg') { assert.match(content.toString(), /<svg/); assert.match(content.toString(), /alpha/); }
    else { assert.equal(content.subarray(1, 4).toString(), 'PNG'); }
  }
  assert.equal(hash(await geometry()), hash(beforeExport));
  record('SVG/PNG exports from either panel preserve live placements');

  await choose('large_lentzea_no_plots.json');
  assert.ok(await page.evaluate(() => labelTesting.viewers.every(v => v.annotation.labelStats.total > 9000)));
  await page.waitForFunction(() => ['left', 'right'].every(side => document.getElementById(`audit-${side}`).dataset.state === 'ready'));
  await page.screenshot({path: path.join(output, 'comparison-desktop.png'), fullPage: true});
  await page.setViewportSize({width: 700, height: 950});
  await page.waitForFunction(() => labelTesting.viewers.every((v, i) => v.width === Math.floor(document.getElementById(i ? 'old-map' : 'new-map').clientWidth)));
  await ready();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({path: path.join(output, 'comparison-stacked.png'), fullPage: true});
  record('large genome, settled audits, and responsive canvas resize');

  assert.deepEqual(errors, []);
  await writeFile(path.join(output, 'verification.json'), JSON.stringify({results, errors}, null, 2) + '\n');
  console.log(`${results.length} comparison checks passed; no browser errors.`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
