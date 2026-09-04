// # OODA decide engage
//
// Logline: Pursuit, merge, and patrol when not in a named mode.
//
function oodaDecideEngage(jet, obs, ori, targetEnemy, altFt, sCeiling, flaresPool, chaffPool) {
  if (targetEnemy && targetEnemy.active && !targetEnemy.isDying) {
    var dx = targetEnemy.x - jet.x;
    var dy = targetEnemy.y - jet.y;
    var dist = Math.hypot(dx, dy);
    var hdgDiff = Math.abs(jet.angle - targetEnemy.angle);
    while (hdgDiff > Math.PI) hdgDiff = Math.abs(hdgDiff - Math.PI * 2);

    var closureRate = (obs && typeof obs.banditClosure === "number") ? obs.banditClosure : 0;
    var isClosingTooFast = (closureRate > 4.0) || (dist < 280 && jet.speed > V_CORNER);
    var hasEnergySurplus = (jet.energyHeight > 48000) || (targetEnemy && (jet.energyHeight || 0) > (targetEnemy.energyHeight || 0) + 6000);

    var bearingToTarget = Math.atan2(dy, dx);
    var aotTargetTail = Math.abs(bearingToTarget - targetEnemy.angle);
    while (aotTargetTail > Math.PI) aotTargetTail = Math.abs(aotTargetTail - Math.PI * 2);

    // Instant 180 snap pitchback upon crossing (dist < 250 px & hdgDiff > 1.8 rad or closure turning negative at close range)
    if ((dist < 250 && hdgDiff > 1.8) || (closureRate < 0 && dist < 350 && hdgDiff > 1.8)) {
      jet.mode = "MERGE_PITCHBACK";
      jet.isTailChasing = false;
      jet.modeTimer = 24;
      jet.pitchbackTimer = 24;
      var leadTime = Math.min(dist / 14.0, 15.0);
      var leadX = targetEnemy.x + Math.cos(targetEnemy.angle) * targetEnemy.speed * leadTime;
      var leadY = targetEnemy.y + Math.sin(targetEnemy.angle) * targetEnemy.speed * leadTime;
      jet.targetAngle = Math.atan2(leadY - jet.y, leadX - jet.x);
      jet.throttleSetting = 1.5;
      jet.afterburner = true;
    } else if (ori && ori.recommendedPursuit === "LAG") {
      jet.mode = "PURSUIT";
      jet.isTailChasing = (aotTargetTail < 1.05 && dist <= 450);
      var directBearing = Math.atan2(dy, dx);
      var lagOffset = (Math.sin(targetEnemy.angle - directBearing) >= 0 ? -0.25 : 0.25);
      jet.targetAngle = directBearing + lagOffset;
      jet.throttleSetting = 1.0;
      jet.afterburner = (jet.speed < 5.0);
    } else if (!isNearCeil && (isClosingTooFast || jet.energyHeight > 65000) && (hasEnergySurplus || jet.energyHeight > 65000) && dist < 280 && altFt < sCeiling - 3000 && (typeof jet.ps === "undefined" || jet.ps >= -50)) {
      // Boyd E-M High Yo-Yo: steep vertical climb trading kinetic speed for altitude
      jet.mode = "YOYO_HIGH";
      jet.isTailChasing = false;
      var isFacingRightHighYo = Math.cos(jet.angle) >= 0;
      jet.targetAngle = isFacingRightHighYo ? -1.25 : (jet.angle < 0 ? -Math.PI + 1.25 : Math.PI - 1.25);
      jet.throttleSetting = 1.5;
      jet.afterburner = true;
    } else if (dist > 250 && (jet.speed < targetEnemy.speed || (jet.energyHeight || 0) < (targetEnemy.energyHeight || 0) - 4000) && altFt > 14000) {
      // Boyd E-M Low Yo-Yo: steep energy dive converting potential energy to speed
      jet.mode = "YOYO_LOW";
      jet.isTailChasing = false;
      var isFacingRightLowYo = Math.cos(jet.angle) >= 0;
      jet.targetAngle = isFacingRightLowYo ? 0.85 : (jet.angle < 0 ? -Math.PI - 0.85 : Math.PI + 0.85);
      jet.throttleSetting = 1.5;
      jet.afterburner = true;
    } else {
      jet.mode = "PURSUIT";
      var isBehindBandit = (aotTargetTail < 1.05); // AOT < 60 deg (1.047 rad)

      if (isBehindBandit && dist <= 500) {
        // Relentless Tail-Chase Latch: Match turns, track 150-400 px envelope
        jet.isTailChasing = true;
        jet.tailChaseTimer = 30;
        var leadTime = Math.min(dist / 14.0, 12.0);
        var leadX = targetEnemy.x + Math.cos(targetEnemy.angle) * targetEnemy.speed * leadTime;
        var leadY = targetEnemy.y + Math.sin(targetEnemy.angle) * targetEnemy.speed * leadTime;
        var leadAngle = Math.atan2(leadY - jet.y, leadX - jet.x);

        // Blend lead pursuit with matching bandit turn heading when close (150-300 px)
        if (dist >= 150 && dist <= 300) {
          var blend = (dist - 150.0) / 150.0;
          jet.targetAngle = leadAngle * blend + targetEnemy.angle * (1.0 - blend);
        } else {
          jet.targetAngle = leadAngle;
        }

        // Throttle modulation in tail chase: maintain position in 150-400px kill zone
        if (dist < 150 && jet.speed > targetEnemy.speed) {
          jet.throttleSetting = 0.8;
          jet.afterburner = false;
        } else if (dist > 280 || jet.speed < targetEnemy.speed) {
          jet.throttleSetting = 1.5;
          jet.afterburner = true;
        } else {
          jet.throttleSetting = 1.5;
          jet.afterburner = (jet.speed < 5.4);
        }
      } else {
        // Continuous 2-Circle Rate Fight Flow / 3D Vertical Merge
        jet.isTailChasing = false;
        var leadTime = Math.min(dist / 14.0, 20.0);
        var leadX = targetEnemy.x + Math.cos(targetEnemy.angle) * targetEnemy.speed * leadTime;
        var leadY = targetEnemy.y + Math.sin(targetEnemy.angle) * targetEnemy.speed * leadTime;
        var baseLeadAngle = Math.atan2(leadY - jet.y, leadX - jet.x);

        if (hdgDiff > 0.6 && hdgDiff <= 2.2 && dist >= 80 && dist <= 450) {
          // Continuous 2-Circle rate fight orbital flow: continuous turning circle at corner velocity
          jet.targetAngle = baseLeadAngle;
          if (jet.speed > 5.4) {
            jet.throttleSetting = 0.85;
            jet.afterburner = false;
          } else if (jet.speed < 4.6) {
            jet.throttleSetting = 1.5;
            jet.afterburner = true;
          } else {
            jet.throttleSetting = 1.2;
            jet.afterburner = true;
          }
        } else {
          jet.targetAngle = baseLeadAngle;
          jet.throttleSetting = 1.5;
          jet.afterburner = true;
        }
      }
    }
  } else {
    // Zero Passive Cruising Mandate: Continuous Active Radar S-Turns & Flank Sweep
    jet.mode = "TACTICAL_SWEEP";
    jet.isTailChasing = false;
    jet.patrolSweepAngle = (jet.patrolSweepAngle || 0) + 0.035;
    var sweepWeave = Math.sin(jet.patrolSweepAngle) * 0.40;
    var baseHeading = (jet.team === "blue" ? 0.0 : Math.PI);
    jet.targetAngle = baseHeading + sweepWeave;
    jet.throttleSetting = 1.0;
    jet.afterburner = true;
  }

}
