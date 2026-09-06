// website 9.1 — clipboard fallback
const fs = require('fs');
const src = fs.readFileSync('src/route/render.js', 'utf8');
if (!src.includes('clipboard')) { console.error('FAIL no clipboard'); process.exit(1); }
if (!src.includes('fallback') && !src.includes('Fallback')) { console.error('FAIL no fallback'); process.exit(1); }
if (!src.includes('copied')) { console.error('FAIL no copied'); process.exit(1); }
console.log('PASS website 9.1 clipboard+fallback+copied');
