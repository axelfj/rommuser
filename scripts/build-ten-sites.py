"""Generate 20 noindex static design previews from the existing artist content. Stdlib only."""
from html.parser import HTMLParser
from html import escape as e
from pathlib import Path
import json
class Node:
 def __init__(self,tag='',attrs=()):self.tag=tag;self.a=dict(attrs);self.children=[]
 def text(self):return ''.join(x if isinstance(x,str) else x.text() for x in self.children).strip()
 def all(self,p):
  out=[]
  for c in self.children:
   if isinstance(c,Node):
    if p(c):out.append(c)
    out+=c.all(p)
  return out
 def cls(self,c):return c in self.a.get('class','').split()
 def first(self,t):return next(iter(self.all(lambda n:n.tag==t)),Node())
class Parser(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.root=Node();self.stack=[self.root]
 def handle_starttag(self,t,a):
  n=Node(t,a);self.stack[-1].children.append(n)
  if t not in ('img','meta','link','input','br','hr','source','wbr'):self.stack.append(n)
 def handle_endtag(self,t):
  for i in range(len(self.stack)-1,0,-1):
   if self.stack[i].tag==t:self.stack=self.stack[:i];break
 def handle_data(self,s):self.stack[-1].children.append(s)
def ext(url,label):return f'<a href="{e(url,quote=True)}" target="_blank" rel="noopener noreferrer">{e(label)} ↗</a>'
names=['Presencia','Contacto','Umbral','Frecuencia','Medianoche','Archivo','Cuerpo','Silencio','Doble exposición','La señal']
slugs=['presencia','contacto','umbral','frecuencia','medianoche','archivo','cuerpo','silencio','doble','senal']
root=Path('site/preview/live')
for lang in ['es','en']:
 p=Parser();p.feed(Path(f'site/{lang}/index.html').read_text());doc=p.root
 def t(es,en):return es if lang=='es' else en
 tracks=doc.all(lambda n:n.cls('track') and n.a.get('data-track'))
 tracklist=''
 for n in tracks:
  title=n.first('strong').text();label=n.first('small').text();date=n.first('time').text()
  links=[]
  if n.a.get('href'):links.append(ext(n.a['href'],n.all(lambda x:x.cls('track-type'))[0].text()))
  else:
   for key,label2 in [('spotify','Spotify'),('apple','Apple Music'),('soundcloud','SoundCloud'),('beatport','Beatport'),('youtube','YouTube'),('bandcamp','Bandcamp')]:
    if n.a.get('data-'+key):links.append(ext(n.a['data-'+key],label2))
  action_label=n.all(lambda x:x.cls('track-type'))[0].text() if n.a.get('href') else t('Escuchar','Listen')
  action=f'<details class="listen"><summary>{e(action_label)} ↗</summary><div>{"".join(links)}</div></details>' if links else f'<span class="soon">{t("Próximamente","Coming soon")}</span>'
  tracklist+=f'<article class="track"><div><h3>{e(title)}</h3><p>{e(label)}</p></div><span class="date">{e(date)}</span>{action}</article>'
 shows=''
 for n in doc.all(lambda n:n.cls('show-row')):
  a=n.first('a');link=ext(a.a['href'],t('Ver set','Watch set')) if a.a.get('href') else ''
  shows+=f'<article class="show"><time>{e(n.first("time").text())}</time><div><h3>{e(n.first("h3").text())}</h3><p>{e(n.first("p").text())}</p></div>{link}</article>'
 nextshow=doc.all(lambda n:n.cls('next-show'))[0]
 bio=doc.all(lambda n:n.cls('artist-intro'))[0].all(lambda n:n.tag=='p' and not n.cls('eyebrow'))
 contacts=doc.all(lambda n:n.a.get('id') in ['localized-epk','localized-rider'])
 for i,(name,slug) in enumerate(zip(names,slugs),1):
  other='en' if lang=='es' else 'es'
  nav=''.join(f'<a href="#{anchor}">{label}</a>' for anchor,label in [('music',t('Música','Music')),('live',t('En vivo','Live')),('artist',t('El artista','The artist')),('contact', 'Bookings')])+ '<a href="https://studio.rommuser.com">Studio ↗</a>'
  image='<img class="portrait" src="/assets/portrait.webp" alt="ROMMUSER" width="1080" height="1350" fetchpriority="high">'
  copy=f'<div class="hero-copy"><p class="eyebrow">{t("HOUSE Y TECHNO, CON ALMA MELÓDICA.","HOUSE AND TECHNO, WITH A MELODIC SOUL.")}</p><h1>ROMMUSER</h1><p class="invitation">{t("Música para cerrar los ojos.","Music to close your eyes to.")}</p><a class="button" href="#music">{t("Escuchar","Listen")} ↗</a></div>'
  if slug=='contacto':hero=copy+'<div class="contact-sheet">'+image+image.replace('fetchpriority="high"','loading="lazy"')+image.replace('fetchpriority="high"','loading="lazy"')+'</div>'
  elif slug=='doble':hero='<div class="diptych">'+image+image.replace('fetchpriority="high"','loading="lazy"')+'</div>'+copy
  else:hero=copy+'<figure>'+image+'</figure>'
  if slug=='frecuencia':hero+='<div class="waves" aria-hidden="true">'+''.join('<i></i>' for _ in range(8))+'</div>'
  music=f'<section id="music" class="music"><div class="section-title"><span>{t("MÚSICA","MUSIC")}</span><h2>{t("Lo que","Sound,")}<br><em>{t("suena.","in motion.")}</em></h2></div><div class="tracklist">{tracklist}</div></section>'
  live=f'<section id="live" class="live"><div class="section-title"><span>LIVE</span><h2>{t("Nos vemos","Meet me")}<br><em>{t("en la pista.","on the dance floor.")}</em></h2></div><div class="agenda"><article class="next"><span>{t("PRÓXIMA FECHA","NEXT SHOW")}</span><h3>{e(nextshow.first("h3").text())}</h3><p>{e(nextshow.first("p").text())} / {e(nextshow.first("time").text())}</p>{ext("https://instagram.com/rommuser",t("Novedades","Updates"))}</article><details class="past"><summary>{t("Shows pasados","Past shows")}</summary>{shows}</details></div></section>'
  artist=f'<section id="artist" class="artist"><figure><img src="/assets/portrait.webp" alt="ROMMUSER" width="1080" height="1350" loading="lazy" decoding="async"></figure><div><span>{t("EL ARTISTA","THE ARTIST")}</span><h2>{t("Entre el cuerpo","Between the body")}<br><em>{t("y lo que sentís.","and what you feel.")}</em></h2>'+''.join(f'<p>{e(n.text())}</p>' for n in bio)+'</div></section>'
  rooms=f'<section class="rooms" id="rooms"><div><span>{t("LA NOCHE PROPIA DE ROMMUSER","ROMMUSER’S OWN NIGHT")}</span><h2>Secret<br><em>Rooms.</em></h2>{ext("https://www.instagram.com/secretroomsrecs/",t("Entrar","Enter"))}</div><div class="door" aria-hidden="true"></div></section>'
  contact=f'<section id="contact" class="contact"><h2>{t("La próxima","The next")}<br><em>{t("noche.","night.")}</em></h2><div class="contact-links"><a href="mailto:bookings@rommuser.com">bookings@rommuser.com</a><a href="mailto:contact@rommuser.com">contact@rommuser.com</a>'+''.join(ext(n.a['href'],n.text()) for n in contacts)+f'<a href="/{lang}/#lista">Golden Circle ↗</a></div></section>'
  sections={'music':music,'live':live,'artist':artist,'rooms':rooms,'contact':contact}
  order=['music','live','rooms','artist','contact']
  if slug in ['umbral','silencio']:order=['artist','music','rooms','live','contact']
  if slug in ['cuerpo','doble']:order=['live','music','artist','rooms','contact']
  switch=''.join(f'<a href="/preview/live/{s}/{lang}/"'+(' aria-current="page"' if s==slug else '')+f'>{j:02} {e(nm)}</a>' for j,(nm,s) in enumerate(zip(names,slugs),1))
  page=f'''<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="color-scheme" content="light dark"><title>ROMMUSER · {name}</title><link rel="stylesheet" href="/preview/live/layouts.css"><link rel="icon" href="/assets/rr-192.png"></head><body class="v-{slug}"><a class="skip" href="#main">{t('Saltar al contenido','Skip to content')}</a><header><a class="brand" href="#home">ROMMUSER</a><nav aria-label="{t('Navegación principal','Main navigation')}">{nav}</nav><details class="mobile-menu"><summary>{t('Menú','Menu')}</summary><nav>{nav}</nav></details><a class="language" href="/preview/live/{slug}/{other}/" lang="{other}">{other.upper()}</a></header><main id="main"><section id="home" class="hero">{hero}</section>{''.join(sections[k] for k in order)}</main><footer><a href="/preview/propuestas/">← {t('Todas las propuestas','All concepts')}</a><details class="switch"><summary>{i:02} / {name} · {t('Cambiar propuesta','Switch concept')}</summary><nav>{switch}</nav></details><span>ROMMUSER / COSTA RICA</span></footer></body></html>'''
  dest=root/slug/lang;dest.mkdir(parents=True,exist_ok=True);(dest/'index.html').write_text(page)
# Add a live link to each existing image concept, preserving the visual gallery.
p=Path('site/preview/propuestas/index.html');s=p.read_text()
import re
s=re.sub(r'<a class="button" href="/preview/presencia/es/">Abrir versión funcional ↗</a>','',s)
s=re.sub(r'<a class="button" href="/preview/live/[^"]+">Navegar propuesta ↗</a>','',s)
for i,slug in enumerate(slugs,1):
 pattern=f'(<article id="p{i:02}">.*?)(</article>)'
 s=re.sub(pattern,lambda m:m[1]+f'<a class="button" href="/preview/live/{slug}/es/">Navegar propuesta ↗</a>'+m[2],s,flags=re.S)
s=s.replace('/preview/presencia/es/','/preview/live/presencia/es/').replace('Presencia es una propuesta navegable con fotografía original.','Las diez propuestas tienen una versión navegable con fotografía original.').replace('Presencia · sitio funcional','Presencia · sitio funcional')
p.write_text(s)
