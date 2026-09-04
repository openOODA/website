// # Create jet
//
// Logline: Callsign, variant, pool object.
//
function setupJetCallsignAndVariant(jet, chosenGen, team, slotIdx) {
  var isBlue = (team === "blue");
  var numSlot = typeof slotIdx === "number" ? slotIdx : 0;
  var isLead = (numSlot === 0);
  var isF16 = false;
  var callsign = "";

  if (isBlue) {
    if (chosenGen === 1) callsign = "SABRE " + (numSlot + 1);
    else if (chosenGen === 2) callsign = "STARFIGHTER " + (numSlot + 1);
    else if (chosenGen === 3) callsign = "PHANTOM " + (numSlot + 1);
    else if (chosenGen === 4) {
      if (numSlot === 0) {
        isF16 = false;
        callsign = "TOMCAT 1";
      } else {
        isF16 = true;
        callsign = "VIPER " + (numSlot + 1);
      }
    } else if (chosenGen === 5) callsign = (numSlot % 2 === 0) ? ("RAPTOR " + (numSlot + 1)) : ("LIGHTNING " + (numSlot + 1));
    else if (chosenGen === 6) callsign = (numSlot % 2 === 0) ? ("NGAD BLUE " + (numSlot + 1)) : ("CCA BLUE " + (numSlot + 1));
    else if (chosenGen === 7) callsign = (numSlot === 0) ? "SWARM ALPHA" : ((numSlot === 1) ? "SWARM BRAVO" : ("SWARM BLUE " + (numSlot + 1)));
  } else {
    if (chosenGen === 1) callsign = "FAGOT " + (numSlot + 1);
    else if (chosenGen === 2) callsign = "FISHBED " + (numSlot + 1);
    else if (chosenGen === 3) callsign = "FLOGGER " + (numSlot + 1);
    else if (chosenGen === 4) {
      isF16 = false;
      callsign = (numSlot % 2 === 0) ? ("FLANKER " + (numSlot + 1)) : ("FULCRUM " + (numSlot + 1));
    } else if (chosenGen === 5) callsign = (numSlot % 2 === 0) ? ("FELON " + (numSlot + 1)) : ("CHECKMATE " + (numSlot + 1));
    else if (chosenGen === 6) callsign = (numSlot % 2 === 0) ? ("NGAD RED " + (numSlot + 1)) : ("CCA RED " + (numSlot + 1));
    else if (chosenGen === 7) callsign = (numSlot === 0) ? "SWARM CHARLIE" : ((numSlot === 1) ? "SWARM DELTA" : ("SWARM RED " + (numSlot + 1)));
  }

  jet.callsign = callsign || ((isBlue ? "BLUE " : "RED ") + (numSlot + 1));
  jet.variant = isF16 ? "F16" : (chosenGen === 4 ? "F14" : "STD");
  jet.wingSweep = (chosenGen === 4 && !isF16 ? 0.25 : 0.0);
}

function createJet(x, y, angle, gen, slotIdx, team) {
  var chosenGen = (gen && activeGens[gen]) ? gen : (activeGens[4] ? 4 : getRandomActiveGen());
  if (!chosenGen) chosenGen = 0;
  var spec = (typeof AIRCRAFT_SPECS !== "undefined" && AIRCRAFT_SPECS[chosenGen]) ? AIRCRAFT_SPECS[chosenGen] : (typeof AIRCRAFT_SPECS !== "undefined" && AIRCRAFT_SPECS ? AIRCRAFT_SPECS[4] : { baseSpeed: 4.8 });
  var baseSpeed = spec ? (spec.baseSpeed || 4.8) : 4.8;

  var actualTeam = (team === "red") ? "red" : "blue";
  var numSlot = typeof slotIdx === "number" ? slotIdx : 0;
  var isLead = (numSlot === 0);
  var isHero = (actualTeam === "blue" && isLead);

  var jet = {
    x: x,
    y: y,
    gen: chosenGen,
    team: actualTeam,
    slotIdx: numSlot,
    isLead: Boolean(isLead),
    isHero: Boolean(isHero),
    variant: "STD",
    callsign: "",
    speed: baseSpeed,
    baseSpeed: baseSpeed,
    prevSpeed: baseSpeed,
    hp: 100.0,
    maxHp: 100.0,
    damageState: "NOMINAL",
    lastDamagedBy: "",
    damageSmokeTimer: 0,
    damageSparksTimer: 0,
    angle: angle,
    targetAngle: angle,
    turnRate: 0,
    gForce: 1.0,
    energy: 100,
    energyHeight: 0,
    ps: 0,
    isStalled: false,
    stallBuffet: 0,
    mode: "PATROL",
    modeTimer: 0,
    isTailChasing: false,
    tailChaseTimer: 0,
    targetJet: null,
    wingmanJet: null,
    afterburner: true,
    flareCooldown: 0,
    chaffCooldown: 0,
    gunCooldown: 0,
    missileCooldown: chosenGen === 1 ? 999999 : (10 + Math.floor(Math.random() * 11)),
    laserCooldown: 0,
    triLaserCooldown: 0,
    superLaserCooldown: chosenGen === 7 ? (isHero ? 60 : (60 + Math.floor(Math.random() * 60))) : 0,
    superLaserPulse: 0,
    shieldPulse: 0,
    bayDoorTimer: 0,
    rcs: spec ? (spec.rcsClean || spec.rcs || 1.0) : 1.0,
    sensors: {
      radarLocked: false,
      lockQuality: 0,
      inRwrWarning: false,
      detectedThreats: []
    },
    wingSweep: (chosenGen === 4 ? 0.25 : 0.0),
    ccaDeployed: false,
    cca1: { x: 0, y: 0, angle: 0, speed: 6.0, active: false, laserCooldown: 0 },
    cca2: { x: 0, y: 0, angle: 0, speed: 6.0, active: false, laserCooldown: 0 },
    drone1: { x: 16, y: 0, targetX: 16, targetY: 0, worldX: x + Math.cos(angle) * 16, worldY: y + Math.sin(angle) * 16 },
    drone2: { x: -6, y: -14, targetX: -6, targetY: -14, worldX: x + Math.cos(angle) * -6 - Math.sin(angle) * -14, worldY: y + Math.sin(angle) * -6 + Math.cos(angle) * -14 },
    drone3: { x: -6, y: 14, targetX: -6, targetY: 14, worldX: x + Math.cos(angle) * -6 - Math.sin(angle) * 14, worldY: y + Math.sin(angle) * -6 + Math.cos(angle) * 14 },
    swarmMode: "FLANK",
    swarmTimer: Math.floor(Math.random() * 1000),
    trapTimer: 0,
    isDying: false,
    deathTimer: 0,
    fadeAlpha: 1.0,
    scrambleTimer: 0,
    contrail: typeof ContrailRingBufferF32 !== "undefined" ? new ContrailRingBufferF32(32, 4) : null,
    wingVapor: typeof ContrailRingBufferF32 !== "undefined" ? new ContrailRingBufferF32(32, 4) : null,
    kills: 0,
    active: true
  };

  setupJetCallsignAndVariant(jet, chosenGen, actualTeam, numSlot);
  return jet;
}
