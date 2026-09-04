// # Jet silhouette dispatch
//
// Logline: Faction paint then gen drawer.
//
var DRAW_JET = {};
function drawJetSilhouette(ctx, gen, isLead, colors, alpha, time, jet) {
  ctx.save();
  ctx.fillStyle = getAlphaColor("fg", alpha || 0.85);
  ctx.strokeStyle = getAlphaColor("fg", alpha || 0.85);
  var isRed = Boolean(jet && (jet.team === "red" || jet.isRed));
  var faction = isRed ? FACTION_COLORS.red : FACTION_COLORS.blue;
  var fn = DRAW_JET[gen];
  if (fn) fn(ctx, jet, faction.primary, faction.accent, isLead, colors, alpha, time);
  else {
    ctx.fillRect(0, -2, 10, 5);
    ctx.fillRect(-6, -6, 8, 4);
    ctx.fillRect(-6, 3, 8, 4);
    ctx.fillStyle = faction.primary;
    ctx.fillRect(2, -1, 4, 2);
  }
  ctx.restore();
}
