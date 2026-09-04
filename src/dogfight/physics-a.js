// # Jet physics A
//
// Logline: Energy, GPWS, stall, thrust.
//
function updateJetPhysics(jet, targetEnemy, incomingThreat, opposingPool, missilesPoolRef) {
  var altFt = getAltitudeFeet(jet.y, DF.height);
  var rho = getBarometricDensity(altFt);
  var rho0 = 0.002377;
  var densityRatio = Math.max(0.001, rho / rho0);
  var sCeiling = SERVICE_CEILINGS[jet.gen] || 60000;

  var spec = AIRCRAFT_SPECS[jet.gen] || AIRCRAFT_SPECS[4];
  var isF16 = (jet.gen === 4 && (jet.variant === "F16" || (jet.callsign && jet.callsign.indexOf("VIPER") !== -1)));
  var mass = isF16 ? 1.1 : (spec.mass || 1.0);

  // Dynamic Weapons Bay Door Timer Countdown and RCS Bloom Recovery
  if (jet.bayDoorTimer > 0) {
    jet.bayDoorTimer--;
    jet.rcs = spec.rcsBloom || 1.2;
    if (jet.bayDoorTimer <= 0) {
      jet.rcs = spec.rcsClean || spec.rcs || 1.0;
    }
  } else {
    jet.rcs = spec.rcsClean || spec.rcs || 1.0;
  }

  // Dynamic Energy Height He = H + V^2 / 2g
  var velFps = jet.speed * 110.0;
  var gAccel = 32.174;
  var heFt = calculateEnergyHeight(altFt, velFps, gAccel);
  jet.energyHeight = heFt;

  // Decrement Cooldowns & Timers
  if (typeof jet.flareCooldown === "number" && jet.flareCooldown > 0) jet.flareCooldown--;
  if (typeof jet.chaffCooldown === "number" && jet.chaffCooldown > 0) jet.chaffCooldown--;
  if (typeof jet.modeTimer === "number" && jet.modeTimer > 0) jet.modeTimer--;
  if (typeof jet.pitchbackTimer === "number" && jet.pitchbackTimer > 0) jet.pitchbackTimer--;

  // Autonomous AI GPWS dynamic recovery calculation (sink rate > 2500 ft/min or alt < 5000 ft or hRec)
  var vySim = Math.sin(jet.angle) * jet.speed;
  var vyFps = vySim * 110.0;
  var isDescending = (vySim > 0.0);
  var sinkRateFpm = isDescending ? (vyFps * 60.0) : 0.0;
  var nMaxG = (jet.gen === 7) ? 12.0 : (jet.gen >= 4 ? 9.0 : 7.5);
  var hRec = (isDescending && nMaxG > 1.0) ? (vyFps * vyFps) / (2.0 * gAccel * (nMaxG - 1.0)) : 0.0;
  var hMargin = isDescending ? (vyFps * 0.4 + 1000.0) : 800.0;

  var gpwsTrigger = isDescending && altFt > 0 && (altFt <= (hRec + hMargin) || altFt < 5000.0 || sinkRateFpm > 2500.0);

  // Boundary Detection & High-G Turnback Reaction (x < 100 or x > DF.width - 100)
  var isHeadingWest = (Math.cos(jet.angle) < 0.1);
  var isHeadingEast = (Math.cos(jet.angle) > -0.1);
  var hitLeftBoundary = (jet.x < 100 && isHeadingWest);
  var hitRightBoundary = (jet.x > DF.width - 100 && isHeadingEast);

  if ((hitLeftBoundary || hitRightBoundary) && jet.mode !== "GPWS_PULLUP") {
    jet.mode = "BOUNDARY_SLICE";
    jet.modeTimer = 24;
    var targetArenaX = DF.width * 0.5;
    var targetArenaY = Math.min(Math.max(jet.y, 120), DF.height - 120);
    jet.targetAngle = Math.atan2(targetArenaY - jet.y, targetArenaX - jet.x);
    jet.throttleSetting = 1.5;
    jet.afterburner = true;
  } else if (gpwsTrigger) {
    jet.mode = "GPWS_PULLUP";
    jet.oodaPhase = "ACT";
    jet.targetAngle = Math.max(-0.45, -vyFps / 120.0);
    jet.throttleSetting = 1.5;
    jet.afterburner = true;
    if (Math.random() < 0.04) {
      dfRadio((jet.callsign || spec.callsign) + ": GPWS PULL UP! RECOVERY PITCH ENGAGED (" + Math.round(altFt) + " FT)");
    }
  } else if (jet.isStalled) {
    jet.mode = "STALL_RECOVERY";
    jet.oodaPhase = "ACT";
    var isHeadingRightStall = Math.cos(jet.angle) >= 0;
    jet.targetAngle = isHeadingRightStall ? 0.0 : (jet.angle < 0 ? -Math.PI : Math.PI);
    jet.throttleSetting = 1.5;
    jet.afterburner = true;
    if (jet.speed > DF.V_CORNER * 0.75) {
      jet.isStalled = false;
      jet.mode = "EXTEND";
      jet.modeTimer = 60;
      jet.throttleSetting = 1.5;
      jet.afterburner = true;
      dfRadio((jet.callsign || spec.callsign) + ": STALL RECOVERED. ACCELERATING ON THE DECK.");
    }
  } else {
    // 4-Phase Boyd OODA State Machine Execution
    jet.oodaPhase = "OBSERVE";
    var mPool = missilesPoolRef || DF.missilesPool;
    var oPool = opposingPool || (jet.team === "blue" ? DF.redPool : DF.bluePool);
    var obs = oodaObserveThreats(jet, oPool, mPool, DF.width, DF.height);

    jet.oodaPhase = "ORIENT";
    var ori = oodaOrientTactics(jet, obs, altFt, sCeiling);

    // Generational reaction latency management
    if (typeof jet.oodaLatencyTimer === "undefined") jet.oodaLatencyTimer = 0;
    if (jet.oodaLatencyTimer > 0) {
      jet.oodaLatencyTimer--;
    }

    if (jet.oodaLatencyTimer <= 0) {
      oodaDecideAction(jet, obs, ori, targetEnemy, altFt, sCeiling, DF.flaresPool, DF.chaffPool);
      jet.oodaLatencyTimer = spec.oodaLatencyFrames || 0;
    }
  }

  // Low-altitude ground-effect leveling invariant (preserves 360-deg horizontal heading):
  if (jet.mode !== "BREAK" && jet.mode !== "GPWS_PULLUP") {
    var isFacingRight = Math.cos(jet.angle) >= 0;
    if (altFt <= 2000) {
      if (Math.sin(jet.targetAngle) > -0.10) {
        jet.targetAngle = isFacingRight ? -0.15 : (jet.targetAngle < 0 ? -Math.PI + 0.15 : Math.PI - 0.15);
      }
    } else if (altFt <= 5000) {
      if (Math.sin(jet.targetAngle) > 0.0) {
        jet.targetAngle = isFacingRight ? -0.05 : (jet.targetAngle < 0 ? -Math.PI + 0.05 : Math.PI - 0.05);
      }
    } else if (altFt <= 12000) {
      if (Math.sin(jet.targetAngle) > 0.35) {
        jet.targetAngle = isFacingRight ? 0.25 : (jet.targetAngle < 0 ? -Math.PI + 0.25 : Math.PI - 0.25);
      }
    }
  }

  // F-14 CADC Dynamic Variable Wing Sweep Calculation based on E-M parameters
  if (jet.gen === 4 && (!jet.variant || jet.variant === "F14")) {
    var targetSweep = 0.0;
    if (jet.isStalled || jet.mode === "BREAK" || jet.gForce > 3.6 || jet.speed < 4.0) {
      targetSweep = 0.0; // 20 deg unswept forward (Max High-G lift & tight turn radius)
    } else if (jet.speed > 5.4 || jet.mode === "EXTEND") {
      targetSweep = 1.0; // 68 deg delta swept back (Supersonic Wave Drag Minimization)
    } else {
      targetSweep = Math.min(Math.max((jet.speed - 4.0) / 1.4, 0.0), 1.0);
    }
    if (typeof jet.wingSweep === "undefined") jet.wingSweep = 0.0;
    jet.wingSweep += (targetSweep - jet.wingSweep) * 0.14;
  }

  // Smooth near-space AI pitch-leveling invariant (theta -> 0)
  if (altFt >= 95000 || jet.y <= 36.0) {
    if (Math.sin(jet.targetAngle) < 0 || Math.sin(jet.angle) < 0) {
      var isFacingRightCeil = Math.cos(jet.angle) >= 0;
      jet.targetAngle = isFacingRightCeil ? 0.0 : (jet.angle < 0 ? -Math.PI : Math.PI);
    }
  }

  if (typeof jet.turnLockTimer !== "number") jet.turnLockTimer = 0;
  if (typeof jet.turnDirectionLock !== "number") jet.turnDirectionLock = 0;
  if (typeof jet.angAcc !== "number") jet.angAcc = 0.0;

  if (jet.turnLockTimer > 0) {
    jet.turnLockTimer--;
  }

  var da = jet.targetAngle - jet.angle;
  while (da < -Math.PI) da += Math.PI * 2;
  while (da > Math.PI) da -= Math.PI * 2;

  if (Math.abs(da) <= 0.02) {
    jet.turnLockTimer = 0;
    jet.turnDirectionLock = 0;
  } else if (jet.turnLockTimer <= 0) {
    jet.turnDirectionLock = da > 0 ? 1 : -1;
    jet.turnLockTimer = 18; // 15-20 tick commitment lock
  }

  updateJetPhysicsTurn(jet, targetEnemy, spec, isF16, mass, densityRatio, altFt, sCeiling, da);
  updateJetPhysicsLate(jet, targetEnemy, incomingThreat, opposingPool, missilesPoolRef);
}
