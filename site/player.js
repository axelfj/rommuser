// One player for the whole page. The hero's ESCUCHAR, the MÚSICA rows and the planets in El artista all play
// through the same SoundCloud widget, loaded only on the first tap, and a thin bar at the bottom of the screen
// says what is sounding. The platform list stays one tap away (PLATAFORMAS). If SoundCloud can't load,
// tapping a row opens that platform list as before. The same happens when a browser won't let the hidden widget
// start (iPhone Safari blocks it): after a few seconds without sound the page stops trying and uses the platform list.
(()=>{
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Costa_Rica'}).format(new Date());
const shortDate=iso=>iso.slice(8,10)+'.'+iso.slice(5,7)+'.'+iso.slice(0,4);
const tracks=[...document.querySelectorAll('#originales .track[data-soundcloud]:not(.presave)')].map(row=>({
  row,name:row.dataset.track,label:row.querySelector('.track-info small')?.textContent||'',
  iso:row.querySelector('time')?.getAttribute('datetime')||'',url:row.dataset.soundcloud,
  type:row.querySelector('.track-type'),typeText:row.querySelector('.track-type')?.textContent||''
})).filter(t=>t.iso&&t.iso<today).sort((a,b)=>b.iso.localeCompare(a.iso));
if(!tracks.length)return;
const listeners=new Set();
let widget=null,current=null,playing=false,loading=false,failed=false,bypass=false,watchdog=0;
const bar=document.createElement('div');bar.className='now-bar';bar.hidden=true;bar.setAttribute('role','region');bar.setAttribute('aria-label',tr('Reproductor'));
bar.innerHTML='<span class="now-progress" aria-hidden="true"><span></span></span><button class="now-toggle" type="button"></button><p class="now-text" aria-live="polite"></p><button class="now-next" type="button"></button><button class="now-platforms" type="button"></button><button class="now-close" type="button"><span aria-hidden="true">×</span></button>';
const $=s=>bar.querySelector(s),fill=$('.now-progress span');
$('.now-next').textContent=tr('SIGUIENTE');$('.now-platforms').textContent=tr('PLATAFORMAS');$('.now-close').setAttribute('aria-label',tr('Cerrar reproductor'));
document.body.append(bar);
function emit(){
  for(const t of tracks){const on=t===current;t.row.classList.toggle('is-playing',on&&playing);t.row.classList.toggle('is-current',on);if(t.type)t.type.textContent=on?(loading?tr('CARGANDO'):playing?tr('SONANDO'):tr('EN PAUSA')):t.typeText}
  if(current){
    bar.hidden=false;document.body.classList.add('has-now-bar');
    $('.now-text').textContent=(loading?tr('CARGANDO'):playing?tr('SONANDO'):tr('EN PAUSA'))+' · '+current.name+' · '+current.label+' · '+shortDate(current.iso)+' · '+tr('VÍA SOUNDCLOUD');
    const action=playing?tr('PAUSA'):tr('SEGUIR');$('.now-toggle').textContent=action;$('.now-toggle').setAttribute('aria-label',action+': '+current.name);
    $('.now-next').hidden=tracks.length<2;
  }
  listeners.forEach(fn=>fn(api));
}
function platforms(t){bypass=true;t.row.click();bypass=false}
function fallback(t){clearTimeout(watchdog);widget?.pause();failed=true;current=null;loading=false;playing=false;bar.hidden=true;document.body.classList.remove('has-now-bar');emit();platforms(t)}
function connect(frameEl){
  widget=SC.Widget(frameEl);const E=SC.Widget.Events;
  widget.bind(E.PLAY,()=>{if(failed){widget.pause();return}clearTimeout(watchdog);loading=false;playing=true;emit()});
  widget.bind(E.PAUSE,()=>{playing=false;emit()});
  widget.bind(E.FINISH,()=>{playing=false;fill.style.transform='scaleX(0)';next()});
  widget.bind(E.PLAY_PROGRESS,e=>{fill.style.transform=`scaleX(${(e.relativePosition||0).toFixed(4)})`});
}
function play(t){
  if(!t)return;
  if(failed){platforms(t);return}
  if(t===current&&widget){widget.toggle();return}
  current=t;playing=false;loading=true;fill.style.transform='scaleX(0)';emit();
  clearTimeout(watchdog);watchdog=setTimeout(()=>{if(current===t&&loading)fallback(t)},7000);
  const options={auto_play:true,visual:false,show_artwork:false,show_comments:false,show_user:false,show_reposts:false,show_teaser:false,hide_related:true};
  if(widget){widget.load(t.url,options);return}
  const frameEl=document.createElement('iframe');frameEl.className='now-player';frameEl.title='SoundCloud';frameEl.allow='autoplay';frameEl.tabIndex=-1;frameEl.setAttribute('aria-hidden','true');
  frameEl.src='https://w.soundcloud.com/player/?url='+encodeURIComponent(t.url)+'&'+Object.entries(options).map(([k,v])=>k+'='+v).join('&');
  document.body.append(frameEl);
  if(window.SC?.Widget){connect(frameEl);return}
  const script=document.createElement('script');script.src='https://w.soundcloud.com/player/api.js';
  script.onload=()=>connect(frameEl);script.onerror=()=>{frameEl.remove();fallback(t)};document.head.append(script);
}
function next(){if(!current)return;play(tracks[(tracks.indexOf(current)+1)%tracks.length])}
function close(){clearTimeout(watchdog);widget?.pause();current=null;playing=false;loading=false;bar.hidden=true;document.body.classList.remove('has-now-bar');emit()}
$('.now-toggle').addEventListener('click',()=>widget?.toggle());
$('.now-next').addEventListener('click',next);
$('.now-platforms').addEventListener('click',()=>current&&platforms(current));
$('.now-close').addEventListener('click',close);
// Rows play here; capture runs before the row's own platform-list handler in app.js.
document.addEventListener('click',e=>{
  if(bypass)return;const row=e.target.closest?.('#originales .track[data-soundcloud]:not(.presave)');const t=row&&tracks.find(t=>t.row===row);
  if(!t||failed)return;e.preventDefault();e.stopPropagation();play(t);
},true);
// The hero's ESCUCHAR plays the newest release; without this script it still scrolls to MÚSICA.
document.querySelector('.hero .actions a.button[href="#musica"]')?.addEventListener('click',e=>{e.preventDefault();play(current||tracks[0])});
const api={tracks,play,next,close,on:fn=>{listeners.add(fn);fn(api)},get current(){return current},get playing(){return playing}};
window.rommuserPlayer=api;
})();
