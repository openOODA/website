// # OODA observe/orient
//
// Logline: Threat scan, flares, chaff, tactics.
//
function oodaDeployFlares(jet, pool) {
  if (!jet || !pool) return 0;
  var spec = (typeof AIRCRAFT_SPECS !== "undefined" && AIRCRAFT_SPECS[jet.gen]) ? AIRCRAFT_SPECS[jet.gen] : {};
  if (spec.hasFlares === false || jet.gen < 3) return 0;
  if (typeof jet.flareCooldown === "number" && jet.flareCooldown > 0) return 0;

  var count = 0;
  for (var f = 0; f < 6; f++) {
    var flIdx = pool.alloc();
    if (flIdx >= 0) {
      count++;
      var fo = flIdx * 5;
      pool.buffer[fo] = jet.x - Math.cos(jet.angle) * 12 + (Math.random() - 0.5) * 4;
      pool.buffer[fo + 1] = jet.y - Math.sin(jet.angle) * 12 + (Math.random() - 0.5) * 4;
      pool.buffer[fo + 2] = -Math.cos(jet.angle) * 2.5 + (Math.random() - 0.5) * 4;
      pool.buffer[fo + 3] = -Math.sin(jet.angle) * 2.5 + (Math.random() - 0.5) * 4;
      pool.buffer[fo + 4] = 1.0;
    }
  }
  jet.flareCooldown = (jet.gen === 4 ? 60 : 80);
  return count;
}

function oodaDeployChaff(jet, pool) {
  if (!jet || !pool) return 0;
  var spec = (typeof AIRCRAFT_SPECS !== "undefined" && AIRCRAFT_SPECS[jet.gen]) ? AIRCRAFT_SPECS[jet.gen] : {};
  if (spec.hasChaff === false || jet.gen < 3) return 0;
  if (typeof jet.chaffCooldown === "number" && jet.chaffCooldown > 0) return 0;

  var count = 0;
  for (var c = 0; c < 6; c++) {
    var cIdx = pool.alloc();
    if (cIdx >= 0) {
      count++;
      var co = cIdx * 5;
      pool.buffer[co] = jet.x - Math.cos(jet.angle) * 10 + (Math.random() - 0.5) * 6;
      pool.buffer[co + 1] = jet.y - Math.sin(jet.angle) * 10 + (Math.random() - 0.5) * 6;
      pool.buffer[co + 2] = -Math.cos(jet.angle) * 1.5 + (Math.random() - 0.5) * 2;
      pool.buffer[co + 3] = -Math.sin(jet.angle) * 1.5 + (Math.random() - 0.5) * 2;
      pool.buffer[co + 4] = 1.0;
    }
  }
  jet.chaffCooldown = (jet.gen === 4 ? 50 : 70);
  return count;
}

