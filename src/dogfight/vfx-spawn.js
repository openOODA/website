// # VFX spawn
//
// Logline: Fireball and wreckage spawn.
//
var globalVfxParticlePool = new VfxParticlePool(512, 8);
var globalWreckagePool = new WreckagePool(32, 10);
function spawnStage1Fireball(x, y, vx, vy, count, gen) {
  var pool = (typeof globalVfxParticlePool !== "undefined" && globalVfxParticlePool) ? globalVfxParticlePool : null;
  if (!pool) return;
  var parentVx = typeof vx === "number" ? vx : 0;
  var parentVy = typeof vy === "number" ? vy : 0;
  var g = typeof gen === "number" ? gen : 4;
  var spec = (typeof AIRCRAFT_SPECS !== "undefined" && AIRCRAFT_SPECS && AIRCRAFT_SPECS[g]) ? AIRCRAFT_SPECS[g] : { mass: 1.5 };
  var mass = typeof spec.mass === "number" ? spec.mass : 1.5;

  // Mass-proportional scaling: R = 8.0 * sqrt(mass) (px)
  var blastRadius = 8.0 * Math.sqrt(mass);

  // Proportional particle counts: total between 18 and 45
  var nPlasma = Math.max(5, Math.min(11, Math.round(5.0 * mass)));
  var nSparks = Math.max(6, Math.min(16, Math.round(7.0 * mass)));
  var nSmoke = Math.max(6, Math.min(16, Math.round(7.0 * mass)));

  // Layer 1: White-hot core plasma particles (Type 0)
  for (var i = 0; i < nPlasma; i++) {
    var idx = pool.alloc();
    if (idx < 0) break;
    var off = idx * 8;
    var ang = Math.random() * Math.PI * 2;
    var spd = (1.2 + Math.random() * 3.2) * Math.sqrt(mass);
    var life = 14 + Math.floor(Math.random() * 12);
    pool.buffer[off] = x + (Math.random() - 0.5) * (blastRadius * 0.5);
    pool.buffer[off + 1] = y + (Math.random() - 0.5) * (blastRadius * 0.5);
    pool.buffer[off + 2] = parentVx * 0.5 + Math.cos(ang) * spd;
    pool.buffer[off + 3] = parentVy * 0.5 + Math.sin(ang) * spd;
    pool.buffer[off + 4] = life;
    pool.buffer[off + 5] = life;
    pool.buffer[off + 6] = (2.5 + Math.random() * 3.0) * Math.sqrt(mass);
    pool.buffer[off + 7] = 0; // Type 0: Core plasma
  }

  // Layer 2: High-velocity sparks (Type 1)
  for (var j = 0; j < nSparks; j++) {
    var sIdx = pool.alloc();
    if (sIdx < 0) break;
    var sOff = sIdx * 8;
    var sAng = Math.random() * Math.PI * 2;
    var sSpd = (3.5 + Math.random() * 6.5) * Math.sqrt(mass);
    var sLife = 18 + Math.floor(Math.random() * 18);
    pool.buffer[sOff] = x;
    pool.buffer[sOff + 1] = y;
    pool.buffer[sOff + 2] = parentVx * 0.4 + Math.cos(sAng) * sSpd;
    pool.buffer[sOff + 3] = parentVy * 0.4 + Math.sin(sAng) * sSpd;
    pool.buffer[sOff + 4] = sLife;
    pool.buffer[sOff + 5] = sLife;
    pool.buffer[sOff + 6] = 1.5;
    pool.buffer[sOff + 7] = 1; // Type 1: Sparks
  }

  // Layer 3: Feature 6: Single expanding shockwave ring scaled to detonation kinetic energy (Type 2)
  var rIdx = pool.alloc();
  if (rIdx >= 0) {
    var rOff = rIdx * 8;
    var rLife = 16;
    pool.buffer[rOff] = x;
    pool.buffer[rOff + 1] = y;
    pool.buffer[rOff + 2] = parentVx * 0.2;
    pool.buffer[rOff + 3] = parentVy * 0.2;
    pool.buffer[rOff + 4] = rLife;
    pool.buffer[rOff + 5] = rLife;
    pool.buffer[rOff + 6] = 4.0 * Math.sqrt(mass); // initial radius
    pool.buffer[rOff + 7] = 2; // Type 2: Shockwave ring
  }

  // Layer 4: Billowing thermal smoke (Type 3)
  for (var m = 0; m < nSmoke; m++) {
    var mIdx = pool.alloc();
    if (mIdx < 0) break;
    var mOff = mIdx * 8;
    var mAng = Math.random() * Math.PI * 2;
    var mSpd = 0.5 + Math.random() * 2.2;
    var mLife = 28 + Math.floor(Math.random() * 24);
    pool.buffer[mOff] = x + (Math.random() - 0.5) * blastRadius;
    pool.buffer[mOff + 1] = y + (Math.random() - 0.5) * blastRadius;
    pool.buffer[mOff + 2] = parentVx * 0.4 + Math.cos(mAng) * mSpd;
    pool.buffer[mOff + 3] = parentVy * 0.4 + Math.sin(mAng) * mSpd - 0.25;
    pool.buffer[mOff + 4] = mLife;
    pool.buffer[mOff + 5] = mLife;
    pool.buffer[mOff + 6] = (3.5 + Math.random() * 3.5) * Math.sqrt(mass);
    pool.buffer[mOff + 7] = 3; // Type 3: Smoke
  }
}

