// # Jet physics turn
//
// Logline: Turn rate, thrust, drag, sonic boom.
//
function updateJetPhysicsTurn(jet, targetEnemy, spec, isF16, mass, densityRatio, altFt, sCeiling, da) {
  densityRatio = (typeof densityRatio === "number" && densityRatio > 0) ? densityRatio : 1;
  altFt = (typeof altFt === "number") ? altFt : 0;
  sCeiling = (typeof sCeiling === "number") ? sCeiling : 60000;
  if (typeof da !== "number") {
    da = jet.targetAngle - jet.angle;
    while (da < -Math.PI) da += Math.PI * 2;
    while (da > Math.PI) da -= Math.PI * 2;
  }
  var maxTurnRate = spec.maxTurnRate || 0.170;
  if (jet.gen === 1) {
    maxTurnRate = 0.220; // Agile Sabre / MiG-15 gunfighter
  } else if (jet.gen === 2) {
    maxTurnRate = 0.180; // Supersonic Starfighter / Fishbed
  } else if (jet.gen === 3) {
    maxTurnRate = 0.210; // Phantom heavy interceptor
  } else if (jet.gen === 4) {
    if (isF16) {
      maxTurnRate = 0.285; // F-16 agile dogfighter 9G sustained
    } else {
      // F-14 CADC: unswept wings 0.275 max; swept delta 0.190
      maxTurnRate = 0.190 + (1.0 - (jet.wingSweep || 0.0)) * 0.085;
    }
  } else if (jet.gen === 5) {
    maxTurnRate = 0.310; // F-22 3D thrust vectoring super-maneuverability
  } else if (jet.gen === 6) {
    maxTurnRate = 0.330; // NGAD autonomous AI
  } else if (jet.gen === 7) {
    maxTurnRate = 0.360; // Gen 7 decentralized autonomous swarm
  }

  if (jet.speed < DF.V_CORNER) {
    maxTurnRate *= (jet.speed / DF.V_CORNER);
  } else {
    maxTurnRate *= (DF.V_CORNER / jet.speed);
  }

  var bfmTurnMult = 1.0;
  if (jet.mode === "MERGE_PITCHBACK" || jet.mode === "PITCHBACK_REVERSAL" || jet.mode === "MERGE" || jet.mode === "PURSUIT" || jet.mode === "BREAK" || jet.mode === "BOUNDARY_SLICE") {
    bfmTurnMult = 1.35; // boost instantaneous turn rate during high-G dogfight turns
  }
  var effectiveMaxTurn = maxTurnRate * bfmTurnMult;

  // Second-order critically damped angular filtering with turn commitment lock
  var desiredTurnEffort = da * 0.35;
  if (jet.turnDirectionLock !== 0 && Math.abs(da) > 0.02) {
    if (Math.sign(desiredTurnEffort) !== jet.turnDirectionLock) {
      desiredTurnEffort = jet.turnDirectionLock * Math.min(Math.abs(da * 0.35), effectiveMaxTurn);
    }
  }
  desiredTurnEffort = Math.min(Math.max(desiredTurnEffort, -effectiveMaxTurn), effectiveMaxTurn);

  // Second-order critically damped filter (zeta = 1.0, omega_n = 0.40)
  var omegaN = 0.40;
  var targetAngAcc = (omegaN * omegaN * (desiredTurnEffort / 0.35)) - (2.0 * omegaN * (jet.turnRate || 0.0));
  jet.angAcc = Math.min(Math.max(targetAngAcc, -0.07), 0.07);
  jet.turnRate = (jet.turnRate || 0.0) + jet.angAcc;
  jet.turnRate = Math.min(Math.max(jet.turnRate, -effectiveMaxTurn), effectiveMaxTurn);

  jet.angle += jet.turnRate;
  while (jet.angle < -Math.PI) jet.angle += Math.PI * 2;
  while (jet.angle > Math.PI) jet.angle -= Math.PI * 2;

  jet.gForce = Math.min(9.0, 1.0 + (jet.speed * Math.abs(jet.turnRate) * 2.2));

  var thrust = jet.afterburner ? (isF16 ? 0.125 : spec.thrustAB) : (isF16 ? 0.048 : spec.thrustDry);
  if (jet.gen === 4 && !isF16 && jet.wingSweep > 0.7) {
    thrust *= 1.15;
  }

  // Atmospheric density lapse on thrust (Gen 1-6)
  if (jet.gen !== 7) {
    thrust *= Math.pow(densityRatio, 0.85);
  }

  var cd0 = isF16 ? 0.0016 : spec.cd0;
  var kInd = isF16 ? 0.65 : spec.kInduced;
  if (jet.gen === 4 && !isF16) {
    kInd = 0.75 + (jet.wingSweep || 0.0) * 0.40;
  }

  var parasiticDrag = cd0 * jet.speed * jet.speed;
  var inducedDrag = 0.0018 * kInd * (jet.gForce * jet.gForce) / Math.max(jet.speed, 1.0);

  // Gen 1 Transonic Drag Divergence near max speed
  if (jet.gen === 1 && jet.speed > 4.0) {
    var mDiff = (jet.speed - 4.0) / 0.8;
    parasiticDrag += 0.005 * mDiff * mDiff;
  }

  // E-M Induced Drag Surge and Thrust bleed above service ceilings
  if (jet.gen !== 7) {
    var altInducedMult = 1.0;
    if (altFt > sCeiling) {
      var overCeilingRatio = (altFt - sCeiling) / 8000.0;
      altInducedMult += overCeilingRatio * 2.8;
    }
    if (jet.gen === 1 && altFt > 35000) {
      var g1Over = (altFt - 35000) / 10000.0;
      altInducedMult += g1Over * 2.5;
      thrust *= Math.max(0.2, 1.0 - g1Over * 0.4);
    }
    inducedDrag = (inducedDrag * altInducedMult) / Math.max(0.1, densityRatio);
    parasiticDrag *= densityRatio;
  }

  var prevSpeed = typeof jet.prevSpeed === "number" ? jet.prevSpeed : jet.speed;
  var totalDrag = parasiticDrag + inducedDrag;
  var gravityAcc = Math.sin(jet.angle) * DF.GRAVITY;
  var deltaV = (thrust - totalDrag) / mass + gravityAcc;
  jet.speed += deltaV;

  // Dynamic Boyd Specific Excess Power (P_s = speed * (thrust - totalDrag) / mass * 850.0 in ft/s)
  jet.ps = jet.speed * (thrust - totalDrag) / mass * 850.0;

  // Feature 4: Wingtip Tracer Emitters during high-G / transonic maneuvers
  if ((jet.gForce > 4.2 || (jet.speed >= 5.0 && jet.afterburner)) && jet.gen !== 7) {
    var halfSpan = (jet.gen === 1) ? 9 : (jet.gen === 2 ? 7 : (jet.gen === 3 ? 11 : (jet.gen === 4 ? 11 : (jet.gen === 5 ? 11 : 13))));
    var cosA = Math.cos(jet.angle);
    var sinA = Math.sin(jet.angle);
    var portX = jet.x - cosA * 4 + sinA * halfSpan;
    var portY = jet.y - sinA * 4 - cosA * halfSpan;
    var stbdX = jet.x - cosA * 4 - sinA * halfSpan;
    var stbdY = jet.y - sinA * 4 + cosA * halfSpan;

    jet.wingVapor.push(portX, portY, 0.85, 1);
    jet.wingVapor.push(stbdX, stbdY, 0.85, 1);
  } else if (jet.gForce > 3.8 && Math.random() < 0.5) {
    var vxVap = jet.x - Math.cos(jet.angle) * 8 + Math.sin(jet.angle) * (Math.random() > 0.5 ? 8 : -8);
    var vyVap = jet.y - Math.sin(jet.angle) * 8 - Math.cos(jet.angle) * (Math.random() > 0.5 ? 8 : -8);
    jet.wingVapor.push(vxVap, vyVap, 0.6, 0);
  }

  if (jet.speed <= DF.V_STALL && jet.gen !== 7) {
    jet.speed = DF.V_STALL;
    if (!jet.isStalled) {
      jet.isStalled = true;
      jet.stallBuffet = 1.0;
      dfRadio((jet.callsign || spec.callsign) + ": CRITICAL STALL WARNING! NOSE DROPPING!");
    }
  }

  if (jet.speed > spec.maxSpeed) jet.speed = spec.maxSpeed;
  if (jet.speed > DF.V_MAX) jet.speed = DF.V_MAX;

  // Transonic crossing trigger: detect accelerating through Mach 1.0 (5.2 px/frame)
  if (prevSpeed < 5.2 && jet.speed >= 5.2 && jet.gen >= 2) {
    if (globalVfxParticlePool) {
      var swIdx = globalVfxParticlePool.alloc();
      if (swIdx >= 0) {
        var swo = swIdx * 8;
        globalVfxParticlePool.buffer[swo] = jet.x;
        globalVfxParticlePool.buffer[swo + 1] = jet.y;
        globalVfxParticlePool.buffer[swo + 2] = Math.cos(jet.angle) * jet.speed * 0.2;
        globalVfxParticlePool.buffer[swo + 3] = Math.sin(jet.angle) * jet.speed * 0.2;
        globalVfxParticlePool.buffer[swo + 4] = 24; // life
        globalVfxParticlePool.buffer[swo + 5] = 24; // maxLife
        globalVfxParticlePool.buffer[swo + 6] = 6.0; // initial radius (r = 6 -> 60 px)
        globalVfxParticlePool.buffer[swo + 7] = 2; // Type 2: Shockwave ring
      }
    }
  }

  // Hypersonic crossing trigger: detect accelerating through Mach 2.0 (6.8 px/frame) - Double-Ring Plasma Shockwave
  if (prevSpeed < 6.8 && jet.speed >= 6.8 && jet.gen >= 2) {
    if (globalVfxParticlePool) {
      for (var dRing = 0; dRing < 2; dRing++) {
        var swIdx2 = globalVfxParticlePool.alloc();
        if (swIdx2 >= 0) {
          var swo2 = swIdx2 * 8;
          globalVfxParticlePool.buffer[swo2] = jet.x;
          globalVfxParticlePool.buffer[swo2 + 1] = jet.y;
          globalVfxParticlePool.buffer[swo2 + 2] = Math.cos(jet.angle) * jet.speed * 0.25;
          globalVfxParticlePool.buffer[swo2 + 3] = Math.sin(jet.angle) * jet.speed * 0.25;
          globalVfxParticlePool.buffer[swo2 + 4] = 28 + dRing * 6;
          globalVfxParticlePool.buffer[swo2 + 5] = 28 + dRing * 6;
          globalVfxParticlePool.buffer[swo2 + 6] = 5.0 + dRing * 4.0;
          globalVfxParticlePool.buffer[swo2 + 7] = 2; // Type 2: Shockwave ring
        }
      }
    }
  }
  jet.prevSpeed = jet.speed;
}
