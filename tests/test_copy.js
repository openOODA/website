// website 9.1 — static home clipboard + stealth mode verified
const fs = require('fs');
const home = fs.readFileSync('index.html', 'utf8');
const copy = fs.readFileSync('js/copy.js', 'utf8');
if (!copy.includes('clipboard')) { console.error('FAIL no clipboard'); process.exit(1); }
if (!copy.includes('fallbackCopy') && !copy.includes('execCommand')) { console.error('FAIL no fallback'); process.exit(1); }
if (!copy.includes('COPIED')) { console.error('FAIL no copied'); process.exit(1); }
if (!home.includes('https://github.com/openOODA')) { console.error('FAIL no openOODA href'); process.exit(1); }
if (!home.includes('Stealth Mode')) { console.error('FAIL stealth mode not named'); process.exit(1); }
if (/<script[^>]+src=["'][^"']*\/src\//.test(home)) {
  console.error('FAIL spa script on home');
  process.exit(1);
}
console.log('PASS website 9.1 static-home clipboard+stealth-mode');
