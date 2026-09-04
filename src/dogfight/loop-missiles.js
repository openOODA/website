// # Frame missiles
//
// Logline: Guide, decoy, and detonate missiles.
//
function dfStepMissiles() {
  // 7. Simulate & Collide Missiles
  for (var mi = DF.missilesPool.activeCount - 1; mi >= 0; mi--) {
    var mo = mi * 8;
    var misX = DF.missilesPool.buffer[mo];
    var misY = DF.missilesPool.buffer[mo + 1];
    var misVx = DF.missilesPool.buffer[mo + 2];
    var misVy = DF.missilesPool.buffer[mo + 3];
    var misOwnerTeam = DF.missilesPool.buffer[mo + 4]; // 0 = Blue, 1 = Red
    var tgtSlot = Math.round(DF.missilesPool.buffer[mo + 5]);
    var misLife = DF.missilesPool.buffer[mo + 6];
    var misType = DF.missilesPool.buffer[mo + 7];

    var oppPool = (misOwnerTeam === 0) ? DF.redPool : DF.bluePool;
    var friendlyLauncherPool = (misOwnerTeam === 0) ? DF.bluePool : DF.redPool;
    var launcherJet = friendlyLauncherPool[0];

    var tgtJet = (tgtSlot >= 0 && tgtSlot < oppPool.length && oppPool[tgtSlot].active && !oppPool[tgtSlot].isDying) ? oppPool[tgtSlot] : null;
    if (!tgtJet) {
      for (var opi = 0; opi < oppPool.length; opi++) {
        if (oppPool[opi].active && !oppPool[opi].isDying) {
          tgtJet = oppPool[opi];
          break;
        }
      }
    }

    var tgtX = null;
    var tgtY = null;
    var isDecoyed = false;
    var isRadarMissile = (misType === 3 || misType === 4 || misType === 5);
    var isIrMissile = (misType === 1 || misType === 2 || misType === 6);

    if (isIrMissile && DF.flaresPool.activeCount > 0 && Math.random() < 0.75) {
      tgtX = DF.flaresPool.buffer[0];
      tgtY = DF.flaresPool.buffer[1];
      isDecoyed = true;
    } else if (isRadarMissile && DF.chaffPool.activeCount > 0 && Math.random() < 0.80) {
      tgtX = DF.chaffPool.buffer[0];
      tgtY = DF.chaffPool.buffer[1];
      isDecoyed = true;
    } else if (tgtJet) {
      tgtX = tgtJet.x;
      tgtY = tgtJet.y;
    }

    // SARH lost lock check
    if (misType === 3 && launcherJet && launcherJet.active && tgtX !== null && !isDecoyed) {
      var hBearing = Math.atan2(tgtY - launcherJet.y, tgtX - launcherJet.x);
      var hConeDiff = Math.abs(launcherJet.angle - hBearing);
      while (hConeDiff > Math.PI) hConeDiff = Math.abs(hConeDiff - Math.PI * 2);
      if (hConeDiff > 0.55) {
        tgtX = null; tgtY = null; isDecoyed = true;
        dfRadio("TACTICAL WARNING: AIM-7 LOST RADAR LOCK (TRACK CONE EXCEEDED)");
      }
    }

    // Doppler Beam Notching check for radar-guided missiles
    if (isRadarMissile && tgtJet && tgtJet.active && !tgtJet.isDying && tgtX !== null && !isDecoyed) {
      var misHeading = Math.atan2(misVy, misVx);
      var targetMisAspect = Math.abs(tgtJet.angle - misHeading);
      while (targetMisAspect > Math.PI) targetMisAspect = Math.abs(targetMisAspect - Math.PI * 2);
      var targetMisAspectDeg = targetMisAspect * (180.0 / Math.PI);
      if (Math.abs(targetMisAspectDeg - 90.0) <= 15.001) {
        tgtX = null; tgtY = null; isDecoyed = true;
        if (Math.random() < 0.25) {
          dfRadio("TACTICAL ALERT: " + tgtJet.callsign + " DOPPLER NOTCHED RADAR MISSILE (LOCK BROKEN)");
        }
      }
    }

    // VLO Stealth Seeker Degradation & Lost-Lock Check
    if (tgtJet && tgtJet.active && !tgtJet.isDying && tgtX !== null && !isDecoyed) {
      var misDist = Math.hypot(tgtJet.x - misX, tgtJet.y - misY);
      var seekerEval = (typeof evaluateMissileSeekerDegradation === "function")
        ? evaluateMissileSeekerDegradation(misType, tgtJet, misDist)
        : null;
      if (seekerEval && (seekerEval.degraded || seekerEval.lostLock)) {
        tgtX = null;
        tgtY = null;
        isDecoyed = true;
        var tCall = (tgtJet && tgtJet.callsign) ? tgtJet.callsign : "TARGET";
        var alertMsg = "TACTICAL ALERT: MISSILE SEEKER LOST TRACK ON " + tCall + " (VLO STEALTH DEGRADATION)";
        if (typeof triggerTacticalRadio === "function") {
          triggerTacticalRadio(alertMsg);
        } else if (typeof dfRadio === "function") {
          dfRadio(alertMsg);
        }
      }
    }

    var curSpeed = Math.hypot(misVx, misVy);
    var maxMSpeed = (misType === 4) ? 12.5 : 11.5;
    var nextSpeed = Math.min(curSpeed + 0.08, maxMSpeed);

    if (tgtX !== null && !isDecoyed) {
      var targetBearing = Math.atan2(tgtY - misY, tgtX - misX);
      var mda = targetBearing - Math.atan2(misVy, misVx);
      while (mda < -Math.PI) mda += Math.PI * 2;
      while (mda > Math.PI) mda -= Math.PI * 2;

      var mTurn = Math.min(Math.max(mda * 0.14, -0.12), 0.12);
      var newAngle = Math.atan2(misVy, misVx) + mTurn;
      misVx = Math.cos(newAngle) * nextSpeed;
      misVy = Math.sin(newAngle) * nextSpeed;
    } else {
      var curAngle = Math.atan2(misVy, misVx);
      misVx = Math.cos(curAngle) * nextSpeed;
      misVy = Math.sin(curAngle) * nextSpeed;
    }

    misX += misVx;
    misY += misVy;
    misLife--;

    DF.missilesPool.buffer[mo] = misX;
    DF.missilesPool.buffer[mo + 1] = misY;
    DF.missilesPool.buffer[mo + 2] = misVx;
    DF.missilesPool.buffer[mo + 3] = misVy;
    DF.missilesPool.buffer[mo + 6] = misLife;

    var smoke = DF.missileSmokes[mi];
    smoke.push(misX, misY, 0.85, 0);

    smoke.forEach(function (sx, sy, alpha, extra, i, idx) {
      var so = idx * smoke.stride;
      smoke.buffer[so + 2] *= 0.91;
      var sa = smoke.buffer[so + 2];
      DF.ctx.fillStyle = getAlphaColor("fg", sa * 0.35);
      DF.ctx.fillRect(Math.floor(sx), Math.floor(sy), 2, 2);
    });

    DF.ctx.fillStyle = getAlphaColor("fg", 1.0);
    DF.ctx.fillRect(Math.floor(misX) - 2, Math.floor(misY) - 1, 5, 3);

    var isDetonated = false;
    if (tgtX !== null && Math.hypot(tgtX - misX, tgtY - misY) < 22 && misLife > 0) {
      isDetonated = true;
      if (isDecoyed) {
        dfRadio("TACTICAL WARNING: MISSILE DECOYED BY COUNTERMEASURES!");
      } else if (tgtJet) {
        if (tgtJet.gen === 7) {
          tgtJet.shieldPulse = 1.0;
          dfRadio((tgtJet.callsign || "SWARM") + ": QUANTUM SHIELD DEFLECTED MISSILE");
        } else if (tgtJet.gen === 6 && tgtJet.laserCooldown <= 0) {
          tgtJet.laserCooldown = 35;
          dfRadio((tgtJet.callsign || "GEN 6 NGAD") + ": LASER CIWS VAPORIZED THREAT MISSILE!");
        } else {
          var mDamage = 75.0 + Math.random() * 10.0;
          var wName = "AIM_7";
          if (misType === 1) { mDamage = 60.0 + Math.random() * 10.0; wName = "AIM_9B"; }
          else if (misType === 3) { mDamage = 75.0 + Math.random() * 10.0; wName = "AIM_7"; }
          else if (misType === 4) { mDamage = 85.0 + Math.random() * 15.0; wName = "AIM_9L"; }
          else if (misType === 5) { mDamage = 90.0 + Math.random() * 10.0; wName = "AIM_120D"; }

          var mLethal = applyAirframeDamage(tgtJet, mDamage, launcherJet, wName);
          if (mLethal) {
            dfRadio("FOX DIRECT IMPACT! " + tgtJet.callsign + " SPLASHED");
          } else {
            dfRadio("FOX DIRECT HIT -> " + tgtJet.callsign + " IN FLAMES!");
            if (globalVfxParticlePool) {
              for (var spk = 0; spk < 6; spk++) {
                var spkIdx = globalVfxParticlePool.alloc();
                if (spkIdx >= 0) {
                  var spko = spkIdx * 8;
                  globalVfxParticlePool.buffer[spko] = tgtJet.x;
                  globalVfxParticlePool.buffer[spko + 1] = tgtJet.y;
                  globalVfxParticlePool.buffer[spko + 2] = (Math.random() - 0.5) * 6;
                  globalVfxParticlePool.buffer[spko + 3] = (Math.random() - 0.5) * 6;
                  globalVfxParticlePool.buffer[spko + 4] = 14;
                  globalVfxParticlePool.buffer[spko + 5] = 14;
                  globalVfxParticlePool.buffer[spko + 6] = 2.0;
                  globalVfxParticlePool.buffer[spko + 7] = 1; // Type 1: Sparks
                }
              }
            }
          }
        }
      }
    }

    if (misLife <= 0 || isDetonated) {
      var lastSlot = DF.missilesPool.activeCount - 1;
      if (mi !== lastSlot) {
        var tmpSmoke = DF.missileSmokes[mi];
        DF.missileSmokes[mi] = DF.missileSmokes[lastSlot];
        DF.missileSmokes[lastSlot] = tmpSmoke;
      }
      DF.missileSmokes[lastSlot].clear();
      DF.missilesPool.free(mi);
    }
  }
}
