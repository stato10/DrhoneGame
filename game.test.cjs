const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(require('node:path').join(__dirname,'index.html'),'utf8');
const code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
class El{constructor(){this.style={};this.children=[];this.textContent=''}replaceChildren(){this.children=[]}append(e){this.children.push(e)}querySelector(){return this.children[0]}focus(){}addEventListener(){}setAttribute(){}setPointerCapture(){}}
const els=new Map(),get=s=>{if(!els.has(s))els.set(s,new El());return els.get(s)};
const listeners={};
const ctx=vm.createContext({document:{querySelector:get,createElement:()=>new El(),addEventListener:(n,f)=>listeners[n]=f},window:{addEventListener(){}},performance:{now:()=>100},requestAnimationFrame(){},localStorage:{getItem:()=>null,setItem(){}},console});
vm.runInContext(code,ctx);
const run=s=>vm.runInContext(s,ctx);
(async()=>{await run('start()');assert.equal(run('phase'),'signal');run('move(35)');for(let t=100;t<2300;t+=100)run(`tick(${t})`);assert.equal(run('phase'),'lock');run('confirmRing()');assert.equal(run('ring'),0,'wrong ring must not pass');run('move(-105);confirmRing();move(135);confirmRing();move(-75);confirmRing()');assert.equal(run('phase'),'steady');run('togglePause()');const before=run('remaining');run('tick(2500)');assert.equal(run('remaining'),before);run('togglePause()');for(let t=2600;t<8100;t+=100)run(`tick(${t})`);assert.equal(run('phase'),'win');assert(run('score')>=1400);await run('start()');run('remaining=.01;last=100;tick(200)');assert.equal(run('phase'),'lost');await run('start()');assert.equal(run('phase'),'signal');assert.equal(run('score'),0);console.log('PASS: signal, rejection of wrong combination, 3 rings, pause, stability, win scoring, timeout, restart.');})();


