// # Sky starfield
//
// Logline: Theme-colored stars. Honors reduced motion.
//
(function () {
var canvas = document.createElement("canvas");
canvas.id = "sky"; canvas.setAttribute("aria-hidden", "true");
document.body.prepend(canvas);
var ctx = canvas.getContext("2d");
if (!ctx) return;
var stars = [];
var skyAnimId = null;
var lastSkyTime = 0;
function resize() {
var w = window.innerWidth, h = window.innerHeight;
canvas.width = w; canvas.height = h;
canvas.style.width = w + "px"; canvas.style.height = h + "px";
initStars(w, h);
drawOnce();
}
function initStars(w, h) {
stars = [];
var total = Math.max(25, Math.min(60, Math.floor((w * h) / 24000)));
for (var i = 0; i < total; i++) {
stars.push({
x: Math.random() * w, y: Math.random() * h,
size: Math.random() > 0.8 ? 2 : 1, flare: Math.random() > 0.6,
flareLen: Math.floor(Math.random() * 4) + 3, phase: Math.random() * Math.PI * 2,
speed: 0.008 + Math.random() * 0.012, maxAlpha: 0.35 + Math.random() * 0.45
});
}
}
function hexToRgb(hex) {
hex = (hex || "").trim();
if (hex.charAt(0) === "#") {
if (hex.length === 4) return [parseInt(hex[1]+hex[1], 16), parseInt(hex[2]+hex[2], 16), parseInt(hex[3]+hex[3], 16)];
if (hex.length >= 7) return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}
return [232, 232, 232];
}
var curRgb = [232, 232, 232];
var alphaCache = new Array(21);
function rebuildAlphaCache(r, g, b) {
for (var i = 0; i <= 20; i++) {
alphaCache[i] = "rgba(" + r + "," + g + "," + b + "," + (i / 20).toFixed(2) + ")";
}
}
rebuildAlphaCache(232, 232, 232);
function updateThemeColor() {
var colors = getThemeColors();
curRgb = hexToRgb(colors.fg);
rebuildAlphaCache(curRgb[0], curRgb[1], curRgb[2]);
drawOnce();
}
function drawOnce() {
var w = canvas.width, h = canvas.height;
ctx.clearRect(0, 0, w, h);
for (var i = 0; i < stars.length; i++) {
var s = stars[i];
var alpha = (Math.sin(s.phase) * 0.5 + 0.5) * s.maxAlpha;
if (alpha <= 0.04) continue;
var idx = Math.min(20, Math.max(0, Math.floor(alpha * 20)));
ctx.fillStyle = alphaCache[idx];
ctx.fillRect(Math.floor(s.x), Math.floor(s.y), s.size, s.size);
}
}
function draw(now) {
if (!skyAnimId) return;
skyAnimId = requestAnimationFrame(draw);
if (now && lastSkyTime && (now - lastSkyTime < 33)) return; // Lock to ~30 FPS
lastSkyTime = now;

var w = canvas.width, h = canvas.height;
ctx.clearRect(0, 0, w, h);
for (var i = 0; i < stars.length; i++) {
var s = stars[i]; s.phase += s.speed;
var alpha = (Math.sin(s.phase) * 0.5 + 0.5) * s.maxAlpha;
if (alpha <= 0.04) continue;
var idx = Math.min(20, Math.max(0, Math.floor(alpha * 20)));
ctx.fillStyle = alphaCache[idx];
var x = Math.floor(s.x), y = Math.floor(s.y);
ctx.fillRect(x, y, s.size, s.size);
if (s.flare && alpha > 0.3) {
var fl = s.flareLen;
var fIdx = Math.min(20, Math.max(0, Math.floor(alpha * 8)));
ctx.fillStyle = alphaCache[fIdx];
ctx.fillRect(x - fl, y, fl * 2 + s.size, 1);
ctx.fillRect(x, y - fl, 1, fl * 2 + s.size);
}
}
}
function start() {
if (!skyAnimId) {
skyAnimId = requestAnimationFrame(draw);
}
}
function stop() {
if (skyAnimId) {
cancelAnimationFrame(skyAnimId);
skyAnimId = null;
}
}
window.addEventListener("resize", resize);
var observer = new MutationObserver(updateThemeColor);
observer.observe(document.documentElement, {"attributes": true, "attributeFilter": ["data-theme"]});
resize(); updateThemeColor();
CanvasLifecycleManager.register("sky-starfield", {
canvas: canvas,
start: start,
stop: stop,
respectReducedMotion: true
});
})();