function oodaObserveThreats(jet, opposingPool, missilesPool, width, height) {
  var obs = {
    nearestMissile: null,
    missileDist: 999999,
    missileClosure: 0,
    missileGuidance: "NONE", // "IR" | "RADAR" | "NONE"
    tailingBandit: null,
    banditDist: 999999,
    banditAOT: Math.PI,
    banditAOTDeg: 180.0,
    banditClosure: 0,
    lockedByBandit: false,
    isThreatActive: false
  };

  if (!jet || !jet.active) return obs;
  var spec = (typeof AIRCRAFT_SPECS !== "undefined" && AIRCRAFT_SPECS[jet.gen]) ? AIRCRAFT_SPECS[jet.gen] : { sensorReach: 1100 };

  // 1. Scan Hostile Incoming Missiles
  if (missilesPool && missilesPool.activeCount > 0) {
    var hostileTeam = (jet.team === "blue") ? 1 : 0;
    for (var m = 0; m < missilesPool.activeCount; m++) {
      var mo = m * 8;
      if (missilesPool.buffer[mo + 4] === hostileTeam && missilesPool.buffer[mo + 6] > 0) {
        var mx = missilesPool.buffer[mo];
        var my = missilesPool.buffer[mo + 1];
        var mvx = missilesPool.buffer[mo + 2];
        var mvy = missilesPool.buffer[mo + 3];
        var mType = missilesPool.buffer[mo + 7];
        var d = Math.hypot(mx - jet.x, my - jet.y);

        // Generational sensor detection limit
        var canDetect = true;
        if (jet.gen === 1 && d > 450) canDetect = false;
        else if (jet.gen === 2 && d > 650) canDetect = false;

        if (canDetect && d < obs.missileDist) {
          obs.missileDist = d;
          var relVx = mvx - Math.cos(jet.angle) * jet.speed;
          var relVy = mvy - Math.sin(jet.angle) * jet.speed;
          var closure = -((mx - jet.x) * relVx + (my - jet.y) * relVy) / Math.max(d, 1.0);
          var guidance = (mType === 3 || mType === 4 || mType === 5) ? "RADAR" : "IR";
          obs.missileClosure = closure;
          obs.missileGuidance = guidance;
          obs.nearestMissile = { x: mx, y: my, vx: mvx, vy: mvy, type: mType, dist: d, closure: closure, guidance: guidance, idx: m };
          if (d < 300) {
            obs.isThreatActive = true;
          }
        }
      }
    }
  }

  // 2. Scan Tailing & Hostile Bandits
  if (opposingPool && Array.isArray(opposingPool)) {
    for (var b = 0; b < opposingPool.length; b++) {
      var opp = opposingPool[b];
      if (!opp || !opp.active || opp.isDying) continue;
      var bd = Math.hypot(opp.x - jet.x, opp.y - jet.y);
      var bearingToOpp = Math.atan2(opp.y - jet.y, opp.x - jet.x);
      var tailAngle = jet.angle + Math.PI;
      var aot = Math.abs(bearingToOpp - tailAngle);
      while (aot > Math.PI) aot = Math.abs(aot - Math.PI * 2);
      var aotDeg = aot * (180.0 / Math.PI);

      var oppVx = Math.cos(opp.angle) * opp.speed;
      var oppVy = Math.sin(opp.angle) * opp.speed;
      var myVx = Math.cos(jet.angle) * jet.speed;
      var myVy = Math.sin(jet.angle) * jet.speed;
      var closure = -((opp.x - jet.x) * (oppVx - myVx) + (opp.y - jet.y) * (oppVy - myVy)) / Math.max(bd, 1.0);

      var bearingFromOpp = Math.atan2(jet.y - opp.y, jet.x - opp.x);
      var oppNoseOffset = Math.abs(bearingFromOpp - opp.angle);
      while (oppNoseOffset > Math.PI) oppNoseOffset = Math.abs(oppNoseOffset - Math.PI * 2);

      if (bd < obs.banditDist) {
        obs.banditDist = bd;
        obs.tailingBandit = opp;
        obs.banditAOT = aot;
        obs.banditAOTDeg = aotDeg;
        obs.banditClosure = closure;
        obs.lockedByBandit = (opp.targetJet === jet && (aot < 0.785 || oppNoseOffset < 0.785) && bd < 500);
        if ((aot < 0.785 && bd < 350) || (oppNoseOffset < 0.785 && bd < 350) || (opp.targetJet === jet && bd < 450)) {
          obs.isThreatActive = true;
        }
      }
    }
  }

  return obs;
}

