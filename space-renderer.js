'use strict';
// Lightweight software 3D renderer. Original geometry, no downloaded assets.
const SpaceRenderer = (() => {
  const TAU=Math.PI*2;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  function random(seed){return()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296}}
  const rng=random(7621),stars=Array.from({length:95},()=>({x:rng()*600,y:rng()*600,z:.3+rng()*.7}));
  const rocks=Array.from({length:11},(_,i)=>({x:(i%2?1:-1)*(.9+rng()*1.4),y:-.5+rng()*1.5,z:rng()*5,spin:rng()*6,r:.08+rng()*.15}));
  let backdrop=null,bank=0,lastX=0,lastHealth=3,impact=0,lastGate=0,burst=0;
  const vertices=[
    [0,0,-2.8],[-.36,.02,-1.1],[.36,.02,-1.1],[-.38,.15,1.2],[.38,.15,1.2],[0,-.43,-.75],[0,-.35,.8],[0,.38,.7],
    [-.35,.05,-.3],[-2.1,.12,1.5],[-1.82,.12,1.9],[-.43,.12,1.4],
    [.35,.05,-.3],[2.1,.12,1.5],[1.82,.12,1.9],[.43,.12,1.4],
    [-.32,-.12,-1.05],[.32,-.12,-1.05],[-.26,-.5,-.35],[.26,-.5,-.35],[-.27,-.3,.4],[.27,-.3,.4],
    [-.55,.06,.4],[-.6,-.55,1.5],[-.6,.12,1.65],[.55,.06,.4],[.6,-.55,1.5],[.6,.12,1.65],
    [-1.1,.06,.9],[-1.1,-.22,1.45],[-1.1,.1,1.75],[1.1,.06,.9],[1.1,-.22,1.45],[1.1,.1,1.75]
  ];
  const faces=[
    [[0,1,5],[132,157,181]],[[0,5,2],[183,204,218]],[[0,2,7],[76,101,126]],[[0,7,1],[60,83,103]],
    [[1,3,6,5],[104,133,156]],[[2,5,6,4],[176,193,206]],[[3,7,4,6],[62,90,109]],
    [[8,9,10,11],[119,144,162]],[[12,15,14,13],[182,200,211]],
    [[8,11,3],[54,76,97]],[[12,4,15],[104,132,151]],
    [[16,18,19,17],[48,167,203]],[[18,20,21,19],[24,74,116]],[[16,20,18],[35,108,143]],[[17,19,21],[92,204,221]],
    [[22,23,24],[93,121,139]],[[25,27,26],[166,184,200]],
    [[28,29,30],[78,105,128]],[[31,33,32],[157,179,194]],
    [[9,10,30,28],[36,61,82]],[[13,31,33,14],[87,114,136]]
  ];
  function background(){
    const c=document.createElement('canvas');c.width=c.height=600;const g=c.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,600,600);
    const haze=g.createRadialGradient(420,160,10,340,200,380);haze.addColorStop(0,'#102c46');haze.addColorStop(.55,'#07111c');haze.addColorStop(1,'#000');g.fillStyle=haze;g.fillRect(0,0,600,600);
    g.save();g.translate(460,120);g.rotate(-.35);g.strokeStyle='#416179';g.lineWidth=6;g.beginPath();g.ellipse(0,0,158,34,0,0,TAU);g.stroke();
    const p=g.createRadialGradient(-38,-35,5,0,0,91);p.addColorStop(0,'#6b99b3');p.addColorStop(.5,'#284e69');p.addColorStop(.84,'#0e243d');p.addColorStop(1,'#02070c');g.fillStyle=p;g.beginPath();g.arc(0,0,91,0,TAU);g.fill();
    g.save();g.beginPath();g.arc(0,0,91,0,TAU);g.clip();for(let i=0;i<8;i++){g.strokeStyle=i%2?'#9fc4cf22':'#152c4166';g.lineWidth=3+i%3;g.beginPath();g.ellipse(-5,-70+i*20,110,18,-.08,0,Math.PI);g.stroke()}g.restore();g.strokeStyle='#88b6c655';g.lineWidth=1;g.beginPath();g.arc(0,0,92,0,TAU);g.stroke();g.restore();
    return c;
  }
  function polygon(g,pts,fill,stroke){g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=.65;g.stroke()}}
  function transform(p,angle,pitch){const [x,y,z]=p,cp=Math.cos(pitch),sp=Math.sin(pitch),ca=Math.cos(angle),sa=Math.sin(angle);const yy=y*cp-z*sp,zz=y*sp+z*cp;return [x*ca-yy*sa,x*sa+yy*ca,zz]}
  function ship(g,x,y,scale,angle,t,detail){
    g.save();g.translate(x,y);const points=vertices.map(v=>transform(v,angle,.38));
    const project=p=>[p[0]*scale*(1+p[2]*.035),p[1]*scale+p[2]*scale*.27];
    // Engine plumes are layered solid polygons, avoiding expensive shadowBlur.
    for(const ex of [-.64,.64]){const nozzle=project(transform([ex,.17,1.25],angle,.38));const tail=project(transform([ex,.17,3.1+Math.sin(t/60)*.12],angle,.38));const w=scale*.19;
      polygon(g,[[nozzle[0]-w,nozzle[1]],[tail[0],tail[1]],[nozzle[0]+w,nozzle[1]]],'#167dc966');
      polygon(g,[[nozzle[0]-w*.48,nozzle[1]],[tail[0],tail[1]-scale*.17],[nozzle[0]+w*.48,nozzle[1]]],'#75efff');
      g.fillStyle='#ddffff';g.beginPath();g.ellipse(nozzle[0],nozzle[1],w*.38,w*.23,angle,0,TAU);g.fill();
    }
    const sorted=faces.map(([ids,color])=>({ids,color,depth:ids.reduce((a,i)=>a+points[i][2],0)/ids.length})).sort((a,b)=>a.depth-b.depth);
    for(const f of sorted){const a=points[f.ids[0]],b=points[f.ids[1]],c=points[f.ids[2]],u=b.map((n,i)=>n-a[i]),v=c.map((n,i)=>n-a[i]);const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const mag=Math.hypot(...n)||1;const light=.58+.42*Math.abs((n[0]*-.3+n[1]*-.8+n[2]*-.4)/mag);const rgb=f.color.map(z=>Math.round(z*light));polygon(g,f.ids.map(i=>project(points[i])),`rgb(${rgb})`,detail?'#b4d9ed55':null)}
    if(detail){g.strokeStyle='#e0f5ff88';g.lineWidth=.8;for(const side of [-1,1]){const p=project(transform([side*.65,-.01,.75],angle,.38)),q=project(transform([side*1.68,.1,1.58],angle,.38));g.beginPath();g.moveTo(...p);g.lineTo(...q);g.stroke();const light=project(transform([side*1.9,.06,1.6],angle,.38));g.fillStyle=side<0?'#ff815c':'#93ffd7';g.fillRect(light[0]-2,light[1]-1,4,2)}}
    g.restore();
  }
  function gate(g,x,y,w,h,locked,alpha,phase){
    g.save();g.globalAlpha=alpha;const color=locked?'#80ffe1':'#ffbf69';
    g.strokeStyle='#233a47';g.lineWidth=11;g.beginPath();g.ellipse(x,y,w,h,0,0,TAU);g.stroke();g.strokeStyle=color;g.lineWidth=3;g.stroke();
    for(let i=0;i<8;i++){const a=i*TAU/8;const px=x+Math.cos(a)*w,py=y+Math.sin(a)*h;g.save();g.translate(px,py);g.rotate(a);g.fillStyle='#536579';g.fillRect(-6,-4,12,8);g.fillStyle=color;g.fillRect(-2,-4,4,8);g.restore()}
    if(phase){g.strokeStyle='#82ffff';g.lineWidth=1;g.beginPath();g.ellipse(x,y,w*.92,h*.92,0,phase,phase+.7);g.stroke()}
    g.restore();
  }
  function render(g,s,mode,t,full=true){
    backdrop??=background();g.drawImage(backdrop,0,0);const flying=mode!=='menu';const time=flying?s.elapsed:0;
    for(const star of stars){const dx=star.x-300,dy=star.y-240,z=(star.z+time*.09)%1,p=.3+z*.8,x=300+dx*p,y=240+dy*p;g.strokeStyle=`rgba(173,218,245,${.25+z*.55})`;g.lineWidth=z>.75?1.4:.7;g.beginPath();g.moveTo(x,y);g.lineTo(x+dx*.012*z,y+dy*.012*z);g.stroke()}
    if(full)for(const r of rocks){const z=1+((r.z-time*.65)%5+5)%5,f=1/z,x=300+r.x*280*f,y=240+r.y*240*f,size=r.r*150*f;g.save();g.translate(x,y);g.rotate(r.spin+time*.05);polygon(g,[[-size,-size*.4],[-size*.3,-size],[size*.65,-size*.7],[size,size*.2],[size*.1,size],[-size*.75,size*.5]],'#17232d','#4d647477');polygon(g,[[-size,-size*.4],[size*.65,-size*.7],[-size*.15,size*.2]],'#3b4a55');g.restore()}
    if(flying){const idx=Math.min(s.gate,11);for(let i=2;i>=0;i--){const index=Math.min(idx+i,11),z=Math.max(.08,1-s.travel+i*.85),f=1/(1+z*2),size=45+125*f;gate(g,300+DroneCore.positions[index]*190*f,255+190*f,size*.8,size*.57,!i&&s.locked,i?.25:1,full?t/600:0);if(!i){const x=300+DroneCore.positions[index]*190*f,y=255+190*f;g.fillStyle=s.locked?'#aaffdd':'#ffe2a9';g.beginPath();g.arc(x,y,5,0,TAU);g.fill()}}
      const depth=1/(1+Math.max(.08,1-s.travel)*2),ax=300+s.aim*190*depth,ay=255+190*depth;g.strokeStyle=s.locked?'#8fffd4':'#d6f3ff';g.lineWidth=1.2;g.beginPath();g.arc(ax,ay,15,0,TAU);g.moveTo(ax-23,ay);g.lineTo(ax-10,ay);g.moveTo(ax+10,ay);g.lineTo(ax+23,ay);g.stroke();
    }
    const desired=clamp((s.x-lastX)*-6,-.5,.5);bank+=(desired-bank)*.16;lastX=s.x;
    if(s.health<lastHealth)impact=1;if(s.gate>lastGate&&s.health===lastHealth)burst=1;lastHealth=s.health;lastGate=s.gate;impact*=.91;burst*=.93;
    if(impact>.03){g.fillStyle=`rgba(255,70,35,${impact*.16})`;g.fillRect(0,0,600,600)}
    if(burst>.05&&full){g.strokeStyle=`rgba(114,255,213,${burst*.6})`;g.lineWidth=2;g.beginPath();g.arc(300,290,80+(1-burst)*240,0,TAU);g.stroke()}
    ship(g,flying?300+s.x*190:300,flying?435:305,flying?33:64,flying?bank:-.1,t,full);
    // Flight instruments frame the action without filling the waveguide black level.
    if(flying){g.strokeStyle='#5fa2b166';g.lineWidth=1;for(const side of [-1,1]){const x=300+side*258;g.beginPath();g.moveTo(x,140);g.lineTo(x,390);g.stroke();for(let j=0;j<8;j++){g.beginPath();g.moveTo(x,150+j*30);g.lineTo(x-side*(j%2?5:10),150+j*30);g.stroke()}}g.font='10px monospace';g.fillStyle='#97c7d5';g.textAlign='left';g.fillText('VEL '+String(Math.round(140+s.gate*11)).padStart(3,'0'),30,415);g.textAlign='right';g.fillText('AURORA / 07',570,415)}
  }
  return {render,ship};
})();
