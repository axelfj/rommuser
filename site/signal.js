// Señal: a ring of particles turning in space with phase spheres orbiting it, drawn behind the name in the hero.
(()=>{
const box=document.querySelector('.hero-signal'),canvas=box&&box.querySelector('canvas'),ctx=canvas&&canvas.getContext('2d');
if(!ctx)return;
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),small=matchMedia('(max-width:620px)').matches;
let w=0,h=0,t=0,last=0,frame=0,visible=true;
// Points on a torus with a little scatter, so the ring reads as dust rather than a solid shape.
const dust=Array.from({length:small?1400:2600},()=>{const u=Math.random()*Math.PI*2,v=Math.random()*Math.PI*2,r=Math.random()<.85?.05+Math.random()*.08:.14+Math.random()*.3;return{u,v,r,size:Math.random()<.08?1.6:1}});
const spheres=[{orbit:1.38,speed:.22,size:.09,phase:0},{orbit:1.62,speed:-.15,size:.055,phase:2.2},{orbit:1.18,speed:.34,size:.028,phase:4.1}];
function resize(){const r=box.getBoundingClientRect();w=r.width;h=r.height;const d=Math.min(devicePixelRatio||1,2);canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0);draw();}
function project(x,y,z,s){const tilt=1.08,cy=y*Math.cos(tilt)-z*Math.sin(tilt),cz=y*Math.sin(tilt)+z*Math.cos(tilt),p=3.2/(3.2+cz);return{x:w/2+x*s*p,y:h/2+cy*s*p,z:cz,p};}
function sphere(o,s){const a=o.phase+t*o.speed,q=project(Math.cos(a)*o.orbit,0,Math.sin(a)*o.orbit,s),rad=o.size*s*q.p;
  const g=ctx.createRadialGradient(q.x-rad*.4,q.y-rad*.45,rad*.05,q.x,q.y,rad);g.addColorStop(0,'#ffffff');g.addColorStop(.45,'#cfccc6');g.addColorStop(1,'#1a1a1a');
  ctx.globalAlpha=.55+.45*(1-(q.z+1.6)/3.2);ctx.fillStyle=g;ctx.beginPath();ctx.arc(q.x,q.y,rad,0,Math.PI*2);ctx.fill();return q.z;}
function draw(){ctx.clearRect(0,0,w,h);const s=Math.min(w,h)*.36,spin=t*.06;
  // Spheres behind the ring first, then the dust, then the ones in front.
  const order=spheres.map(o=>({o,z:Math.sin(o.phase+t*o.speed)*o.orbit})).sort((a,b)=>b.z-a.z);
  order.filter(e=>e.z>0).forEach(e=>sphere(e.o,s));
  ctx.fillStyle='#EBE8E2';
  for(const d of dust){const u=d.u+spin,ring=1+d.r*Math.cos(d.v),x=ring*Math.cos(u),z=ring*Math.sin(u),y=d.r*Math.sin(d.v)+Math.sin(u*3+t*.5)*.02;const q=project(x,y,z,s);
    ctx.globalAlpha=Math.max(.12,Math.min(.95,.72-q.z*.35));ctx.fillRect(q.x,q.y,d.size*q.p,d.size*q.p);}
  order.filter(e=>e.z<=0).forEach(e=>sphere(e.o,s));
  ctx.globalAlpha=1;}
function tick(now){frame=0;if(!visible||reduced.matches)return;t+=Math.min(.05,(now-(last||now))/1000);last=now;draw();frame=requestAnimationFrame(tick);}
function play(){if(!frame&&visible&&!reduced.matches){last=0;frame=requestAnimationFrame(tick);}}
new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(!visible&&frame){cancelAnimationFrame(frame);frame=0;}play();}).observe(box);
reduced.addEventListener('change',()=>{draw();play();});
addEventListener('resize',resize);resize();play();
})();
