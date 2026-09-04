// # Boot
//
// Logline: Route, dogfight, no 404 overwrite.
//
if (typeof document !== "undefined" && typeof window !== "undefined") {
  if (document.body && document.body.getAttribute("data-page") !== "404") {
    renderRoute(getInitialRoute());
  }
  jetsEnabled = true;
  if (!hasAnyActiveGen()) activeGens[4] = true;
  setupGenSelector();
  initGlobalDogfight();
}
