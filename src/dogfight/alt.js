// # Altitude and radar
//
// Logline: ISA scale, energy height, lock geometry.
//
function getAltitudeFeet(canvasY, canvasH) {
  var hCanvas = (typeof canvasH === "number" && canvasH > 0) ? canvasH : 900;
  if (hCanvas <= 0) return 0;
  var ratio = 1.0 - (canvasY / hCanvas);
  if (ratio < 0) ratio = 0;
  if (ratio > 1) ratio = 1;
  return ratio * 100000.0;
}

function getYFromAltitude(altFt, canvasH) {
  var hCanvas = (typeof canvasH === "number" && canvasH > 0) ? canvasH : 900;
  if (hCanvas <= 0) return 0;
  var ratio = altFt / 100000.0;
  if (ratio < 0) ratio = 0;
  if (ratio > 1) ratio = 1;
  return (1.0 - ratio) * hCanvas;
}

function getBarometricDensity(altFt) {
  var rho0 = 0.002377; // slug/ft^3 sea level standard air density
  var h = (typeof altFt === "number" && altFt > 0) ? altFt : 0;
  return rho0 * Math.exp(-h / 25000.0);
}

function getDynamicPressure(altFt, speed) {
  var rho = getBarometricDensity(altFt);
  var velFps = (typeof speed === "number" ? speed : 0) * 110.0;
  return 0.5 * rho * velFps * velFps;
}

function calculateEnergyHeight(altitudeFt, speed, g) {
  var h = typeof altitudeFt === "number" ? altitudeFt : 0;
  var v = typeof speed === "number" ? speed : 0;
  var gVal = (typeof g === "number" && g > 0) ? g : 32.174;
  return h + (v * v) / (2.0 * gVal);
}
function calculateAspectAngle(emitterPos, emitterHeading, targetPos) {
  var x1 = 0, y1 = 0, hdg = 0, x2 = 0, y2 = 0;
  if (typeof emitterPos === "object" && emitterPos !== null) {
    x1 = typeof emitterPos.x === "number" ? emitterPos.x : 0;
    y1 = typeof emitterPos.y === "number" ? emitterPos.y : 0;
  }
  if (typeof emitterHeading === "number") {
    hdg = emitterHeading;
  }
  if (typeof targetPos === "object" && targetPos !== null) {
    x2 = typeof targetPos.x === "number" ? targetPos.x : 0;
    y2 = typeof targetPos.y === "number" ? targetPos.y : 0;
  }
  var los = Math.atan2(y2 - y1, x2 - x1);
  var da = Math.abs(hdg - los);
  while (da > Math.PI) da = Math.abs(da - Math.PI * 2);
  return da * (180.0 / Math.PI);
}

function calculateRadarDetectionRange(emitterGen, targetRcs, emitterPower, aspectAngle, bayOpen) {
  var gen = (typeof emitterGen === "number") ? emitterGen : 4;
  var specE = (typeof AIRCRAFT_SPECS !== "undefined" && AIRCRAFT_SPECS && AIRCRAFT_SPECS[gen]) ? AIRCRAFT_SPECS[gen] : { radarBaseline: 1100 };
  var power = (typeof emitterPower === "number" && emitterPower > 0) ? emitterPower : 1.0;

  var r0 = specE.radarBaseline || specE.sensorReach || 1100;
  if (gen === 1) r0 = 450;
  else if (gen === 2) r0 = 650;
  else if (gen === 3) r0 = 850;
  else if (gen === 4) r0 = 1100;
  else if (gen === 5) r0 = 1300;
  else if (gen === 6) r0 = 1500;
  else if (gen === 7) r0 = 1800;

  var sigma = (typeof targetRcs === "number" && targetRcs >= 0) ? targetRcs : 1.0;
  if (bayOpen) {
    if (sigma < 0.01) {
      sigma = 1.2;
    }
  }
  var sigma0 = 1.0;

  var rMax = r0 * Math.pow(Math.max(0.000001, sigma / sigma0), 0.25) * Math.pow(power, 0.25);

  if (gen === 1) {
    rMax = Math.min(rMax, 450);
  } else if (gen === 2) {
    rMax = Math.min(rMax, 650);
  }

  if (typeof aspectAngle === "number") {
    var deg = aspectAngle;
    while (deg > 180) deg = Math.abs(360 - deg);
    var isBeamAspect = (Math.abs(deg - 90.0) <= 15.001);

    if (isBeamAspect && (gen === 3 || gen === 4)) {
      rMax *= 0.35;
    }
  }

  return rMax;
}

