// website — zero-trust privacy gate over every published file
//
// The Pages artifact carries the whole repository tree, so every file that the
// deploy uploads is public. This gate reads each of those files and refuses
// the tokens that name the internal fleet. The rule is ported from the
// privacy gate of the public status repository, which guards the same tokens
// for the status page only.
//
// The node names are joined from pieces at run time, so that this gate does
// not hold the very words that it forbids. The rule that matches a name is a
// word that is not part of a longer identifier, so a class name that happens
// to share a piece with a node name does not trip the gate.
const fs = require('fs');
const path = require('path');

// The internal fleet node names. Forbidden in every published file.
const HOSTS = ['zeb' + 'es', 'ring' + 'master'];

// The same rule for the node name that the site also uses as the name of a
// visual metaphor in its style sheets and its scripts. Forbidden in the
// content files, where a bare word can only read as the name of a node.
const PROSE_HOSTS = ['spot' + 'light'];

// The content files, where a bare node name reads as a leak.
const CONTENT_EXT = new Set(['.html', '.txt', '.md', '.xml', '.oot', '.oo', '.json', '.yml', '.yaml']);

// The directories that the Pages artifact never carries.
const SKIP_DIRS = new Set(['.git', 'node_modules', '.ooda-cache', 'dist', 'build', '.agents']);
const SKIP_FILES = new Set(['.DS_Store', 'Thumbs.db']);

// The tokens that must never reach the public site.
const TOKENS = [
  { re: /100\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, why: 'a Tailscale address' },
  { re: /\b11435\b/g, why: 'the local inference port' },
  { re: /\/home\/[a-z]/g, why: 'a local home path' },
  { re: new RegExp('~04:' + '00|04:' + '30', 'g'), why: 'a local time zone' },
  { re: /\$[0-9]/g, why: 'a dollar amount' },
  { re: /\bstarjammer\b/g, why: 'the name of a node' },
];

// The name as a word that is not part of a longer identifier.
function wordPattern(name) {
  return new RegExp('(?<![\\w-])' + name + '(?![\\w-])', 'gi');
}

// Every file of the tree that the deploy uploads.
function collect(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      collect(path.join(dir, entry.name), out);
    } else if (entry.isFile()) {
      if (SKIP_FILES.has(entry.name)) continue;
      if (entry.name.endsWith('.log')) continue;
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

// The line of the file that holds the match, for the report.
function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

const files = collect('.', []);
const violations = [];

for (const file of files) {
  const buf = fs.readFileSync(file);
  if (buf.includes(0)) continue; // a binary asset, such as a picture
  const text = buf.toString('utf8');
  const ext = path.extname(file).toLowerCase();
  const isContent = CONTENT_EXT.has(ext);

  const names = HOSTS.slice();
  if (isContent) names.push(...PROSE_HOSTS);

  for (const name of names) {
    const re = wordPattern(name);
    let m;
    while ((m = re.exec(text)) !== null) {
      violations.push(`${file}:${lineOf(text, m.index)} the name of a fleet node`);
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }

  for (const token of TOKENS) {
    const re = new RegExp(token.re.source, token.re.flags);
    let m;
    while ((m = re.exec(text)) !== null) {
      violations.push(`${file}:${lineOf(text, m.index)} ${token.why}`);
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }
}

// The gate must read a real site, so it fails when the walk finds nothing.
if (files.length < 20) {
  console.error(`FAIL privacy gate read only ${files.length} files, the walk is broken`);
  process.exit(1);
}
if (!files.includes('index.html') || !files.includes('llms.txt')) {
  console.error('FAIL privacy gate did not read the published pages');
  process.exit(1);
}

if (violations.length > 0) {
  for (const v of violations) console.error(`FAIL privacy gate: ${v}`);
  console.error(`Zero-Trust privacy gate violation: ${violations.length} match(es)`);
  process.exit(1);
}
console.log(`PASS zero-trust privacy gate (${files.length} published files)`);
