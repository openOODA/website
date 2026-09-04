// # OODA decide
//
// Logline: Mode and throttle choice.
//
function oodaDecideAction(jet, obs, ori, targetEnemy, altFt, sCeiling, flaresPool, chaffPool) {
  if (!jet) return;
  jet.oodaPhase = "DECIDE";

  var isNearCeil = (altFt >= 95000 || (typeof jet.y === "number" && jet.y <= 36.0));

  // Boundary slice turnback has top priority to guarantee arena containment
  if (jet.mode === "BOUNDARY_SLICE" && typeof jet.modeTimer === "number" && jet.modeTimer > 0) {
    jet.isTailChasing = false;
    jet.zoomClimbActive = false;
    jet.throttleSetting = 1.5;
    jet.afterburner = true;
    return;
  }

  if (ori && ori.recommendedEvasion && ori.recommendedEvasion !== "NONE") {
    jet.isTailChasing = false;
    jet.mode = ori.recommendedEvasion;
    jet.evasionType = ori.recommendedEvasion;
    jet.evasionTimer = (jet.evasionTimer || 0) + 1;
    jet.zoomClimbActive = (ori.recommendedEvasion === "ZOOM_CLIMB");

    if (ori.recommendedEvasion === "BEAM_NOTCH") {
      var mAngle = (obs && obs.nearestMissile) ? Math.atan2(obs.nearestMissile.vy, obs.nearestMissile.vx) : jet.angle;
      var notchSign = (Math.random() > 0.5 ? 1 : -1);
      jet.targetAngle = mAngle + Math.PI * 0.5 * notchSign;
      jet.throttleSetting = 1.5;
      jet.afterburner = true;
      if (jet.gen >= 3 && chaffPool && (typeof jet.chaffCooldown === "undefined" || jet.chaffCooldown <= 0)) {
        oodaDeployChaff(jet, chaffPool);
      }
    } else if (ori.recommendedEvasion === "BREAK_9G" || ori.recommendedEvasion === "BREAK_MANUAL") {
      var tAngle = (obs && obs.nearestMissile) ? Math.atan2(obs.nearestMissile.y - jet.y, obs.nearestMissile.x - jet.x) : ((obs && obs.tailingBandit) ? obs.tailingBandit.angle : jet.angle);
      var breakSign = (Math.random() > 0.5 ? 1 : -1);
      jet.targetAngle = tAngle + Math.PI * 0.55 * breakSign;
      jet.throttleSetting = 0.2;
      jet.afterburner = false;
      if (jet.gen >= 3 && flaresPool && (typeof jet.flareCooldown === "undefined" || jet.flareCooldown <= 0)) {
        oodaDeployFlares(jet, flaresPool);
      }
    } else if (ori.recommendedEvasion === "ROLLING_SCISSORS") {
      jet.scissorsFrameCount = (jet.scissorsFrameCount || 0) + 1;
      if (jet.scissorsFrameCount % 18 === 0) {
        jet.scissorsWeaveSign = -(jet.scissorsWeaveSign || 1);
      }
      jet.targetAngle = jet.angle + (jet.scissorsWeaveSign || 1) * 0.70;
      jet.throttleSetting = 0.0; // Idle throttle forces closure overshoot
      jet.afterburner = false;
      if (jet.gen >= 3 && flaresPool && (typeof jet.flareCooldown === "undefined" || jet.flareCooldown <= 0) && Math.random() < 0.25) {
        oodaDeployFlares(jet, flaresPool);
      }
      if (obs && obs.tailingBandit && (obs.banditAOT > Math.PI * 0.5 || obs.banditClosure < -1.0)) {
        jet.mode = "PURSUIT";
        jet.isTailChasing = true;
        jet.tailChaseTimer = 30;
        jet.throttleSetting = 1.5;
        jet.afterburner = true;
      }
    } else if (ori.recommendedEvasion === "SPLIT_S") {
      var isFacingRightSplit = Math.cos(jet.angle) >= 0;
      jet.targetAngle = isFacingRightSplit ? Math.PI * 0.48 : Math.PI * 0.52;
      jet.throttleSetting = 1.5;
      jet.afterburner = true;
    } else if (ori.recommendedEvasion === "COBRA") {
      var cStep = jet.evasionTimer % 36;
      if (cStep < 12) {
        jet.angle += 0.40;
        jet.speed = Math.max(jet.speed * 0.72, 1.8);
        jet.throttleSetting = 0.0;
        jet.afterburner = false;
      } else if (cStep < 24) {
        jet.angle -= 0.35;
        jet.throttleSetting = 0.0;
        jet.afterburner = false;
      } else {
        jet.throttleSetting = 1.5;
        jet.afterburner = true;
        jet.mode = "PURSUIT";
      }
    } else if (ori.recommendedEvasion === "ZOOM_CLIMB") {
      jet.zoomClimbActive = true;
      if (isNearCeil || altFt >= sCeiling - 2000) {
        jet.mode = "EXTEND_HIGH_SPEED";
        jet.zoomClimbActive = false;
        var isFacingRightExtZ = Math.cos(jet.angle) >= 0;
        jet.targetAngle = isFacingRightExtZ ? 0.02 : (jet.angle < 0 ? -Math.PI + 0.02 : Math.PI - 0.02);
      } else {
        var isFacingRightZoom = Math.cos(jet.angle) >= 0;
        var zoomPitch = 1.05; // 60 deg steep climb (45°-75°)
        jet.targetAngle = isFacingRightZoom ? -zoomPitch : (jet.angle < 0 ? -Math.PI + zoomPitch : Math.PI - zoomPitch);
      }
      jet.throttleSetting = 1.5;
      jet.afterburner = true;
    } else if (ori.recommendedEvasion === "EXTEND_HIGH_SPEED") {
      var isFacingRightExt = Math.cos(jet.angle) >= 0;
      jet.targetAngle = isFacingRightExt ? 0.02 : (jet.angle < 0 ? -Math.PI + 0.02 : Math.PI - 0.02);
      jet.throttleSetting = 1.5;
      jet.afterburner = true;
    } else if (ori.recommendedEvasion === "DEW_CIWS") {
      jet.targetAngle = jet.angle;
      jet.throttleSetting = 1.2;
      jet.afterburner = true;
    } else if (ori.recommendedEvasion === "CCA_PINCER") {
      jet.targetAngle = jet.angle + 0.35;
      jet.throttleSetting = 1.3;
      jet.afterburner = true;
    } else if (ori.recommendedEvasion === "QUANTUM_SHIFT") {
      var qShiftSign = (Math.random() > 0.5 ? 1 : -1);
      jet.targetAngle = jet.angle + Math.PI * 0.55 * qShiftSign;
      jet.shieldPulse = 1.0;
      jet.throttleSetting = 1.5;
      jet.afterburner = true;
    }
  } else if ((jet.mode === "COVER" || jet.mode === "PINCER") && typeof jet.modeTimer === "number" && jet.modeTimer > 0) {
    jet.isTailChasing = false;
    jet.zoomClimbActive = false;
    jet.throttleSetting = 1.5;
    jet.afterburner = true;
  } else if (jet.mode === "MERGE_PITCHBACK" && ((typeof jet.modeTimer === "number" && jet.modeTimer > 0) || (typeof jet.pitchbackTimer === "number" && jet.pitchbackTimer > 0))) {
    // Persistent Post-Merge Pitchback Reversal (Latched for 24 frames)
    jet.isTailChasing = false;
    jet.zoomClimbActive = false;
    if (targetEnemy && targetEnemy.active && !targetEnemy.isDying) {
      var dx = targetEnemy.x - jet.x;
      var dy = targetEnemy.y - jet.y;
      var dist = Math.hypot(dx, dy);
      var leadTime = Math.min(dist / 14.0, 15.0);
      var leadX = targetEnemy.x + Math.cos(targetEnemy.angle) * targetEnemy.speed * leadTime;
      var leadY = targetEnemy.y + Math.sin(targetEnemy.angle) * targetEnemy.speed * leadTime;
      jet.targetAngle = Math.atan2(leadY - jet.y, leadX - jet.x);
      jet.throttleSetting = 1.5;
      jet.afterburner = true;

      var hdgDiff = Math.abs(jet.angle - jet.targetAngle);
      while (hdgDiff > Math.PI) hdgDiff = Math.abs(hdgDiff - Math.PI * 2);
      if (hdgDiff < 0.20 && (jet.modeTimer || 0) <= 0 && (jet.pitchbackTimer || 0) <= 0) {
        jet.mode = "PURSUIT";
      }
    } else {
      jet.mode = "PURSUIT";
    }
  } else {
    oodaDecideEngage(jet, obs, ori, targetEnemy, altFt, sCeiling, flaresPool, chaffPool);
  }
  // Smooth near-space AI pitch-leveling invariant (theta -> 0)
  if (isNearCeil && Math.sin(jet.targetAngle) < 0) {
    var isFacingRightLvl = Math.cos(jet.angle) >= 0;
    jet.targetAngle = isFacingRightLvl ? 0.05 : (jet.angle < 0 ? -Math.PI - 0.05 : Math.PI + 0.05);
  }
}
