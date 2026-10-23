'use strict';
const FlightControls=(()=>{
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function normalized(q){if(!q||q.length!==4||!Array.from(q).every(Number.isFinite))return null;const n=Math.hypot(...q);return n>1e-6?Array.from(q,v=>v/n):null;}
  function relativeRoll(q,zero){
    const a=normalized(zero),b=normalized(q);if(!a||!b)return null;
    const [ax,ay,az,aw]=[-a[0],-a[1],-a[2],a[3]],[bx,by,bz,bw]=b;
    const x=aw*bx+ax*bw+ay*bz-az*by,y=aw*by-ax*bz+ay*bw+az*bx,z=aw*bz+ax*by-ay*bx+az*bw,w=aw*bw-ax*bx-ay*by-az*bz;
    return Math.atan2(2*(w*x+y*z),1-2*(x*x+y*y))*180/Math.PI;
  }
  function mapTilt(degrees,range=30,inverted=false){
    if(!Number.isFinite(degrees))return 0;
    const magnitude=clamp((Math.abs(degrees)-3)/(Math.max(10,range)-3),0,1);
    return Math.sign(degrees)*(inverted?-1:1)*Math.pow(magnitude,1.15);
  }
  function keyboard(keys){return {steer:(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0),aim:(keys.has('d')?1:0)-(keys.has('a')?1:0)};}
  return {normalized,relativeRoll,mapTilt,keyboard};
})();
if(typeof module!=='undefined')module.exports=FlightControls;
