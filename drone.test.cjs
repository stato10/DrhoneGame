const assert=require('node:assert/strict'),D=require('./drone-core.js');
const s=D.create();s.aim=D.positions[0];assert(D.lock(s));assert(!D.lock(s));assert.equal(s.score,50);
for(let gate=0;gate<12;gate++){while(s.gate===gate&&s.phase==='playing')D.step(s,.05,D.positions[gate],D.positions[gate]);}
assert.equal(s.phase,'won');assert.equal(s.score,1250);
const bad=D.create();for(let i=0;i<1000&&bad.phase==='playing';i++)D.step(bad,.1,1,-1);assert.equal(bad.phase,'lost');assert.equal(bad.health,0);
const miss=D.create();miss.aim=1;assert(!D.lock(miss));assert.equal(miss.score,0);
const finished=JSON.stringify(s);D.step(s,1,1,1);assert.equal(JSON.stringify(s),finished);
console.log('PASS: 12-gate win, three-hit loss, lock accuracy, duplicate lock prevention, terminal state.');
