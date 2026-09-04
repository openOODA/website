// # Theme boot
// Logline: Apply the stored theme before paint.
(function () {
  var THEMES = ["night","paper","magma","flare","solar","cyber","frost","tokyo","laser"];
  var m = document.cookie.match(/(?:^|; )ooda-theme=([^;]*)/);
  var stored = (m && m[1]) || (typeof localStorage !== "undefined" && localStorage.getItem("ooda-theme"));
  var t = (stored && THEMES.indexOf(stored) !== -1) ? stored : "night";
  document.documentElement.setAttribute("data-theme", t);
})();
