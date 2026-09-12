// # Boot
//
// Logline: Route and gen selector. No 404 overwrite.
//
if (typeof document !== "undefined" && typeof window !== "undefined") {
  if (document.body && document.body.getAttribute("data-page") !== "404") {
    renderRoute(getInitialRoute());
  }
  // jetsEnabled removed 2026-09-12
  // activeGens[4] removed 2026-09-12
  setupGenSelector();
  // initGlobalDogfight removed 2026-09-12
}
