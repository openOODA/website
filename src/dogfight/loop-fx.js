// # Frame flares
//
// Logline: Flares, chaff, and explosion puffs.
//
function dfStepFx() {
  // 8. Flares, Chaff Clouds & Explosions Simulation
  for (var fli = DF.flaresPool.activeCount - 1; fli >= 0; fli--) {
    var flo = fli * 5;
    DF.flaresPool.buffer[flo] += DF.flaresPool.buffer[flo + 2];
    DF.flaresPool.buffer[flo + 1] += DF.flaresPool.buffer[flo + 3];
    DF.flaresPool.buffer[flo + 4] -= 0.024;
    var flx = DF.flaresPool.buffer[flo];
    var fly = DF.flaresPool.buffer[flo + 1];
    var flife = DF.flaresPool.buffer[flo + 4];

    if (flife <= 0) {
      DF.flaresPool.free(fli);
      continue;
    }

    DF.ctx.fillStyle = getAlphaColor("fg", flife);
    DF.ctx.fillRect(Math.floor(flx), Math.floor(fly), 3, 3);
  }

  for (var ci = DF.chaffPool.activeCount - 1; ci >= 0; ci--) {
    var co = ci * 5;
    DF.chaffPool.buffer[co] += DF.chaffPool.buffer[co + 2];
    DF.chaffPool.buffer[co + 1] += DF.chaffPool.buffer[co + 3];
    DF.chaffPool.buffer[co + 2] *= 0.92;
    DF.chaffPool.buffer[co + 3] *= 0.92;
    DF.chaffPool.buffer[co + 4] -= 0.018;
    var cx = DF.chaffPool.buffer[co];
    var cy = DF.chaffPool.buffer[co + 1];
    var clife = DF.chaffPool.buffer[co + 4];

    if (clife <= 0) {
      DF.chaffPool.free(ci);
      continue;
    }

    DF.ctx.fillStyle = (Math.random() > 0.5) ? ("rgba(200, 240, 255, " + Math.max(0, clife) + ")") : getAlphaColor("fg", clife * 0.75);
    DF.ctx.fillRect(Math.floor(cx), Math.floor(cy), 2, 2);
  }

  for (var exp = DF.explosionsPool.activeCount - 1; exp >= 0; exp--) {
    var eo = exp * 6;
    DF.explosionsPool.buffer[eo] += DF.explosionsPool.buffer[eo + 2];
    DF.explosionsPool.buffer[eo + 1] += DF.explosionsPool.buffer[eo + 3];
    DF.explosionsPool.buffer[eo + 2] *= 0.94;
    DF.explosionsPool.buffer[eo + 3] *= 0.94;
    DF.explosionsPool.buffer[eo + 5] -= 0.024;
    var exLife = DF.explosionsPool.buffer[eo + 5];

    if (exLife <= 0) {
      DF.explosionsPool.free(exp);
      continue;
    }

    var exX = Math.floor(DF.explosionsPool.buffer[eo]);
    var exY = Math.floor(DF.explosionsPool.buffer[eo + 1]);
    var exSize = DF.explosionsPool.buffer[eo + 4];

    if (exLife > 0.45) {
      DF.ctx.fillStyle = "#ffffff";
      DF.ctx.fillRect(exX - Math.floor(exSize * 0.25), exY - Math.floor(exSize * 0.25), Math.max(2, Math.floor(exSize * 0.5)), Math.max(2, Math.floor(exSize * 0.5)));
    }
    DF.ctx.fillStyle = getAlphaColor("fg", exLife * 0.9);
    DF.ctx.fillRect(exX - Math.floor(exSize * 0.5), exY - Math.floor(exSize * 0.5), exSize, exSize);
  }
}
