// website shim check — install.sh fetches the canonical installer safely.
//
// Run from the website folder: node tests/test_shim.js
// PASS means: install.sh passes `sh -n`, downloads the installer to a temp
// file first (never curl|bash: mktemp + trap + -o file), fetches from the
// install repo's master branch, the fetch URL answers 2xx, and index.html
// documents the openooda.org/install.sh entry point.
const fs = require('fs');
const { execFileSync } = require('child_process');

function fail(msg) { console.error('FAIL ' + msg); process.exit(1); }

try {
  execFileSync('sh', ['-n', 'install.sh'], { stdio: 'pipe' });
} catch (e) {
  fail('install.sh fails sh -n');
}

const shim = fs.readFileSync('install.sh', 'utf8');
for (const marker of ['mktemp', 'trap', '-o ', 'bash "$TMP"']) {
  if (!shim.includes(marker)) fail('install.sh lost no-empty-exec guard: ' + marker);
}
const code = shim.split('\n').filter(l => !l.trimStart().startsWith('#')).join('\n');
if (/curl[^\n]*\|\s*(bash|sh)/.test(code)) fail('install.sh pipes curl into a shell');

const m = shim.match(/https:\/\/raw\.githubusercontent\.com\/openOODA\/install\/([^\s"']+)\/install\.sh/);
if (!m) fail('install.sh has no canonical fetch URL');
if (m[1] !== 'master') fail('install.sh fetches branch ' + m[1] + ', want master');
const url = m[0];

const home = fs.readFileSync('index.html', 'utf8');
if (!home.includes('openooda.org/install.sh')) fail('index.html does not document openooda.org/install.sh');

(async () => {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 15000);
  try {
    const r = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctl.signal });
    clearTimeout(t);
    if (r.status >= 400) fail('canonical installer URL dead: ' + url + ' -> ' + r.status);
    const body = await r.text();
    if (body.length < 1000) fail('canonical installer body suspiciously small');
    if (!body.includes('openOODA one-line installer')) fail('canonical installer body unrecognized');
  } catch (e) {
    clearTimeout(t);
    fail('canonical installer URL unreachable: ' + url + ' (' + e.message + ')');
  }
  console.log('PASS website shim: syntax+guards+master fetch alive');
})();
