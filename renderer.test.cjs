const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let calls=0;
const gradient={addColorStop(){}};
const context=new Proxy({}, {get:(o,key)=>key in o?o[key]:(...args)=>{calls++;for(const x of args)if(typeof x==='number')assert(Number.isFinite(x),'non-finite canvas coordinate');if(String(key).startsWith('create'))return gradient;},set:(o,k,v)=>{o[k]=v;return true}});
const sandbox=vm.createContext({document:{createElement:()=>({getContext:()=>context})},DroneCore:require('./drone-core.js')});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'space-renderer.js'),'utf8'),sandbox);
for(const mode of ['menu','demo','device'])for(const full of [true,false])for(const x of [-1,0,1])for(const travel of [0,.5,.999]){
  sandbox.g=context;sandbox.s={...require('./drone-core.js').create(),x,travel};sandbox.m=mode;sandbox.full=full;
  vm.runInContext('SpaceRenderer.render(g,s,m,500,full)',sandbox);
}
assert(calls>1000);console.log('PASS: renderer menu/flight, effect levels, steering extremes and near-gate coordinates.');
