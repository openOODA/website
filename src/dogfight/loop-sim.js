// # Frame sim
//
// Logline: Wipeout, tactics, physics, collisions.
//
function dfStepSim() {
  // 1. Wipeout Detection, Dying Decay & Wave Ingress Timers
  var blueActiveCount = 0;
  for (var bi = 0; bi < DF.bluePool.length; bi++) {
    var bj = DF.bluePool[bi];
    if (bj.isDying) {
      bj.deathTimer--;
      bj.fadeAlpha = Math.max(0.0, bj.deathTimer / 45.0);
      if (bj.deathTimer <= 0) {
        bj.active = false;
        bj.isDying = false;
        bj.fadeAlpha = 0.0;
      }
    } else if (bj.active) {
      blueActiveCount++;
    }
  }

  var redActiveCount = 0;
  for (var ri = 0; ri < DF.redPool.length; ri++) {
    var rj = DF.redPool[ri];
    if (rj.isDying) {
      rj.deathTimer--;
      rj.fadeAlpha = Math.max(0.0, rj.deathTimer / 45.0);
      if (rj.deathTimer <= 0) {
        rj.active = false;
        rj.isDying = false;
        rj.fadeAlpha = 0.0;
      }
    } else if (rj.active) {
      redActiveCount++;
    }
  }

  // Wipeout Patrol Cruise Transition & Screen-Edge Scramble Timers
  if (redActiveCount === 0 && blueActiveCount > 0) {
    // Blue Force Wins Round -> Patrol Cruise
    for (var bpc = 0; bpc < DF.bluePool.length; bpc++) {
      var bpJet = DF.bluePool[bpc];
      if (bpJet.active && !bpJet.isDying) {
        bpJet.mode = "PATROL";
        bpJet.afterburner = false;
        bpJet.targetJet = null;
        if (Math.abs(Math.sin(bpJet.angle)) > 0.15) {
          bpJet.targetAngle = (Math.cos(bpJet.angle) >= 0) ? 0.0 : Math.PI;
        }
      }
    }
    DF.redIngressTimer++;
    if (DF.redIngressTimer >= 90) { // 3.0s tactical ingress delay
      DF.redIngressTimer = 0;
      scrambleWave("red");
    }
  } else if (blueActiveCount === 0 && redActiveCount > 0) {
    // Red Force Wins Round -> Patrol Cruise
    for (var rpc = 0; rpc < DF.redPool.length; rpc++) {
      var rpJet = DF.redPool[rpc];
      if (rpJet.active && !rpJet.isDying) {
        rpJet.mode = "PATROL";
        rpJet.afterburner = false;
        rpJet.targetJet = null;
        if (Math.abs(Math.sin(rpJet.angle)) > 0.15) {
          rpJet.targetAngle = (Math.cos(rpJet.angle) >= 0) ? 0.0 : Math.PI;
        }
      }
    }
    DF.blueIngressTimer++;
    if (DF.blueIngressTimer >= 90) {
      DF.blueIngressTimer = 0;
      scrambleWave("blue");
    }
  } else if (blueActiveCount === 0 && redActiveCount === 0) {
    DF.blueIngressTimer++;
    DF.redIngressTimer++;
    if (DF.blueIngressTimer >= 90) {
      DF.blueIngressTimer = 0;
      scrambleWave("blue");
    }
    if (DF.redIngressTimer >= 90) {
      DF.redIngressTimer = 0;
      scrambleWave("red");
    }
  } else {
    DF.blueIngressTimer = 0;
    DF.redIngressTimer = 0;
  }

  // 2. Mutual Cross-Targeting & Tactical Swarm AI
  updateTacticalManeuvers(DF.bluePool, DF.redPool);
  updateTacticalManeuvers(DF.redPool, DF.bluePool);

  // 3. Physics & Weapon Simulation for all active aircraft
  for (var aji = 0; aji < DF.allJets.length; aji++) {
    var airframe = DF.allJets[aji];
    if (!airframe.active || airframe.isDying) continue;

    var isBlueAirframe = (airframe.team === "blue");
    var hostileTeam = isBlueAirframe ? 1 : 0;

    // Check incoming threat missile
    var threatMissile = false;
    var threatMissileIdx = -1;
    var minMDist = 999999;
    for (var tm = 0; tm < DF.missilesPool.activeCount; tm++) {
      var tmo = tm * 8;
      if (DF.missilesPool.buffer[tmo + 4] === hostileTeam) {
        var tmx = DF.missilesPool.buffer[tmo];
        var tmy = DF.missilesPool.buffer[tmo + 1];
        var mDist = Math.hypot(tmx - airframe.x, tmy - airframe.y);
        if (mDist < minMDist && mDist < 220) {
          minMDist = mDist;
          threatMissile = true;
          threatMissileIdx = tm;
        }
      }
    }

    // Gen 6 Mothership 150 kW DEW Laser CIWS Intercept
    if (airframe.gen === 6 && threatMissile && threatMissileIdx >= 0 && (typeof airframe.laserCooldown === "undefined" || airframe.laserCooldown <= 0)) {
      airframe.laserCooldown = 35;
      airframe.dewCiwsActive = true;
      var ctmo = threatMissileIdx * 8;
      var ctmx = DF.missilesPool.buffer[ctmo];
      var ctmy = DF.missilesPool.buffer[ctmo + 1];
      DF.ctx.save();
      DF.ctx.strokeStyle = "rgba(0, 240, 255, 0.85)";
      DF.ctx.lineWidth = 4.5;
      DF.ctx.beginPath();
      DF.ctx.moveTo(airframe.x, airframe.y);
      DF.ctx.lineTo(ctmx, ctmy);
      DF.ctx.stroke();

      DF.ctx.strokeStyle = "#ffffff";
      DF.ctx.lineWidth = 2.0;
      DF.ctx.beginPath();
      DF.ctx.moveTo(airframe.x, airframe.y);
      DF.ctx.lineTo(ctmx, ctmy);
      DF.ctx.stroke();
      DF.ctx.restore();

      DF.missilesPool.buffer[ctmo + 6] = 0; // 1-tick speed-of-light vaporize

      if (globalVfxParticlePool) {
        var spkIdx = globalVfxParticlePool.alloc();
        if (spkIdx >= 0) {
          var spo = spkIdx * 8;
          globalVfxParticlePool.buffer[spo] = ctmx;
          globalVfxParticlePool.buffer[spo + 1] = ctmy;
          globalVfxParticlePool.buffer[spo + 2] = (Math.random() - 0.5) * 4;
          globalVfxParticlePool.buffer[spo + 3] = (Math.random() - 0.5) * 4;
          globalVfxParticlePool.buffer[spo + 4] = 12;
          globalVfxParticlePool.buffer[spo + 5] = 12;
          globalVfxParticlePool.buffer[spo + 6] = 4.0;
          globalVfxParticlePool.buffer[spo + 7] = 2; // Shockwave ring
        }
      }
      dfRadio(airframe.callsign + " 150 kW DEW CIWS: DIRECTED-ENERGY THERMAL INTERCEPT (MISSILE VAPORIZED)");
    } else {
      airframe.dewCiwsActive = false;
    }

    updateJetPhysics(airframe, airframe.targetJet, threatMissile, isBlueAirframe ? DF.redPool : DF.bluePool, DF.missilesPool);
    evaluateJetWeapons(airframe, airframe.targetJet, getThemeColors());
  }

  // 4. Pairwise Mid-Air Dynamic Merge & Collision Detection
  for (var c1 = 0; c1 < DF.allJets.length; c1++) {
    var colJet1 = DF.allJets[c1];
    if (!colJet1.active || colJet1.isDying) continue;
    for (var c2 = c1 + 1; c2 < DF.allJets.length; c2++) {
      var colJet2 = DF.allJets[c2];
      if (!colJet2.active || colJet2.isDying) continue;
      var pDist = Math.hypot(colJet1.x - colJet2.x, colJet1.y - colJet2.y);
      var relSpeed = Math.hypot(
        Math.cos(colJet1.angle) * colJet1.speed - Math.cos(colJet2.angle) * colJet2.speed,
        Math.sin(colJet1.angle) * colJet1.speed - Math.sin(colJet2.angle) * colJet2.speed
      );
      if (pDist < 6.0 && relSpeed < 4.0) {
        // Direct catastrophic mid-air fuselage ram
        applyAirframeDamage(colJet1, 100.0, colJet2, "COLLISION");
        applyAirframeDamage(colJet2, 100.0, colJet1, "COLLISION");
        dfRadio("TACTICAL ALERT: MID-AIR COLLISION -> " + colJet1.callsign + " & " + colJet2.callsign + " MUTUAL DESTRUCTION!");
      } else if (pDist < 32.0 && relSpeed > 5.0 && (colJet1.speed > 4.5 || colJet2.speed > 4.5)) {
        // High-speed 3D supersonic merge pass: spawn near-miss transonic vapor effects
        if (Math.random() < 0.15) {
          dfRadio("TACTICAL MERGE: " + colJet1.callsign + " & " + colJet2.callsign + " HIGH-SPEED PASS -> TRANSITIONING TO DOGFIGHT!");
        }
      }
    }
  }

}
