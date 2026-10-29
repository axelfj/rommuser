// Red band under the hero: the next releases and shows, read from the release list and the next-show card,
// so a date only ever lives in one place. Past dates drop out on their own; with nothing ahead the band stays hidden.
(()=>{
const band=document.querySelector('.dates-band'),track=band?.querySelector('.dates-track');
if(!band||!track)return;
const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Costa_Rica'}).format(new Date());
const items=[];
document.querySelectorAll('.tracks .track[data-release]').forEach(row=>{const title=row.querySelector('.track-info strong')?.textContent.trim();if(title&&row.dataset.release>=today)items.push({date:row.dataset.release,text:title})});
document.querySelectorAll('.next-show[data-show-date]').forEach(show=>{const name=show.querySelector('h3')?.textContent.trim();if(name&&show.dataset.showDate>=today)items.push({date:show.dataset.showDate,text:[name,show.dataset.showPlace].filter(Boolean).join(', ')})});
if(!items.length)return;
items.sort((a,b)=>a.date<b.date?-1:1);
const group=()=>{const g=document.createElement('span');g.className='dates-group';items.forEach(({date,text})=>{const item=document.createElement('span');item.className='dates-item';const t=document.createElement('time');t.dateTime=date;const [,m,d]=date.split('-');t.textContent=d+'.'+m;item.append(t,' '+text);g.append(item)});return g};
const first=group(),second=group();second.setAttribute('aria-hidden','true');
track.append(first,second);band.hidden=false;
})();
