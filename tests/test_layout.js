// website layout check — pages load whole, links land, small screens hold.
//
// Run from the website folder: node tests/test_layout.js
// PASS means: both pages carry a viewport tag, every inside link
// points at a file that exists, and the styles carry small-screen
// rules (media queries or fluid clamp sizes).
const fs = require('fs');
const path = require('path');

function fail(msg) { console.error('FAIL ' + msg); process.exit(1); }

const pages = ['index.html', '404.html'];
for (const page of pages) {
  const html = fs.readFileSync(page, 'utf8');
  if (!html.includes('name="viewport"')) fail(page + ' has no viewport tag');
  if (/<script[^>]+src=["'][^"']*\/src\//.test(html)) fail(page + ' loads app script');
  const refs = [...html.matchAll(/(?:href|src)="(\/[^"]*)"/g)].map(m => m[1]);
  for (const ref of refs) {
    if (ref === '/') continue;
    const local = path.join('.', ref);
    if (!fs.existsSync(local)) fail(page + ' dead link ' + ref);
  }
}

const styles = fs.readdirSync('styles').filter(f => f.endsWith('.css'));
if (styles.length === 0) fail('no styles found');
let responsive = 0;
for (const file of styles) {
  const css = fs.readFileSync(path.join('styles', file), 'utf8');
  if (css.includes('@media') || css.includes('clamp(')) responsive++;
}
if (responsive < styles.length) fail('style without small-screen rules');

console.log('PASS website layout pages+links+small-screen');
