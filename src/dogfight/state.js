// # Dogfight state
//
// Logline: Shared DF bag for split loop files.
//
var DF = {
  canvas: null, ctx: null, width: 0, height: 0, lastTime: 0,
  GRAVITY: 0.045, V_STALL: 1.8, V_CORNER: 4.8, V_MAX: 7.6,
  blueIngressTimer: 0, redIngressTimer: 0,
  bluePool: null, redPool: null, allJets: null,
  missilesPool: null, missileSmokes: null,
  flaresPool: null, chaffPool: null, bulletsPool: null, explosionsPool: null,
  radioBuffer: null, radioHead: 0, radioCount: 0, MAX_RADIO: 5
};
function dfRadio(text) {
  if (!DF.radioBuffer) return;
  var slot = DF.radioBuffer[DF.radioHead];
  slot.text = text;
  slot.alpha = 1.0;
  DF.radioHead = (DF.radioHead + 1) % DF.MAX_RADIO;
  if (DF.radioCount < DF.MAX_RADIO) DF.radioCount++;
}
