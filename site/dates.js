// Red band under the hero: the next releases and shows, read from the release list and the next-show card,
// so a date only ever lives in one place. Past dates drop out on their own; with nothing ahead the band stays hidden.
// Each item says whether it is a release or a show and jumps to its row, so it can be focused (which also pauses the band).
(()=>{
const band=document.querySelector('.dates-band'),track=band?.querySelector('.dates-track');
if(!band||!track)return;
const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Costa_Rica'}).format(new Date());
const items=[],months=document.documentElement.lang==='en'?['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']:['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
document.querySelectorAll('.tracks .track[data-release]').forEach(row=>{const title=row.querySelector('.track-info strong')?.textContent.trim();if(title&&row.dataset.release>=today)items.push({date:row.dataset.release,text:title,kind:tr('LANZAMIENTO'),href:'#musica'})});
document.querySelectorAll('.next-show[data-show-date]').forEach(show=>{const name=show.querySelector('h3')?.textContent.trim();if(name&&show.dataset.showDate>=today)items.push({date:show.dataset.showDate,text:[name,show.dataset.showPlace].filter(Boolean).join(', '),kind:tr('EN VIVO'),href:'#vivo'})});
if(!items.length)return;
items.sort((a,b)=>a.date<b.date?-1:1);
const group=hidden=>{const g=document.createElement('span');g.className='dates-group';items.forEach(({date,text,kind,href})=>{const item=document.createElement('a');item.className='dates-item';item.href=href;if(hidden)item.tabIndex=-1;const t=document.createElement('time');t.dateTime=date;const [,m,d]=date.split('-');t.textContent=d+' '+months[m-1];const k=document.createElement('small');k.textContent=kind;item.append(t,' '+text+' ',k);g.append(item)});return g};
const first=group(false),second=group(true);second.setAttribute('aria-hidden','true');
track.append(first,second);band.hidden=false;
})();