function spawnStage2Wreckage(jet) {
  if (!jet) return;
  var pool = (typeof globalWreckagePool !== "undefined" && globalWreckagePool) ? globalWreckagePool : null;
  if (!pool) return;

  var jx = typeof jet.x === "number" ? jet.x : 0;
  var jy = typeof jet.y === "number" ? jet.y : 0;
  var jAngle = typeof jet.angle === "number" ? jet.angle : 0;
  var jSpeed = typeof jet.speed === "number" ? jet.speed : 5.0;
  var jGen = typeof jet.gen === "number" ? jet.gen : 4;
  var spec = (typeof AIRCRAFT_SPECS !== "undefined" && AIRCRAFT_SPECS && AIRCRAFT_SPECS[jGen]) ? AIRCRAFT_SPECS[jGen] : { mass: 1.5 };
  var mass = typeof spec.mass === "number" ? spec.mass : 1.5;

  var parentVx = Math.cos(jAngle) * jSpeed;
  var parentVy = Math.sin(jAngle) * jSpeed;

  // Feature 7: Exactly 3 to 4 tumbling fuselage fragments based on airframe mass (mass <= 1.4 -> 3, mass > 1.4 -> 4)
  var numFragments = (mass > 1.4) ? 4 : 3;

  for (var f = 0; f < numFragments; f++) {
    var idx = pool.alloc();
    if (idx < 0) break;
    var off = idx * 10;

    var deltaVx = 0;
    var deltaVy = 0;
    if (f === 0) {
      deltaVx = Math.cos(jAngle) * 2.2 + (Math.random() - 0.5) * 1.0;
      deltaVy = Math.sin(jAngle) * 2.2 + (Math.random() - 0.5) * 1.0;
    } else if (f === 1) {
      deltaVx = Math.cos(jAngle - Math.PI * 0.5) * 2.4 + (Math.random() - 0.5) * 1.0;
      deltaVy = Math.sin(jAngle - Math.PI * 0.5) * 2.4 + (Math.random() - 0.5) * 1.0;
    } else if (f === 2) {
      deltaVx = Math.cos(jAngle + Math.PI * 0.5) * 2.4 + (Math.random() - 0.5) * 1.0;
      deltaVy = Math.sin(jAngle + Math.PI * 0.5) * 2.4 + (Math.random() - 0.5) * 1.0;
    } else {
      deltaVx = -Math.cos(jAngle) * 1.8 + (Math.random() - 0.5) * 1.0;
      deltaVy = -Math.sin(jAngle) * 1.8 + (Math.random() - 0.5) * 1.0;
    }

    var spin = ((Math.random() > 0.5 ? 1 : -1) * (0.08 + Math.random() * 0.16));
    var life = 75 + Math.floor(Math.random() * 40);

    pool.buffer[off] = jx + (Math.random() - 0.5) * 6;
    pool.buffer[off + 1] = jy + (Math.random() - 0.5) * 6;
    pool.buffer[off + 2] = parentVx * 0.7 + deltaVx;
    pool.buffer[off + 3] = parentVy * 0.7 + deltaVy;
    pool.buffer[off + 4] = jAngle + (Math.random() - 0.5);
    pool.buffer[off + 5] = spin;
    pool.buffer[off + 6] = life;
    pool.buffer[off + 7] = f;
    pool.buffer[off + 8] = 0.85 + Math.random() * 0.3;
    pool.buffer[off + 9] = jGen;
  }
}