// ============================================================================
// BOYD OODA (Observe-Orient-Decide-Act) TACTICAL STATE MACHINE ENGINE
// ============================================================================
function canAcquireTargetLock(shooter, target, dist, deltaAltFt) {
  if (!shooter || !target) return false;
  var specS = (typeof AIRCRAFT_SPECS !== "undefined" && AIRCRAFT_SPECS[shooter.gen]) ? AIRCRAFT_SPECS[shooter.gen] : { radarBaseline: 1100 };
  var specT = (typeof AIRCRAFT_SPECS !== "undefined" && AIRCRAFT_SPECS[target.gen]) ? AIRCRAFT_SPECS[target.gen] : { rcsClean: 1.0 };

  var d = typeof dist === "number" ? dist : Math.hypot(target.x - shooter.x, target.y - shooter.y);
  var dh = typeof deltaAltFt === "number" ? deltaAltFt : (getAltitudeFeet(target.y, 900) - getAltitudeFeet(shooter.y, 900));

  // Visual only (Gen 1)
  if (shooter.gen === 1) {
    return (d <= 450);
  }

  // Rear-aspect IR only (Gen 2)
  if (shooter.gen === 2) {
    if (d > 650 || Math.abs(dh) > 35000) return false;
    var targetBearing = Math.atan2(target.y - shooter.y, target.x - shooter.x);
    var aspectDiff = Math.abs(target.angle - targetBearing);
    while (aspectDiff > Math.PI) aspectDiff = Math.abs(aspectDiff - Math.PI * 2);
    return (aspectDiff <= 0.75);
  }

  // Radar / sensors equipped (Gen 3+)
  var targetAspectDeg = calculateAspectAngle({ x: shooter.x, y: shooter.y }, target.angle, { x: target.x, y: target.y });
  var isBayOpen = (typeof target.bayDoorTimer === "number" && target.bayDoorTimer > 0);
  var effectiveRcs = isBayOpen ? (specT.rcsBloom || 1.2) : (target.rcs || specT.rcsClean || 1.0);
  var maxRange = calculateRadarDetectionRange(shooter.gen, effectiveRcs, 1.0, targetAspectDeg, isBayOpen);

  if (Math.abs(dh) > 35000 && shooter.gen <= 4) {
    return false;
  }

  return (d <= maxRange);
}

function evaluateMissileSeekerDegradation(misType, tgtJet, dist) {
  if (!tgtJet) {
    return { degraded: false, lostLock: false, trackLossRate: 0, lossRate: 0, reason: "NO_TARGET" };
  }

  // Weapons bay cavity bloom override: opening doors blooms RCS to 1.2 m^2, restoring 100% seeker track
  if (typeof tgtJet.bayDoorTimer === "number" && tgtJet.bayDoorTimer > 0) {
    return { degraded: false, lostLock: false, trackLossRate: 0, lossRate: 0, reason: "BAY_DOOR_BLOOM" };
  }

  var d = (typeof dist === "number") ? dist : 0;
  var gen = tgtJet.gen;
  var rcs = (typeof tgtJet.rcs === "number") ? tgtJet.rcs : 1.0;

  // Gen 7: Quantum Swarm Phase Shift Motes (85% tracking failure rate across all ranges)
  if (gen === 7 || rcs <= 0.00001) {
    var roll7 = Math.random();
    if (roll7 < 0.85) {
      return { degraded: true, lostLock: true, trackLossRate: 0.85, lossRate: 0.85, reason: "GEN7_QUANTUM_PHASE_SHIFT" };
    } else {
      return { degraded: false, lostLock: false, trackLossRate: 0.85, lossRate: 0.85, reason: "GEN7_QUANTUM_PHASE_SHIFT_LOCK" };
    }
  }

  // Gen 6: Advanced VLO Stealth (NGAD / CCAs) (80% track loss at d > 75 px)
  if (gen === 6 || rcs <= 0.00005) {
    if (d > 75) {
      var roll6 = Math.random();
      if (roll6 < 0.80) {
        return { degraded: true, lostLock: true, trackLossRate: 0.80, lossRate: 0.80, reason: "GEN6_VLO_ATTENUATION" };
      } else {
        return { degraded: false, lostLock: false, trackLossRate: 0.80, lossRate: 0.80, reason: "GEN6_VLO_RETAINED_LOCK" };
      }
    } else {
      return { degraded: false, lostLock: false, trackLossRate: 0, lossRate: 0, reason: "POINT_BLANK_LOCK" };
    }
  }

  // Gen 5: VLO Stealth (F-22 Raptor, Su-57 Felon) (75% track loss at d > 90 px)
  if (gen === 5 || rcs <= 0.0001) {
    if (d > 90) {
      var roll5 = Math.random();
      if (roll5 < 0.75) {
        return { degraded: true, lostLock: true, trackLossRate: 0.75, lossRate: 0.75, reason: "GEN5_VLO_ATTENUATION" };
      } else {
        return { degraded: false, lostLock: false, trackLossRate: 0.75, lossRate: 0.75, reason: "GEN5_VLO_RETAINED_LOCK" };
      }
    } else {
      return { degraded: false, lostLock: false, trackLossRate: 0, lossRate: 0, reason: "POINT_BLANK_LOCK" };
    }
  }

  // Gen 1-4: Non-Stealth Baseline Invariant (0% stealth degradation)
  return { degraded: false, lostLock: false, trackLossRate: 0, lossRate: 0, reason: "NON_STEALTH_BASELINE" };
}
