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

// Quote form: checks the two fields that can be wrong, then opens the visitor's email with the request filled in.
const form=document.querySelector('.studio-form');
if(!form)return;
const status=form.querySelector('.form-status');
const fail=(input,bad)=>{
  input.setAttribute('aria-invalid',String(bad));
  document.getElementById(input.getAttribute('aria-describedby')).hidden=!bad;
  return bad;
};
form.addEventListener('submit',event=>{
  event.preventDefault();
  const artist=form.elements.artista,link=form.elements.enlace;
  const badArtist=fail(artist,!artist.value.trim());
  const badLink=fail(link,!!link.value.trim()&&!/^https?:\/\/\S+$/i.test(link.value.trim()));
  if(badArtist||badLink){(badArtist?artist:link).focus();status.textContent='';return}
  const service=form.elements.servicio.selectedOptions[0].textContent;
  const lines=[...form.querySelectorAll('label')].map(label=>{
    const field=document.getElementById(label.htmlFor);
    const value=field.tagName==='SELECT'?field.selectedOptions[0].textContent:field.value.trim();
    return label.textContent+': '+value;
  });
  const subject=tr('Cotización')+' · '+service+' · '+artist.value.trim();
  location.href='mailto:'+form.dataset.to+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(lines.join('\n')+'\n\n');
  status.textContent=tr('Se abrió tu correo con el pedido listo. Si no se abrió, escribe a contact@rommuser.com.');
});
form.addEventListener('input',event=>{
  if(event.target.getAttribute('aria-invalid')==='true')fail(event.target,false);
});
})();
