const menu=document.querySelector('.menu-toggle');const nav=document.querySelector('header nav');menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('open',open)});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menu.setAttribute('aria-expanded','false');nav.classList.remove('open')}));document.querySelectorAll('[data-email]').forEach(button=>button.addEventListener('click',async()=>{const status=document.querySelector('.copy-status');try{await navigator.clipboard.writeText(button.dataset.email);status.textContent=tr('Correo copiado: ')+button.dataset.email;button.textContent=tr('COPIADO');setTimeout(()=>{button.textContent=tr('COPIAR CORREO')},2500)}catch{status.textContent=tr('Selecciona y copia el correo: ')+button.dataset.email}}));
// Release-day labels update without replacing verified outbound destinations.
const releaseToday=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Costa_Rica'}).format(new Date());
document.querySelectorAll('.track.upcoming[data-release]').forEach(track=>{
  if(track.dataset.release>releaseToday)return;
  track.classList.remove('upcoming');
  track.querySelector('.track-type').textContent=tr('ESCUCHAR');
  // Verified release destinations become available through the listening dialog.
  // Otherwise keep the existing smartlink as the direct outbound destination.
  if(track.classList.contains('presave')&&track.dataset.soundcloud){
    track.classList.remove('presave');
    track.dataset.track=track.querySelector('strong').textContent;
  }
  if(!track.hasAttribute('href')){
    track.disabled=false;
    track.dataset.track=track.querySelector('strong').textContent;
  }
});
// Preserve the original listening controls inside a chronological release archive.
const releaseList=document.querySelector('#originales .tracks');
if(releaseList){
  const releaseYears=new Map();
  [...releaseList.children].forEach(track=>{
    const year=track.querySelector('time')?.dateTime.slice(0,4);
    if(!year)return;
    if(!releaseYears.has(year))releaseYears.set(year,[]);
    releaseYears.get(year).push(track);
  });
  [...releaseYears].sort(([a],[b])=>b.localeCompare(a)).forEach(([year,tracks],index)=>{
    const group=document.createElement('details');group.className='release-year';group.open=index===0;
    const summary=document.createElement('summary');
    const label=document.createElement('span');label.textContent=year;
    const count=document.createElement('span');count.className='release-count';count.textContent=tracks.length+' '+tr(tracks.length===1?'TRACK':'TRACKS');
    summary.append(label,count);group.append(summary,...tracks);releaseList.append(group);
  });
}

