// # Health and exhaust
//
// Logline: In-world HP bar and thrust plume.
//
var HUD_SEGMENTS = 10;
var HUD_SEGMENT_WIDTH = 7;
var HUD_SEGMENT_HEIGHT = 6;
var HUD_SEGMENT_GAP = 2;

function getHealthColor(hp, frameCount) {
  var val = typeof hp === "number" ? hp : 100.0;
  if (val >= 70.0) return "#00ff66";
  if (val >= 45.0) return "#ffd166";
  if (val >= 20.0) return "#ffa726";
  var flash = (Math.floor((frameCount || 0) / 10) % 2 === 0);
  return flash ? "#ff3333" : "#550000";
}

function getHealthStatus(hp) {
  var val = typeof hp === "number" ? hp : 100.0;
  if (val >= 70.0) return "NOMINAL";
  if (val >= 45.0) return "LIGHT DMG";
  if (val >= 20.0) return "MODERATE DMG";
  return "AIRFRAME CRITICAL";
}

function drawInWorldHealthBar(ctx, jet, colors, frameCount) {
  if (!ctx || !jet || !jet.active || jet.isDying) return;
  var hp = typeof jet.hp === "number" ? jet.hp : 100.0;
  if (hp >= 99.9 || hp <= 0.0) return; // Automatically hidden at 100% nominal health or when destroyed

  var bx = Math.floor(jet.x - 10);
  var by = Math.floor(jet.y - 18);
  var bw = 20;
  var bh = 3;
  var fillW = Math.max(0, Math.min(bw, Math.round((hp / 100.0) * bw)));

  var barColor;
  if (hp > 60.0) {
    barColor = (jet.team === "blue" || jet.isHero || jet.isBlue) ? ((colors && colors.blue) || "#7dcfff") : ((colors && colors.red) || "#ff6b6b");
  } else if (hp >= 25.0) {
    barColor = (colors && colors.gold) || "#ffd166";
  } else {
    var isFlash = (Math.floor((frameCount || 0) / 8) % 2 === 0);
    barColor = isFlash ? "#ff3333" : "#550000";
  }

  ctx.save();
  // 1. Dark backdrop frame with 1px border
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
  ctx.strokeStyle = "rgba(100, 100, 100, 0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(bx - 1, by - 1, bw + 2, bh + 2);

  // 2. Health Fill
  ctx.fillStyle = barColor;
  ctx.fillRect(bx, by, fillW, bh);
  ctx.restore();
}

function drawThrustScaledExhaust(ctx, jet, colors, now) {
  if (!ctx || !jet || jet.gen === 7 || !jet.active || jet.isDying) return;

  var isAB = Boolean(jet.afterburner);
  var spd = typeof jet.speed === "number" ? jet.speed : 4.0;
  var speedRatio = Math.min(1.0, Math.max(0.0, (spd - 2.0) / 5.6));

  // Dynamic dimension scaling:
  // Dry cruise: 4-8px length, 2-3px width
  // Afterburner sprint: 20-40px length, 4-6px width
  var baseLen = isAB ? (18.0 + speedRatio * 22.0) : (4.0 + speedRatio * 4.0);
  var flameL = Math.max(4, Math.min(40, Math.floor(baseLen + (isAB ? (Math.random() * 2.0 - 1.0) : 0))));
  var flameW = isAB ? (speedRatio > 0.7 ? 5 : 4) : 2;
  var halfW = flameW * 0.5;

  var isRed = Boolean(jet.team === "red" || jet.isRed);
  var faction = isRed ? FACTION_COLORS.red : FACTION_COLORS.blue;

  ctx.save();

  // 1. Outer Flame Plume locked strictly to FACTION_COLORS
  var grad = (ctx.createLinearGradient) ? ctx.createLinearGradient(0, 0, -flameL, 0) : null;
  if (grad) {
    if (isAB) {
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.35, faction.accent);
      grad.addColorStop(0.70, faction.primary);
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    } else {
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.40, faction.exhaustDry);
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    }
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = isAB ? faction.accent : faction.exhaustDry;
  }

  ctx.beginPath();
  ctx.moveTo(-14, -halfW);
  ctx.lineTo(-14 - flameL, 0);
  ctx.lineTo(-14, halfW);
  ctx.closePath();
  ctx.fill();

  // 2. Inner White-Hot Plasma Column
  var coreL = Math.max(2, Math.floor(flameL * 0.45));
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-14 - coreL, -1, coreL, 2);

  // 3. Pulsating Mach Diamonds (Shock Diamonds) in Supersonic Afterburner Sprint
  if (isAB && spd >= 5.0 && jet.gen >= 2) {
    var numDiamonds = (spd > 6.0) ? 4 : 3;
    var tNow = typeof now === "number" ? now : 0;
    for (var d = 1; d <= numDiamonds; d++) {
      var dDist = 14 + Math.floor((flameL / (numDiamonds + 1)) * d);
      if (dDist >= 14 + flameL - 3) break;
      var pulse = 0.8 + 0.3 * Math.sin(tNow * 0.04 + d * 1.6);
      var dw = 2.2 * pulse;
      var dh = 1.6 * pulse;
      var dx = -dDist;

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(dx - dw, 0);
      ctx.lineTo(dx, -dh);
      ctx.lineTo(dx + dw, 0);
      ctx.lineTo(dx, dh);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = faction.accent;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }

  ctx.restore();
}
