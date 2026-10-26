from pathlib import Path
from html.parser import HTMLParser
import subprocess,hashlib
class Check(HTMLParser):
 def __init__(self):super().__init__();self.ids=[];self.hrefs=[];self.assets=[];self.h1=0;self.robots='';self.scripts=0
 def handle_starttag(self,t,a):
  d=dict(a)
  if 'id' in d:self.ids.append(d['id'])
  if t=='a':self.hrefs.append(d.get('href',''))
  if t=='h1':self.h1+=1
  if t=='script':self.scripts+=1
  if t=='meta' and d.get('name')=='robots':self.robots=d.get('content')
  if t in ['link','img']:self.assets.append(d.get('src',d.get('href','')))
files=list(Path('site/preview/live').glob('*/*/index.html'));assert len(files)==20
for f in files:
 c=Check();c.feed(f.read_text());assert c.h1==1 and c.scripts==0 and c.robots=='noindex,nofollow',f
 assert len(c.ids)==len(set(c.ids)),f
 for h in c.hrefs:
  if h.startswith('#'):assert h[1:] in c.ids,(f,h)
  elif h.startswith('/preview/live/'):assert Path('site'+h+'index.html').exists(),(f,h)
 for a in c.assets:
  if a.startswith('/'):assert Path('site'+a).is_file(),(f,a)
 assert 'bookings@rommuser.com' in f.read_text()
gallery=Path('site/preview/propuestas/index.html');assert gallery.read_text().count('Navegar propuesta ↗')==10
before=hashlib.sha256(gallery.read_bytes()).digest();subprocess.run(['python','scripts/build-ten-sites.py'],check=True);assert before==hashlib.sha256(gallery.read_bytes()).digest(),'generator not idempotent'
print('20 ES/EN pages: anchors, unique IDs, local assets, language/concept links, noindex, no runtime JS and repeatable generation passed.')
print('HTML bytes:',min(f.stat().st_size for f in files),'-',max(f.stat().st_size for f in files));print('Shared CSS:',Path('site/preview/live/layouts.css').stat().st_size,'bytes; existing portrait:',Path('site/assets/portrait.webp').stat().st_size,'bytes')
