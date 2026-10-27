// /estudio: launch offer window, motion (hero, section reveals, tagline words) and the quote form that opens an email.
(()=>{
const root=document.documentElement;
const calm=matchMedia('(prefers-reduced-motion: reduce)').matches;

// The offer shows only up to its last day, Costa Rica time.
const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Costa_Rica'}).format(new Date());
document.querySelectorAll('[data-until]').forEach(el=>{el.hidden=today>el.dataset.until});

// Tagline words, split after translation so each word can light up on its own.
const tagline=document.querySelector('.tagline-reveal');
if(tagline)[...tagline.childNodes].forEach(node=>{
  if(node.nodeType!==3||!node.textContent.trim())return;
  const frag=document.createDocumentFragment();
  node.textContent.split(/(\s+)/).forEach(part=>{
    if(!part)return;
    if(/^\s+$/.test(part)){frag.append(part);return}
    const word=document.createElement('span');word.className='word';word.textContent=part;frag.append(word);
  });
  node.replaceWith(frag);
});

if(!calm&&'IntersectionObserver' in window){
  root.classList.add('motion');
  document.querySelectorAll('.studio-hero .rise').forEach((el,i)=>el.style.setProperty('--i',i));
  requestAnimationFrame(()=>requestAnimationFrame(()=>root.classList.add('is-in')));

  // Each section rises once when about a fifth of it is visible.
  const reveal=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(!entry.isIntersecting)return;
    entry.target.classList.add('shown');reveal.unobserve(entry.target);
  }),{threshold:.2});
  document.querySelectorAll('[data-reveal]').forEach(el=>reveal.observe(el));

  // Words light up as they cross a line at 65% of the viewport, in reading order.
  if(tagline){
    const words=[...tagline.querySelectorAll('.word')];
    let queued=false;
    const paint=()=>{queued=false;const line=innerHeight*.65;words.forEach(w=>w.classList.toggle('lit',w.getBoundingClientRect().top<line))};
    const onScroll=()=>{if(!queued){queued=true;requestAnimationFrame(paint)}};
    new IntersectionObserver(([entry])=>{
      if(entry.isIntersecting){addEventListener('scroll',onScroll,{passive:true});paint()}
      else removeEventListener('scroll',onScroll);
    }).observe(tagline);
  }
}

// Quote form: checks the fields that can be wrong, then sends the request to contact@ through the Apps Script
// endpoint (integraciones/estudio-pedidos.gs, Turnstile protected). Until data-endpoint is set, it opens the
// visitor's email app with the request filled in instead.
const form=document.querySelector('.studio-form');
if(!form)return;
const status=form.querySelector('.form-status');
const button=form.querySelector('button[type="submit"]');
const challenge=form.querySelector('#studio-challenge');
const endpoint=form.dataset.endpoint;
const EMAIL=/^[^\s@=+\-][^\s@]*@[^\s@]+\.[^\s@]{2,}$/;
let widget,token='',sending=false;
const renderChallenge=()=>{
  if(!endpoint||!challenge?.dataset.sitekey||widget!==undefined||!window.turnstile)return;
  widget=window.turnstile.render(challenge,{
    sitekey:challenge.dataset.sitekey,
    action:'studio_quote',
    appearance:'interaction-only',
    language:document.documentElement.lang==='en'?'en':'es',
    callback:t=>{token=t},
    'expired-callback':()=>{token=''},
    'error-callback':()=>{token=''},
  });
};
window.initStudioChallenge=renderChallenge;
renderChallenge();
const fail=(input,bad)=>{
  input.setAttribute('aria-invalid',String(bad));
  document.getElementById(input.getAttribute('aria-describedby')).hidden=!bad;
  return bad;
};
const openMail=()=>{
  const service=form.elements.servicio.selectedOptions[0].textContent;
  const lines=[...form.querySelectorAll('label')].map(label=>{
    const field=document.getElementById(label.htmlFor);
    const value=field.tagName==='SELECT'?field.selectedOptions[0].textContent:field.value.trim();
    return label.textContent+': '+value;
  });
  const subject=tr('Cotización')+' · '+service+' · '+form.elements.artista.value.trim();
  location.href='mailto:'+form.dataset.to+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(lines.join('\n')+'\n\n');
  status.textContent=tr('Se abrió tu correo con el pedido listo. Si no se abrió, escribe a contact@rommuser.com.');
};
form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(sending)return;
  const artist=form.elements.artista,email=form.elements.correo,link=form.elements.enlace;
  const badArtist=fail(artist,!artist.value.trim());
  const badEmail=fail(email,email.value.trim().length>254||!EMAIL.test(email.value.trim()));
  const badLink=fail(link,!!link.value.trim()&&!/^https?:\/\/\S+$/i.test(link.value.trim()));
  if(badArtist||badEmail||badLink){(badArtist?artist:badEmail?email:link).focus();status.textContent='';return}
  if(form.elements.website.value)return;
  if(!endpoint){openMail();return}
  if(!token||widget===undefined){status.textContent=tr('Completa la verificación. Si no aparece, recarga la página.');return}
  sending=true;button.disabled=true;button.textContent=tr('ENVIANDO');
  try{
    const body=new URLSearchParams(new FormData(form));
    body.set('servicio',form.elements.servicio.selectedOptions[0].textContent);
    body.set('lang',document.documentElement.lang==='en'?'en':'es');
    body.set('origen','rommuser.com'+location.pathname);
    body.set('cf-turnstile-response',token);
    await fetch(endpoint,{method:'POST',mode:'no-cors',body,signal:AbortSignal.timeout(20000)});
    // Apps Script answers with an opaque response, so the page can only confirm the request left.
    form.reset();
    status.textContent=tr('Listo. Tu pedido me llegó y te respondo a tu correo.');
  }catch{
    status.textContent=tr('No se pudo enviar. Escríbeme a contact@rommuser.com.');
  }finally{
    token='';if(widget!==undefined)window.turnstile.reset(widget);
    sending=false;button.disabled=false;button.textContent=tr('PEDIR COTIZACIÓN');
  }
});
form.addEventListener('input',event=>{
  if(event.target.getAttribute('aria-invalid')==='true')fail(event.target,false);
});
})();
