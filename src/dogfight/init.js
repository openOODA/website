// # Dogfight init
//
// Logline: Canvas, pools, rAF register.
//
function scrambleWave(team, gen) {
  if (!hasAnyActiveGen()) return;
  var pool = (team === "blue") ? DF.bluePool : DF.redPool;
  var isBlue = (team === "blue");
  var activeList = [];
  for (var g = 1; g <= 7; g++) if (activeGens[g]) activeList.push(g);
  if (activeList.length === 0) return;
  for (var idx = 0; idx < activeList.length; idx++) {
    var gg = activeList[idx];
    var specG = AIRCRAFT_SPECS[gg] || AIRCRAFT_SPECS[4];
    var jet = pool[idx];
    if (!jet.active || jet.isDying || jet.hp <= 0) {
      jet.gen = gg;
      jet.active = true;
      jet.isDying = false;
      jet.deathTimer = 0;
      jet.fadeAlpha = 1.0;
      jet.hp = 100.0;
      jet.maxHp = 100.0;
      jet.x = isBlue ? (-60 - idx * 45) : (DF.width + 60 + idx * 45);
      var baseY = getYFromAltitude(RESPAWN_CEILINGS[gg] || 52000, DF.height);
      jet.y = isBlue ? Math.max(32.0, baseY - (idx === 0 ? 50 : 25)) : Math.min(DF.height - 40.0, baseY + (idx === 0 ? 50 : 75));
      jet.angle = isBlue ? 0.0 : Math.PI;
      jet.targetAngle = jet.angle;
      jet.speed = specG.baseSpeed * 1.15;
      jet.baseSpeed = specG.baseSpeed;
      setupJetCallsignAndVariant(jet, gg, team, idx);
    }
  }
  dfRadio("TAC-NET: " + (isBlue ? "BLUE FORCE" : "RED FORCE") + " REINFORCEMENTS SCRAMBLING FROM FLANK!");
}

function initGlobalDogfight() {
  var canvas = document.getElementById("dogfight-canvas");
  if (!canvas) return;
  canvas.style.display = "block";
  var ctx = canvas.getContext("2d");
  if (!ctx) return;
  DF.canvas = canvas;
  DF.ctx = ctx;
  DF.width = canvas.width = Math.min(window.innerWidth, 1440);
  DF.height = canvas.height = Math.min(window.innerHeight, 900);
  function onResize() {
    DF.width = canvas.width = Math.min(window.innerWidth, 1440);
    DF.height = canvas.height = Math.min(window.innerHeight, 900);
  }
  window.removeEventListener("resize", onResize);
  window.addEventListener("resize", onResize);
  DF.bluePool = globalDogfightJetsState.bluePool;
  DF.redPool = globalDogfightJetsState.redPool;
  DF.allJets = globalDogfightJetsState.allJets;
  syncFleetToActiveGenerations(activeGens, DF.width, DF.height);
  DF.missilesPool = new StaticEntityPoolF32(48, 8);
  DF.missileSmokes = [];
  for (var ms = 0; ms < 48; ms++) DF.missileSmokes.push(new ContrailRingBufferF32(20, 4));
  DF.flaresPool = new StaticEntityPoolF32(64, 5);
  DF.chaffPool = new StaticEntityPoolF32(64, 5);
  DF.bulletsPool = new StaticEntityPoolF32(64, 6);
  DF.explosionsPool = new StaticEntityPoolF32(128, 6);
  DF.MAX_RADIO = 5;
  DF.radioBuffer = [
    { text: "", alpha: 0 }, { text: "", alpha: 0 }, { text: "", alpha: 0 },
    { text: "", alpha: 0 }, { text: "", alpha: 0 }
  ];
  DF.radioHead = 0;
  DF.radioCount = 0;
  globalRadioAdd = dfRadio;
  globalSetAllOffline = function () {
    for (var i = 0; i < DF.allJets.length; i++) DF.allJets[i].active = false;
  };
  globalReassignHero = function () {
    if (!hasAnyActiveGen()) globalSetAllOffline();
    else syncFleetToActiveGenerations(activeGens);
  };
  function start() {
    if (!jetsEnabled) return;
    if (!dogfightAnimId) dogfightAnimId = requestAnimationFrame(updateDogfight);
  }
  function stop() {
    if (dogfightAnimId) { cancelAnimationFrame(dogfightAnimId); dogfightAnimId = null; }
  }
  CanvasLifecycleManager.register("global-dogfight", {
    canvas: canvas, start: start, stop: stop, respectReducedMotion: false
  });
  start();
}
