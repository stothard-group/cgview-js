/** Visual regression survey for Adaptive labels. Build first; --reference compares a saved browser bundle. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, readdir, mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const flag = process.argv.indexOf('--reference');
const reference = flag < 0 ? undefined : path.resolve(process.argv[flag + 1]);
const mapFlag = process.argv.indexOf('--map');
const output = path.join(root, '.agents/artifacts/adaptive-overviews');
await mkdir(output, {recursive: true});
const maps = (await readdir(path.join(root, 'docs/test/maps')))
  .filter(name => name.endsWith('.json')).map(name => name.slice(0, -5))
  .filter(name => mapFlag < 0 || name === process.argv[mapFlag + 1]).sort();
assert.ok(maps.length, 'No matching maps');
const files = new Map([
  ['/current.js', path.join(root, 'docs/dist/cgview.standalone.min.js')],
  ...(reference ? [['/reference.js', reference]] : []),
  ...maps.map(name => [`/${name}.json`, path.join(root, `docs/test/maps/${name}.json`)])
]);
const html = `<!doctype html><meta charset="utf-8"><title>Adaptive genome survey</title>
<style>body{font:14px system-ui;margin:12px;color:#243447}main{display:flex;gap:12px}h2{font-size:18px;margin:0 0 6px}p{margin:0 0 6px}</style>
<main>${(reference ? ['Upstream', 'Proposed'] : ['Proposed']).map((name, i) =>
  `<section><h2>${name}</h2><p id="stats${i}"></p><div id="map${i}"></div></section>`).join('')}</main>
${reference ? '<script src="/reference.js"></script><script>window.Reference=CGView;</script>' : ''}
<script src="/current.js"></script>`;
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
const page = await browser.newPage({viewport: {width: reference ? 1640 : 830, height: 950}, reducedMotion: 'reduce'});
const errors = [], results = [];
page.on('pageerror', e => errors.push(e.message));
const ready = () => page.waitForFunction(() => viewers.every(v => !v.layout.fullDrawInProgress &&
  v.tracks().every(t => t.dataMethod !== 'sequence' || !v.sequence.hasSeq || t.loadProgress === 100) &&
  !v.annotation._externalLabels.renderer.job && !v.annotation._externalLabels.renderer.layout?.pending &&
  v.annotation._externalLabels.renderer.stats.phase === 'ready'), null, {timeout: 60000}).catch(async error => {
  console.error(await page.evaluate(() => viewers.map(v => ({tracks:v.tracks().map(t => ({name:t.name, progress:t.loadProgress})),
    labels:v.annotation.labelStats, fullDraw:v.layout.fullDrawInProgress}))));
  throw error;
});
try {
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(reference => {
    window.viewers = (reference ? [Reference, CGView] : [CGView]).map((lib, i) =>
      new lib.Viewer(`map${i}`, {width: 800, height: 870}));
  }, Boolean(reference));
  for (const name of maps) {
    await page.evaluate(async name => {
      const data = await (await fetch(`/${name}.json`)).json();
      viewers.forEach(v => {
        v.io.loadJSON(JSON.parse(JSON.stringify(data)));
        v.annotation.update({visible: true, labelMethod: 'adaptive', labelPosition: 'outside', font: 'monospace,plain,12', labelDensity: 0});
        v.drawFull();
      });
    }, name);
    for (const zoom of [1, 0.5, 2]) {
      await page.evaluate(async zoom => {
        for (const v of viewers) {
          await new Promise(resolve => v.zoomTo(0, zoom, {duration: 0, callback: resolve}));
          v.drawFull();
        }
      }, zoom);
      await ready();
      const metrics = await page.evaluate(({name, zoom}) => viewers.map((v, i) => {
        const layout = v.annotation._externalLabels.renderer.layout, map = layout.map;
        const nodes = layout.placed;
        const lengths = nodes.map(n => Math.hypot(n.placement.points[1].x - n.placement.points[0].x,
          n.placement.points[1].y - n.placement.points[0].y));
        const tangent = nodes.filter((n, j) => {
          const [a,b] = n.placement.points;
          return map.circular && lengths[j] > 10 &&
            ((a.x-map.x)*(b.x-a.x)+(a.y-map.y)*(b.y-a.y)) / (map.radius*lengths[j]) < 0.35;
        }).length;
        const finite = nodes.every(n => [...Object.values(n.placement.rect), ...n.placement.points.flatMap(p => [p.x,p.y])].every(Number.isFinite));
        const bounded = nodes.every(({placement:{rect:r}}) => r.x >= layout.padding-1e-6 && r.y >= layout.padding-1e-6 &&
          r.x+r.width <= map.width-layout.padding+1e-6 && r.y+r.height <= map.height-layout.padding+1e-6);
        const overlapsRect = (a,b) => a.x < b.x+b.width-1e-6 && a.x+a.width > b.x+1e-6 &&
          a.y < b.y+b.height-1e-6 && a.y+a.height > b.y+1e-6;
        const orientation = (a,b,c) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
        const crosses = ([a,b],[c,d]) => orientation(a,b,c)*orientation(a,b,d) < -1e-7 &&
          orientation(c,d,a)*orientation(c,d,b) < -1e-7;
        let overlaps = 0, crossings = 0;
        nodes.forEach(({placement:a}, j) => nodes.slice(j+1).forEach(({placement:b}) => {
          if (overlapsRect(a.rect,b.rect)) { overlaps++; }
          if (crosses(a.points,b.points)) { crossings++; }
        }));
        const overlayOverlaps = nodes.filter(n => (layout.options.obstacles || []).some(b => overlapsRect(n.placement.rect,b))).length;
        const unique = new Set(nodes.map(n=>n.id)).size === nodes.length;
        document.getElementById(`stats${i}`).textContent = `${name} · ${zoom}× · ${nodes.length} labels · ${tangent} near-tangent leaders`;
        return {count:nodes.length, maxLeader:Math.max(0,...lengths), tangent, finite, bounded, overlaps, crossings, overlayOverlaps, unique,
          mode:layout.mode, format:v.format, names:nodes.map(n=>n.id.name)};
      }), {name,zoom});
      const current = metrics.at(-1);
      assert.ok(current.finite && current.bounded, `${name}/${zoom}: invalid placement`);
      assert.equal(current.overlaps, 0, `${name}/${zoom}: overlapping text`);
      assert.equal(current.overlayOverlaps, 0, `${name}/${zoom}: text overlapping an overlay`);
      assert.equal(current.crossings, 0, `${name}/${zoom}: crossing leaders`);
      assert.ok(current.unique, `${name}/${zoom}: duplicate labels`);
      const screenshot = `${name}-${zoom}.png`;
      await page.screenshot({path:path.join(output,screenshot)});
      results.push({name,zoom,metrics,screenshot});
      console.log(`${name}/${zoom}: ${metrics.map(m=>`${m.count} labels, ${m.tangent} tangent`).join(' -> ')}`);
    }
  }
  assert.deepEqual(errors, []);
  await writeFile(path.join(output,'results.json'), JSON.stringify(results,null,2));
  await writeFile(path.join(output,'index.html'), `<!doctype html><meta charset="utf-8"><title>Adaptive label survey</title>
    <style>body{font:16px system-ui;margin:24px}img{max-width:100%;border:1px solid #ddd}h2{margin-top:40px}</style>
    <h1>Adaptive label survey</h1>${results.map(r=>`<h2>${r.name} · ${r.zoom}×</h2><img loading="lazy" src="${r.screenshot}">`).join('')}`);
  console.log(`PASS: ${results.length} map/zoom combinations; screenshots in ${output}`);
} finally {
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
