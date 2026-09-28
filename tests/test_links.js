// website link check — every real link lands.
//
// Run from the website folder: node tests/test_links.js
// PASS means: each external href/src we own (github.com/openOODA/*,
// openooda.org/*) answers 2xx/3xx, and each relative file ref exists.
// Third-party hosts (CDN, credit links) are out of our control and skipped.
// Code-sample URLs in page text are illustrative, not links: only href/src
// attributes are checked.
const fs = require('fs');
const path = require('path');

function fail(msg) { console.error('FAIL ' + msg); process.exit(1); }

const pages = ['index.html', '404.html'];
const owned = ['github.com', 'openooda.org', 'catalog.openooda.org'];
const external = [];
const local = [];

for (const page of pages) {
  const html = fs.readFileSync(page, 'utf8');
  const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(m => m[1]);
  for (const ref of refs) {
    if (ref.startsWith('#') || ref.startsWith('data:') || ref === '/') continue;
    if (/^https?:\/\//.test(ref)) {
      const host = new URL(ref).hostname;
      if (owned.some(h => host === h || host.endsWith('.' + h))) external.push(ref);
      continue;
    }
    local.push([page, ref]);
  }
}

for (const [page, ref] of local) {
  const target = path.join('.', ref.split(/[?#]/)[0]);
  if (!fs.existsSync(target)) fail(page + ' references missing file ' + ref);
}

async function alive(url) {
  for (const method of ['HEAD', 'GET']) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 15000);
    try {
      const r = await fetch(url, { method, redirect: 'follow', signal: ctl.signal });
      clearTimeout(t);
      if (r.status < 400) return true;
      if (method === 'GET') return false;
    } catch (e) {
      clearTimeout(t);
      if (method === 'GET') return false;
    }
  }
  return false;
}

(async () => {
  const uniq = [...new Set(external)];
  for (const url of uniq) {
    if (!await alive(url)) fail('dead owned link ' + url);
  }
  console.log('PASS website links: ' + uniq.length + ' owned URLs alive, ' + local.length + ' local refs exist');
})();
