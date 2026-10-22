(()=>{
const scene=document.querySelector('.cosmic-scene'),canvas=document.getElementById('cosmic-flow'),button=scene.querySelector('.motion-control'),ctx=canvas.getContext('2d');
if(!ctx){button.hidden=true;return;}
const reduced=matchMedia('(prefers-reduced-motion: reduce)');let paused=reduced.matches,visible=false,frame=0,time=0,last=0,w=0,h=0,entrance=1;
// Several depths create the sensation of drifting through suspended matter.
const seeds=Array.from({length:matchMedia('(max-width:620px)').matches?95:185},()=>({x:Math.random(),y:Math.random(),depth:Math.random(),phase:Math.random()*Math.PI*2}));
// Musical notes drift through the field at their own heights and speeds; the RR logo travels with them.
const notes=Array.from({length:matchMedia('(max-width:620px)').matches?6:11},(_,i)=>({kind:i%3,offset:i/11+Math.random()*.05,lane:.18+Math.random()*.64,speed:.016+Math.random()*.012,size:.75+Math.random()*.5,spin:(Math.random()-.5)*.5,phase:Math.random()*Math.PI*2}));
const logo=new Image();logo.src="/assets/rr.webp";logo.addEventListener("load",draw);
function resize(){const r=scene.getBoundingClientRect();w=r.width;h=r.height;const d=Math.min(devicePixelRatio||1,2);canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0);draw();}
function portal(x,mirror){ctx.save();ctx.translate(x,h*.5);ctx.scale(.45+entrance*.55,.18+entrance*.82);const rx=Math.max(12,w*.019),ry=h*.3;
// Nested luminous rings suggest depth into a wormhole.
for(let ring=4;ring>=0;ring--){ctx.globalAlpha=.1+(4-ring)*.13;ctx.strokeStyle='#EAE6E5';ctx.lineWidth=ring===0?2.5:1;ctx.shadowColor='#EAE6E5';ctx.shadowBlur=ring===0?14:5;ctx.beginPath();ctx.ellipse(-mirror*ring*3,0,rx*(1-ring*.12),ry*(1-ring*.12),0,0,Math.PI*2);ctx.stroke();}
ctx.shadowBlur=8;ctx.globalAlpha=.85;ctx.lineWidth=1.5;const turn=time*.65*mirror;ctx.beginPath();ctx.ellipse(0,0,rx*1.14,ry*1.06,0,turn,turn+Math.PI*.7);ctx.stroke();ctx.beginPath();ctx.ellipse(0,0,rx*1.14,ry*1.06,0,turn+Math.PI,turn+Math.PI*1.7);ctx.stroke();
ctx.shadowBlur=0;ctx.fillStyle='#EAE6E5';for(let i=0;i<15;i++){const angle=i*Math.PI*2/15+time*.3*mirror;ctx.globalAlpha=.2+.4*((Math.sin(angle*3+time)+1)/2);ctx.beginPath();ctx.arc(Math.cos(angle)*rx*1.22,Math.sin(angle)*ry*1.08,.8,0,Math.PI*2);ctx.fill();}ctx.restore();}
function draw(){ctx.clearRect(0,0,w,h);const r=scene.getBoundingClientRect();entrance=reduced.matches?1:Math.max(0,Math.min(1,(innerHeight*.9-r.top)/(innerHeight*.48)));const left=w*.045,right=w*.955,span=right-left;portal(left,1);portal(right,-1);for(const p of seeds){const depth=.2+p.depth*.8;const progress=(p.x+time*.024*depth)%1;const x=left+progress*span;const y=h*.5+(p.y-.5)*h*.54+Math.sin(progress*Math.PI)*Math.sin(time*.3+p.phase)*h*.035;const radius=.35+p.depth*1.65;ctx.globalAlpha=entrance*(.18+p.depth*.56)*Math.min(1,progress*35,(1-progress)*35)*(.8+.2*Math.sin(time*.35+p.phase));ctx.fillStyle='#EAE6E5';ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
// Notes: 0 = eighth note, 1 = beamed pair, 2 = quarter note.
for(const n of notes){const progress=(time*n.speed+n.offset)%1;const x=left+progress*span;const y=h*n.lane+Math.sin(progress*Math.PI)*Math.sin(time*.55+n.phase)*h*.07;ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(time*.4+n.phase)*.35+time*n.spin);const emergence=Math.min(1,progress*20,(1-progress)*20);ctx.scale(emergence*n.size,emergence*n.size);ctx.globalAlpha=entrance*emergence*.48;ctx.fillStyle='#EAE6E5';ctx.strokeStyle='#EAE6E5';ctx.lineWidth=1.7;
ctx.beginPath();ctx.ellipse(-5,9,5,3.5,-.35,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(0,8);ctx.lineTo(0,-11);if(n.kind===0)ctx.quadraticCurveTo(9,-6,8,2);if(n.kind===1)ctx.lineTo(10,-7);ctx.stroke();
if(n.kind===1){ctx.beginPath();ctx.ellipse(5,13,5,3.5,-.35,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(10,12);ctx.lineTo(10,-7);ctx.stroke();}ctx.restore();}
{const progress=(time*.022+.74)%1;const x=left+progress*span;const y=h*.65+Math.sin(progress*Math.PI)*Math.sin(time*.55+4)*h*.07;const emergence=Math.min(1,progress*20,(1-progress)*20);ctx.save();ctx.translate(x,y);ctx.rotate(time*.55+2);ctx.scale(emergence,emergence);ctx.globalAlpha=entrance*emergence*.48;if(logo.complete&&logo.naturalWidth)ctx.drawImage(logo,-22,-22,44,44);ctx.restore();}
ctx.globalAlpha=1;}
function loop(now){frame=0;if(paused||!visible||document.hidden){last=0;return;}const dt=last?Math.min((now-last)/1000,.05):0;time+=dt;last=now;draw();frame=requestAnimationFrame(loop);}
function sync(){scene.classList.toggle('is-paused',paused);button.textContent=tr(paused?'REANUDAR MOVIMIENTO':'PAUSAR MOVIMIENTO');button.setAttribute('aria-pressed',String(paused));if(frame)cancelAnimationFrame(frame);frame=0;last=0;if(!paused&&visible&&!document.hidden)frame=requestAnimationFrame(loop);}
button.addEventListener('click',()=>{paused=!paused;sync();});reduced.addEventListener('change',()=>{paused=reduced.matches;sync();draw();});document.addEventListener('languagechange',sync);document.addEventListener('visibilitychange',sync);addEventListener('scroll',()=>{if(visible&&(paused||!frame))draw();},{passive:true});new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();},{threshold:.05}).observe(scene);new ResizeObserver(resize).observe(scene);
sync();
})();
