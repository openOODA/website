// # Frame loop
//
// Logline: Clear, grid, sim, draw, VFX.
//
function dfDrawGrid(colors) {
  DF.ctx.save();
  DF.ctx.strokeStyle = getAlphaColor("border", 0.18);
  DF.ctx.lineWidth = 1;
  DF.ctx.beginPath();
  for (var gx = 0; gx < DF.width; gx += 120) {
    DF.ctx.moveTo(gx, 0); DF.ctx.lineTo(gx, DF.height);
  }
  DF.ctx.stroke();

  // Minimalist Tactical Altitude Layers & Markers (0k - 100k ft)
  DF.ctx.strokeStyle = getAlphaColor("fg", 0.22);
  DF.ctx.fillStyle = getAlphaColor("fg", 0.45);
  DF.ctx.font = "9px monospace";
  var altGridLines = [0, 20000, 40000, 60000, 80000, 100000];
  for (var agi = 0; agi < altGridLines.length; agi++) {
    var altVal = altGridLines[agi];
    var gridY = getYFromAltitude(altVal, DF.height);
    DF.ctx.setLineDash(DASH_4_4);
    DF.ctx.beginPath();
    DF.ctx.moveTo(0, gridY); DF.ctx.lineTo(DF.width, gridY);
    DF.ctx.stroke();

    var altLabel = (altVal === 100000) ? "100k FT (NEAR-SPACE)" : (altVal === 0 ? "0 FT (TERRAIN)" : (altVal / 1000) + "k FT");
    DF.ctx.fillText(altLabel, 10, gridY > 12 ? gridY - 4 : 12);
  }
  DF.ctx.setLineDash([]);

  // Subtle 0 ft Terrain Footer Gradient
  if (DF.ctx.createLinearGradient) {
    var terrainGrad = DF.ctx.createLinearGradient(0, DF.height - 32, 0, DF.height);
    terrainGrad.addColorStop(0, getAlphaColor("panel", 0.0));
    terrainGrad.addColorStop(1, getAlphaColor("panel", 0.45));
    DF.ctx.fillStyle = terrainGrad;
  } else {
    DF.ctx.fillStyle = getAlphaColor("panel", 0.25);
  }
  DF.ctx.fillRect(0, DF.height - 32, DF.width, 32);
  DF.ctx.restore();

}
function updateDogfight(now) {
  if (!dogfightAnimId) return;
  dogfightAnimId = requestAnimationFrame(updateDogfight);
  if (now && DF.lastTime && (now - DF.lastTime < 33)) return;
  DF.lastTime = now;
  DF.ctx.clearRect(0, 0, DF.width, DF.height);
  if (!hasAnyActiveGen()) return;
  var colors = getThemeColors();
  dfDrawGrid(colors);
  dfStepSim();
  dfDrawAircraft(now, colors);
  dfStepProjectiles(colors);
  updateAndDrawWreckage(DF.ctx, 1.0, DF.height);
  updateAndDrawVfxParticles(DF.ctx, 1.0, DF.height, colors);
  globalHudFrameCount = (globalHudFrameCount + 1) | 0;
}
