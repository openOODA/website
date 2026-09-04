// # Jet gens 1-4
//
// Logline: Sabre, Starfighter, Phantom, Tomcat/Viper.
//
DRAW_JET[1] = function (ctx, jet, fPrimary, fAccent) {
  // Base airframe hull
  ctx.fillRect(8, -1, 3, 3);
  ctx.fillRect(0, -3, 8, 7);
  ctx.fillRect(-8, -2, 8, 5);
  ctx.fillRect(-2, -9, 4, 7);
  ctx.fillRect(-2, 3, 4, 7);
  ctx.fillRect(-9, -4, 3, 3);

  // Faction Accents: Nose intake ring, wingtip caps, tail flash, roundel
  ctx.fillStyle = fPrimary;
  ctx.fillRect(9, -1, 2, 3); // Nose intake lip ring
  ctx.fillRect(-9, -3, 2, 2); // Vertical fin flash
  ctx.fillStyle = fAccent;
  ctx.fillRect(-2, -9, 4, 2); // Port wingtip cap
  ctx.fillRect(-2, 8, 4, 2); // Starboard wingtip cap
  ctx.fillStyle = fPrimary;
  ctx.fillRect(2, -1, 3, 3); // Fuselage roundel
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(3, 0, 1, 1);

};
DRAW_JET[2] = function (ctx, jet, fPrimary, fAccent) {
  // Base pencil airframe & stub wings
  ctx.fillRect(11, 0, 4, 1);
  ctx.fillRect(0, -1, 11, 3);
  ctx.fillRect(-10, -2, 10, 5);
  ctx.fillRect(-3, -7, 4, 5);
  ctx.fillRect(-3, 3, 4, 5);
  ctx.fillRect(-10, -5, 3, 4);
  ctx.fillRect(-12, -6, 5, 2);

  // Faction Accents: Dorsal spine stripe, wingtip tip tanks/rails, T-tail tip
  ctx.fillStyle = fPrimary;
  ctx.fillRect(2, 0, 7, 1); // Dorsal high-vis team stripe
  ctx.fillRect(-12, -6, 5, 1); // T-tail leading edge flash
  ctx.fillStyle = fAccent;
  ctx.fillRect(-4, -8, 5, 2); // Port wingtip missile rail / tip tank
  ctx.fillRect(-4, 7, 5, 2); // Starboard wingtip missile rail / tip tank
  ctx.fillRect(13, 0, 2, 1); // Pitot tip marker

};
DRAW_JET[3] = function (ctx, jet, fPrimary, fAccent) {
  // Base Phantom hull & cranked wings
  ctx.fillRect(6, -2, 6, 5);
  ctx.fillRect(-4, -4, 10, 9);
  ctx.fillRect(-10, -3, 6, 7);
  ctx.fillRect(-4, -11, 6, 8);
  ctx.fillRect(-4, 4, 6, 8);
  ctx.fillRect(-12, -6, 4, 3);
  ctx.fillRect(-12, 4, 4, 3);

  // Faction Accents: Outer dihedral wing panels, intake ramp stripe, taileron tips
  ctx.fillStyle = fPrimary;
  ctx.fillRect(0, -4, 2, 9); // Intake ramp boundary stripe
  ctx.fillRect(-12, -6, 4, 1); // Port taileron tip
  ctx.fillRect(-12, 6, 4, 1); // Starboard taileron tip
  ctx.fillRect(-2, -6, 2, 2); // Port wing insignia
  ctx.fillRect(-2, 5, 2, 2); // Starboard wing insignia
  ctx.fillStyle = fAccent;
  ctx.fillRect(-3, -11, 5, 2); // Port outer wing dihedral tip panel
  ctx.fillRect(-3, 10, 5, 2); // Starboard outer wing dihedral tip panel

};
DRAW_JET[4] = function (ctx, jet, fPrimary, fAccent, isLead, colors, alpha) {
  if (jet && (jet.variant === "F16" || (jet.callsign && jet.callsign.indexOf("VIPER") !== -1))) {
    // F-16 Fighting Falcon: single-engine lightweight agile fighter with cropped delta wings
    ctx.fillRect(8, -1, 4, 2);
    ctx.fillRect(2, -2, 6, 4);
    ctx.fillRect(-6, -3, 8, 6);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(3, -1, 3, 2); // Bubble canopy
    ctx.fillStyle = getAlphaColor("fg", alpha || 0.85);
    // Cropped delta wings with leading-edge strakes
    ctx.beginPath();
    ctx.moveTo(3, -2);
    ctx.lineTo(-4, -11);
    ctx.lineTo(-7, -11);
    ctx.lineTo(-6, -3);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(3, 2);
    ctx.lineTo(-4, 11);
    ctx.lineTo(-7, 11);
    ctx.lineTo(-6, 3);
    ctx.closePath();
    ctx.fill();
    // Ventral fins & single vertical tail
    ctx.fillRect(-10, -1, 4, 2);
    ctx.fillRect(-8, -4, 2, 2);
    ctx.fillRect(-8, 2, 2, 2);

    // F-16 Faction Accents: Wingtip AIM-9 missile rails, LERX strakes, tail cap
    ctx.fillStyle = fAccent;
    ctx.fillRect(-7, -12, 4, 2); // Port wingtip rail
    ctx.fillRect(-7, 11, 4, 2); // Starboard wingtip rail
    ctx.fillStyle = fPrimary;
    ctx.beginPath();
    ctx.moveTo(3, -2); ctx.lineTo(-1, -5); ctx.lineTo(-2, -2); ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(3, 2); ctx.lineTo(-1, 5); ctx.lineTo(-2, 2); ctx.closePath();
    ctx.fill();
    ctx.fillRect(-9, -1, 3, 2); // Vertical tail cap flash
  } else {
    // Central Lifting Pancake Body & Radome Nose
    ctx.fillRect(10, 0, 5, 1);
    ctx.fillRect(3, -1, 7, 3);
    ctx.fillRect(-8, -4, 12, 9);
    
    // Fixed Titanium Wing Glove Boxes
    ctx.fillRect(-2, -7, 6, 4);
    ctx.fillRect(-2, 4, 6, 4);

    // Twin Engine Nacelles
    ctx.fillRect(-12, -5, 5, 3);
    ctx.fillRect(-12, 3, 5, 3);

    // Twin Outward-Canted Vertical Stabilizers
    ctx.fillRect(-10, -5, 4, 2);
    ctx.fillRect(-10, 4, 4, 2);

    // All-Moving Horizontal Stabilators (Tailerons)
    ctx.fillRect(-13, -7, 4, 3);
    ctx.fillRect(-13, 5, 4, 3);

    // F-14 Faction Accents: Glove vane trims, twin vertical stabilizer fin caps
    ctx.fillStyle = fPrimary;
    ctx.fillRect(-2, -7, 4, 1); // Port glove vane accent
    ctx.fillRect(-2, 7, 4, 1); // Starboard glove vane accent
    ctx.fillRect(-10, -5, 4, 1); // Port outer fin flash
    ctx.fillRect(-10, 5, 4, 1); // Starboard outer fin flash

    // Dynamic Variable-Geometry Swing Wings (20° forward to 68° delta)
    var sweepRatio = (jet && typeof jet.wingSweep === "number") ? jet.wingSweep : 0.2;
    var sweepRad = 0.35 + sweepRatio * 0.83;

    // Left Swing Wing (Pivoting around (-2, -5))
    ctx.save();
    ctx.translate(-2, -5);
    ctx.rotate(-sweepRad);
    ctx.fillStyle = getAlphaColor("fg", alpha || 0.85);
    ctx.fillRect(-2, -9, 4, 10);
    ctx.fillStyle = fAccent;
    ctx.fillRect(0, -10, 2, 2); // Port swing wingtip beacon
    ctx.restore();

    // Right Swing Wing (Pivoting around (-2, 5))
    ctx.save();
    ctx.translate(-2, 5);
    ctx.rotate(sweepRad);
    ctx.fillStyle = getAlphaColor("fg", alpha || 0.85);
    ctx.fillRect(-2, 0, 4, 10);
    ctx.fillStyle = fAccent;
    ctx.fillRect(0, 9, 2, 2); // Starboard swing wingtip beacon
    ctx.restore();
  }

};