const tabs=[...document.querySelectorAll('[role="tab"]')];function chooseTab(tab){tabs.forEach(t=>{const selected=t===tab;t.setAttribute('aria-selected',String(selected));t.tabIndex=selected?0:-1;document.getElementById(t.getAttribute('aria-controls')).hidden=!selected})}tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>chooseTab(tab));tab.addEventListener('keydown',event=>{let n=i;if(event.key==='ArrowRight')n=(i+1)%tabs.length;else if(event.key==='ArrowLeft')n=(i+tabs.length-1)%tabs.length;else if(event.key==='Home')n=0;else if(event.key==='End')n=tabs.length-1;else return;event.preventDefault();chooseTab(tabs[n]);tabs[n].focus()})});const listenDialog=document.getElementById('listen-dialog');const listenPlatforms=['apple','bandcamp','beatport','soundcloud','spotify','youtube'].map(key=>({key,element:document.getElementById('listen-'+key)})).filter(p=>p.element).map(p=>({...p,defaultHref:p.element.href,defaultLabel:p.element.querySelector('span').textContent}));
document.querySelectorAll('.music-choice:not(.presave)').forEach(b=>b.addEventListener('click',e=>{
  e.preventDefault();
  const isTrack=b.dataset.track!=='MÚSICA DE ROMMUSER';
  listenPlatforms.forEach(({key,element,defaultHref,defaultLabel})=>{
    const href=b.dataset[key];
    const pending=isTrack&&!href;
    element.hidden=false;
    if(pending){
      element.removeAttribute('href');
      element.setAttribute('aria-disabled','true');
      element.setAttribute('role','link');
      element.setAttribute('tabindex','-1');
    }else{
      element.href=href||defaultHref;
      element.removeAttribute('aria-disabled');
      element.removeAttribute('role');
      element.removeAttribute('tabindex');
    }
    element.querySelector('span').textContent=pending?tr('ENLACE PENDIENTE'):href?tr(key==='beatport'||key==='bandcamp'?'COMPRAR':'ESCUCHAR'):defaultLabel;
  });
  document.getElementById('listen-title').dataset.original=b.dataset.track;
  document.getElementById('listen-title').textContent=tr(b.dataset.track);
  listenDialog.showModal();
}));document.querySelector('.dialog-close')?.addEventListener('click',()=>listenDialog.close());listenDialog?.addEventListener('click',e=>{if(e.target===listenDialog){const r=listenDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)listenDialog.close()}});
// A completed date remains in the artist's show history, never as an upcoming show. It keeps its place and type and lands in date order.
const todayCR=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Costa_Rica'}).format(new Date());document.querySelectorAll('[data-show-date]').forEach(show=>{if(show.dataset.showDate<todayCR){if(show.dataset.showStatus==='tentative'){show.remove();return;}const venue=show.querySelector('h3')?.textContent||'';const [y,m,d]=show.dataset.showDate.split('-');show.classList.remove('next-show');show.classList.add('show-row');const date=document.createElement('time');date.dateTime=show.dataset.showDate;date.textContent=d+'.'+m+'.'+y.slice(2);const info=document.createElement('div');const title=document.createElement('h3');title.textContent=venue;info.append(title);if(show.dataset.showPlace){const place=document.createElement('p');place.textContent=show.dataset.showPlace;info.append(place)}const type=document.createElement('span');if(show.dataset.showType)type.textContent=show.dataset.showType;else{type.dataset.liveType='true';type.textContent=tr('EN VIVO')}show.replaceChildren(date,info,type);const older=[...document.querySelectorAll('.show-row:not([data-show-date]) > time')].find(t=>t.dateTime<show.dataset.showDate);const rows=[...document.querySelectorAll('.show-row:not([data-show-date])')];if(older)older.parentElement.before(show);else if(rows.length)rows[rows.length-1].after(show);else document.querySelector('.show-history-label').after(show)}});
// Older nights fade a little, and each year folds into its own dropdown (the latest one open).
{const regs=[...document.querySelectorAll('#vivo .show-row')];const years=new Map();regs.forEach((r,i)=>{r.style.setProperty('--fade',String(1-.4*i/Math.max(regs.length-1,1)));const y=r.querySelector('time')?.dateTime.slice(0,4)||'';if(!years.has(y))years.set(y,[]);years.get(y).push(r)});[...years].forEach(([y,rows],i)=>{const box=document.createElement('details');box.className='show-year';box.open=i===0;const sum=document.createElement('summary');const label=document.createElement('span');label.textContent=y;const count=document.createElement('span');count.className='show-count';count.textContent=rows.length+' '+tr(rows.length===1?'SHOW':'SHOWS');sum.append(label,count);rows[0].before(box);box.append(sum,...rows)})}

function refreshYear(){const year=new Intl.DateTimeFormat('en',{timeZone:'America/Costa_Rica',year:'numeric'}).format(new Date());document.getElementById('footer-year').textContent='© '+year+' ROMMUSER / COSTA RICA'}refreshYear();document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshYear()});document.addEventListener('languagechange',()=>{refreshYear();document.querySelectorAll('[data-live-type]').forEach(el=>el.textContent=tr('EN VIVO'));document.querySelector('.copy-status').textContent=''});setInterval(refreshYear,60000);

function syncMarqueeSpeed(){const group=document.querySelector('.signal-group');const track=document.querySelector('.signal-track');if(group&&track){const pixelsPerSecond=matchMedia('(max-width:620px)').matches?75:115;track.style.setProperty('--marquee-duration',(group.getBoundingClientRect().width/pixelsPerSecond)+'s')}}syncMarqueeSpeed();document.fonts.ready.then(syncMarqueeSpeed);addEventListener('resize',syncMarqueeSpeed);document.addEventListener('languagechange',syncMarqueeSpeed);

// Shrink desktop navigation continuously from the page top to the red band.
const homeHeader = document.querySelector('.artist-home > header');
const heroSignal = document.querySelector('.artist-home .signal');
if (homeHeader && heroSignal) {
  let navigationFrame = 0;
  const resizeNavigation = () => {
    navigationFrame = 0;
    const end = Math.max(1, heroSignal.getBoundingClientRect().bottom + window.scrollY - 94);
    const progress = window.innerWidth > 900 ? Math.min(1, Math.max(0, window.scrollY / end)) : 0;
    homeHeader.style.setProperty('--nav-height', `${94 - 47 * progress}px`);
    homeHeader.style.setProperty('--nav-logo-size', `${58 - 26 * progress}px`);
    homeHeader.style.setProperty('--nav-language-height', `${44 - 12 * progress}px`);
    homeHeader.style.setProperty('--nav-language-padding', `${9 - 6 * progress}px`);
  };
  const scheduleNavigation = () => {
    if (!navigationFrame) navigationFrame = window.requestAnimationFrame(resizeNavigation);
  };
  window.addEventListener('scroll', scheduleNavigation, { passive: true });
  window.addEventListener('resize', scheduleNavigation);
  window.addEventListener('load', scheduleNavigation);
  resizeNavigation();
}

