// # Weapons gens 6-7
//
// Logline: Laser, tri-lance, singularity.
//
function evaluateJetWeapons(jet, targetEnemy, colors) {
  if (!jet.active || jet.isDying || jet.isStalled || !targetEnemy || !targetEnemy.active || targetEnemy.isDying) return;

  var dx = targetEnemy.x - jet.x;
  var dy = targetEnemy.y - jet.y;
  var dist = Math.hypot(dx, dy);
  var bearing = Math.atan2(dy, dx);
  var da = Math.abs(jet.angle - bearing);
  while (da > Math.PI) da = Math.abs(da - Math.PI * 2);

  var shooterTeamCode = (jet.team === "blue") ? 0 : 1;

  // Gen 7: Swarm directed weapons
  if (jet.gen === 7) {
    var d1 = jet.drone1 || { x: 16, y: 0 };
    var d2 = jet.drone2 || { x: -6, y: -14 };
    var d3 = jet.drone3 || { x: -6, y: 14 };
    var cosA = Math.cos(jet.angle);
    var sinA = Math.sin(jet.angle);

    var d1x = jet.x + cosA * (d1.x + 6) - sinA * d1.y;
    var d1y = jet.y + sinA * (d1.x + 6) + cosA * d1.y;
    var d2x = jet.x + cosA * (d2.x + 5) - sinA * d2.y;
    var d2y = jet.y + sinA * (d2.x + 5) + cosA * d2.y;
    var d3x = jet.x + cosA * (d3.x + 5) - sinA * d3.y;
    var d3y = jet.y + sinA * (d3.x + 5) + cosA * d3.y;

    // 1. Surround Trap (360° Eat Sequence)
    if (jet.swarmMode === "SURROUND_TRAP" && dist < 350) {
      DF.ctx.save();
      DF.ctx.strokeStyle = colors.fg;
      DF.ctx.lineWidth = 4.2;
      DF.ctx.beginPath();
      DF.ctx.moveTo(d1x, d1y); DF.ctx.lineTo(targetEnemy.x, targetEnemy.y);
      DF.ctx.moveTo(d2x, d2y); DF.ctx.lineTo(targetEnemy.x, targetEnemy.y);
      DF.ctx.moveTo(d3x, d3y); DF.ctx.lineTo(targetEnemy.x, targetEnemy.y);
      DF.ctx.stroke();

      DF.ctx.strokeStyle = "#ffffff";
      DF.ctx.lineWidth = 2.2;
      DF.ctx.beginPath();
      DF.ctx.moveTo(d1x, d1y); DF.ctx.lineTo(targetEnemy.x, targetEnemy.y);
      DF.ctx.moveTo(d2x, d2y); DF.ctx.lineTo(targetEnemy.x, targetEnemy.y);
      DF.ctx.moveTo(d3x, d3y); DF.ctx.lineTo(targetEnemy.x, targetEnemy.y);
      DF.ctx.stroke();

      DF.ctx.fillStyle = getAlphaColor("fg", 0.4);
      DF.ctx.beginPath();
      DF.ctx.arc(targetEnemy.x, targetEnemy.y, 10 + Math.random() * 6, 0, Math.PI * 2);
      DF.ctx.fill();

      var spkIdx = DF.explosionsPool.alloc();
      if (spkIdx >= 0) {
        var spko = spkIdx * 6;
        DF.explosionsPool.buffer[spko] = targetEnemy.x + (Math.random() - 0.5) * 12;
        DF.explosionsPool.buffer[spko + 1] = targetEnemy.y + (Math.random() - 0.5) * 12;
        DF.explosionsPool.buffer[spko + 2] = (Math.random() - 0.5) * 8;
        DF.explosionsPool.buffer[spko + 3] = (Math.random() - 0.5) * 8;
        DF.explosionsPool.buffer[spko + 4] = 2 + Math.floor(Math.random() * 3);
        DF.explosionsPool.buffer[spko + 5] = 0.85;
      }
      DF.ctx.restore();

      if (jet.trapTimer >= 14) {
        jet.trapTimer = 0;
        if (targetEnemy.gen <= 5) {
          applyAirframeDamage(targetEnemy, 100.0, jet, "SINGULARITY_CANNON");
          dfRadio(jet.callsign + ": 360° SURROUND TRAP -> " + targetEnemy.callsign + " VAPORIZED!");
        } else if (targetEnemy.gen === 6) {
          if (Math.random() < 0.65) {
            applyAirframeDamage(targetEnemy, 100.0, jet, "SINGULARITY_CANNON");
            dfRadio(jet.callsign + ": SURROUND TRAP OVERWHELMED NGAD CIWS!");
          } else {
            targetEnemy.laserCooldown = 25;
            dfRadio((targetEnemy.callsign || "GEN 6 NGAD") + ": LASER CIWS DEFLECTS SURROUND CAGE!");
          }
        } else if (targetEnemy.gen === 7) {
          targetEnemy.shieldPulse = 1.0;
          targetEnemy.mode = "BREAK";
          targetEnemy.modeTimer = 30;
          dfRadio((targetEnemy.callsign || "SWARM") + ": QUANTUM SHIELD DEFLECTS SURROUND TRAP!");
        }
      }
    }

    // 2. Tri-Lance Pulse Beams
    if (da < 0.65 && dist < 420 && jet.swarmMode !== "SURROUND_TRAP") {
      if (jet.triLaserCooldown <= 0) {
        jet.triLaserCooldown = 10;
        DF.ctx.save();
        DF.ctx.strokeStyle = colors.fg;
        DF.ctx.lineWidth = 3.2;
        DF.ctx.beginPath();
        DF.ctx.moveTo(d1x, d1y); DF.ctx.lineTo(targetEnemy.x, targetEnemy.y);
        DF.ctx.moveTo(d2x, d2y); DF.ctx.lineTo(targetEnemy.x, targetEnemy.y);
        DF.ctx.moveTo(d3x, d3y); DF.ctx.lineTo(targetEnemy.x, targetEnemy.y);
        DF.ctx.stroke();

        DF.ctx.strokeStyle = "#ffffff";
        DF.ctx.lineWidth = 1.6;
        DF.ctx.beginPath();
        DF.ctx.moveTo(d1x, d1y); DF.ctx.lineTo(targetEnemy.x, targetEnemy.y);
        DF.ctx.moveTo(d2x, d2y); DF.ctx.lineTo(targetEnemy.x, targetEnemy.y);
        DF.ctx.moveTo(d3x, d3y); DF.ctx.lineTo(targetEnemy.x, targetEnemy.y);
        DF.ctx.stroke();
        DF.ctx.restore();

        var triDmg = 35.0 + Math.random() * 15.0;
        if (targetEnemy.gen === 7) {
          targetEnemy.shieldPulse = 1.0;
          if (Math.random() < 0.35) {
            var triLethal7 = applyAirframeDamage(targetEnemy, triDmg, jet, "TRI_LANCE");
            if (triLethal7) {
              dfRadio(jet.callsign + ": TRI-LANCE PARTICLE BEAM SPLASH ON " + targetEnemy.callsign);
            }
          }
        } else {
          var triLethal = applyAirframeDamage(targetEnemy, triDmg, jet, "TRI_LANCE");
          if (triLethal) {
            dfRadio(jet.callsign + ": TRI-LANCE PARTICLE BEAM SPLASH ON " + targetEnemy.callsign);
          } else {
            var spIdx = DF.explosionsPool.alloc();
            if (spIdx >= 0) {
              var spo = spIdx * 6;
              DF.explosionsPool.buffer[spo] = targetEnemy.x + (Math.random() - 0.5) * 8;
              DF.explosionsPool.buffer[spo + 1] = targetEnemy.y + (Math.random() - 0.5) * 8;
              DF.explosionsPool.buffer[spo + 2] = (Math.random() - 0.5) * 6;
              DF.explosionsPool.buffer[spo + 3] = (Math.random() - 0.5) * 6;
              DF.explosionsPool.buffer[spo + 4] = 3;
              DF.explosionsPool.buffer[spo + 5] = 0.9;
            }
          }
        }
      }
    }

    // 3. Singularity Cannon / Super Laser
    if (da < 0.45 && dist >= 140 && dist < 450 && jet.superLaserCooldown <= 0) {
      jet.superLaserCooldown = 120;
      jet.superLaserPulse = 1.0;
      jet.singularityBeamActive = true;
      jet.swarmMode = "FORM_UP";
      var focalX = jet.x + cosA * 26;
      var focalY = jet.y + sinA * 26;

      // Full-screen quantum beam ray across the DF.canvas
      var beamAngle = Math.atan2(targetEnemy.y - focalY, targetEnemy.x - focalX);
      var fullRayLen = 2000.0;
      var beamEndX = focalX + Math.cos(beamAngle) * fullRayLen;
      var beamEndY = focalY + Math.sin(beamAngle) * fullRayLen;

      DF.ctx.save();
      DF.ctx.strokeStyle = "rgba(180, 0, 255, 0.85)";
      DF.ctx.lineWidth = 16;
      DF.ctx.beginPath();
      DF.ctx.moveTo(focalX, focalY); DF.ctx.lineTo(beamEndX, beamEndY);
      DF.ctx.stroke();

      DF.ctx.strokeStyle = "rgba(0, 255, 255, 0.95)";
      DF.ctx.lineWidth = 8;
      DF.ctx.beginPath();
      DF.ctx.moveTo(focalX, focalY); DF.ctx.lineTo(beamEndX, beamEndY);
      DF.ctx.stroke();

      DF.ctx.strokeStyle = "#ffffff";
      DF.ctx.lineWidth = 3.5;
      DF.ctx.beginPath();
      DF.ctx.moveTo(focalX, focalY); DF.ctx.lineTo(beamEndX, beamEndY);
      DF.ctx.stroke();

      DF.ctx.beginPath();
      DF.ctx.arc(focalX, focalY, 16, 0, Math.PI * 2);
      DF.ctx.arc(focalX, focalY, 28, 0, Math.PI * 2);
      DF.ctx.arc(targetEnemy.x, targetEnemy.y, 24, 0, Math.PI * 2);
      DF.ctx.arc(targetEnemy.x, targetEnemy.y, 40, 0, Math.PI * 2);
      DF.ctx.stroke();
      DF.ctx.restore();

      // Expanding particle shockwaves
      if (globalVfxParticlePool) {
        for (var psw = 0; psw < 2; psw++) {
          var swIdx = globalVfxParticlePool.alloc();
          if (swIdx >= 0) {
            var swo = swIdx * 8;
            globalVfxParticlePool.buffer[swo] = targetEnemy.x;
            globalVfxParticlePool.buffer[swo + 1] = targetEnemy.y;
            globalVfxParticlePool.buffer[swo + 2] = (Math.random() - 0.5) * 3;
            globalVfxParticlePool.buffer[swo + 3] = (Math.random() - 0.5) * 3;
            globalVfxParticlePool.buffer[swo + 4] = 30 + psw * 10;
            globalVfxParticlePool.buffer[swo + 5] = 30 + psw * 10;
            globalVfxParticlePool.buffer[swo + 6] = 8.0 + psw * 8.0;
            globalVfxParticlePool.buffer[swo + 7] = 2; // Type 2: Shockwave ring
          }
        }
      }

      if (targetEnemy.gen === 7) {
        targetEnemy.shieldPulse = 1.0;
        targetEnemy.mode = "BREAK";
        targetEnemy.modeTimer = 35;
        dfRadio((targetEnemy.callsign || "SWARM") + ": QUANTUM SHIELD ABSORBS SINGULARITY BEAM!");
      } else {
        applyAirframeDamage(targetEnemy, 100.0, jet, "SINGULARITY_CANNON");
        dfRadio(jet.callsign + ": SINGULARITY SUPER LASER FIRED -> " + targetEnemy.callsign + " DISINTEGRATED!");
      }
    }
  } else {
    evaluateKineticWeapons(jet, targetEnemy, colors);
  }
}
