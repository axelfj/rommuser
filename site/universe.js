// Silent, abstract interpretation of the three musical sides of ROMMUSER.
(()=>{
const scene=document.querySelector('.cosmic-scene'),canvas=document.getElementById('cosmic-flow');
if(!scene||!canvas)return;
const ctx=canvas.getContext('2d'),button=scene.querySelector('.motion-control');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let mode='groove',paused=reduced.matches,visible=false,frame=0,t=0,last=0,w=0,h=0;
function draw(){if(!ctx)return;ctx.clearRect(0,0,w,h);ctx.strokeStyle='#eeeae3';
for(let row=0;row<17;row++){ctx.beginPath();ctx.globalAlpha=.18+.6*(1-Math.abs(row-8)/10);ctx.lineWidth=row===8?1.5:.7;
for(let x=0;x<=w;x+=3){const u=x/Math.max(w,1);const envelope=Math.sin(u*Math.PI)**2;let wave;
if(mode==='groove')wave=Math.sin(u*38-t*1.6)*Math.sin(u*7+t*.3)*25;
else if(mode==='tension')wave=Math.sin(u*86+t)*Math.sin(u*21-t*.4)*32;
else wave=Math.sin(u*12-t*.7)*35+Math.sin(u*5+t*.5)*18;
const y=h/2+(row-8)*7+wave*envelope*(.4+row/20);x===0?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.stroke()}
ctx.globalAlpha=1;}
function loop(now){frame=0;if(paused||!visible||document.hidden)return;t+=last?Math.min((now-last)/1000,.05):0;last=now;draw();frame=requestAnimationFrame(loop)}
function sync(){cancelAnimationFrame(frame);frame=0;last=0;button.textContent=tr(paused?'REANUDAR MOVIMIENTO':'PAUSAR MOVIMIENTO');button.setAttribute('aria-pressed',String(paused));if(!paused&&visible&&!document.hidden&&ctx)frame=requestAnimationFrame(loop)}
function resize(){const r=scene.getBoundingClientRect();w=r.width;h=r.height;const d=Math.min(devicePixelRatio||1,2);canvas.width=w*d;canvas.height=h*d;if(ctx)ctx.setTransform(d,0,0,d,0,0);draw()}
document.querySelectorAll('[data-signal]').forEach(control=>control.addEventListener('click',()=>{mode=control.dataset.signal;document.querySelectorAll('[data-signal]').forEach(b=>b.setAttribute('aria-pressed',String(b===control)));document.querySelectorAll('[data-story]').forEach(p=>p.hidden=p.dataset.story!==mode);draw()}));
document.querySelectorAll('.signal-stories a').forEach(link=>link.addEventListener('click',()=>{document.getElementById('tab-originales')?.click();const track=document.querySelector(link.getAttribute('href'));const group=track?.closest('details');if(group)group.open=true;requestAnimationFrame(()=>{track?.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'center'});track?.focus({preventScroll:true})})}));
button.addEventListener('click',()=>{paused=!paused;sync()});reduced.addEventListener('change',()=>{paused=reduced.matches;sync();draw()});document.addEventListener('languagechange',sync);document.addEventListener('visibilitychange',sync);new IntersectionObserver(([e])=>{visible=e.isIntersecting;sync()}).observe(scene);new ResizeObserver(resize).observe(scene);if(!ctx)button.hidden=true;sync();
})();
