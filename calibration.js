'use strict';
const $ = s => document.querySelector(s);
let active = false, mode = 'off', generation = 0, timer = null, wrist = null;
let head = null, hand = null, headZero = 0, handZero = 0;
let headAt = null, handAt = null, headCount = 0, handCount = 0;
let arrows = 0, confirmations = 0, headProblem = '', handProblem = '';
let demoHead = 0, demoHand = 0;
const note = text => { $('#message').textContent = text; };
function stop() {
  generation++; active = false;
  window.removeEventListener('deviceorientation', onHead);
  if (timer !== null) clearInterval(timer);
  timer = null;
  if (wrist) {
    wrist.removeEventListener('reading', onHand);
    wrist.removeEventListener('error', onHandError);
    wrist.stop(); wrist = null;
  }
  $('#enable').disabled = false; $('#demo').disabled = false; $('#stop').disabled = true;
  $('#mode').textContent = 'נעצר';
  $('#headStatus').textContent = 'נעצר'; $('#wristStatus').textContent = 'נעצר';
}
function onHead(event) {
  if (!active || mode !== 'live' || !Number.isFinite(event.alpha) || !Number.isFinite(event.beta)) return;
  head = {alpha: event.alpha, beta: event.beta}; headAt = performance.now(); headCount++;
}
function onHand() {
  if (!active || mode !== 'live') return;
  const value = SensorMath.roll(wrist?.quaternion);
  if (value === null) return;
  hand = value; handAt = performance.now(); handCount++;
}
function onHandError(event) {
  handProblem = event.error?.name === 'NotAllowedError' ? 'הרשאה נדחתה' : 'שגיאת חיישן';
  handAt = null;
}
async function enable() {
  stop();
  const token = generation;
  mode = 'live'; head = hand = null; headAt = handAt = null;
  headCount = handCount = 0; headZero = handZero = 0; headProblem = handProblem = '';
  arrows = confirmations = 0;
  $('#enable').disabled = true; $('#demo').disabled = true;
  note('בודק הרשאות וזמינות…');
  if (!window.isSecureContext) {
    note('נדרש HTTPS או localhost כדי לבדוק חיישנים.');
    $('#enable').disabled = false; $('#demo').disabled = false;
    return;
  }
  let orientationAllowed = true;
  try {
    if (typeof DeviceOrientationEvent === 'undefined') {
      orientationAllowed = false; headProblem = 'API לא זמין';
    } else if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      orientationAllowed = await DeviceOrientationEvent.requestPermission() === 'granted';
      if (!orientationAllowed) headProblem = 'הרשאה נדחתה';
    }
  } catch { orientationAllowed = false; headProblem = 'בקשת הרשאה נכשלה'; }
  // Permission prompts can outlive the page; never restart a hidden/stopped session.
  if (token !== generation || document.hidden) return;
  active = true;
  if (orientationAllowed) window.addEventListener('deviceorientation', onHead);
  if (typeof window.RelativeOrientationSensor === 'function') {
    try {
      wrist = new window.RelativeOrientationSensor({frequency: 30, referenceFrame: 'device', sensorId: 'emg-wrist'});
      wrist.addEventListener('reading', onHand);
      wrist.addEventListener('error', onHandError);
      wrist.start();
    } catch (error) { handProblem = error.name === 'NotAllowedError' ? 'הרשאה נדחתה' : 'אתחול נכשל'; }
  } else handProblem = 'API לא זמין';
  $('#mode').textContent = 'בדיקה במכשיר'; $('#stop').disabled = false;
  note('הזז ראש ויד בנפרד. אם רק הראש משפיע על הצמיד, ייתכן שהדפדפן התעלם ממזהה החיישן.');
  timer = setInterval(render, 100); render();
}
function demo() {
  stop(); mode = 'demo'; active = true;
  head = hand = null; headAt = handAt = null; headCount = handCount = 0;
  headZero = handZero = demoHead = demoHand = 0; arrows = confirmations = 0;
  $('#mode').textContent = 'הדגמה בלבד';
  $('#enable').disabled = false; $('#demo').disabled = true; $('#stop').disabled = false;
  note('הדגמה: ימין/שמאל מזיזים את הסמן. ללא הרשאות וללא נתוני חומרה.');
  timer = setInterval(render, 100); render();
}
function render() {
  if (!active) return;
  const now = performance.now(), demoMode = mode === 'demo';
  const hf = SensorMath.fresh(headAt, now), wf = SensorMath.fresh(handAt, now);
  $('#headStatus').textContent = demoMode ? 'הדגמה — לא חיישן' : hf ? 'מתקבלות דגימות' : headProblem || (headCount ? 'נתונים התיישנו' : 'ממתין לדגימה');
  $('#wristStatus').textContent = demoMode ? 'הדגמה — לא צמיד' : wf ? 'נתונים ניסיוניים · אמת מקור' : handProblem || (handCount ? 'נתונים התיישנו' : 'ממתין לדגימה');
  const yaw = demoMode ? demoHead : hf ? SensorMath.wrap(head.alpha - headZero) : null;
  const tilt = demoMode ? demoHand : wf ? SensorMath.wrap(hand - handZero) : null;
  $('#headValue').textContent = yaw === null ? '—' : `YAW ${yaw.toFixed(1)}°`;
  $('#wristValue').textContent = tilt === null ? '—' : `ROLL ${tilt.toFixed(1)}°`;
  $('#headMeter').value = yaw === null ? 0 : Math.min(1, Math.abs(yaw) / 45);
  $('#cursor').style.left = (tilt === null ? 50 : 50 + Math.max(-45, Math.min(45, tilt)) / 45 * 45) + '%';
  $('#inputStatus').textContent = arrows || confirmations ? 'אירועים התקבלו' : 'ממתין לקלט';
  $('#inputValue').textContent = `D-PAD ${arrows} · SELECT ${confirmations}`;
}
function calibrate() {
  if (!active) { note('הפעל בדיקה תחילה.'); return; }
  if (mode === 'demo') { demoHead = demoHand = 0; note('אופסה ההדגמה בלבד.'); }
  else {
    const now = performance.now(), hf = SensorMath.fresh(headAt, now), wf = SensorMath.fresh(handAt, now);
    if (!hf && !wf) { note('אין דגימות עדכניות לכיול.'); return; }
    if (hf) headZero = head.alpha;
    if (wf) handZero = hand;
    note('נקודת אפס עודכנה לחיישנים שמספקים נתונים.');
  }
  render();
}
function onKey(event) {
  if (event.key === 'Escape') { stop(); note('הבדיקה נעצרה.'); $('#enable').focus(); return; }
  if (!event.key.startsWith('Arrow')) return;
  if (active) arrows++;
  if (active && mode === 'demo') {
    demoHand = SensorMath.wrap(demoHand + (['ArrowRight', 'ArrowUp'].includes(event.key) ? 5 : -5));
    demoHead = demoHand;
  }
  // Arrow navigation remains available for every semantic control.
  event.preventDefault();
  const controls = [...document.querySelectorAll('button:not(:disabled), a[href], summary')];
  const current = controls.indexOf(document.activeElement);
  const delta = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
  controls[(current + delta + controls.length) % controls.length]?.focus();
  render();
}
$('#enable').onclick = enable; $('#stop').onclick = () => { stop(); note('החיישנים שוחררו.'); };
$('#demo').onclick = demo; $('#zero').onclick = calibrate;
// A single semantic click handler handles Enter/pinch; no synthetic double activation.
$('#confirm').onclick = () => { if (active) { confirmations++; render(); note('פעולת אישור התקבלה.'); } else note('הפעל בדיקה תחילה.'); };
$('#export').onclick = () => {
  const now = performance.now();
  const report = {version: 1, createdAt: new Date().toISOString(), mode, active,
    head: {samples: headCount, fresh: active && mode === 'live' && SensorMath.fresh(headAt, now), issue: headProblem},
    wrist: {experimental: true, sourceVerified: false, samples: handCount, fresh: active && mode === 'live' && SensorMath.fresh(handAt, now), issue: handProblem},
    input: {arrows, confirmations, physicalSourceVerified: false}, rawMotionIncluded: false};
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], {type: 'application/json'}));
  const a = document.createElement('a'); a.href = url; a.download = 'shadow-agent-equipment.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
document.addEventListener('keydown', onKey);
document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); note('הבדיקה נעצרה במעבר לרקע. הפעל מחדש כדי להמשיך.'); } });
window.addEventListener('pagehide', stop);
