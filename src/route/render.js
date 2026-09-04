// # Router
//
// Logline: Fill #content from pulled/{repo}.oot.
//
var DEFAULT_ROUTE = "openOODA";
var VALID_ROUTES = {
  openOODA: 1, home: 1, ooda: 1, std: 1, opm: 1,
  catalog: 1, lsp: 1, mcp: 1, oodar: 1, oodac: 1
};
var INSTALL_HTML = '<div class="install"><span class="install-cmd">curl -fsSL <a href="https://openooda.org/install.sh">https://openooda.org/install.sh</a> | bash</span><button type="button" class="copy" aria-label="Copy install command">copy</button></div>';

function setupOpenOODA() {
  var copyBtns = document.querySelectorAll("main .copy");
  for (var i = 0; i < copyBtns.length; i++) {
    (function (btn) {
      btn.onclick = function () {
        var cmd = "curl -fsSL https://openooda.org/install.sh | bash";
        function ok() {
          btn.classList.add("is-on");
          setTimeout(function () { btn.classList.remove("is-on"); }, 1400);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(cmd).then(ok, function () {});
        }
      };
    })(copyBtns[i]);
  }
}

function renderRoute(route) {
  var raw = (route || "").replace(/^#/, "").trim();
  if (!raw || raw === "home" || raw === "/") raw = "openOODA";
  var contentEl = document.getElementById("content");
  if (!contentEl) return;
  document.querySelectorAll("aside .local a").forEach(function (a) {
    var isAct = a.dataset.route === raw;
    if (a.classList.contains("active") !== isAct) a.classList.toggle("active", isAct);
  });
  if (raw === "openOODA") {
    document.title = "openOODA";
    contentEl.innerHTML = '<p class="canon">Loading&hellip;</p>';
    fetch("/pulled/openOODA.oot").then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    }).then(function (text) {
      var data = parsePulledOot(text);
      var html = "";
      if (data.title) html += '<h1 class="visually-hidden">' + escapeHtml(data.title) + "</h1>";
      if (data.source) html += '<p class="canon">Source: ' + escapeHtml(data.source) + "</p>";
      html += INSTALL_HTML;
      if (data.content) html += simpleMarkdown(data.content);
      html += INSTALL_HTML;
      contentEl.innerHTML = html;
      setupOpenOODA();
    }).catch(function (err) {
      var msg = escapeHtml(err && err.message ? err.message : "unknown");
      contentEl.innerHTML = "<h1>openOODA</h1><p>Failed to load: " + msg + "</p>";
    });
  } else if (VALID_ROUTES[raw]) {
    document.title = "openOODA — " + raw;
    contentEl.innerHTML = '<p class="canon">Loading ' + escapeHtml(raw) + "&hellip;</p>";
    fetch("/pulled/" + raw + ".oot").then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    }).then(function (text) {
      var data = parsePulledOot(text);
      var html = "";
      if (data.title) html += '<h1 class="visually-hidden">' + escapeHtml(data.title) + "</h1>";
      if (data.source) html += '<p class="canon">Source: ' + escapeHtml(data.source) + "</p>";
      if (data.content) html += simpleMarkdown(data.content);
      contentEl.innerHTML = html;
    }).catch(function (err) {
      var msg = escapeHtml(err && err.message ? err.message : "unknown");
      contentEl.innerHTML = "<h1>" + escapeHtml(raw) + "</h1><p>Failed to load: " + msg + "</p>";
    });
  } else {
    document.title = "openOODA — Not Found";
    contentEl.innerHTML = "<p>Not found.</p>";
  }
  window.scrollTo(0, 0);
}

function getInitialRoute() {
  if (typeof location !== "undefined" && location.hash) {
    return location.hash.replace(/^#/, "").trim();
  }
  var p = (typeof location !== "undefined" && location.pathname)
    ? location.pathname.replace(/^\//, "").replace(/\/index\.html$/, "").replace(/\.html$/, "")
    : "";
  if (VALID_ROUTES[p]) return p;
  return DEFAULT_ROUTE;
}

if (typeof document !== "undefined") {
  window.addEventListener("hashchange", function () { renderRoute(location.hash); });
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (href.startsWith("#")) {
      e.preventDefault();
      var targetRoute = href.replace(/^#/, "");
      history.pushState(null, "", "#" + targetRoute);
      renderRoute(targetRoute);
    }
  });
}
