const assert=require('node:assert/strict'),C=require('./flight-controls.js'),D=require('./drone-core.js');
const near=(a,b,t=1e-5)=>assert(Math.abs(a-b)<t,`${a} != ${b}`);
const axis=(a)=>[Math.sin(a*Math.PI/360),0,0,Math.cos(a*Math.PI/360)];
near(C.relativeRoll(axis(179),axis(170)),9);
near(C.relativeRoll(axis(-175),axis(175)),10);
near(C.relativeRoll(axis(40).map(x=>-x),axis(40)),0);
assert.equal(C.relativeRoll([0,0,0,0],axis(0)),null);
near(C.mapTilt(2.9),0);near(C.mapTilt(30),1);near(C.mapTilt(-30),-1);near(C.mapTilt(30,30,true),-1);
assert(C.mapTilt(15,45)<C.mapTilt(15,20));
const keys=new Set(['ArrowRight']);assert.equal(C.keyboard(keys).steer,1);keys.delete('ArrowRight');assert.equal(C.keyboard(keys).steer,0);
keys.add('ArrowLeft');keys.add('ArrowRight');assert.equal(C.keyboard(keys).steer,0);
function simulate(hz){const s=D.create();for(let i=0;i<hz*.4;i++)D.step(s,1/hz,1,0);return s;}
const a=simulate(30),b=simulate(60);near(a.x,b.x);assert(a.x>.95);assert(a.x<=1);
const s=D.create();for(let i=0;i<30;i++)D.step(s,1/30,1,0);for(let i=0;i<30;i++)D.step(s,1/30,0,0);assert(Math.abs(s.x)<.001);assert(Math.abs(s.vx)<.01);assert(Math.abs(s.roll)<.01);
let prev=0;const monotonic=D.create();for(let i=0;i<20;i++){D.step(monotonic,1/30,1,0);assert(monotonic.x>=prev&&monotonic.x<=1);prev=monotonic.x;}
console.log('PASS: neutral-relative quaternion, wrap/sign equivalence, deadzone, sensitivity/inversion, key release, frame-independent damping, center return and bounded movement.');