// Keep the existing Apps Script endpoint. Every submission needs a fresh Turnstile token.
const fanForm = document.querySelector('.fan-form');
let fanWidgetId;
let fanToken = '';
let fanSubmitting = false;
window.initFanChallenge = () => {
  if (!fanForm) return;
  const target = fanForm.querySelector('#fan-challenge');
  if (!target?.dataset.sitekey) return; // Fail closed until deployment is configured.
  fanWidgetId = window.turnstile.render(target, {
    sitekey: target.dataset.sitekey,
    action: 'fan_signup',
    appearance: 'interaction-only',
    language: document.documentElement.lang === 'en' ? 'en' : 'es',
    callback: token => { fanToken = token; },
    'expired-callback': () => { fanToken = ''; },
    'error-callback': () => { fanToken = ''; },
  });
};
if (fanForm) {
  const fanEmail = fanForm.querySelector('#fan-email');
  const fanStatus = fanForm.querySelector('.fan-status');
  const fanButton = fanForm.querySelector('button[type="submit"]');
  const syncFanLanguage = () => {
    fanEmail.placeholder = fanEmail.dataset[document.documentElement.lang === 'en' ? 'placeholderEn' : 'placeholderEs'];
    fanForm.elements.lang.value = document.documentElement.lang;
  };
  const fanRef = (() => {
    const q = new URLSearchParams(location.search);
    const keep = (key, value, ok) => {
      try {
        if (value && ok.test(value) && !localStorage.getItem(key)) localStorage.setItem(key, value);
        const saved = localStorage.getItem(key) || '';
        return ok.test(saved) ? saved : '';
      } catch { return value && ok.test(value) ? value : ''; }
    };
    let from = '';
    try {
      const host = document.referrer && new URL(document.referrer).hostname.replace(/^www\./, '');
      if (host && !/(^|\.)rommuser\.com$/.test(host)) from = host;
    } catch {}
    return {
      ref: keep('rommuser-ref', (q.get('ref') || '').toUpperCase(), /^[A-Z0-9]{4,10}$/),
      origen: keep('rommuser-origen', (q.get('utm_source') || from).toLowerCase(), /^[\w.\-]{1,40}$/),
    };
  })();
  const syncFanRef = () => {
    fanForm.elements.ref.value = fanRef.ref;
    fanForm.elements.origen.value = fanRef.origen;
  };
  syncFanRef();
  syncFanLanguage();
  document.addEventListener('languagechange', () => { syncFanLanguage(); fanStatus.textContent = ''; });
  fanForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (fanSubmitting) return;
    const email = fanEmail.value.trim();
    if (email.length > 254 || !/^[^\s@=+\-][^\s@]*@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      fanStatus.textContent = tr('Escribe un correo válido.');
      fanEmail.focus();
      return;
    }
    if (fanForm.elements.website.value) return;
    if (!fanToken || fanWidgetId === undefined) {
      fanStatus.textContent = tr('Completa la verificación. Si no aparece, recarga la página.');
      return;
    }
    const endpoint = fanForm.dataset.endpoint;
    if (!endpoint) { fanStatus.textContent = tr('No se pudo enviar. Inténtalo otra vez.'); return; }
    fanSubmitting = true;
    fanButton.disabled = true;
    fanButton.textContent = tr('ENVIANDO');
    try {
      const body = new URLSearchParams(new FormData(fanForm));
      body.set('email', email);
      body.set('cf-turnstile-response', fanToken);
      await fetch(endpoint, { method: 'POST', mode: 'no-cors', body, signal: AbortSignal.timeout(20000) });
      // Apps Script's opaque response cannot confirm that a row was accepted.
      fanForm.reset();
      syncFanLanguage();
      syncFanRef();
      fanStatus.textContent = tr('Solicitud enviada. No podemos confirmar el registro desde esta página.');
    } catch {
      fanStatus.textContent = tr('No pudimos confirmar el envío. Inténtalo otra vez.');
    } finally {
      fanToken = '';
      if (fanWidgetId !== undefined) window.turnstile.reset(fanWidgetId);
      fanSubmitting = false;
      fanButton.disabled = false;
      fanButton.textContent = tr('ENTRAR');
    }
  });
}
