/* tracker.js — filter and sort the repository completion tracker */
(function () {
  "use strict";

  var rows = Array.prototype.slice.call(document.querySelectorAll(".tk-row"));
  if (!rows.length) {
    return;
  }
  var chips = Array.prototype.slice.call(document.querySelectorAll(".tk-chip"));
  var search = document.getElementById("tk-search");
  var count = document.getElementById("tk-count");
  var head = document.getElementById("tk-head");
  var body = document.getElementById("tk-rows");

  var org = "all";
  var query = "";
  var sortKey = "name";
  var sortDir = 1;

  /* The four canonical organizations, in architectural order rather than
     alphabetical: root, core, system, apps. */
  var ORG_ORDER = ["openOODA", "openOODA-core", "openOODA-system", "openOODA-apps"];
  var TIER_ORDER = {
    complete: 0,
    blocked: 1,
    stale: 2,
    red: 3,
    uncited: 4,
    skeleton: 5,
  };
  var ATTESTED_ORDER = { signed: 0, drift: 1, none: 2 };
  var CI_ORDER = { success: 0, failure: 1, none: 2, na: 3 };

  function num(row, key) {
    return parseInt(row.getAttribute(key), 10) || 0;
  }

  function comparator(a, b) {
    var x, y;
    if (sortKey === "name") {
      return a.getAttribute("data-name").localeCompare(b.getAttribute("data-name")) * sortDir;
    }
    if (sortKey === "org") {
      x = ORG_ORDER.indexOf(a.getAttribute("data-org"));
      y = ORG_ORDER.indexOf(b.getAttribute("data-org"));
      if (x !== y) {
        return (x - y) * sortDir;
      }
      return a.getAttribute("data-name").localeCompare(b.getAttribute("data-name")) * sortDir;
    }
    if (sortKey === "version") {
      x = a.getAttribute("data-version") || "";
      y = b.getAttribute("data-version") || "";
      return x.localeCompare(y, undefined, { numeric: true }) * sortDir;
    }
    if (sortKey === "tier") {
      x = TIER_ORDER[a.getAttribute("data-tier")];
      y = TIER_ORDER[b.getAttribute("data-tier")];
      return (x - y) * sortDir;
    }
    if (sortKey === "attested") {
      x = ATTESTED_ORDER[a.getAttribute("data-attested")];
      y = ATTESTED_ORDER[b.getAttribute("data-attested")];
      return (x - y) * sortDir;
    }
    if (sortKey === "caps") {
      x = a.getAttribute("data-caps") || "";
      y = b.getAttribute("data-caps") || "";
      return x.localeCompare(y) * sortDir;
    }
    if (sortKey === "ci") {
      x = CI_ORDER[a.getAttribute("data-ci")];
      y = CI_ORDER[b.getAttribute("data-ci")];
      return (x - y) * sortDir;
    }
    if (sortKey === "releases") {
      return (num(a, "data-releases") - num(b, "data-releases")) * sortDir;
    }
    if (sortKey === "pushed") {
      return (num(a, "data-pushed") - num(b, "data-pushed")) * sortDir;
    }
    if (sortKey === "score") {
      return (num(a, "data-score") - num(b, "data-score")) * sortDir;
    }
    return 0;
  }

  function apply() {
    var shown = 0;
    rows.sort(comparator);
    rows.forEach(function (row) {
      var name = row.getAttribute("data-search") || row.getAttribute("data-name") || "";
      var orgOk = org === "all" || row.getAttribute("data-org") === org;
      var queryOk = !query || name.indexOf(query) !== -1;
      var visible = orgOk && queryOk;
      row.style.display = visible ? "" : "none";
      if (visible) {
        shown++;
      }
      body.appendChild(row);
    });
    if (count) {
      count.textContent = shown + " / " + rows.length;
    }
  }

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      chips.forEach(function (other) {
        other.classList.remove("is-on");
      });
      chip.classList.add("is-on");
      org = chip.getAttribute("data-org") || "all";
      apply();
    });
  });

  if (search) {
    search.addEventListener("input", function () {
      query = (search.value || "").trim().toLowerCase();
      apply();
    });
  }

  if (head) {
    head.addEventListener("click", function (event) {
      var cell = event.target.closest("[data-sort]");
      if (!cell) {
        return;
      }
      var key = cell.getAttribute("data-sort");
      if (sortKey === key) {
        sortDir = -sortDir;
      } else {
        sortKey = key;
        sortDir = 1;
      }
      apply();
    });
  }

  /* The contract legend is a wall of text. Start it collapsed on every
     screen so the fleet matrix and the rows are the first thing you see, and
     leave it open for readers who did not run this script. */
  var legend = document.querySelector(".tk-legend-box");
  if (legend) {
    legend.removeAttribute("open");
  }

  apply();
})();
