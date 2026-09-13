// # Boot
//
// Logline: Route and gen selector. No 404 overwrite.
//
if (typeof document !== "undefined" && typeof window !== "undefined") {
  if (document.body && document.body.getAttribute("data-page") !== "404") {
    renderRoute(getInitialRoute());
  setupGenSelector();
}
