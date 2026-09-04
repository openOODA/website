// # Jet physics B
//
// Logline: Afterburner sparks and gen-7 drones.
//
function updateJetPhysicsLate(jet, targetEnemy, incomingThreat, opposingPool, missilesPoolRef) {

  // Thermal ionization sparks when afterburner is active
  if (jet.afterburner && jet.gen !== 7 && Math.random() < 0.35 && globalVfxParticlePool) {
    var spIdx = globalVfxParticlePool.alloc();
    if (spIdx >= 0) {
      var spo = spIdx * 8;
      var spAngle = jet.angle + Math.PI + (Math.random() - 0.5) * 0.3;
      var spSpeed = 2.5 + Math.random() * 3.5;
      var spLife = 10 + Math.floor(Math.random() * 8);
      globalVfxParticlePool.buffer[spo] = jet.x - Math.cos(jet.angle) * 16 + (Math.random() - 0.5) * 4;
      globalVfxParticlePool.buffer[spo + 1] = jet.y - Math.sin(jet.angle) * 16 + (Math.random() - 0.5) * 4;
      globalVfxParticlePool.buffer[spo + 2] = Math.cos(spAngle) * spSpeed;
      globalVfxParticlePool.buffer[spo + 3] = Math.sin(spAngle) * spSpeed;
      globalVfxParticlePool.buffer[spo + 4] = spLife;
      globalVfxParticlePool.buffer[spo + 5] = spLife;
      globalVfxParticlePool.buffer[spo + 6] = 1.2;
      globalVfxParticlePool.buffer[spo + 7] = 1; // Type 1: Sparks
    }
  }

  var vx = Math.cos(jet.angle) * jet.speed;
  var vy = Math.sin(jet.angle) * jet.speed;

  if (jet.damageState === "CRITICAL" || (typeof jet.hp === "number" && jet.hp < 20.0)) {
    vy += (Math.random() - 0.5) * 1.8;
    vx += (Math.random() - 0.5) * 1.8;
    jet.stallBuffet = Math.max(jet.stallBuffet || 0, 0.8);
  } else if (jet.isStalled) {
    vy += (Math.random() - 0.5) * 1.5;
    vx += (Math.random() - 0.5) * 1.5;
  }

  jet.x += vx;
  jet.y += vy;

  // Hard Viewport Containment Clamping (Zero Screen-Wrap)
  // For Gen 7: strict ceiling clamp y >= 65 px (h <= 85,000 ft) and y <= DF.height - 65 px, x in [65, DF.width-65]
  var isGen7 = (jet.gen === 7);
  var minArenaX = isGen7 ? 65.0 : 60.0;
  var maxArenaX = isGen7 ? (DF.width - 65.0) : (DF.width - 60.0);
  if (jet.x < minArenaX) {
    jet.x = minArenaX;
    if (Math.cos(jet.angle) < 0) {
      jet.angle = (Math.sin(jet.angle) >= 0) ? 0.20 : -0.20;
      jet.targetAngle = (Math.sin(jet.targetAngle) >= 0) ? 0.20 : -0.20;
    }
  } else if (jet.x > maxArenaX) {
    jet.x = maxArenaX;
    if (Math.cos(jet.angle) > 0) {
      jet.angle = (Math.sin(jet.angle) >= 0) ? (Math.PI - 0.20) : (-Math.PI + 0.20);
      jet.targetAngle = (Math.sin(jet.targetAngle) >= 0) ? (Math.PI - 0.20) : (-Math.PI + 0.20);
    }
  }

  // Near-space ceiling (100k ft) header clamp (min visible ceiling y >= 32.0 px, Gen 7 strictly clamped to y >= 65.0 px)
  var minCeilingY = isGen7 ? 65.0 : 32.0;
  if (jet.y < minCeilingY) {
    jet.y = minCeilingY;
    if (Math.sin(jet.angle) < 0) {
      var isFacingRight = Math.cos(jet.angle) >= 0;
      jet.angle = isFacingRight ? 0.05 : (jet.angle < 0 ? -Math.PI - 0.05 : Math.PI + 0.05);
      jet.targetAngle = jet.angle;
    }
  }

  // Gen 7 floor clamp: y <= DF.height - 65.0 px
  if (isGen7 && jet.y > DF.height - 65.0) {
    jet.y = DF.height - 65.0;
    if (Math.sin(jet.angle) > 0) {
      var isFacingRightG7 = Math.cos(jet.angle) >= 0;
      jet.angle = isFacingRightG7 ? -0.05 : (jet.angle < 0 ? -Math.PI + 0.05 : Math.PI - 0.05);
      jet.targetAngle = jet.angle;
    }
  }

  // Minimum Altitude Floor Invariant (h >= 800 ft clearance)
  var minFloorY = Math.min(getYFromAltitude(800, DF.height), DF.height - 32.0);
  if (!jet.isDying && (altFt <= 800 || jet.y >= minFloorY)) {
    jet.y = Math.min(jet.y, minFloorY);
    if (Math.sin(jet.angle) > 0) {
      jet.angle = -0.15;
      jet.targetAngle = -0.20;
      jet.afterburner = true;
    }
  }

  // Ground Floor Impact Collision (0 ft terrain footer)
  if (jet.y >= DF.height && jet.active && !jet.isDying) {
    applyAirframeDamage(jet, 100.0, null, "TERRAIN_IMPACT");
    jet.y = DF.height;
    dfRadio("CFIT ALERT: " + (jet.callsign || spec.callsign) + " IMPACTED TERRAIN AT 0 FT!");
  }

  // Visual Damage Particle Emissions (<70%, <45%, <20% HP)
  if (!jet.isDying && jet.active && typeof jet.hp === "number") {
    if (jet.hp < 20.0) {
      // Critical Damage (<20% HP): Heavy billowing black smoke and fire trails
      jet.damageSmokeTimer = (jet.damageSmokeTimer || 0) + 1;
      var crIdx = DF.explosionsPool.alloc();
      if (crIdx >= 0) {
        var cro = crIdx * 6;
        DF.explosionsPool.buffer[cro] = jet.x - Math.cos(jet.angle) * 14 + (Math.random() - 0.5) * 6;
        DF.explosionsPool.buffer[cro + 1] = jet.y - Math.sin(jet.angle) * 14 + (Math.random() - 0.5) * 6;
        DF.explosionsPool.buffer[cro + 2] = -Math.cos(jet.angle) * 2.0 + (Math.random() - 0.5) * 3;
        DF.explosionsPool.buffer[cro + 3] = -Math.sin(jet.angle) * 2.0 + (Math.random() - 0.5) * 3;
        DF.explosionsPool.buffer[cro + 4] = 4 + Math.floor(Math.random() * 3);
        DF.explosionsPool.buffer[cro + 5] = 0.95;
      }
    } else if (jet.hp < 45.0) {
      // Moderate Damage (<45% HP): Steady dark smoke plume and occasional sparks
      jet.damageSmokeTimer = (jet.damageSmokeTimer || 0) + 1;
      if (jet.damageSmokeTimer % 2 === 0) {
        var moIdx = DF.explosionsPool.alloc();
        if (moIdx >= 0) {
          var moo = moIdx * 6;
          DF.explosionsPool.buffer[moo] = jet.x - Math.cos(jet.angle) * 12;
          DF.explosionsPool.buffer[moo + 1] = jet.y - Math.sin(jet.angle) * 12;
          DF.explosionsPool.buffer[moo + 2] = -Math.cos(jet.angle) * 1.5 + (Math.random() - 0.5) * 2;
          DF.explosionsPool.buffer[moo + 3] = -Math.sin(jet.angle) * 1.5 + (Math.random() - 0.5) * 2;
          DF.explosionsPool.buffer[moo + 4] = 3;
          DF.explosionsPool.buffer[moo + 5] = 0.7;
        }
      }
      jet.damageSparksTimer = (jet.damageSparksTimer || 0) + 1;
      if (jet.damageSparksTimer % 10 === 0) {
        var spDmgIdx = DF.explosionsPool.alloc();
        if (spDmgIdx >= 0) {
          var spDo = spDmgIdx * 6;
          DF.explosionsPool.buffer[spDo] = jet.x + (Math.random() - 0.5) * 8;
          DF.explosionsPool.buffer[spDo + 1] = jet.y + (Math.random() - 0.5) * 8;
          DF.explosionsPool.buffer[spDo + 2] = (Math.random() - 0.5) * 5;
          DF.explosionsPool.buffer[spDo + 3] = (Math.random() - 0.5) * 5;
          DF.explosionsPool.buffer[spDo + 4] = 2;
          DF.explosionsPool.buffer[spDo + 5] = 0.6;
        }
      }
    } else if (jet.hp < 70.0) {
      // Light Damage (<70% HP): Light smoke / vapor wisps
      jet.damageSmokeTimer = (jet.damageSmokeTimer || 0) + 1;
      if (jet.damageSmokeTimer % 3 === 0) {
        var vxVapDmg = jet.x - Math.cos(jet.angle) * 10 + Math.sin(jet.angle) * (Math.random() > 0.5 ? 6 : -6);
        var vyVapDmg = jet.y - Math.sin(jet.angle) * 10 - Math.cos(jet.angle) * (Math.random() > 0.5 ? 6 : -6);
        jet.wingVapor.push(vxVapDmg, vyVapDmg, 0.65, 0);
      }
    }
  }

  jet.contrail.push(
    jet.x - Math.cos(jet.angle) * 16,
    jet.y - Math.sin(jet.angle) * 16,
    jet.afterburner ? 0.75 : 0.35,
    jet.gForce
  );

  if (jet.flareCooldown > 0) jet.flareCooldown--;
  if (jet.gunCooldown > 0) jet.gunCooldown--;
  if (jet.missileCooldown > 0) jet.missileCooldown--;
  if (jet.laserCooldown > 0) jet.laserCooldown--;
  if (jet.triLaserCooldown > 0) jet.triLaserCooldown--;
  if (jet.superLaserCooldown > 0) jet.superLaserCooldown--;
  if (jet.superLaserPulse > 0) jet.superLaserPulse *= 0.85;

  updateJetPhysicsSwarm(jet, targetEnemy, incomingThreat);
}
