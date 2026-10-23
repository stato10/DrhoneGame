'use strict';
const DroneCore = (() => {
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const positions = [-.6,.45,0,-.35,.65,-.6,.25,.6,-.4,0,.65,-.55];
  function create() { return {phase:'playing',gate:0,travel:0,x:0,aim:0,health:3,score:0,locked:false,elapsed:0,event:''}; }
  function lock(s) {
    if (s.phase !== 'playing' || s.locked) return false;
    if (Math.abs(s.aim - positions[s.gate]) > .22) { s.event='כוון את הראש אל האות'; return false; }
    s.locked=true; s.score+=50; s.event='המידע ננעל · +50'; return true;
  }
  function step(s, dt, steer, aim) {
    if(s.phase !== 'playing') return;
    dt=clamp(dt,0,.1); s.elapsed+=dt;
    s.x += (clamp(steer,-1,1)-s.x)*Math.min(1,dt*9); s.aim=clamp(aim,-1,1);
    s.travel+=dt/(3.5-s.gate*.08);
    if(s.travel>=1) {
      if(Math.abs(s.x-positions[s.gate])<.27){s.score+=100;s.event='שער נקי · +100';}
      else{s.health--;s.event='פגיעה במסגרת';}
      s.gate++;s.travel=0;s.locked=false;
      if(s.health<=0)s.phase='lost'; else if(s.gate>=positions.length)s.phase='won';
    }
  }
  return {create,step,lock,positions,clamp};
})();
if(typeof module!=='undefined')module.exports=DroneCore;
