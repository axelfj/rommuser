// La Caja: the crate scrolls sideways; a vertical wheel flips through it, arrows step a card, the bar shows progress.
(()=>{
const crate=document.querySelector('.crate'),bar=document.querySelector('.crate-progress');if(!crate)return;
const fine=matchMedia('(pointer:fine)').matches;
if(fine)crate.addEventListener('wheel',(e)=>{if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){e.preventDefault();crate.scrollLeft+=e.deltaY;}},{passive:false});
crate.addEventListener('keydown',(e)=>{if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;e.preventDefault();crate.scrollBy({left:(e.key==='ArrowRight'?1:-1)*crate.clientWidth*.6,behavior:'smooth'});});
const update=()=>{const max=crate.scrollWidth-crate.clientWidth;bar.style.setProperty('--p',(max>0?crate.scrollLeft/max*100:0)+'%');};
crate.addEventListener('scroll',update,{passive:true});update();
document.querySelectorAll('a[href^="#"]').forEach((a)=>a.addEventListener('click',(e)=>{const t=document.querySelector(a.getAttribute('href'));if(!t||!crate.contains(t))return;e.preventDefault();crate.scrollTo({left:t.offsetLeft-crate.offsetLeft-parseFloat(getComputedStyle(crate).paddingLeft),behavior:'smooth'});}));
})();
