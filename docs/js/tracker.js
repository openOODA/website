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

  var TIER_ORDER = {
    complete: 0,
    blocked: 1,
    stale: 2,
    red: 3,
    uncited: 4,
    skeleton: 5
  };
  var CI_ORDER = { success: 0, failure: 1, none: 2 };

  function tierOf(row) {
    return row.getAttribute("data-tier") || "skeleton";
  }

  function comparator(a, b) {
    var x, y;
    if (sortKey === "name") {
      return a.getAttribute("data-name").localeCompare(b.getAttribute("data-name")) * sortDir;
    }
    if (sortKey === "version") {
      x = a.getAttribute("data-version") || "";
      y = b.getAttribute("data-version") || "";
      return x.localeCompare(y, undefined, { numeric: true }) * sortDir;
    }
    if (sortKey === "tier") {
      x = TIER_ORDER[tierOf(a)];
      y = TIER_ORDER[tierOf(b)];
      return (x - y) * sortDir;
    }
    if (sortKey === "ci") {
      x = CI_ORDER[a.getAttribute("data-ci")] || 9;
      y = CI_ORDER[b.getAttribute("data-ci")] || 9;
      return (x - y) * sortDir;
    }
    if (sortKey === "releases") {
      x = parseInt(a.getAttribute("data-releases"), 10) || 0;
      y = parseInt(b.getAttribute("data-releases"), 10) || 0;
      return (x - y) * sortDir;
    }
    if (sortKey === "pushed") {
      x = parseInt(a.getAttribute("data-pushed"), 10) || 0;
      y = parseInt(b.getAttribute("data-pushed"), 10) || 0;
      return (x - y) * sortDir;
    }
    if (sortKey === "score") {
      x = parseInt(a.getAttribute("data-score"), 10) || 0;
      y = parseInt(b.getAttribute("data-score"), 10) || 0;
      return (x - y) * sortDir;
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

  apply();
})();
