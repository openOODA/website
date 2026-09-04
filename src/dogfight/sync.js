// # Sync fleet
//
// Logline: Map active gens onto blue/red pools.
//
var globalDogfightJetsState = {
  bluePool: [],
  redPool: [],
  allJets: []
};

for (var dbi = 0; dbi < 7; dbi++) {
  var dbGen = dbi + 1;
  globalDogfightJetsState.bluePool.push(createJet(320, getYFromAltitude(RESPAWN_CEILINGS[dbGen] || 52000, 900), 0, dbGen, dbi, "blue"));
  globalDogfightJetsState.redPool.push(createJet(1280, getYFromAltitude(RESPAWN_CEILINGS[dbGen] || 52000, 900), Math.PI, dbGen, dbi, "red"));
}
for (var dai = 0; dai < 7; dai++) globalDogfightJetsState.allJets.push(globalDogfightJetsState.bluePool[dai]);
for (var dri = 0; dri < 7; dri++) globalDogfightJetsState.allJets.push(globalDogfightJetsState.redPool[dri]);

if (typeof global !== "undefined") {
  global.globalDogfightJets = globalDogfightJetsState;
}
if (typeof window !== "undefined") {
  window.globalDogfightJets = globalDogfightJetsState;
}

function syncFleetToActiveGenerations(activeGensMask, canvasW, canvasH) {
  var w = (typeof canvasW === "number" && canvasW > 0) ? canvasW : 1600;
  var h = (typeof canvasH === "number" && canvasH > 0) ? canvasH : 900;
  var bPool = globalDogfightJetsState.bluePool;
  var rPool = globalDogfightJetsState.redPool;
  var aJets = globalDogfightJetsState.allJets;

  var mask = (typeof activeGensMask === "object" && activeGensMask !== null) ? activeGensMask : {};
  for (var ag = 1; ag <= 7; ag++) {
    activeGens[ag] = Boolean(mask[ag]);
  }

  var activeList = [];
  for (var g = 1; g <= 7; g++) {
    if (mask[g]) activeList.push(g);
  }
  var nActive = activeList.length;

  if (nActive === 0) {
    for (var i = 0; i < aJets.length; i++) {
      aJets[i].active = false;
      aJets[i].targetJet = null;
      aJets[i].wingmanJet = null;
    }
    return;
  }

  // 1 Blue + 1 Red per active generation
  for (var idx = 0; idx < nActive; idx++) {
    var g = activeList[idx];
    var specG = (typeof AIRCRAFT_SPECS !== "undefined" && AIRCRAFT_SPECS[g]) ? AIRCRAFT_SPECS[g] : { baseSpeed: 4.8 };
    var gAltY = getYFromAltitude(RESPAWN_CEILINGS[g] || 52000, h);

    var bJet = bPool[idx];
    bJet.gen = g;
    bJet.active = true;
    bJet.isDying = false;
    bJet.deathTimer = 0;
    bJet.fadeAlpha = 1.0;
    bJet.hp = 100.0;
    bJet.maxHp = 100.0;
    bJet.damageState = "NOMINAL";
    bJet.lastDamagedBy = "";
    bJet.damageSmokeTimer = 0;
    bJet.damageSparksTimer = 0;
    bJet.x = w * 0.20 + (idx % 2 === 1 ? -40 : 0);
    bJet.y = Math.max(32.0, gAltY - (idx === 0 ? 50 : 25));
    bJet.angle = 0.0;
    bJet.targetAngle = 0.0;
    bJet.speed = specG.baseSpeed || 4.8;
    bJet.baseSpeed = specG.baseSpeed || 4.8;
    bJet.prevSpeed = bJet.speed;
    bJet.ps = 0;
    bJet.turnRate = 0;
    bJet.gForce = 1.0;
    bJet.isStalled = false;
    bJet.mode = "PATROL";
    bJet.modeTimer = 30;
    bJet.afterburner = true;
    bJet.targetJet = null;
    bJet.isLead = (idx === 0);
    bJet.isHero = (idx === 0);
    bJet.rcs = specG.rcsClean || specG.rcs || 1.0;
    bJet.bayDoorTimer = 0;
    bJet.flareCooldown = 0;
    bJet.chaffCooldown = 0;
    bJet.gunCooldown = 0;
    bJet.missileCooldown = g === 1 ? 999999 : (10 + Math.floor(Math.random() * 11));
    bJet.laserCooldown = 0;
    bJet.triLaserCooldown = 0;
    bJet.superLaserCooldown = g === 7 ? (60 + Math.floor(Math.random() * 60)) : 0;
    bJet.superLaserPulse = 0;
    bJet.shieldPulse = 0;
    bJet.ccaDeployed = false;
    setupJetCallsignAndVariant(bJet, g, "blue", idx);
    if (bJet.contrail) bJet.contrail.clear();
    if (bJet.wingVapor) bJet.wingVapor.clear();

    var rJet = rPool[idx];
    rJet.gen = g;
    rJet.active = true;
    rJet.isDying = false;
    rJet.deathTimer = 0;
    rJet.fadeAlpha = 1.0;
    rJet.hp = 100.0;
    rJet.maxHp = 100.0;
    rJet.damageState = "NOMINAL";
    rJet.lastDamagedBy = "";
    rJet.damageSmokeTimer = 0;
    rJet.damageSparksTimer = 0;
    rJet.x = w * 0.80 + (idx % 2 === 1 ? 40 : 0);
    rJet.y = Math.min(h - 40.0, gAltY + (idx === 0 ? 50 : 75));
    rJet.angle = Math.PI;
    rJet.targetAngle = Math.PI;
    rJet.speed = specG.baseSpeed || 4.8;
    rJet.baseSpeed = specG.baseSpeed || 4.8;
    rJet.prevSpeed = rJet.speed;
    rJet.ps = 0;
    rJet.turnRate = 0;
    rJet.gForce = 1.0;
    rJet.isStalled = false;
    rJet.mode = "PATROL";
    rJet.modeTimer = 30;
    rJet.afterburner = true;
    rJet.targetJet = null;
    rJet.isLead = (idx === 0);
    rJet.isHero = false;
    rJet.rcs = specG.rcsClean || specG.rcs || 1.0;
    rJet.bayDoorTimer = 0;
    rJet.flareCooldown = 0;
    rJet.chaffCooldown = 0;
    rJet.gunCooldown = 0;
    rJet.missileCooldown = g === 1 ? 999999 : (10 + Math.floor(Math.random() * 11));
    rJet.laserCooldown = 0;
    rJet.triLaserCooldown = 0;
    rJet.superLaserCooldown = g === 7 ? (60 + Math.floor(Math.random() * 60)) : 0;
    rJet.superLaserPulse = 0;
    rJet.shieldPulse = 0;
    rJet.ccaDeployed = false;
    setupJetCallsignAndVariant(rJet, g, "red", idx);
    if (rJet.contrail) rJet.contrail.clear();
    if (rJet.wingVapor) rJet.wingVapor.clear();
  }

  // Assign mutual wingman links (or self when single)
  for (var wi = 0; wi < nActive; wi++) {
    var partnerIdx = (nActive > 1) ? ((wi % 2 === 0) ? (wi + 1 < nActive ? wi + 1 : wi) : wi - 1) : wi;
    bPool[wi].wingmanJet = bPool[partnerIdx];
    rPool[wi].wingmanJet = rPool[partnerIdx];
  }

  // Deactivate unused slots
  for (var rem = nActive; rem < 7; rem++) {
    bPool[rem].active = false;
    bPool[rem].targetJet = null;
    bPool[rem].wingmanJet = null;
    rPool[rem].active = false;
    rPool[rem].targetJet = null;
    rPool[rem].wingmanJet = null;
  }
}
