'use strict';
const $=s=>document.querySelector(s),ctx=$('canvas').getContext('2d');
let state=DroneCore.create(),mode='menu',running=false,waiting=false,paused=false;
let head=null,hand=null,headAt=null,handAt=null,headZero=0,handZero=0,device=null;
let fullGraphics=true;
let frame=null,last=0,audio=null,muted=false,steer=0,aim=0,generation=0,lastGate=0;
function sound(freq=660){if(muted||!audio)return;const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.frequency.value=freq;g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.15);o.start();o.stop(audio.currentTime+.15)}
function button(label,fn){const b=document.createElement('button');b.textContent=label;b.onclick=fn;$('#commands').append(b);return b}
function panel(title,description,detail=''){$('#panel').hidden=false;$('h1').textContent=title;$('#description').textContent=description;$('#detail').textContent=detail;$('#commands').replaceChildren()}
function release(){generation++;window.removeEventListener('deviceorientation',onHead);if(device){device.removeEventListener('reading',onWrist);device.removeEventListener('error',onError);device.stop();device=null;}if(frame!==null)cancelAnimationFrame(frame);frame=null;last=0}
function onHead(e){if(Number.isFinite(e.alpha)){head=e.alpha;headAt=performance.now();}}
function onWrist(){const r=SensorMath.roll(device?.quaternion);if(r!==null){hand=r;handAt=performance.now();}}
function onError(){handAt=null;}
const ready=()=>SensorMath.fresh(headAt,performance.now())&&SensorMath.fresh(handAt,performance.now());
async function connect(resume=false){
  release();const token=generation;mode='device';waiting=true;head=hand=null;headAt=handAt=null;
  panel('חיבור לציוד','הסתכל קדימה והחזק את היד בתנוחה נוחה. ממתינים לדגימות מהראש ומהצמיד.','ממשק פרק היד ניסיוני · יש לאמת מקור במסך הכיול');
  button('ביטול',menu);$('#select').hidden=true;$('#pause').hidden=true;
  try{
    if(!window.isSecureContext)throw Error('נדרש HTTPS להפעלת חיישנים.');
    if(typeof DeviceOrientationEvent==='undefined'||typeof window.RelativeOrientationSensor!=='function')throw Error('ממשקי החיישנים אינם זמינים בדפדפן הזה. אפשר לבחור אימון מקלדת.');
    if(typeof DeviceOrientationEvent.requestPermission==='function'&&await DeviceOrientationEvent.requestPermission()!=='granted')throw Error('לא ניתנה הרשאת תנועה.');
    if(token!==generation||document.hidden)return;
    window.addEventListener('deviceorientation',onHead);
    device=new window.RelativeOrientationSensor({frequency:30,referenceFrame:'device',sensorId:'emg-wrist'});
    device.addEventListener('reading',onWrist);device.addEventListener('error',onError);device.start();
    const check=()=>{if(token!==generation||!waiting)return;$('#connection').textContent='ראש: '+(SensorMath.fresh(headAt,performance.now())?'מתקבל':'ממתין')+' · צמיד: '+(SensorMath.fresh(handAt,performance.now())?'מתקבל':'ממתין');if(ready()){waiting=false;panel('הציוד מגיב','כוון ראש קדימה ויד למרכז. לחיצה על התחלה מכיילת את שתי הזוויות.');button(resume?'כיול והמשך':'כיול והתחלה',()=>{if(!ready()){connect(resume);return}headZero=head;handZero=hand;begin('device',resume)}).focus();button('ביטול',menu);return;}frame=requestAnimationFrame(check)};check();
  }catch(error){if(token!==generation)return;waiting=false;release();panel('הציוד אינו מוכן',error.message);button('נסה שוב',()=>connect(resume));button('אימון מקלדת',()=>begin('demo'));button('לתפריט',menu)}
}
function begin(selected,resume=false){
  if(selected==='demo')release();mode=selected;waiting=false;paused=false;running=true;
  if(!resume){state=DroneCore.create();steer=aim=0;lastGate=0;}
  try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});}catch{}
  $('#panel').hidden=true;$('#select').hidden=false;$('#pause').hidden=false;$('#pause').textContent='השהיה';$('#select').focus();last=0;if(frame!==null)cancelAnimationFrame(frame);frame=requestAnimationFrame(loop);
}
function pause(reason='הטיסה מושהית'){
  if(!running||paused)return;paused=true;release();$('#select').hidden=true;$('#pause').hidden=true;
  panel('השהיה',reason,'הזמן והניקוד נעצרו');button('המשך',()=>mode==='device'?connect(true):begin('demo',true)).focus();button('לתפריט',menu);
}
function end(){running=false;release();$('#select').hidden=true;$('#pause').hidden=true;let best=0;try{const key='drhone-best-'+mode;best=Number(localStorage.getItem(key))||0;best=Math.max(best,state.score);localStorage.setItem(key,best)}catch{}panel(state.phase==='won'?'המידע חולץ':'הרחפן אבד','ניקוד: '+state.score+' · שיא במצב זה: '+best,mode==='demo'?'אימון מקלדת — ללא אימות חומרה':'טיסת חיישנים — לפי מקור הנתונים שהדפדפן חשף');button('טיסה נוספת',()=>mode==='device'?connect():begin('demo')).focus();button('לתפריט',menu);sound(state.phase==='won'?1100:150)}
function menu(){running=false;waiting=false;paused=false;release();mode='menu';$('#select').hidden=true;$('#pause').hidden=true;$('#hint').textContent='';$('#connection').textContent='';panel('מבצע אורורה','הטה את היד כדי לעבור בשערים. כוון את הראש אל האות וצבוט לנעילת מידע.','12 שערים · 3 יחידות מגן · משחק בישיבה');button('טיסה עם חיישנים',()=>connect()).focus();button('אימון מקלדת',()=>begin('demo'));const a=document.createElement('a');a.href='calibration.html';a.textContent='כיול ציוד';$('#commands').append(a);const back=document.createElement('a');back.href='index.html';back.textContent='משימות נוספות';$('#commands').append(back);draw(0)}
function loop(now){frame=null;if(!running||paused)return;if(mode==='device'&&!ready()){pause('נתוני החיישנים התנתקו. המשך יחבר ויכייל מחדש.');return}if(document.hidden){pause('האפליקציה עברה לרקע.');return}if(last&&now-last<33){frame=requestAnimationFrame(loop);return}if(last&&now-last>1000){pause('הטיסה הושהתה לאחר הפסקה בעדכוני המסך.');return}const dt=last?(now-last)/1000:0;last=now;if(mode==='device'){steer=SensorMath.wrap(hand-handZero)/35;aim=SensorMath.wrap(head-headZero)/35;}DroneCore.step(state,dt,steer,aim);if(state.gate!==lastGate){sound(state.event.startsWith('פגיעה')?180:800);lastGate=state.gate;}draw(now);$('#gates').textContent=String(Math.min(12,state.gate+1)).padStart(2,'0')+' / 12';$('#points').textContent=String(state.score).padStart(4,'0');$('#health').textContent='◆ '.repeat(Math.max(0,state.health));$('#connection').textContent=mode==='device'?'שליטת חיישנים · יד להיגוי, ראש לכיוון':'אימון מקלדת · ← → היגוי · A / D סורק · Enter אישור';$('#hint').textContent=state.locked?'מידע נעול · עבור בשער':Math.abs(state.aim-DroneCore.positions[state.gate])<.22?'אות בכוונת — צבוט לנעילה':state.event||'כוון את הסורק אל האות';if(state.phase!=='playing'){end();return}frame=requestAnimationFrame(loop)}
function draw(now){SpaceRenderer.render(ctx,state,mode,now,fullGraphics)}

