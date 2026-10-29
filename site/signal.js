// "Señal" behind the artist bio: a white dot spiral on black with a slow pulse travelling outward,
// like a signal leaving its source. Decorative only, no text or controls on it. It draws one still frame
// when the system asks for less motion and only animates while the section is on screen.
(()=>{
const canvas=document.querySelector('.artist-signal'),ctx=canvas?.getContext('2d');
if(!ctx)return;
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const count=matchMedia('(max-width:620px)').matches?260:520,golden=Math.PI*(3-Math.sqrt(5));
let w=0,h=0,frame=0,visible=false,last=0,t=0;
function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);w=r.width;h=r.height;canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0);draw()}
function draw(){
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#EBE8E2';
  const mobile=w<700,cx=mobile?w*.5:w*.76,cy=h*.5,radius=Math.min(mobile?w*.62:w*.3,h*.62);
  for(let i=1;i<=count;i++){
    const f=i/count,dist=Math.sqrt(f)*radius,angle=i*golden+t*.05;
    const pulse=(Math.sin(f*14-t*1.2)+1)/2;
    ctx.globalAlpha=(.08+.42*pulse*pulse)*(1-f*.55);
    ctx.beginPath();ctx.arc(cx+Math.cos(angle)*dist,cy+Math.sin(angle)*dist,.6+1.1*(1-f),0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
}
function loop(now){frame=0;if(!visible||reduce.matches||document.hidden)return;t+=Math.min(.05,(now-(last||now))/1000);last=now;draw();frame=requestAnimationFrame(loop)}
function start(){if(!frame&&visible&&!reduce.matches&&!document.hidden){last=0;frame=requestAnimationFrame(loop)}}
new ResizeObserver(resize).observe(canvas);
new IntersectionObserver(([e])=>{visible=e.isIntersecting;visible?start():(cancelAnimationFrame(frame),frame=0)}).observe(canvas);
document.addEventListener('visibilitychange',start);reduce.addEventListener?.('change',()=>{draw();start()});
})();
