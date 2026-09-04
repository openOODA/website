// # Canvas life
//
// Logline: Start and stop rAF when the tab is hidden.
//
var CanvasLifecycleManager = (function () {
  var registry = [];
  function docVisible() {
    return typeof document === "undefined" || !document.hidden;
  }
  function reduced() {
    return typeof window !== "undefined" && window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function update(item) {
    var block = reduced() && item.respectReducedMotion;
    var run = docVisible() && !block && item.canvas && item.canvas.isConnected !== false;
    if (run && !item.isRunning) { item.isRunning = true; item.start(); }
    else if (!run && item.isRunning) { item.isRunning = false; item.stop(); }
  }
  function updateAll() { for (var i = 0; i < registry.length; i++) update(registry[i]); }
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", updateAll);
  }
  if (typeof window !== "undefined" && window.matchMedia) {
    var mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.addEventListener) mq.addEventListener("change", updateAll);
    else if (mq.addListener) mq.addListener(updateAll);
  }
  return {
    register: function (id, opts) {
      if (!opts || !opts.canvas) return;
      var item = {
        id: id, canvas: opts.canvas, start: opts.start, stop: opts.stop,
        respectReducedMotion: !!opts.respectReducedMotion, isRunning: false
      };
      registry.push(item);
      update(item);
    },
    updateAll: updateAll
  };
})();
