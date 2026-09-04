// # Frame bullets
//
// Logline: Tracer streams and gun hits.
//
function dfStepBullets() {
  // 6. Simulate & Collide Bullets (Velocity-Aligned Tracer Streams & Spark Particles)
  for (var b = DF.bulletsPool.activeCount - 1; b >= 0; b--) {
    var bo = b * 6;
    DF.bulletsPool.buffer[bo] += DF.bulletsPool.buffer[bo + 2];
    DF.bulletsPool.buffer[bo + 1] += DF.bulletsPool.buffer[bo + 3];
    DF.bulletsPool.buffer[bo + 4]--;
    var bx = DF.bulletsPool.buffer[bo];
    var by = DF.bulletsPool.buffer[bo + 1];
    var bvx = DF.bulletsPool.buffer[bo + 2];
    var bvy = DF.bulletsPool.buffer[bo + 3];
    var blife = DF.bulletsPool.buffer[bo + 4];
    var bOwnerTeam = DF.bulletsPool.buffer[bo + 5]; // 0 = Blue, 1 = Red

    if (blife <= 0) {
      DF.bulletsPool.free(b);
      continue;
    }

    // Draw high-visibility velocity-aligned tracer line strokes
    DF.ctx.save();
    var bFaction = (bOwnerTeam === 1) ? FACTION_COLORS.red : FACTION_COLORS.blue;
    var tracerColor = bFaction ? (bFaction.tracer || bFaction.accent) : (bOwnerTeam === 0 ? "#38bdf8" : "#f43f5e");
    DF.ctx.strokeStyle = tracerColor;
    DF.ctx.lineWidth = 2.2;
    DF.ctx.beginPath();
    DF.ctx.moveTo(bx - bvx * 0.75, by - bvy * 0.75);
    DF.ctx.lineTo(bx, by);
    DF.ctx.stroke();

    // Incandescent white tracer core
    DF.ctx.strokeStyle = "#ffffff";
    DF.ctx.lineWidth = 1.2;
    DF.ctx.beginPath();
    DF.ctx.moveTo(bx - bvx * 0.35, by - bvy * 0.35);
    DF.ctx.lineTo(bx, by);
    DF.ctx.stroke();
    DF.ctx.restore();

    // Emit high-velocity tracer spark particles into globalVfxParticlePool
    if (globalVfxParticlePool && Math.random() < 0.30) {
      var spIdx = globalVfxParticlePool.alloc();
      if (spIdx >= 0) {
        var spo = spIdx * 8;
        var spkLife = 6 + Math.floor(Math.random() * 6);
        globalVfxParticlePool.buffer[spo] = bx - bvx * 0.4;
        globalVfxParticlePool.buffer[spo + 1] = by - bvy * 0.4;
        globalVfxParticlePool.buffer[spo + 2] = -bvx * 0.12 + (Math.random() - 0.5) * 2.0;
        globalVfxParticlePool.buffer[spo + 3] = -bvy * 0.12 + (Math.random() - 0.5) * 2.0;
        globalVfxParticlePool.buffer[spo + 4] = spkLife;
        globalVfxParticlePool.buffer[spo + 5] = spkLife;
        globalVfxParticlePool.buffer[spo + 6] = 1.0;
        globalVfxParticlePool.buffer[spo + 7] = 1; // Type 1: Sparks
      }
    }

    var targetPool = (bOwnerTeam === 0) ? DF.redPool : DF.bluePool;
    var shooterPool = (bOwnerTeam === 0) ? DF.bluePool : DF.redPool;
    var bulletConsumed = false;

    for (var ti = 0; ti < targetPool.length; ti++) {
      var tJet = targetPool[ti];
      if (!tJet.active || tJet.isDying) continue;
      if (Math.hypot(tJet.x - bx, tJet.y - by) < 20) {
        if (tJet.gen === 7) {
          tJet.shieldPulse = 1.0;
        } else {
          var shooterJet = shooterPool[0];
          var gDmg = 15.0 + Math.random() * 5.0;
          var isLethal = applyAirframeDamage(tJet, gDmg, shooterJet, "GUN_20MM");
          if (isLethal) {
            dfRadio("GUN KILL! SPLASH " + tJet.callsign);
          } else {
            for (var hbHit = 0; hbHit < 6; hbHit++) {
              var hbhIdx = DF.explosionsPool.alloc();
              if (hbhIdx >= 0) {
                var hbho = hbhIdx * 6;
                DF.explosionsPool.buffer[hbho] = bx;
                DF.explosionsPool.buffer[hbho + 1] = by;
                DF.explosionsPool.buffer[hbho + 2] = (Math.random() - 0.5) * 6;
                DF.explosionsPool.buffer[hbho + 3] = (Math.random() - 0.5) * 6;
                DF.explosionsPool.buffer[hbho + 4] = 2;
                DF.explosionsPool.buffer[hbho + 5] = 0.8;
              }
            }
          }
        }
        DF.bulletsPool.free(b);
        bulletConsumed = true;
        break;
      }
    }
    if (bulletConsumed) continue;
  }
}
