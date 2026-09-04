// # Jets enabled
//
// Logline: localStorage flag for the dogfight rAF.
//
var dogfightAnimId = null;
var jetsEnabled = true;
function isJetsEnabled() {
  try {
    var stored = localStorage.getItem("ooda-jets-active");
    if (stored !== null) return stored === "true";
  } catch (e) {}
  return true;
}
function setJetsEnabled(val) {
  jetsEnabled = Boolean(val);
  try { localStorage.setItem("ooda-jets-active", jetsEnabled ? "true" : "false"); } catch (e) {}
  if (typeof CanvasLifecycleManager !== "undefined") CanvasLifecycleManager.updateAll();
}
var ACTIVE_GENS_KEY = "ooda-active-gens-v3";
var activeGens = { 1: false, 2: false, 3: false, 4: true, 5: false, 6: false, 7: false };
try {
  var storedGens = typeof localStorage !== "undefined" ? localStorage.getItem(ACTIVE_GENS_KEY) : null;
  if (storedGens) {
    var parsed = JSON.parse(storedGens);
    if (typeof parsed === "object" && parsed !== null) {
      for (var g = 1; g <= 7; g++) {
        if (typeof parsed[g] === "boolean") {
          activeGens[g] = parsed[g];
        }
      }
    }
  }
} catch (e) {
  for (var g3 = 1; g3 <= 7; g3++) activeGens[g3] = (g3 === 4);
}

function hasAnyActiveGen() {
  for (var k = 1; k <= 7; k++) {
    if (activeGens[k]) return true;
  }
  return false;
}

function saveActiveGens() {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(ACTIVE_GENS_KEY, JSON.stringify(activeGens));
    }
  } catch (e) {}
}

function getRandomActiveGen(preferred) {
  var available = [];
  for (var g = 1; g <= 7; g++) {
    if (activeGens[g]) available.push(g);
  }
  if (available.length === 0) return 0;
  if (preferred && activeGens[preferred]) return preferred;
  return available[Math.floor(Math.random() * available.length)];
}
function updateGenSelectorUI() {
  var btns = document.querySelectorAll(".gen-btn");
  for (var i = 0; i < btns.length; i++) {
    var btn = btns[i];
    var gAttr = btn.getAttribute("data-gen") || (btn.dataset && btn.dataset.gen);
    var gNum = parseInt(gAttr, 10);
    if (gNum >= 1 && gNum <= 7) {
      var isAct = Boolean(activeGens[gNum]);
      btn.classList.toggle("active", isAct);
      btn.setAttribute("aria-pressed", isAct ? "true" : "false");
    }
  }
}

function toggleGeneration(genNum) {
  if (genNum < 1 || genNum > 7) return;
  activeGens[genNum] = !activeGens[genNum];
  saveActiveGens();
  updateGenSelectorUI();

  var hasAny = hasAnyActiveGen();

  var genNames = [
    "",
    "GEN 1 (F-86 / MiG-15 Gunfighter)",
    "GEN 2 (F-104 / MiG-21 Supersonic)",
    "GEN 3 (F-4 / MiG-23 Radar Phantom)",
    "GEN 4 (F-16 Falcon Boyd 9G / F-14 Tomcat)",
    "GEN 5 (F-22 / Su-57 Stealth & Cobra)",
    "GEN 6 (NGAD / CCA Laser Swarm)",
    "GEN 7 (Quantum Swarm Globes / Omni-Directional Spheres)"
  ];
  if (globalRadioAdd) {
    if (!hasAny) {
      globalRadioAdd("TAC-NET: ALL GENERATIONS OFFLINE -> AIRSPACE DISENGAGED");
    } else {
      globalRadioAdd("TAC-NET: " + genNames[genNum] + (activeGens[genNum] ? " [ACTIVE]" : " [OFFLINE]"));
    }
  }
  if (!hasAny && globalSetAllOffline) {
    globalSetAllOffline();
  } else if (globalReassignHero) {
    globalReassignHero(genNum);
  } else {
    syncFleetToActiveGenerations(activeGens);
  }
}

function setupGenSelector() {
  updateGenSelectorUI();
}

if (typeof document !== "undefined" && !window._genSelectorDelegated) {
  window._genSelectorDelegated = true;
  document.addEventListener("click", function(e) {
    var target = e.target;
    var btn = target && (target.classList && target.classList.contains("gen-btn") ? target : (target.closest ? target.closest(".gen-btn") : null));
    if (!btn) return;
    var gAttr = btn.getAttribute("data-gen") || (btn.dataset && btn.dataset.gen);
    var gNum = parseInt(gAttr, 10);
    if (gNum >= 1 && gNum <= 7) {
      e.preventDefault();
      e.stopPropagation();
      toggleGeneration(gNum);
    }
  });
}
