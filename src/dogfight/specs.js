// # Aircraft specs
//
// Logline: Live fields only. Unused aero tables deleted.
//
var SERVICE_CEILINGS = { 1: 45000, 2: 55000, 3: 58000, 4: 60000, 5: 65000, 6: 75000, 7: 100000 };
var RESPAWN_CEILINGS = { 1: 35000, 2: 45000, 3: 48000, 4: 52000, 5: 60000, 6: 72000, 7: 92000 };
var V_CORNER = 4.8;
var AIRCRAFT_SPECS = {
  1: { hudName: "GEN 1 SABRE", callsign: "SABRE 1", mass: 1.0, baseSpeed: 3.8, maxSpeed: 4.8, thrustDry: 0.038, thrustAB: 0.045, cd0: 0.0020, kInduced: 1.60, maxTurnRate: 0.140, rcs: 1.0, rcsClean: 1.0, rcsBloom: 1.0, radarBaseline: 450, sensorReach: 450, oodaLatencyFrames: 24, hasFlares: false, hasChaff: false },
  2: { hudName: "GEN 2 STARFIGHTER", callsign: "STARFIGHTER 1", mass: 1.3, baseSpeed: 6.0, maxSpeed: 7.6, thrustDry: 0.045, thrustAB: 0.135, cd0: 0.0016, kInduced: 1.45, maxTurnRate: 0.155, rcs: 1.1, rcsClean: 1.1, rcsBloom: 1.1, radarBaseline: 650, sensorReach: 650, oodaLatencyFrames: 18, hasFlares: false, hasChaff: false },
  3: { hudName: "GEN 3 PHANTOM", callsign: "PHANTOM 1", mass: 1.8, baseSpeed: 4.6, maxSpeed: 7.2, thrustDry: 0.050, thrustAB: 0.115, cd0: 0.0022, kInduced: 1.25, maxTurnRate: 0.170, rcs: 1.5, rcsClean: 1.5, rcsBloom: 1.5, radarBaseline: 850, sensorReach: 850, oodaLatencyFrames: 12, hasFlares: true, hasChaff: true },
  4: { hudName: "GEN 4 VIPER / TOMCAT", callsign: "VIPER 1", mass: 2.2, baseSpeed: 5.2, maxSpeed: 7.4, thrustDry: 0.045, thrustAB: 0.115, cd0: 0.0018, kInduced: 0.85, maxTurnRate: 0.185, rcs: 1.2, rcsClean: 1.2, rcsBloom: 1.2, radarBaseline: 1100, sensorReach: 1100, oodaLatencyFrames: 6, hasFlares: true, hasChaff: true },
  5: { hudName: "GEN 5 RAPTOR", callsign: "RAPTOR 1", mass: 1.5, baseSpeed: 5.6, maxSpeed: 7.4, thrustDry: 0.065, thrustAB: 0.120, cd0: 0.0014, kInduced: 0.65, maxTurnRate: 0.200, rcs: 0.0001, rcsClean: 0.0001, rcsBloom: 1.2, radarBaseline: 1300, sensorReach: 1300, oodaLatencyFrames: 2, hasFlares: true, hasChaff: true },
  6: { hudName: "GEN 6 NGAD SWARM", callsign: "NGAD 1", mass: 1.9, baseSpeed: 6.2, maxSpeed: 7.6, thrustDry: 0.055, thrustAB: 0.135, cd0: 0.0014, kInduced: 0.65, maxTurnRate: 0.215, rcs: 0.00005, rcsClean: 0.00005, rcsBloom: 0.8, radarBaseline: 1500, sensorReach: 1500, oodaLatencyFrames: 1, hasFlares: true, hasChaff: true },
  7: { hudName: "GEN 7 QUANTUM GLOBES", callsign: "SWARM ALPHA", mass: 0.8, baseSpeed: 6.8, maxSpeed: 7.8, thrustDry: 0.060, thrustAB: 0.135, cd0: 0.0012, kInduced: 0.65, maxTurnRate: 0.245, rcs: 0.00001, rcsClean: 0.00001, rcsBloom: 0.00001, radarBaseline: 1800, sensorReach: 1800, oodaLatencyFrames: 0, hasFlares: true, hasChaff: true }
};
