// # Markdown
//
// Logline: Escape, parse pulled .oot, render markdown.
//
function escapeHtml(text) {
  var map = {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"};
  return String(text).replace(/[&<>"']/g, function (c) { return map[c]; });
}

function parsePulledOot(text) {
  var lines = String(text).split("\n");
  var title = "";
  var source = "";
  var i = 0;
  if (lines[0] && lines[0].indexOf("# ") === 0) {
    title = lines[0].slice(2).trim();
    i = 1;
  }
  while (i < lines.length) {
    var line = lines[i].trim();
    if (line.indexOf("File:") === 0) { i++; continue; }
    if (line.indexOf("Source:") === 0) {
      source = line.slice(7).trim();
      i++;
      continue;
    }
    if (line === "") { i++; continue; }
    break;
  }
  return { title: title, source: source, content: lines.slice(i).join("\n") };
}
function simpleMarkdown(text) {
  var htmlBlocks = [];
  var preserved = text.replace(/<[a-zA-Z\/][^>]*>/g, function (match) {
    var idx = htmlBlocks.length;
    htmlBlocks.push(match);
    return "\x00RAWHTML" + idx + "\x00";
  });
  var html = preserved.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html.replace(/```([\s\S]*?)```/g, function (match, code) {
    return "<pre><code>" + code.trim() + "</code></pre>";
  });
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");
  html = html.replace(/\*\*([^\*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/^---$/gim, "<hr>");
  html = html.replace(/^\|(.+)\|$/gim, function (match, row) {
    var cells = row.split("|").map(function (c) { return c.trim(); });
    return "<tr>" + cells.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>";
  });
  html = html.replace(/((?:<tr>.*<\/tr>\n?)+)/g, "<table>$1</table>");
  html = html.replace(/^\s*-\s+(.*$)/gim, "<li>$1</li>");
  html = html.replace(/^\s*\d+\.\s+(.*$)/gim, "<li>$1</li>");
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>");
  var paras = html.split(/\n\n+/);
  html = paras.map(function (p) {
    p = p.trim();
    if (!p) return "";
    if (/^<(h[1-6]|pre|table|ul|ol|blockquote|hr)/.test(p) || p.indexOf("\x00RAWHTML") === 0) return p;
    return "<p>" + p.replace(/\n/g, "<br>") + "</p>";
  }).join("\n");
  html = html.replace(/\x00RAWHTML(\d+)\x00/g, function (match, idx) {
    return htmlBlocks[parseInt(idx, 10)] || "";
  });
  return html;
}
