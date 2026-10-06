(()=>{
const scene=document.querySelector('.cosmic-scene'),canvas=document.getElementById('cosmic-flow'),button=scene.querySelector('.motion-control'),ctx=canvas.getContext('2d');
if(!ctx){button.hidden=true;return;}
const reduced=matchMedia('(prefers-reduced-motion: reduce)');let clock=0,paused=false,visible=false,frame=0,time=0,last=0,w=0,h=0,entrance=1;
// Several depths create the sensation of drifting through suspended matter.
const seeds=Array.from({length:matchMedia('(max-width:620px)').matches?95:185},()=>({x:Math.random(),y:Math.random(),depth:Math.random(),phase:Math.random()*Math.PI*2}));
// Mini game: the cursor becomes a ship that shoots the notes; the RR logo dodges.
const ship={x:0,y:0,on:false,tilt:0},bullets=[],sparks=[],dead=[0,0],pos=[null,null,null],dodge={x:0,y:0,vx:0,vy:0};
const logo=new Image();logo.src="assets/rr.png";logo.addEventListener("load",draw);
function resize(){const r=scene.getBoundingClientRect();w=r.width;h=r.height;const d=Math.min(devicePixelRatio||1,2);canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0);draw();}
function portal(x,mirror){ctx.save();ctx.translate(x,h*.5);ctx.scale(.45+entrance*.55,.18+entrance*.82);const rx=Math.max(12,w*.019),ry=h*.3;
// Nested luminous rings suggest depth into a wormhole.
for(let ring=4;ring>=0;ring--){ctx.globalAlpha=.1+(4-ring)*.13;ctx.strokeStyle='#EAE6E5';ctx.lineWidth=ring===0?2.5:1;ctx.shadowColor='#EAE6E5';ctx.shadowBlur=ring===0?14:5;ctx.beginPath();ctx.ellipse(-mirror*ring*3,0,rx*(1-ring*.12),ry*(1-ring*.12),0,0,Math.PI*2);ctx.stroke();}
ctx.shadowBlur=8;ctx.globalAlpha=.85;ctx.lineWidth=1.5;const turn=time*.65*mirror;ctx.beginPath();ctx.ellipse(0,0,rx*1.14,ry*1.06,0,turn,turn+Math.PI*.7);ctx.stroke();ctx.beginPath();ctx.ellipse(0,0,rx*1.14,ry*1.06,0,turn+Math.PI,turn+Math.PI*1.7);ctx.stroke();
ctx.shadowBlur=0;ctx.fillStyle='#EAE6E5';for(let i=0;i<15;i++){const angle=i*Math.PI*2/15+time*.3*mirror;ctx.globalAlpha=.2+.4*((Math.sin(angle*3+time)+1)/2);ctx.beginPath();ctx.arc(Math.cos(angle)*rx*1.22,Math.sin(angle)*ry*1.08,.8,0,Math.PI*2);ctx.fill();}ctx.restore();}
function draw(){ctx.clearRect(0,0,w,h);const r=scene.getBoundingClientRect();entrance=Math.max(0,Math.min(1,(innerHeight*.9-r.top)/(innerHeight*.48)));const left=w*.045,right=w*.955,span=right-left;portal(left,1);portal(right,-1);for(const p of seeds){const depth=.2+p.depth*.8;const progress=(p.x+time*.024*depth)%1;const x=left+progress*span;const y=h*.5+(p.y-.5)*h*.54+Math.sin(progress*Math.PI)*Math.sin(time*.3+p.phase)*h*.035;const radius=.35+p.depth*1.65;ctx.globalAlpha=entrance*(.18+p.depth*.56)*Math.min(1,progress*35,(1-progress)*35)*(.8+.2*Math.sin(time*.35+p.phase));ctx.fillStyle='#EAE6E5';ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
// A few musical fragments orbit quietly through the field.
for(let i=0;i<3;i++){const progress=(time*.022+i*.37)%1;let x=left+progress*span;let y=h*(.35+i*.15)+Math.sin(progress*Math.PI)*Math.sin(time*.55+i*2)*h*.07;if(i===2){x+=dodge.x;y+=dodge.y;}if(i<2&&dead[i]>clock){pos[i]=null;continue;}pos[i]={x,y};ctx.save();ctx.translate(x,y);ctx.rotate(time*(i===2?.55:.24)+i);const emergence=Math.min(1,progress*20,(1-progress)*20);ctx.scale(emergence,emergence);ctx.globalAlpha=entrance*emergence*.48;
if(i===2){if(logo.complete&&logo.naturalWidth)ctx.drawImage(logo,-22,-22,44,44);}else{ctx.fillStyle='#EAE6E5';ctx.strokeStyle='#EAE6E5';ctx.lineWidth=1.7;ctx.beginPath();ctx.ellipse(-5,9,5,3.5,-.35,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(0,8);ctx.lineTo(0,-11);ctx.lineTo(10,-7);ctx.stroke();if(i===1){ctx.beginPath();ctx.ellipse(5,13,5,3.5,-.35,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(10,12);ctx.lineTo(10,-7);ctx.stroke();}}ctx.restore();}
ctx.globalAlpha=1;drawGame();}
function loop(now){frame=0;if((paused&&!active())||!visible||document.hidden){last=0;return;}const dt=last?Math.min((now-last)/1000,.05):0;if(!paused)time+=dt;clock+=dt;step(dt);last=now;draw();frame=requestAnimationFrame(loop);}
function sync(){scene.classList.toggle('is-paused',paused);button.textContent=tr(paused?'REANUDAR MOVIMIENTO':'PAUSAR MOVIMIENTO');button.setAttribute('aria-pressed',String(paused));if(frame)cancelAnimationFrame(frame);frame=0;last=0;if((!paused||active())&&visible&&!document.hidden)frame=requestAnimationFrame(loop);}
button.addEventListener('click',()=>{paused=!paused;sync();});document.addEventListener('languagechange',sync);document.addEventListener('visibilitychange',sync);addEventListener('scroll',()=>{if(visible&&(paused||!frame))draw();},{passive:true});new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();},{threshold:.05}).observe(scene);new ResizeObserver(resize).observe(scene);
function active(){return ship.on||bullets.length||sparks.length;}
function step(dt){for(const b of bullets){b.y-=b.v*dt;}for(let k=bullets.length-1;k>=0;k--){const b=bullets[k];let hit=b.y<-10;for(let i=0;i<2&&!hit;i++){const q=pos[i];if(q&&Math.hypot(q.x-b.x,q.y-b.y)<18){hit=true;dead[i]=clock+2.5;for(let n=0;n<16;n++){const a=Math.random()*Math.PI*2,v=60+Math.random()*160;sparks.push({x:q.x,y:q.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.7});}}}if(hit)bullets.splice(k,1);}
// The logo reads incoming bullets and the ship, and slips sideways out of the line of fire.
const q=pos[2];if(q){for(const b of bullets){const dy=q.y-b.y,dx=q.x-b.x;if(dy<0&&dy>-220&&Math.abs(dx)<46){dodge.vx+=(dx>=0?1:-1)*(1400/(Math.abs(dx)+12))*dt*60;}}const sx=q.x-ship.x,sy=q.y-ship.y,sd=Math.hypot(sx,sy);if(ship.on&&sd<110&&sd>0){dodge.vx+=sx/sd*900*dt;dodge.vy+=sy/sd*900*dt;}}
dodge.vx+=-dodge.x*4*dt;dodge.vy+=-dodge.y*4*dt;dodge.vx*=Math.pow(.04,dt);dodge.vy*=Math.pow(.04,dt);dodge.x+=dodge.vx*dt;dodge.y+=dodge.vy*dt;const lim=Math.min(w,h)*.35;dodge.x=Math.max(-lim,Math.min(lim,dodge.x));dodge.y=Math.max(-lim,Math.min(lim,dodge.y));
for(const p of sparks){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}for(let k=sparks.length-1;k>=0;k--)if(sparks[k].life<=0)sparks.splice(k,1);ship.tilt*=Math.pow(.02,dt);}
function drawGame(){ctx.fillStyle='#EAE6E5';for(const b of bullets){ctx.globalAlpha=.95;ctx.fillRect(b.x-1,b.y-7,2,10);}ctx.fillStyle='#C81D25';for(const p of sparks){ctx.globalAlpha=Math.max(0,p.life/.7);ctx.fillRect(p.x-1.2,p.y-1.2,2.4,2.4);}ctx.globalAlpha=1;
if(!ship.on)return;ctx.save();ctx.translate(ship.x,ship.y);ctx.rotate(Math.max(-.4,Math.min(.4,ship.tilt)));ctx.strokeStyle='#EAE6E5';ctx.fillStyle='#12130F';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(0,-16);ctx.lineTo(11,12);ctx.lineTo(0,6);ctx.lineTo(-11,12);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#C81D25';ctx.globalAlpha=.6+.4*Math.random();ctx.beginPath();ctx.moveTo(-4,9);ctx.lineTo(0,17+Math.random()*5);ctx.lineTo(4,9);ctx.fill();ctx.restore();ctx.globalAlpha=1;}
function point(e){const r=scene.getBoundingClientRect();ship.tilt+=((e.clientX-r.left)-ship.x)*.01;ship.x=e.clientX-r.left;ship.y=e.clientY-r.top;}
function onButton(e){return e.target.closest&&e.target.closest('.motion-control');}
scene.addEventListener('pointermove',e=>{if(onButton(e)){ship.on=false;return;}point(e);ship.on=true;if(!frame)sync();});
scene.addEventListener('pointerleave',()=>{ship.on=false;});
scene.addEventListener('pointerdown',e=>{if(onButton(e))return;point(e);ship.on=true;bullets.push({x:ship.x,y:ship.y-16,v:720});if(!frame)sync();});
sync();
})();
