// # CCA drones
//
// Logline: Gen 6 loyal wingmen.
//
function updateAndDrawCcaDrones(jet, isLead, colors) {
  if (!jet || jet.gen !== 6 || !jet.active) {
    if (jet) {
      jet.ccaDeployed = false;
      if (jet.cca1) jet.cca1.active = false;
      if (jet.cca2) jet.cca2.active = false;
    }
    return;
  }

  var oppPool = (jet.team === "blue") ? DF.redPool : DF.bluePool;

  // Check if we should deploy / loose drones
  if (!jet.ccaDeployed) {
    var shouldDeploy = false;
    for (var e = 0; e < oppPool.length; e++) {
      if (oppPool[e].active && !oppPool[e].isDying && Math.hypot(oppPool[e].x - jet.x, oppPool[e].y - jet.y) < 450) {
        shouldDeploy = true;
        break;
      }
    }

    if (shouldDeploy) {
      jet.ccaDeployed = true;
      var cosA = Math.cos(jet.angle);
      var sinA = Math.sin(jet.angle);
      jet.cca1.active = true;
      jet.cca1.x = jet.x - sinA * 25;
      jet.cca1.y = jet.y + cosA * 25;
      jet.cca1.angle = jet.angle - 0.28;
      jet.cca1.speed = jet.speed + 1.2;
      jet.cca1.laserCooldown = 15;

      jet.cca2.active = true;
      jet.cca2.x = jet.x + sinA * 25;
      jet.cca2.y = jet.y - cosA * 25;
      jet.cca2.angle = jet.angle + 0.28;
      jet.cca2.speed = jet.speed + 1.2;
      jet.cca2.laserCooldown = 25;

      dfRadio((jet.callsign || "GEN 6 NGAD") + ": LOOSING CCA DRONES! 2X AUTONOMOUS WINGMEN DEPLOYED");
    }
  }

  if (!jet.ccaDeployed) return;

  var drones = [jet.cca1, jet.cca2];
  for (var d = 0; d < 2; d++) {
    var cca = drones[d];
    if (!cca || !cca.active) continue;

    if (cca.laserCooldown > 0) cca.laserCooldown--;

    // Target selection
    var target = null;
    var minDist = 999999;
    for (var ei = 0; ei < oppPool.length; ei++) {
      var en = oppPool[ei];
      if (!en.active || en.isDying) continue;
      var ed = Math.hypot(en.x - cca.x, en.y - cca.y);
      if (ed < minDist) {
        minDist = ed;
        target = en;
      }
    }

    var targetAngle = cca.angle;

    // Steering & Tactics
    if (target && minDist < 500) {
      var tgtAngle = Math.atan2(target.y - cca.y, target.x - cca.x);
      // Coordinated dual-axis pincer strikes (CCA 1 breaks port +50 deg / +0.87 rad, CCA 2 breaks starboard -50 deg / -0.87 rad)
      var flankOffset = (d === 0 ? 0.873 : -0.873);
      var pincerFactor = Math.min(Math.max((minDist - 140) / 180, 0.0), 1.0);
      targetAngle = tgtAngle + flankOffset * pincerFactor;

      var diffA = targetAngle - cca.angle;
      while (diffA > Math.PI) diffA -= Math.PI * 2;
      while (diffA < -Math.PI) diffA += Math.PI * 2;
      cca.angle += Math.max(-0.14, Math.min(0.14, diffA));
      cca.speed = Math.min(7.4, cca.speed + 0.08);

      // Offensive Directed-Energy Pulse Strike directly onto target
      var directDiff = tgtAngle - cca.angle;
      while (directDiff > Math.PI) directDiff -= Math.PI * 2;
      while (directDiff < -Math.PI) directDiff += Math.PI * 2;

      if (Math.abs(directDiff) < 0.38 && minDist < 280 && cca.laserCooldown <= 0) {
        cca.laserCooldown = 24;
        DF.ctx.save();
        DF.ctx.strokeStyle = colors.fg;
        DF.ctx.lineWidth = 1.8;
        DF.ctx.beginPath();
        DF.ctx.moveTo(cca.x, cca.y);
        DF.ctx.lineTo(target.x, target.y);
        DF.ctx.stroke();
        DF.ctx.strokeStyle = "#ffffff";
        DF.ctx.lineWidth = 1.0;
        DF.ctx.beginPath();
        DF.ctx.moveTo(cca.x, cca.y);
        DF.ctx.lineTo(target.x, target.y);
        DF.ctx.stroke();
        DF.ctx.restore();

        var spIdx = DF.explosionsPool.alloc();
        if (spIdx >= 0) {
          var spo = spIdx * 6;
          DF.explosionsPool.buffer[spo] = target.x + (Math.random() - 0.5) * 6;
          DF.explosionsPool.buffer[spo + 1] = target.y + (Math.random() - 0.5) * 6;
          DF.explosionsPool.buffer[spo + 2] = (Math.random() - 0.5) * 4;
          DF.explosionsPool.buffer[spo + 3] = (Math.random() - 0.5) * 4;
          DF.explosionsPool.buffer[spo + 4] = 2;
          DF.explosionsPool.buffer[spo + 5] = 0.9;
        }

        if (target.gen === 7) {
          target.shieldPulse = 1.0;
        } else {
          var ccaDmg = 40.0 + Math.random() * 15.0;
          var ccaLethal = applyAirframeDamage(target, ccaDmg, jet, "CCA_STRIKE");
          if (ccaLethal) {
            dfRadio("CCA WINGMAN: DIRECTED-ENERGY SPLASH (" + jet.callsign + ")");
          } else if (Math.random() < 0.35) {
            dfRadio("CCA WINGMAN " + (d + 1) + ": FLANKING PINCER STRIKE -> DEW BURST (HP: " + Math.round(target.hp) + "%)");
          }
        }
      }
    } else {
      // Wide-Area Autonomous Forward Combat Orbit (Flanking, Screening & Autonomous Scouting)
      var tSwarmCca = (jet.swarmTimer || 0) * 0.04;
      var fwdOffset = 160;
      var latOffset = (d === 0 ? -140 : 140);
      var patrolTargetX = jet.x + Math.cos(jet.angle) * fwdOffset - Math.sin(jet.angle) * latOffset + Math.cos(tSwarmCca + d * Math.PI) * 45;
      var patrolTargetY = jet.y + Math.sin(jet.angle) * fwdOffset + Math.cos(jet.angle) * latOffset + Math.sin(2 * (tSwarmCca + d * Math.PI)) * 30;

      var patrolBearing = Math.atan2(patrolTargetY - cca.y, patrolTargetX - cca.x);
      var diffEsc = patrolBearing - cca.angle;
      while (diffEsc > Math.PI) diffEsc -= Math.PI * 2;
      while (diffEsc < -Math.PI) diffEsc += Math.PI * 2;
      cca.angle += Math.max(-0.11, Math.min(0.11, diffEsc));
      cca.speed = Math.min(7.2, Math.max(5.0, jet.speed * 1.12));
    }

    // Leash tethering to maintain 40px <= distance <= 450px from mothership
    var dxM = cca.x - jet.x;
    var dyM = cca.y - jet.y;
    var curDist = Math.hypot(dxM, dyM);

    if (curDist > 260) {
      var backAngle = Math.atan2(-dyM, -dxM);
      var tetherWeight = Math.min(Math.max((curDist - 260) / 120, 0.0), 1.0);
      var daTether = backAngle - cca.angle;
      while (daTether > Math.PI) daTether -= Math.PI * 2;
      while (daTether < -Math.PI) daTether += Math.PI * 2;
      cca.angle += daTether * tetherWeight * 0.14;
      cca.speed = Math.min(7.6, jet.speed * 1.18);
    } else if (curDist < 60) {
      var pushAngle = Math.atan2(dyM, dxM);
      var pushWeight = Math.min(Math.max((60 - curDist) / 20, 0.0), 1.0);
      var daPush = pushAngle - cca.angle;
      while (daPush > Math.PI) daPush -= Math.PI * 2;
      while (daPush < -Math.PI) daPush += Math.PI * 2;
      cca.angle += daPush * pushWeight * 0.14;
      cca.speed = Math.max(4.5, jet.speed * 0.92);
    }

    // Defensive CIWS Interception of Threat Missiles
    var hostileType = (jet.team === "blue") ? 1 : 0;
    for (var mi = 0; mi < DF.missilesPool.activeCount; mi++) {
      var mio = mi * 8;
      if (DF.missilesPool.buffer[mio + 4] === hostileType) {
        var misX = DF.missilesPool.buffer[mio];
        var misY = DF.missilesPool.buffer[mio + 1];
        if (Math.hypot(misX - cca.x, misY - cca.y) < 170 || Math.hypot(misX - jet.x, misY - jet.y) < 170) {
          if (cca.laserCooldown <= 0) {
            cca.laserCooldown = 35;
            DF.ctx.save();
            DF.ctx.strokeStyle = colors.fg;
            DF.ctx.lineWidth = 2;
            DF.ctx.beginPath();
            DF.ctx.moveTo(cca.x, cca.y);
            DF.ctx.lineTo(misX, misY);
            DF.ctx.stroke();
            DF.ctx.restore();
            DF.missilesPool.buffer[mio + 6] = 0;
            dfRadio("CCA LASER CIWS: THREAT MISSILE INTERCEPTED!");
            break;
          }
        }
      }
    }

    // Physics Move
    cca.x += Math.cos(cca.angle) * cca.speed;
    cca.y += Math.sin(cca.angle) * cca.speed;

    // Screen edge boundary clamping [60, DF.width-60] x [32, DF.height-32]
    if (cca.x < 60) {
      cca.x = 60;
      if (Math.cos(cca.angle) < 0) cca.angle = (Math.sin(cca.angle) >= 0) ? 0.20 : -0.20;
    }
    if (cca.x > DF.width - 60) {
      cca.x = DF.width - 60;
      if (Math.cos(cca.angle) > 0) cca.angle = (Math.sin(cca.angle) >= 0) ? (Math.PI - 0.20) : (-Math.PI + 0.20);
    }
    if (cca.y < 32) cca.y = 32;
    if (cca.y > DF.height - 32) cca.y = DF.height - 32;

    // Hard clamp bounds [42px, 440px]
    var endDx = cca.x - jet.x;
    var endDy = cca.y - jet.y;
    var endDist = Math.hypot(endDx, endDy);
    if (endDist > 440) {
      var factor440 = 440 / endDist;
      cca.x = jet.x + endDx * factor440;
      cca.y = jet.y + endDy * factor440;
    } else if (endDist < 42) {
      var factor42 = 42 / (endDist || 1);
      cca.x = jet.x + endDx * factor42;
      cca.y = jet.y + endDy * factor42;
    }

    // Draw CCA Loyal Wingman Drone
    DF.ctx.save();
    DF.ctx.translate(Math.floor(cca.x), Math.floor(cca.y));
    DF.ctx.rotate(cca.angle);

    // Dedicated exhaust plume
    var cFlame = 5 + Math.floor(Math.random() * (cca.speed * 1.6));
    DF.ctx.fillStyle = colors.fg;
    DF.ctx.fillRect(-6 - cFlame, -1, cFlame, 2);
    DF.ctx.fillStyle = "#ffffff";
    DF.ctx.fillRect(-6 - Math.floor(cFlame * 0.4), 0, Math.floor(cFlame * 0.4), 1);

    // Sleek stealth delta silhouette
    DF.ctx.fillStyle = colors.fg;
    DF.ctx.beginPath();
    DF.ctx.moveTo(7, 0);
    DF.ctx.lineTo(-5, -5);
    DF.ctx.lineTo(-2, 0);
    DF.ctx.lineTo(-5, 5);
    DF.ctx.closePath();
    DF.ctx.fill();

    // White-hot sensor core
    DF.ctx.fillStyle = "#ffffff";
    DF.ctx.fillRect(2, -1, 3, 2);
    DF.ctx.restore();
  }
}
