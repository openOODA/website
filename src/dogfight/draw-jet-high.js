// # Jet gens 5-7
//
// Logline: Raptor, NGAD, quantum swarm.
//
DRAW_JET[5] = function (ctx, jet, fPrimary, fAccent, isLead, colors, alpha) {
  // Base stealth diamond airframe
  ctx.fillRect(7, -1, 5, 3);
  ctx.fillRect(0, -2, 7, 5);
  ctx.fillRect(-6, -11, 8, 9);
  ctx.fillRect(-6, 3, 8, 9);
  ctx.fillRect(-10, -6, 4, 3);
  ctx.fillRect(-10, 4, 4, 3);

  // Faction Accents: Chined stealth trims, outer wingtip facets, canted tail caps, bay perimeter
  ctx.fillStyle = fAccent;
  ctx.fillRect(6, -1, 3, 1); // Chined nose port trim
  ctx.fillRect(6, 1, 3, 1); // Chined nose starboard trim
  ctx.fillRect(-6, -11, 4, 2); // Port outer trapezoidal wing facet
  ctx.fillRect(-6, 10, 4, 2); // Starboard outer trapezoidal wing facet
  ctx.fillStyle = fPrimary;
  ctx.fillRect(-10, -6, 4, 1); // Port canted tail cap
  ctx.fillRect(-10, 6, 4, 1); // Starboard canted tail cap
  ctx.fillRect(-1, -2, 4, 1); // Weapons bay seam port
  ctx.fillRect(-1, 2, 4, 1); // Weapons bay seam starboard

  // Mach 2.0+ (V >= 6.8) High-Energy Dual Plasma Boundary Shear Lines along chined fuselage
  if (jet && jet.speed >= 6.8) {
    ctx.save();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    // Port plasma shear line
    ctx.moveTo(12, 0); ctx.lineTo(6, -3); ctx.lineTo(-6, -12); ctx.lineTo(-10, -6);
    // Starboard plasma shear line
    ctx.moveTo(12, 0); ctx.lineTo(6, 3); ctx.lineTo(-6, 12); ctx.lineTo(-10, 6);
    ctx.stroke();
    ctx.strokeStyle = fAccent;
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.restore();
  }

};
DRAW_JET[6] = function (ctx, jet, fPrimary, fAccent, isLead, colors, alpha, time) {
  // Base lambda cranked-arrow wing
  ctx.fillRect(8, -1, 4, 3);
  ctx.fillRect(2, -4, 6, 9);
  ctx.fillRect(-4, -9, 6, 19);
  ctx.fillRect(-10, -13, 6, 27);

  // Faction Accents: Wingtip beacon trims, dorsal chevron command insignia, CCA docking rail status
  ctx.fillStyle = fAccent;
  ctx.fillRect(-10, -13, 3, 2); // Port lambda wingtip beacon
  ctx.fillRect(-10, 12, 3, 2); // Starboard lambda wingtip beacon
  ctx.fillStyle = fPrimary;
  // Dorsal chevron command insignia
  ctx.beginPath();
  ctx.moveTo(5, 0); ctx.lineTo(1, -3); ctx.lineTo(2, 0); ctx.lineTo(1, 3); ctx.closePath();
  ctx.fill();

  if (!jet || !jet.ccaDeployed) {
    // Mounted / Docked CCA Loyal Wingman Drones on wing pylons
    ctx.fillStyle = getAlphaColor("fg", alpha || 0.85);
    ctx.fillRect(-2, -18, 4, 3);
    ctx.fillRect(-2, 16, 4, 3);
    ctx.fillStyle = fAccent;
    ctx.fillRect(-3, -19, 2, 5); // CCA port drone winglet
    ctx.fillRect(-3, 15, 2, 5); // CCA starboard drone winglet
  } else {
    // Empty release pylons with active faction status glow
    ctx.strokeStyle = fPrimary;
    ctx.lineWidth = 1;
    ctx.strokeRect(-2, -18, 4, 2);
    ctx.strokeRect(-2, 16, 4, 2);
  }

};
DRAW_JET[7] = function (ctx, jet, fPrimary, fAccent, isLead, colors, alpha, time) {
  var d1 = (jet && jet.drone1) || { x: 16, y: 0 };
  var d2 = (jet && jet.drone2) || { x: -6, y: -14 };
  var d3 = (jet && jet.drone3) || { x: -6, y: 14 };

  ctx.save();
  var tNow = time || 0;
  var isChargingSuper = (jet && ((jet.superLaserCooldown > 0 && jet.superLaserCooldown < 35) || jet.superLaserPulse > 0 || jet.swarmMode === "FORM_UP"));

  if (isChargingSuper) {
    // 9 Quantum Globes Fuse / Team Up into a Single Massive Super-Globe / Singularity Projector Ball
    var focalGx = 16;
    var focalGy = 0;
    var masterR = 12 + ((jet.superLaserPulse || 0) * 4);

    // Giant Resonant Outer Quantum Aura in faction glow
    ctx.fillStyle = faction.glow;
    ctx.beginPath();
    ctx.arc(focalGx, focalGy, masterR + 6, 0, Math.PI * 2);
    ctx.fill();

    // Primary Super-Globe Core
    ctx.fillStyle = getAlphaColor("fg", alpha || 0.95);
    ctx.beginPath();
    ctx.arc(focalGx, focalGy, masterR, 0, Math.PI * 2);
    ctx.fill();

    // White-Hot Singularity Plasma Heart
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(focalGx, focalGy, masterR * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // 6 Orbiting Sub-Globes with alternating team colors and white cores
    for (var si = 0; si < 6; si++) {
      var sAng = (tNow * 0.02) + (si * Math.PI / 3);
      var sx = focalGx + Math.cos(sAng) * (masterR + 7);
      var sy = focalGy + Math.sin(sAng) * (masterR + 5);
      ctx.fillStyle = (si % 2 === 0) ? fPrimary : fAccent;
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Resonant Energy Ring in faction accent
    ctx.strokeStyle = fAccent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(focalGx, focalGy, masterR + 10, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // 3 Independent Primary Quantum Spheres / Globes + 6 Orbiting Mini-Globes (9 Total Sovereign Entities)
    var globes = [
      { x: d1.x, y: d1.y, r: 5.5 },
      { x: d2.x, y: d2.y, r: 5.0 },
      { x: d3.x, y: d3.y, r: 5.0 }
    ];

    // Draw each primary quantum globe
    for (var gi = 0; gi < globes.length; gi++) {
      var g = globes[gi];

      // Omni-directional propulsion halo (mastered physics: zero-inertia energetic glow in team color)
      var haloR = g.r + (jet && jet.afterburner ? 3.5 : 1.5);
      ctx.fillStyle = faction.glow;
      ctx.beginPath();
      ctx.arc(g.x, g.y, haloR, 0, Math.PI * 2);
      ctx.fill();

      // Solid Spherical Energy Hull
      ctx.fillStyle = getAlphaColor("fg", alpha || 0.95);
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
      ctx.fill();

      // Luminous White-Hot Singularity Pupil / Core
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r * 0.45, 0, Math.PI * 2);
      ctx.fill();

      // Omni-directional micro-thrust particle trail in team color
      var flLen = (jet && jet.afterburner ? 6 : 2) + Math.random() * 3;
      ctx.fillStyle = fPrimary;
      ctx.fillRect(Math.floor(g.x - g.r - flLen), Math.floor(g.y - 1), flLen, 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(Math.floor(g.x - g.r - Math.floor(flLen * 0.5)), Math.floor(g.y), Math.floor(flLen * 0.5), 1);
    }

    // Swarm of Swarms: 6 Orbiting Mini-Globes / Energy Balls with team highlights
    var tAng1 = tNow * 0.008;
    var tAng2 = tNow * 0.008 + 2.09;
    var tAng3 = tNow * 0.008 + 4.18;

    var subMotes = [
      { x: d1.x + Math.cos(tAng1) * 8.5, y: d1.y + Math.sin(tAng1) * 7.5 },
      { x: d1.x + Math.cos(tAng1 + Math.PI) * 8.5, y: d1.y + Math.sin(tAng1 + Math.PI) * 7.5 },
      { x: d2.x + Math.cos(tAng2) * 7.5, y: d2.y + Math.sin(tAng2) * 6.5 },
      { x: d2.x + Math.cos(tAng2 + Math.PI) * 7.5, y: d2.y + Math.sin(tAng2 + Math.PI) * 6.5 },
      { x: d3.x + Math.cos(tAng3) * 7.5, y: d3.y + Math.sin(tAng3) * 6.5 },
      { x: d3.x + Math.cos(tAng3 + Math.PI) * 7.5, y: d3.y + Math.sin(tAng3 + Math.PI) * 6.5 }
    ];

    for (var mi = 0; mi < subMotes.length; mi++) {
      var sm = subMotes[mi];
      ctx.fillStyle = fAccent;
      ctx.beginPath();
      ctx.arc(sm.x, sm.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(sm.x, sm.y, 1.0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Individual & Collective Quantum Capability Shield Spheres in team color
  if (jet && jet.shieldPulse > 0) {
    ctx.strokeStyle = fAccent;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (isChargingSuper) {
      ctx.arc(16, 0, 22 * jet.shieldPulse, 0, Math.PI * 2);
      ctx.arc(16, 0, 30 * jet.shieldPulse, 0, Math.PI * 2);
    } else {
      ctx.arc(d1.x, d1.y, 10 * jet.shieldPulse, 0, Math.PI * 2);
      ctx.arc(d2.x, d2.y, 9 * jet.shieldPulse, 0, Math.PI * 2);
      ctx.arc(d3.x, d3.y, 9 * jet.shieldPulse, 0, Math.PI * 2);
    }
    ctx.stroke();
    jet.shieldPulse *= 0.90;
  }
  ctx.restore();

};
