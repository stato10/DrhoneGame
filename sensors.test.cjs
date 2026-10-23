const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const math = require('./sensor-math.js');
assert.equal(math.roll([0,0,0,1]),0);
assert(Math.abs(math.roll([Math.SQRT1_2,0,0,Math.SQRT1_2])-90)<.001);
assert.equal(math.roll([0,0,0,0]),null);
assert.equal(math.roll([NaN,0,0,1]),null);
assert.equal(math.wrap(359),-1);
assert.equal(math.wrap(-359),1);
assert(!math.fresh(null,100));
assert(math.fresh(100,1599));
assert(!math.fresh(100,1600));
const elements=new Map(),listeners=new Map(); let intervals=0, removed=0;
const el=()=>({textContent:'',style:{},disabled:false,value:0,focus(){}});
const get=k=>{if(!elements.has(k))elements.set(k,el());return elements.get(k)};
const ctx=vm.createContext({SensorMath:math,window:{isSecureContext:true,addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:()=>removed++},document:{hidden:false,querySelector:get,querySelectorAll:()=>[],addEventListener(){}},performance:{now:()=>100},setInterval:()=>{intervals++;return 1},clearInterval:()=>intervals--,DeviceOrientationEvent:{},console});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'calibration.js'),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);
(async()=>{await run('enable()');assert(run('active'));assert.equal(run('mode'),'live');assert.equal(get('#wristStatus').textContent,'API לא זמין');run('onHead({alpha:359,beta:2});calibrate();onHead({alpha:1,beta:2});render()');assert.equal(get('#headValue').textContent,'YAW 2.0°');run('stop()');assert.equal(intervals,0);assert(!run('active'));run('demo()');assert.equal(get('#wristStatus').textContent,'הדגמה — לא צמיד');assert.equal(run('handCount'),0);run('stop();stop()');assert.equal(intervals,0);ctx.DeviceOrientationEvent.requestPermission=async()=> 'denied';await run('enable()');assert.equal(get('#headStatus').textContent,'הרשאה נדחתה');run('stop()');let resolve;ctx.DeviceOrientationEvent.requestPermission=()=>new Promise(r=>resolve=r);const pending=run('enable()');run('stop()');resolve('granted');await pending;assert(!run('active'));assert.equal(intervals,0);console.log('PASS: quaternion normalization, angle wrap, stale/null data, live input, calibration, unsupported/denied sensors, demo separation, idempotent cleanup, permission race.');})();