$('#quality').onclick=()=>{fullGraphics=!fullGraphics;$('#quality').textContent=fullGraphics?'אפקטים מלאים':'אפקטים קלים';if(!running)draw(0)};

$('#select').onclick=()=>{if(running&&!paused){if(DroneCore.lock(state))sound(1000);$('#hint').textContent=state.event;}};
$('#pause').onclick=()=>pause();$('#mute').onclick=()=>{muted=!muted;$('#mute').textContent=muted?'צליל מושתק':'צליל פעיל'};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(running&&!paused){e.preventDefault();pause()}return}if(running&&!paused){if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();if(mode==='demo')steer=DroneCore.clamp(steer+(e.key==='ArrowLeft'?-.18:e.key==='ArrowRight'?.18:0),-1,1);}if(mode==='demo'&&['a','d','A','D'].includes(e.key)){e.preventDefault();aim=DroneCore.clamp(aim+(e.key.toLowerCase()==='a'?-.15:.15),-1,1);}return;}if(e.key.startsWith('Arrow')){e.preventDefault();const buttons=[...document.querySelectorAll('button:not([hidden]),a')].filter(b=>!b.closest('[hidden]'));const i=buttons.indexOf(document.activeElement);buttons[(i+(['ArrowDown','ArrowRight'].includes(e.key)?1:-1)+buttons.length)%buttons.length]?.focus();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(running&&!paused)pause('האפליקציה עברה לרקע.');else if(waiting){waiting=false;release();panel('הבדיקה נעצרה','חזור לחיבור הציוד כדי להמשיך.');button('חיבור מחדש',()=>connect()).focus();button('לתפריט',menu)}}});window.addEventListener('pagehide',release);menu();



