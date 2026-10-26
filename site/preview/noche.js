// La Noche: the clock follows the hour you are in, and the bar shows how far into the night you are.
(()=>{
const clock=document.querySelector('.clock');if(!clock)return;
const time=clock.querySelector('.clock-time'),label=clock.querySelector('.clock-label');
const io=new IntersectionObserver((es)=>{for(const e of es)if(e.isIntersecting){time.textContent=e.target.dataset.time;label.textContent=e.target.dataset.label;}},{rootMargin:'-45% 0px -45% 0px'});
document.querySelectorAll('.hour').forEach((h)=>io.observe(h));
const bar=()=>{const max=document.documentElement.scrollHeight-innerHeight;clock.style.setProperty('--p',(max>0?scrollY/max*100:0)+'%');};
addEventListener('scroll',bar,{passive:true});bar();
})();
