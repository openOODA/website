// website 9.2 — js/html hook integrity + sitemap truth
const fs = require('fs');
const cp = require('child_process');
function fail(m) { console.error('FAIL ' + m); process.exit(1); }

// 1. every js file parses
for (const f of ['js/copy.js', 'js/panels.js', 'js/rotate.js']) {
  try { cp.execFileSync('node', ['--check', f], { stdio: 'pipe' }); }
  catch (e) { fail('syntax ' + f); }
}

// 2. literal getElementById hooks exist in index.html
const home = fs.readFileSync('index.html', 'utf8');
const ids = new Set([...home.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
for (const f of ['js/copy.js', 'js/panels.js', 'js/rotate.js']) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/getElementById\("([^"]+)"\)/g)) {
    if (!ids.has(m[1])) fail(f + ' hooks missing id "' + m[1] + '"');
  }
  for (const m of src.matchAll(/querySelector(All)?\("\.([^"]+)"\)/g)) {
    if (!home.includes(m[2])) fail(f + ' hooks missing class "' + m[2] + '"');
  }
}

// 3. copySnippet call sites target real ids
for (const m of home.matchAll(/copySnippet\('([^']+)'/g)) {
  if (!ids.has(m[1])) fail('copySnippet targets missing id "' + m[1] + '"');
}

// 4. sitemap locs match CNAME host and resolve to real files
const host = fs.readFileSync('CNAME', 'utf8').trim();
const sm = fs.readFileSync('sitemap.xml', 'utf8');
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
if (locs.length === 0) fail('sitemap has no locs');
for (const u of locs) {
  const low = u.toLowerCase();
  if (!low.startsWith('https://' + host + '/')) fail('sitemap host drift: ' + u);
  const p = u.slice(('https://' + host + '/').length);
  const f = p === '' ? 'index.html' : p;
  if (!fs.existsSync(f)) fail('sitemap target missing: ' + u);
}
if (!fs.readFileSync('robots.txt', 'utf8').includes('https://' + host + '/sitemap.xml')) {
  fail('robots.txt sitemap drift');
}

// 5. html skeleton on both pages
for (const f of ['index.html', '404.html']) {
  const h = fs.readFileSync(f, 'utf8');
  for (const t of ['<!DOCTYPE html>', '<html', '</html>', '<head', '</head>', '<body', '</body>']) {
    if (!h.includes(t)) fail(f + ' missing ' + t);
  }
}
console.log('PASS website 9.2 hooks+sitemap+skeleton');