function oodaOrientTactics(jet, obs, altFt, sCeiling) {
  var ori = {
    inLethalMissileZone: (obs && obs.nearestMissile !== null && obs.missileDist < 300),
    tailingThreatActive: (obs && obs.tailingBandit !== null && ((obs.banditAOT < 0.785 && obs.banditClosure > 0.2) || obs.isThreatActive) && obs.banditDist < 260),
    hasAltitudeMargin: (altFt > 15000),
    isEnergyAdvantaged: false,
    recommendedEvasion: "NONE",
    recommendedPursuit: "LEAD"
  };

  if (!jet) return ori;
  var spec = (typeof AIRCRAFT_SPECS !== "undefined" && AIRCRAFT_SPECS[jet.gen]) ? AIRCRAFT_SPECS[jet.gen] : {};

  if (obs && obs.tailingBandit) {
    ori.isEnergyAdvantaged = ((jet.energyHeight || 0) > (obs.tailingBandit.energyHeight || 0));
  }

  var isNearCeiling = (altFt >= 95000 || (typeof jet.y === "number" && jet.y <= 36.0));
  var isHighTW = (jet.gen === 2 || jet.gen === 4 || jet.gen === 5 || jet.gen === 6);
  var isPsPositive = (typeof jet.ps === "undefined" || jet.ps >= 0 || jet.speed >= 4.5);
  var isDefensiveOrTakingFire = (typeof jet.hp === "number" && jet.hp < 75.0);

  if (ori.inLethalMissileZone) {
    if (obs.missileGuidance === "RADAR") {
      if (jet.gen >= 3) {
        ori.recommendedEvasion = "BEAM_NOTCH";
      } else if (jet.gen === 1) {
        ori.recommendedEvasion = "BREAK_MANUAL";
      } else if (jet.gen === 2) {
        ori.recommendedEvasion = (jet.speed > 5.0 && !isNearCeiling ? "ZOOM_CLIMB" : "EXTEND_HIGH_SPEED");
      } else {
        ori.recommendedEvasion = "BREAK_9G";
      }
    } else {
      // IR Missile Lethal Zone
      if (jet.gen >= 3 && jet.gen <= 5) {
        if (isHighTW && isPsPositive && isDefensiveOrTakingFire && !isNearCeiling) {
          ori.recommendedEvasion = "ZOOM_CLIMB";
        } else {
          ori.recommendedEvasion = "BREAK_9G";
        }
      } else if (jet.gen === 2) {
        ori.recommendedEvasion = (jet.speed > 5.0 && !isNearCeiling ? "ZOOM_CLIMB" : "EXTEND_HIGH_SPEED");
      } else if (jet.gen === 1) {
        ori.recommendedEvasion = "BREAK_MANUAL";
      } else if (jet.gen === 6) {
        ori.recommendedEvasion = "DEW_CIWS";
      } else if (jet.gen === 7) {
        ori.recommendedEvasion = "QUANTUM_SHIFT";
      } else {
        ori.recommendedEvasion = "BREAK_9G";
      }
    }
  } else if (ori.tailingThreatActive || (isHighTW && isDefensiveOrTakingFire && isPsPositive && !isNearCeiling && altFt < sCeiling - 3000)) {
    if (isHighTW && isPsPositive && isDefensiveOrTakingFire && !isNearCeiling && altFt < sCeiling - 3000) {
      ori.recommendedEvasion = "ZOOM_CLIMB";
    } else if (jet.gen === 5 && obs && obs.banditClosure > 1.8 && altFt > 8000) {
      ori.recommendedEvasion = "COBRA";
    } else if (jet.gen === 4 && obs && obs.banditClosure > 1.4) {
      ori.recommendedEvasion = "ROLLING_SCISSORS";
    } else if (jet.gen === 3 && ori.hasAltitudeMargin && !ori.isEnergyAdvantaged && !isNearCeiling) {
      ori.recommendedEvasion = "SPLIT_S";
    } else if (jet.gen === 2) {
      ori.recommendedEvasion = (jet.speed > 5.0 && !isNearCeiling ? "ZOOM_CLIMB" : "EXTEND_HIGH_SPEED");
    } else if (jet.gen === 1) {
      ori.recommendedEvasion = "BREAK_MANUAL";
    } else if (jet.gen === 6) {
      ori.recommendedEvasion = "CCA_PINCER";
    } else if (jet.gen === 7) {
      ori.recommendedEvasion = "QUANTUM_SHIFT";
    } else {
      ori.recommendedEvasion = "BREAK_9G";
    }
  } else {
    ori.recommendedEvasion = "NONE";
  }

  // Pursuit geometry selection
  if (obs && obs.tailingBandit && jet.speed > obs.tailingBandit.speed + 2.0) {
    ori.recommendedPursuit = "LAG";
  } else {
    ori.recommendedPursuit = "LEAD";
  }

  return ori;
}
