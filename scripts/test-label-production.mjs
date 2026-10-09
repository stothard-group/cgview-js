/** Browser regression checks. Build first; --reference adds trials 13/14 and labels-6-density comparisons. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const referenceFlag = process.argv.indexOf('--reference');
const reference = referenceFlag >= 0 ? path.resolve(process.argv[referenceFlag + 1]) : undefined;
const output = path.join(root, '.agents/artifacts/labels-production');
await mkdir(output, {recursive: true});
const files = new Map([
  ['/production.js', path.join(root, 'docs/dist/cgview.standalone.min.js')],
  ['/map.json', path.join(root, 'docs/test/maps/large_lentzea_no_plots.json')],
  ...(reference ? [['/reference.js', path.join(reference, 'docs/dist/cgview.standalone.min.js')]] : [])
]);
const html = `<!doctype html><meta charset="utf-8"><title>Label production comparison</title>
<style>body{font:14px system-ui;margin:10px;color:#284439}main{display:flex;gap:12px}h2{font-size:16px}p{margin:8px 0}</style>
<main>${['Production', 'Original experiment', 'labels-6-density'].slice(0, reference ? 3 : 1).map((title, i) =>
  `<section><h2>${title}</h2><div id="map${i}"></div><p id="stats${i}"></p></section>`).join('')}</main>
<script src="/production.js"></script><script>window.Production = CGView;</script>
${reference ? '<script src="/reference.js"></script><script>window.Reference = CGView;</script>' : ''}`;
const server = createServer(async (request, response) => {
  const route = new URL(request.url, 'http://localhost').pathname;
  if (route === '/') { response.setHeader('Content-Type', 'text/html'); response.end(html); return; }
  const file = files.get(route);
  if (!file) { response.writeHead(404).end(); return; }
  try {
    response.setHeader('Content-Type', route.endsWith('.js') ? 'text/javascript' : 'application/json');
    response.end(await readFile(file));
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({headless: true});
const page = await browser.newPage({viewport: {width: reference ? 2140 : 730, height: 770}, reducedMotion: 'reduce'});
const errors = [], results = [];
page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
const ready = () => page.waitForFunction(() => window.viewers?.every(v => !v.layout.fullDrawInProgress &&
  (!v.annotation._externalLabels.renderer.stats || v.annotation._externalLabels.renderer.stats.phase === 'ready')),
null, {timeout: 30000});
const snapshot = () => page.evaluate(() => viewers.map((v, i) => {
  const geometry = v.annotation.externalLabelPlacements.map(({label, rect, bp, points}) => ({name: label.name,
    rect: [rect.x, rect.y, rect.width, rect.height], bp, points}));
  const summary = {method: i === 0 ? v.annotation.labelMethod : v.annotation.externalLabelRenderer, ...v.annotation.labelStats,
    mode: v.annotation._externalLabels.renderer.layout?.mode};
  document.getElementById(`stats${i}`).textContent = `${summary.method}: ${summary.drawn} drawn / ${summary.total} total`;
  return {summary, geometry: JSON.parse(JSON.stringify(geometry, (key, value) => typeof value === 'number' ? +value.toFixed(5) : value))};
}));
try {
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(hasReference => {
    const data = {cgview: {version: '1.9.0', sequence: {length: 100000}, legend: {visible: false},
      features: Array.from({length: 1000}, (_, i) => ({name: `${['gene', 'ATP synthase', 'rpoB'][i % 3]} ${i}`,
        start: i * 100 + 1, stop: i * 100 + 70 + i % 30, source: 'test', legend: 'Genes', favorite: i % 43 === 0})),
      tracks: [{dataType: 'feature', dataMethod: 'source', dataKeys: ['test'], position: 'outside'}]}};
    window.fixture = data;
    window.viewers = [new Production.Viewer('map0', {width: 700, height: 650}),
      ...(hasReference ? [new Reference.Viewer('map1', {width: 700, height: 650}),
        new Reference.Viewer('map2', {width: 700, height: 650})] : [])];
    viewers.forEach(v => v.io.loadJSON(JSON.parse(JSON.stringify(data))));
  }, Boolean(reference));
  await ready();
  assert.deepEqual(await page.evaluate(() => Production.externalLabelRenderers().map(r => r.id)),
    ['adaptive', 'classic']);
  assert.equal(await page.evaluate(() => viewers[0].annotation.labelMethod), 'adaptive');

  const migration = [];
  for (const [version, annotation, method] of [
    ['1.8.0', {}, 'classic'],
    ['1.8.0', {labelPlacement: 'default'}, 'classic'],
    ['1.8.0', {labelPlacement: 'angled'}, 'adaptive'],
    ['1.9.0', {labelPlacement: 'default'}, 'classic'],
    ['1.9.0', {labelPlacement: 'angled'}, 'adaptive'],
    ['1.9.0', {externalLabelRenderer: 'default'}, 'classic'],
    ['1.9.0', {externalLabelRenderer: 'angled'}, 'adaptive'],
    ['1.9.0', {externalLabelRenderer: 'classic', labelPlacement: 'angled'}, 'classic'],
    ['1.9.0', {externalLabelRenderer: 'adaptive', labelPlacement: 'default'}, 'adaptive'],
    ['1.9.0', {labelMethod: 'classic', externalLabelRenderer: 'adaptive', labelDensity: 0,
      labelSpacing: 0, keepLabelsInView: false, externalLabelRendererOptions: {labelDensity: 1, gap: 9, constrainToViewport: true}}, 'classic'],
    ['1.9.0', {labelMethod: 'adaptive', externalLabelRenderer: 'classic',
      externalLabelRendererOptions: {labelDensity: 0.5, gap: 4, constrainToViewport: true}}, 'adaptive'],
  ]) {
    await page.evaluate(({version, annotation}) => {
      const data = JSON.parse(JSON.stringify(fixture));
      data.cgview.version = version;
      data.cgview.annotation = {...annotation, labelPosition: 'outside'};
      viewers[0].io.loadJSON(data); viewers[0].drawFull();
    }, {version, annotation});
    await ready();
    const saved = await page.evaluate(() => ({annotation: viewers[0].annotation.toJSON(),
      drawn: viewers[0].annotation.labelStats.drawn}));
    assert.equal(saved.annotation.labelMethod, method);
    assert.ok(saved.drawn > 0);
    assert.equal(Object.hasOwn(saved.annotation, 'labelPlacement'), false);
    assert.equal(Object.hasOwn(saved.annotation, 'priorityMax'), false);
    assert.equal(Object.hasOwn(saved.annotation, 'externalLabelRenderer'), false);
    assert.equal(Object.hasOwn(saved.annotation, 'externalLabelRendererOptions'), false);
    const previous = annotation.externalLabelRendererOptions || {};
    assert.equal(saved.annotation.labelDensity, annotation.labelDensity ?? previous.labelDensity ?? 0);
    assert.equal(saved.annotation.labelSpacing, annotation.labelSpacing ?? previous.gap ?? 3);
    assert.equal(saved.annotation.keepLabelsInView, annotation.keepLabelsInView ?? previous.constrainToViewport ?? true);
    migration.push({version, input: annotation, method, drawn: saved.drawn});
  }

  for (const method of ['classic', 'adaptive']) {
    for (const format of ['circular', 'linear']) {
      for (const font of [3, 12]) {
        for (const bounded of [true, false]) {
          // Reset between cases, but retain selection history throughout each density sweep.
          await page.evaluate(({method, format, font, bounded}) => {
            viewers.forEach((v, i) => {
              v.io.loadJSON(JSON.parse(JSON.stringify(fixture))); v.format = format;
              v.annotation.update({labelPosition: 'outside', font: `monospace,plain,${font}`, labelLineThickness: 0.5,
                ...(i === 0 ? {labelMethod: method, labelDensity: 0, labelSpacing: 3, keepLabelsInView: bounded} : {
                  externalLabelRenderer: i === 1 ? (method === 'classic' ? 'labels-14-classic-density' : 'labels-13-edge') : 'labels-6-density',
                  externalLabelRendererOptions: {labelDensity: 0, gap: 3, constrainToViewport: bounded},
                })});
              v.drawFull();
            });
          }, {method, format, font, bounded});
          await ready();
          for (const density of [0, 0.5, 1, 0]) {
            await page.evaluate(density => viewers.forEach((v, i) => {
              v.annotation.update(i === 0 ? {labelDensity: density} : {
                externalLabelRendererOptions: {...v.annotation.externalLabelRendererOptions, labelDensity: density}});
              v.drawFull();
            }), density);
            await ready();
            const shots = await snapshot();
            if (reference) { assert.deepEqual(shots[0].geometry, shots[1].geometry, `${method}/${format}/${font}/${bounded}/${density}`); }
            assert.ok(shots[0].summary.drawn > 0);
            if (bounded) {
              assert.ok(shots[0].geometry.every(({rect: [x, y, w, h]}) => x >= 3 - 1e-5 && y >= 3 - 1e-5 && x + w <= 697 + 1e-5 && y + h <= 647 + 1e-5));
            }
            results.push({method, format, font, bounded, density, methods: shots.map(s => s.summary)});
            if (font === 3 && bounded && density === 1) {
              await page.screenshot({path: path.join(output, `${method}-${format}.png`)});
            }
          }
          console.log(`PASS: ${method}, ${format}, ${font}px, viewport ${bounded}`);
        }
      }
    }
  }

  await page.evaluate(async () => {
    window.fixture = await (await fetch('/map.json')).json();
    viewers.forEach((v, i) => {
      v.io.loadJSON(JSON.parse(JSON.stringify(fixture)));
      v.annotation.update({labelPosition: 'outside', font: 'monospace,plain,4',
        ...(i === 0 ? {labelMethod: 'adaptive', labelDensity: 1, labelSpacing: 3, keepLabelsInView: true} : {
          externalLabelRenderer: i === 1 ? 'labels-13-edge' : 'labels-6-density',
          externalLabelRendererOptions: {labelDensity: 1, gap: 3, constrainToViewport: true},
        })});
      v.drawFull();
    });
  });
  await ready();
  for (const [bp, zoom] of [[0.5, 2], [0.001, 5], [0.885, 9.75], [0.885, 10.25]]) {
    await page.evaluate(async ([bp, zoom]) => {
      for (const v of viewers) {
        await new Promise(resolve => v.zoomTo(v.sequence.length * bp, zoom, {duration: 0,
          callback: () => { v.drawFull(); resolve(); }}));
      }
    }, [bp, zoom]);
    await ready();
    const shots = await snapshot();
    if (reference) { assert.deepEqual(shots[0].geometry, shots[1].geometry, `Lentzea ${bp}/${zoom}`); }
    results.push({largeMap: true, bp, zoom, methods: shots.map(s => s.summary)});
  }

  await page.emulateMedia({reducedMotion: 'no-preference'});
  const lifecycle = await page.evaluate(async () => {
    const v = viewers[0], a = v.annotation;
    v.drawFull();
    const r = a._externalLabels.renderer;
    const domain = v.scale.x.domain(), delta = v.scale.x.invert(0) - v.scale.x.invert(420);
    v.scale.x.domain(domain.map(n => n + delta)); v.drawFast();
    const before = JSON.stringify(a.externalLabelPlacements.map(({rect, bp, points}) => ({rect, bp, points})));
    const motion = JSON.stringify([...r.motion.values()]);
    const job = r.job;
    const svg = new DOMParser().parseFromString(v.io.getSVG(), 'image/svg+xml');
    const exportValid = !svg.querySelector('parsererror') && svg.querySelectorAll('text').length > 0;
    const exportIsolated = r.job === job && JSON.stringify([...r.motion.values()]) === motion &&
      JSON.stringify(a.externalLabelPlacements.map(({rect, bp, points}) => ({rect, bp, points}))) === before;
    const bounded = a.externalLabelPlacements.every(({rect}) => rect.x >= 3 - 1e-5 && rect.y >= 3 - 1e-5 &&
      rect.right <= v.width - 3 + 1e-5 && rect.bottom <= v.height - 3 + 1e-5);
    a.update({visible: false}); v.drawFull();
    const cleared = a._externalLabels.frames.size === 0 && a.externalLabelPlacements.length === 0 && a.labelStats.drawn === 0;
    a.update({visible: true});
    v.scale.x.domain(domain); v.drawFull();
    return {exportValid, exportIsolated, bounded, cleared};
  });
  assert.deepEqual(lifecycle, {exportValid: true, exportIsolated: true, bounded: true, cleared: true});
  await ready();
  const jsonCheck = await page.evaluate(() => {
    const v = viewers[0], data = v.io.toJSON();
    v.io.loadJSON(data); v.drawFull();
    return {method: v.annotation.labelMethod, annotation: v.annotation.toJSON(), saved: data.cgview.annotation};
  });
  assert.equal(jsonCheck.method, 'adaptive'); assert.deepEqual(jsonCheck.annotation, jsonCheck.saved);
  await ready();
  assert.deepEqual(errors, []);
  await writeFile(path.join(output, 'verification.json'), JSON.stringify({migration, results, lifecycle, jsonCheck}, null, 2));
  console.log(`PASS: ${migration.length} imports, ${results.length} layout cases, export/navigation lifecycle and JSON round trip.`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