function triggerStage3GroundImpact(x, groundY, impactVx, gen) {
  var pool = (typeof globalVfxParticlePool !== "undefined" && globalVfxParticlePool) ? globalVfxParticlePool : null;
  if (!pool) return;

  var gX = typeof x === "number" ? x : 0;
  var gY = typeof groundY === "number" ? groundY : 150;
  var ivx = typeof impactVx === "number" ? impactVx : 0;
  var g = typeof gen === "number" ? gen : 4;

  // 1. Upward fountain particles in upper hemisphere (28 particles)
  var numFountain = 28;
  for (var f = 0; f < numFountain; f++) {
    var fIdx = pool.alloc();
    if (fIdx < 0) break;
    var fOff = fIdx * 8;
    var angle = -Math.PI * (0.15 + Math.random() * 0.70);
    var speed = 3.0 + Math.random() * 7.5;
    var life = 24 + Math.floor(Math.random() * 22);

    pool.buffer[fOff] = gX + (Math.random() - 0.5) * 8;
    pool.buffer[fOff + 1] = gY - 2;
    pool.buffer[fOff + 2] = ivx * 0.35 + Math.cos(angle) * speed;
    pool.buffer[fOff + 3] = Math.sin(angle) * speed;
    pool.buffer[fOff + 4] = life;
    pool.buffer[fOff + 5] = life;
    pool.buffer[fOff + 6] = 2.0 + Math.random() * 2.5;
    pool.buffer[fOff + 7] = 5; // Type 5: Ground fountain
  }

  // 2. Expanding surface shockwave dome
  for (var s = 0; s < 2; s++) {
    var sIdx = pool.alloc();
    if (sIdx < 0) break;
    var sOff = sIdx * 8;
    var sLife = 18 + s * 6;
    pool.buffer[sOff] = gX;
    pool.buffer[sOff + 1] = gY;
    pool.buffer[sOff + 2] = ivx * 0.15;
    pool.buffer[sOff + 3] = 0;
    pool.buffer[sOff + 4] = sLife;
    pool.buffer[sOff + 5] = sLife;
    pool.buffer[sOff + 6] = 6.0 + s * 4.0;
    pool.buffer[sOff + 7] = 6; // Type 6: Ground dome
  }

  // 3. Scorch plume
  var numScorch = 10;
  for (var sc = 0; sc < numScorch; sc++) {
    var scIdx = pool.alloc();
    if (scIdx < 0) break;
    var scOff = scIdx * 8;
    var scLife = 35 + Math.floor(Math.random() * 30);
    pool.buffer[scOff] = gX + (Math.random() - 0.5) * 16;
    pool.buffer[scOff + 1] = gY - 2 - Math.random() * 4;
    pool.buffer[scOff + 2] = ivx * 0.2 + (Math.random() - 0.5) * 1.5;
    pool.buffer[scOff + 3] = -0.5 - Math.random() * 2.0;
    pool.buffer[scOff + 4] = scLife;
    pool.buffer[scOff + 5] = scLife;
    pool.buffer[scOff + 6] = 5.0 + Math.random() * 6.0;
    pool.buffer[scOff + 7] = 7; // Type 7: Scorch plume
  }
}
