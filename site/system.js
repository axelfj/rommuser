// "El sistema" in the artist section: the RR sits at the centre and every released original orbits it,
// newest closest to the core. Tapping a planet plays that track through the page's one player (player.js),
// and while it plays the RR turns like a record label at 33⅓, the core breathes and notes leave the planet. Releases still to come wait on the outer
// dashed ring with their date. Everything is read from the MÚSICA rows, so nothing here is typed twice.
(()=>{
const figure=document.querySelector('.artist-system'),canvas=figure?.querySelector('canvas'),ctx=canvas?.getContext('2d');
if(!ctx)return;
const player=window.rommuserPlayer,rows=[...document.querySelectorAll('#originales .track[data-track]')];
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Costa_Rica'}).format(new Date());
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const BONE='#EBE8E2',RED='#C81D25',BEAT=60/124,golden=Math.PI*(3-Math.sqrt(5));
const shortDate=iso=>iso.slice(8,10)+'.'+iso.slice(5,7)+'.'+iso.slice(0,4);
const bodies=rows.map(row=>{
  const iso=row.querySelector('time')?.getAttribute('datetime')||'';
  return {row,name:row.dataset.track,short:row.dataset.track.replace(/\s*\(.*\)$/,''),label:row.querySelector('.track-info small')?.textContent||'',
    iso,track:player?.tracks.find(t=>t.row===row),upcoming:!iso||iso>=today};
}).filter(b=>b.iso);
const released=bodies.filter(b=>!b.upcoming).sort((a,b)=>b.iso.localeCompare(a.iso));
const upcoming=bodies.filter(b=>b.upcoming).sort((a,b)=>a.iso.localeCompare(b.iso));
if(!released.some(b=>b.track))return;
const layer=figure.querySelector('.system-bodies');figure.querySelector('.system-now').textContent=tr('TOCA UN PLANETA PARA ESCUCHARLO AQUÍ');
layer.setAttribute('aria-label',tr('Originales de ROMMUSER'));
released.forEach((b,i)=>{
  b.phase=i*golden*2.3;b.orbit=i;
  // A release without a SoundCloud link still orbits; it just can't be played here.
  const button=document.createElement(b.track?'button':'span');button.className='system-body';
  button.innerHTML='<span class="system-name"></span>';button.firstChild.textContent=b.short;layer.append(button);b.el=button;
  if(!b.track)return;
  button.type='button';button.setAttribute('aria-label',tr('Escuchar aquí')+': '+b.name+', '+b.label+', '+shortDate(b.iso));button.setAttribute('aria-pressed','false');
  button.addEventListener('click',()=>player.play(b.track));
  button.addEventListener('pointerenter',()=>{hover=b;paint()});button.addEventListener('pointerleave',()=>{if(hover===b)hover=null;paint()});
  button.addEventListener('focus',()=>{hover=b;paint()});button.addEventListener('blur',()=>{if(hover===b)hover=null;paint()});
});
upcoming.forEach((b,i)=>{
  b.phase=Math.PI*.15+i*Math.PI*2/Math.max(3,upcoming.length);
  const tag=document.createElement('span');tag.className='system-body is-upcoming'+(i===0?' is-next':'');
  tag.innerHTML='<span class="system-name"></span><span class="system-date"></span>';
  tag.firstChild.textContent=b.short;tag.lastChild.textContent=tr('EN CAMINO')+' · '+b.iso.slice(8,10)+'.'+b.iso.slice(5,7);
  layer.append(tag);b.el=tag;
});
const logo=new Image();logo.src='/assets/rr-light.svg';logo.addEventListener('load',paint);
let w=0,h=0,t=0,last=0,frame=0,visible=false,hover=null,current=null,playing=false,beatClock=0,pulse=0,spin=0,disc=0;
const RPM33=Math.PI*2*(100/3)/60;
const notes=Array.from({length:10},(_,i)=>({kind:i%3,a:i/10*Math.PI*2,r:1.02+(i%4)*.04,speed:.025+(i%3)*.01,bob:i*1.7,size:.8+(i%2)*.25}));
const sparks=[];
figure.hidden=false;
function geometry(){
  // Leave room for the names beside the outer ring; flatter on desktop, rounder on phones.
  const mobile=w<620,room=mobile?36:140,rx=Math.max(80,Math.min((w-room*2)/2,h*(mobile?.9:1.1))),ry=Math.min(rx*(mobile?.62:.5),h*.36);
  return {cx:w/2,cy:h*.48,rx,ry,inner:rx*.26,outer:rx*.8,mobile};
}
function orbitRadius(g,i){return released.length<2?g.inner:g.inner+(g.outer-g.inner)*i/(released.length-1)}
function place(g,b,radius,speed){
  const a=b.phase+t*speed,x=g.cx+Math.cos(a)*radius,y=g.cy+Math.sin(a)*radius*(g.ry/g.rx),z=Math.sin(a);
  b.x=x;b.y=y;b.z=z;b.s=.78+.22*(z+1)/2;return b;
}
function sphere(x,y,r,alpha,ring){
  ctx.globalAlpha=alpha;const grad=ctx.createRadialGradient(x-r*.35,y-r*.4,r*.1,x,y,r);
  grad.addColorStop(0,BONE);grad.addColorStop(.55,'#8f8c86');grad.addColorStop(1,'#1d1d1c');
  ctx.fillStyle=grad;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  if(ring){ctx.globalAlpha=1;ctx.strokeStyle=RED;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r+5,0,Math.PI*2);ctx.stroke()}
}
function note(kind){
  ctx.beginPath();ctx.ellipse(-5,9,5,3.5,-.35,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(0,8);ctx.lineTo(0,-11);
  if(kind===0)ctx.quadraticCurveTo(9,-6,8,2);if(kind===1)ctx.lineTo(10,-7);ctx.stroke();
  if(kind===1){ctx.beginPath();ctx.ellipse(5,13,5,3.5,-.35,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(10,12);ctx.lineTo(10,-7);ctx.stroke()}
}
function paint(){
  if(!w)return;const g=geometry();ctx.clearRect(0,0,w,h);ctx.lineWidth=1;
  released.forEach((b,i)=>place(g,b,orbitRadius(g,i),.2*Math.pow(g.inner/orbitRadius(g,i),1.5)));
  upcoming.forEach(b=>place(g,b,g.rx,.035));
  // Grooves and the fixed light across them, so the system reads as a record seen at an angle.
  ctx.save();ctx.translate(g.cx,g.cy);ctx.scale(1,g.ry/g.rx);ctx.strokeStyle=BONE;ctx.globalAlpha=.035;
  for(let r=g.inner*.7;r<g.outer*1.06;r+=g.mobile?4:5){ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke()}
  ctx.fillStyle=BONE;ctx.globalAlpha=.014;
  for(const a of [-.8,Math.PI-.8])for(const spread of [.36,.24,.12]){ctx.beginPath();ctx.arc(0,0,g.outer*1.06,a-spread/2,a+spread/2);ctx.arc(0,0,g.inner*.7,a+spread/2,a-spread/2,true);ctx.closePath();ctx.fill()}
  ctx.restore();
  // Orbits: thin bone lines, the hovered or playing one brighter.
  released.forEach((b,i)=>{const r=orbitRadius(g,i),lit=b===hover||b===current;ctx.globalAlpha=lit?.6:.16;ctx.strokeStyle=lit&&b===current?RED:BONE;
    ctx.beginPath();ctx.ellipse(g.cx,g.cy,r,r*g.ry/g.rx,0,0,Math.PI*2);ctx.stroke()});
  ctx.setLineDash([2,7]);ctx.globalAlpha=.28;ctx.strokeStyle=BONE;ctx.beginPath();ctx.ellipse(g.cx,g.cy,g.rx,g.ry,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  const drawBody=b=>{if(b.upcoming){ctx.globalAlpha=.85;ctx.strokeStyle=b.el.classList.contains('is-next')?RED:BONE;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(b.x,b.y,6*b.s,0,Math.PI*2);ctx.stroke();ctx.lineWidth=1;return}
    sphere(b.x,b.y,(g.mobile?7:9)*b.s*(b===current?1+pulse*.18:1),.55+.45*(b.z+1)/2,b===current)};
  const all=[...released,...upcoming];
  all.filter(b=>b.z<0).sort((a,b)=>a.z-b.z).forEach(drawBody);
  // Core: the RR with two halos; it breathes on the beat while a track plays.
  const core=(g.mobile?40:56)*(1+pulse*.07);
  [1.55,2.2].forEach((m,i)=>{ctx.globalAlpha=(playing?.34:.16)*(1-i*.4)+pulse*.25;ctx.strokeStyle=playing?RED:BONE;ctx.beginPath();ctx.ellipse(g.cx,g.cy,core*m*.5,core*m*.5*(g.ry/g.rx)*1.6,0,0,Math.PI*2);ctx.stroke()});
  ctx.globalAlpha=1;if(logo.complete&&logo.naturalWidth){ctx.save();ctx.translate(g.cx,g.cy);ctx.rotate(disc);ctx.drawImage(logo,-core/2,-core/2,core,core);ctx.restore()}
  all.filter(b=>b.z>=0).sort((a,b)=>a.z-b.z).forEach(drawBody);
  // Notes drift on a loose halo around the system.
  ctx.fillStyle=BONE;ctx.strokeStyle=BONE;ctx.lineWidth=1.6;
  for(const n of notes){const a=n.a+t*n.speed,x=g.cx+Math.cos(a)*g.rx*n.r,y=g.cy+Math.sin(a)*g.ry*n.r*1.5+Math.sin(t*.6+n.bob)*10;
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(t*.4+n.bob)*.35);ctx.scale(n.size*(g.mobile?.75:1),n.size*(g.mobile?.75:1));ctx.globalAlpha=.16+.12*(Math.sin(a)+1)/2;note(n.kind);ctx.restore()}
  // While a track plays, notes leave its planet and rise away from the core.
  for(const s of sparks){const k=s.age/s.life;ctx.save();ctx.translate(s.x+s.vx*s.age,s.y+s.vy*s.age-k*k*30);ctx.rotate(s.spin*s.age);ctx.globalAlpha=(1-k)*.75;ctx.fillStyle=s.red?RED:BONE;ctx.strokeStyle=ctx.fillStyle;note(s.kind);ctx.restore()}
  ctx.globalAlpha=1;
  // Names sit on the outer side of each body and flip inward when they would leave the frame.
  for(const b of all){b.el.style.transform=`translate(${b.x.toFixed(1)}px,${b.y.toFixed(1)}px)`;
    const lw=(b.lw??=Math.max(...[...b.el.children].map(c=>c.offsetWidth)))+22,left=b.x<g.cx?b.x-lw>0:b.x+lw>w;
    b.el.classList.toggle('is-left',left);b.el.classList.toggle('is-back',b.z<-.2)}
}
function loop(stamp){
  frame=0;if(!visible||document.hidden)return;
  const dt=Math.min(.05,(stamp-(last||stamp))/1000);last=stamp;
  if(!reduce.matches){t+=dt;
    if(playing&&current){beatClock+=dt;if(beatClock>=BEAT){beatClock-=BEAT;pulse=1;
      const g=geometry(),dx=current.x-g.cx,dy=current.y-g.cy,d=Math.hypot(dx,dy)||1;
      sparks.push({x:current.x,y:current.y,vx:dx/d*28+(Math.random()-.5)*14,vy:dy/d*20-16,age:0,life:2.6,kind:sparks.length%3,spin:(Math.random()-.5)*.8,red:Math.random()<.25})}}
    pulse=Math.max(0,pulse-dt*3.2);
    // Like a turntable: it spins up when a track plays and runs down on pause, then rests where it stopped.
    spin+=((playing?RPM33:0)-spin)*Math.min(1,dt*(playing?2.4:1.4));if(!playing&&spin<.01)spin=0;
    disc=(disc+spin*dt)%(Math.PI*2);
    for(const s of sparks)s.age+=dt;while(sparks.length&&sparks[0].age>sparks[0].life)sparks.shift();
  }
  paint();if(!reduce.matches||sparks.length)frame=requestAnimationFrame(loop);
}
function start(){if(!frame&&visible&&!document.hidden){last=0;frame=requestAnimationFrame(loop)}}
function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);w=r.width;h=r.height;canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0);paint()}
new ResizeObserver(resize).observe(canvas);
new IntersectionObserver(([e])=>{visible=e.isIntersecting;visible?start():(cancelAnimationFrame(frame),frame=0)}).observe(figure);
document.addEventListener('visibilitychange',start);reduce.addEventListener?.('change',()=>{paint();start()});
// Follow the shared player: the playing track's planet turns red and the system starts to breathe.
player.on(p=>{
  current=released.find(b=>b.track&&b.track===p.current)||null;playing=Boolean(current&&p.playing);
  if(playing&&beatClock===0)beatClock=BEAT;
  for(const b of released)if(b.track)b.el.setAttribute('aria-pressed',String(b===current&&playing));
  figure.classList.toggle('is-playing',playing);paint();start();
});
})();
