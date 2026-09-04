// # VFX wreckage
//
// Logline: Ballistic wreckage draw.
//
function updateAndDrawWreckage(ctx, dt, height) {
  var pool = (typeof globalWreckagePool !== "undefined" && globalWreckagePool) ? globalWreckagePool : null;
  if (!pool || pool.activeCount === 0) return;

  var h = typeof height === "number" ? height : (ctx && ctx.canvas ? ctx.canvas.height : 150);
  var vfxPool = (typeof globalVfxParticlePool !== "undefined" && globalVfxParticlePool) ? globalVfxParticlePool : null;

  for (var i = pool.activeCount - 1; i >= 0; i--) {
    var off = i * 10;

    // Ballistic gravity arc: g = 0.16 px/frame^2
    pool.buffer[off + 3] += 0.16;
    // Aerodynamic drag
    pool.buffer[off + 2] *= 0.988;
    pool.buffer[off + 3] *= 0.992;
    // Angular rotation
    pool.buffer[off + 4] += pool.buffer[off + 5];
    // Translation
    pool.buffer[off] += pool.buffer[off + 2];
    pool.buffer[off + 1] += pool.buffer[off + 3];
    // Decrement life
    pool.buffer[off + 6]--;

    var wx = pool.buffer[off];
    var wy = pool.buffer[off + 1];
    var wvx = pool.buffer[off + 2];
    var wvy = pool.buffer[off + 3];
    var wAngle = pool.buffer[off + 4];
    var wLife = pool.buffer[off + 6];
    var wType = pool.buffer[off + 7];
    var wSize = pool.buffer[off + 8];
    var wGen = pool.buffer[off + 9];

    // Controlled sub-emitters to eliminate particle bloat
    if (vfxPool) {
      if (Math.random() < 0.35) {
        var smkIdx = vfxPool.alloc();
        if (smkIdx >= 0) {
          var smkOff = smkIdx * 8;
          var smkLife = 20 + Math.floor(Math.random() * 15);
          vfxPool.buffer[smkOff] = wx + (Math.random() - 0.5) * 4;
          vfxPool.buffer[smkOff + 1] = wy + (Math.random() - 0.5) * 4;
          vfxPool.buffer[smkOff + 2] = wvx * 0.2 + (Math.random() - 0.5) * 0.8;
          vfxPool.buffer[smkOff + 3] = wvy * 0.2 - Math.random() * 0.5;
          vfxPool.buffer[smkOff + 4] = smkLife;
          vfxPool.buffer[smkOff + 5] = smkLife;
          vfxPool.buffer[smkOff + 6] = 3.0 + Math.random() * 3.0;
          vfxPool.buffer[smkOff + 7] = 3;
        }
      }
      if (Math.random() < 0.15) {
        var embIdx = vfxPool.alloc();
        if (embIdx >= 0) {
          var embOff = embIdx * 8;
          var embLife = 10 + Math.floor(Math.random() * 10);
          vfxPool.buffer[embOff] = wx;
          vfxPool.buffer[embOff + 1] = wy;
          vfxPool.buffer[embOff + 2] = wvx * 0.4 + (Math.random() - 0.5) * 2.0;
          vfxPool.buffer[embOff + 3] = wvy * 0.4 + (Math.random() - 0.5) * 2.0;
          vfxPool.buffer[embOff + 4] = embLife;
          vfxPool.buffer[embOff + 5] = embLife;
          vfxPool.buffer[embOff + 6] = 1.2;
          vfxPool.buffer[embOff + 7] = 4;
        }
      }
    }

    // Ground Impact Trigger at terrain footer (wy >= h - 2, 0 ft)
    if (wy >= h - 2) {
      triggerStage3GroundImpact(wx, h - 2, wvx, wGen);
      pool.free(i);
      continue;
    }

    // Out of bounds / Expired
    if (wLife <= 0 || wx < -300 || wx > 2500) {
      pool.free(i);
      continue;
    }

    // Geometric fragment rendering
    if (ctx) {
      ctx.save();
      ctx.translate(Math.floor(wx), Math.floor(wy));
      ctx.rotate(wAngle);
      ctx.scale(wSize, wSize);

      ctx.fillStyle = typeof getAlphaColor === "function" ? getAlphaColor("fg", 0.75) : "#aaaaaa";
      ctx.strokeStyle = typeof getAlphaColor === "function" ? getAlphaColor("fg", 0.95) : "#ffffff";
      ctx.lineWidth = 1;

      ctx.beginPath();
      if (wType === 0) {
        ctx.moveTo(7, 0);
        ctx.lineTo(-3, -2.5);
        ctx.lineTo(-3, 2.5);
      } else if (wType === 1) {
        ctx.moveTo(0, 0);
        ctx.lineTo(-5, -7);
        ctx.lineTo(-9, -5);
        ctx.lineTo(-3, 0);
      } else if (wType === 2) {
        ctx.moveTo(0, 0);
        ctx.lineTo(-5, 7);
        ctx.lineTo(-9, 5);
        ctx.lineTo(-3, 0);
      } else if (wType === 3) {
        ctx.moveTo(2, -2);
        ctx.lineTo(2, 2);
        ctx.lineTo(-5, 3);
        ctx.lineTo(-7, 0);
        ctx.lineTo(-5, -3);
      } else {
        ctx.moveTo(-5, -2);
        ctx.lineTo(5, -2);
        ctx.lineTo(5, 2);
        ctx.lineTo(-5, 2);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ff6600";
      ctx.fillRect(-1, -1, 2, 2);

      ctx.restore();
    }
  }
}
