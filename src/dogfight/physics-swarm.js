// # Jet physics swarm
//
// Logline: Gen 7 drone world positions.
//
function updateJetPhysicsSwarm(jet, targetEnemy, incomingThreat) {
  // Gen 7 Dynamic Swarm Kinematics (Decentralized Multi-Agent Coordination, Zero Teleporting, Smooth Continuous Motion)
  if (jet.gen === 7 && jet.drone1 && jet.drone2 && jet.drone3) {
    var tSwarm = (jet.swarmTimer || 0) * 0.05;
    jet.swarmTimer = ((jet.swarmTimer || 0) + 1) % 100000;

    var targetDist = targetEnemy && targetEnemy.active ? Math.hypot(targetEnemy.x - jet.x, targetEnemy.y - jet.y) : 999999;

    if ((jet.superLaserCooldown > 0 && jet.superLaserCooldown < 35) || jet.superLaserPulse > 0) {
      jet.swarmMode = "FORM_UP";
      jet.trapTimer = 0;
      jet.drone1.targetX = 18;
      jet.drone1.targetY = 0;
      jet.drone2.targetX = -8;
      jet.drone2.targetY = -12;
      jet.drone3.targetX = -8;
      jet.drone3.targetY = 12;
    } else if (jet.mode === "BREAK" || incomingThreat) {
      jet.swarmMode = "SPLIT";
      jet.trapTimer = 0;
      jet.drone1.targetX = 20 + Math.sin(tSwarm * 2.2) * 4;
      jet.drone1.targetY = 0;
      jet.drone2.targetX = -12 + Math.cos(tSwarm * 1.5) * 4;
      jet.drone2.targetY = -26 + Math.sin(tSwarm * 2.5) * 5;
      jet.drone3.targetX = -12 + Math.sin(tSwarm * 1.5) * 5;
      jet.drone3.targetY = 26 + Math.cos(tSwarm * 2.5) * 5;
    } else if (targetEnemy && targetEnemy.active && targetDist < 350) {
      jet.swarmMode = "SURROUND_TRAP";
      jet.trapTimer = (jet.trapTimer || 0) + 1;
      var tOrbit = jet.trapTimer * 0.16;

      var dxT = targetEnemy.x - jet.x;
      var dyT = targetEnemy.y - jet.y;

      var cosJ = Math.cos(jet.angle);
      var sinJ = Math.sin(jet.angle);
      var localTx = cosJ * dxT + sinJ * dyT;
      var localTy = -sinJ * dxT + cosJ * dyT;

      var cageRadius = 38;
      jet.drone1.targetX = localTx + Math.cos(tOrbit) * cageRadius;
      jet.drone1.targetY = localTy + Math.sin(tOrbit) * cageRadius;
      jet.drone2.targetX = localTx + Math.cos(tOrbit + 2.094) * cageRadius;
      jet.drone2.targetY = localTy + Math.sin(tOrbit + 2.094) * cageRadius;
      jet.drone3.targetX = localTx + Math.cos(tOrbit + 4.188) * cageRadius;
      jet.drone3.targetY = localTy + Math.sin(tOrbit + 4.188) * cageRadius;
    } else {
      jet.swarmMode = "FLANK";
      jet.trapTimer = 0;
      // Organic, independent multi-agent tactical formation
      jet.drone1.targetX = 16 + Math.sin(tSwarm * 1.8) * 4;
      jet.drone1.targetY = Math.cos(tSwarm * 1.4) * 3;
      jet.drone2.targetX = -10 + Math.cos(tSwarm * 1.2) * 4;
      jet.drone2.targetY = -18 + Math.sin(tSwarm * 2.0) * 4;
      jet.drone3.targetX = -10 + Math.sin(tSwarm * 1.2) * 4;
      jet.drone3.targetY = 18 + Math.cos(tSwarm * 2.0) * 4;
    }

    var kRate = jet.swarmMode === "SURROUND_TRAP" ? 0.18 : (jet.swarmMode === "FORM_UP" ? 0.16 : (jet.swarmMode === "SPLIT" ? 0.15 : 0.12));
    var maxRelDelta = jet.speed * 0.40;

    function updateDroneRel(drone) {
      var ddx = (drone.targetX - drone.x) * kRate;
      var ddy = (drone.targetY - drone.y) * kRate;
      var dDist = Math.hypot(ddx, ddy);
      if (dDist > maxRelDelta) {
        ddx = (ddx / dDist) * maxRelDelta;
        ddy = (ddy / dDist) * maxRelDelta;
      }
      drone.x += ddx;
      drone.y += ddy;
    }

    updateDroneRel(jet.drone1);
    updateDroneRel(jet.drone2);
    updateDroneRel(jet.drone3);

    var cosA = Math.cos(jet.angle);
    var sinA = Math.sin(jet.angle);

    if (typeof jet.drone1.worldX === "undefined") {
      jet.drone1.worldX = jet.x + cosA * jet.drone1.x - sinA * jet.drone1.y;
      jet.drone1.worldY = jet.y + sinA * jet.drone1.x + cosA * jet.drone1.y;
      jet.drone2.worldX = jet.x + cosA * jet.drone2.x - sinA * jet.drone2.y;
      jet.drone2.worldY = jet.y + sinA * jet.drone2.x + cosA * jet.drone2.y;
      jet.drone3.worldX = jet.x + cosA * jet.drone3.x - sinA * jet.drone3.y;
      jet.drone3.worldY = jet.y + sinA * jet.drone3.x + cosA * jet.drone3.y;
    }

    var maxWorldDelta = jet.speed * 1.45;
    function clampWorld(prevX, prevY, tgtX, tgtY) {
      var cdx = tgtX - prevX;
      var cdy = tgtY - prevY;
      var cd = Math.hypot(cdx, cdy);
      if (cd > maxWorldDelta) {
        cdx = (cdx / cd) * maxWorldDelta;
        cdy = (cdy / cd) * maxWorldDelta;
      }
      return { x: prevX + cdx, y: prevY + cdy };
    }

    var targetW1X = jet.x + cosA * jet.drone1.x - sinA * jet.drone1.y;
    var targetW1Y = jet.y + sinA * jet.drone1.x + cosA * jet.drone1.y;
    var targetW2X = jet.x + cosA * jet.drone2.x - sinA * jet.drone2.y;
    var targetW2Y = jet.y + sinA * jet.drone2.x + cosA * jet.drone2.y;
    var targetW3X = jet.x + cosA * jet.drone3.x - sinA * jet.drone3.y;
    var targetW3Y = jet.y + sinA * jet.drone3.x + cosA * jet.drone3.y;

    var nextW1 = clampWorld(jet.drone1.worldX, jet.drone1.worldY, targetW1X, targetW1Y);
    var nextW2 = clampWorld(jet.drone2.worldX, jet.drone2.worldY, targetW2X, targetW2Y);
    var nextW3 = clampWorld(jet.drone3.worldX, jet.drone3.worldY, targetW3X, targetW3Y);

    jet.drone1.worldX = Math.min(Math.max(nextW1.x, 65.0), DF.width - 65.0);
    jet.drone1.worldY = Math.min(Math.max(nextW1.y, 65.0), DF.height - 65.0);
    jet.drone2.worldX = Math.min(Math.max(nextW2.x, 65.0), DF.width - 65.0);
    jet.drone2.worldY = Math.min(Math.max(nextW2.y, 65.0), DF.height - 65.0);
    jet.drone3.worldX = Math.min(Math.max(nextW3.x, 65.0), DF.width - 65.0);
    jet.drone3.worldY = Math.min(Math.max(nextW3.y, 65.0), DF.height - 65.0);
  }
}
