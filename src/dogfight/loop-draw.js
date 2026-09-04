// # Frame draw
//
// Logline: Aircraft silhouettes and vapor.
//
function dfDrawAircraft(now, colors) {
  // 5. Render Aircraft Visuals
  for (var rji = 0; rji < DF.allJets.length; rji++) {
    var rJet = DF.allJets[rji];
    if (rJet.isDying) {
      continue;
    }
    if (!rJet.active) continue;

    var rFaction = (rJet.team === "red" || rJet.isRed) ? FACTION_COLORS.red : FACTION_COLORS.blue;

    if (rJet.contrail) rJet.contrail.forEach(function (cx, cy, alpha, g, i, idx) {
      var co = idx * rJet.contrail.stride;
      rJet.contrail.buffer[co + 2] *= 0.93;
      var a = rJet.contrail.buffer[co + 2];
      DF.ctx.fillStyle = getAlphaColor("fg", a * (g > 4.0 ? 0.45 : 0.2));
      DF.ctx.fillRect(Math.floor(cx), Math.floor(cy), (g > 5.0 ? 3 : 2), (g > 5.0 ? 3 : 2));
    });

    // Wing Vapor & Wingtip Faction Tracers
    if (rJet.wingVapor) rJet.wingVapor.forEach(function (vx, vy, alpha, extra, i, idx) {
      var vo = idx * rJet.wingVapor.stride;
      rJet.wingVapor.buffer[vo + 2] *= 0.88;
      var a = rJet.wingVapor.buffer[vo + 2];
      if (extra === 1) {
        DF.ctx.fillStyle = rFaction.accent;
        DF.ctx.fillRect(Math.floor(vx), Math.floor(vy), 2, 2);
      } else {
        DF.ctx.fillStyle = getAlphaColor("fg", a * 0.5);
        DF.ctx.fillRect(Math.floor(vx), Math.floor(vy), 3, 3);
      }
    });

    // Jet Silhouette, Condensation Vapor Collar & Thrust-Scaled Exhaust
    DF.ctx.save();
    DF.ctx.translate(Math.floor(rJet.x), Math.floor(rJet.y));
    DF.ctx.rotate(rJet.angle);

    // Aerodynamic condensation vapor collar (Prandtl-Glauert cloud) in transonic regime
    if (rJet.gen >= 2 && rJet.speed >= 5.0 && rJet.speed <= 6.2) {
      var vaporRatio = 1.0 - Math.abs(rJet.speed - 5.5) / 0.7;
      if (vaporRatio > 0) {
        DF.ctx.save();
        DF.ctx.strokeStyle = (typeof getAlphaColor === "function") ? getAlphaColor("fg", vaporRatio * 0.65) : "rgba(255,255,255,0.65)";
        DF.ctx.fillStyle = (typeof getAlphaColor === "function") ? getAlphaColor("panel", vaporRatio * 0.35) : "rgba(100,100,100,0.35)";
        DF.ctx.lineWidth = 1.6;
        DF.ctx.beginPath();
        if (typeof DF.ctx.ellipse === "function") {
          DF.ctx.ellipse(-6, 0, 10, 22, 0, -Math.PI * 0.45, Math.PI * 0.45);
        } else {
          DF.ctx.arc(-6, 0, 16, -Math.PI * 0.45, Math.PI * 0.45);
        }
        DF.ctx.stroke();
        DF.ctx.fill();
        DF.ctx.restore();
      }
    }

    drawThrustScaledExhaust(DF.ctx, rJet, colors, now);
    drawJetSilhouette(DF.ctx, rJet.gen, rJet.isLead, colors, rJet.isLead ? 0.95 : 0.85, now, rJet);
    DF.ctx.restore();

    if (rJet.gen === 6) {
      updateAndDrawCcaDrones(rJet, rJet.isLead, colors);
    }

    // Clean aircraft silhouette with in-world floating health bar
    drawInWorldHealthBar(DF.ctx, rJet, colors, globalHudFrameCount);
  }

}
