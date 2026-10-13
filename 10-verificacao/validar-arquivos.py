"""Run from any directory: python3 validar-arquivos.py. Standard library only."""
from pathlib import Path
from html.parser import HTMLParser
import json,re,hashlib,struct
K=Path(__file__).resolve().parent.parent
class Parser(HTMLParser):
 def __init__(self):super().__init__();self.links=[];self.ids=set();self.lang=None
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='html':self.lang=a.get('lang')
  if 'id' in a:self.ids.add(a['id'])
  for k in ['src','href']:
   if k in a:self.links.append(a[k])
  if 'srcset' in a:self.links.extend(x.strip().split()[0] for x in a['srcset'].split(','))
count=0
for p in K.rglob('*.html'):
 q=Parser();q.feed(p.read_text(encoding='utf-8'))
 for ref in q.links:
  if ref.startswith('#'):assert ref[1:] in q.ids,(p,ref)
  elif '://' not in ref and not ref.startswith(('data:','mailto:','tel:')):assert (p.parent/ref.split('#')[0]).is_file(),(p,ref)
 if p.name=='index.html':assert q.lang=='en-IE'
 count+=len(q.links)
for p in K.rglob('*.css'):
 for ref in re.findall(r'url\([\"\']?([^\)\"\']+)',p.read_text()):
  if not ref.startswith('data:'):assert (p.parent/ref).is_file(),(p,ref)
for p in K.rglob('*.json'):json.loads(p.read_text())
png=(K/'01-identidade/lovinspoon-preta-transparente.png').read_bytes();assert png[:8]==b'\x89PNG\r\n\x1a\n';assert png[25]==6,'PNG must contain RGBA channels'
manifest=K/'MANIFESTO-SHA256.json'
if manifest.exists():
 for rel,digest in json.loads(manifest.read_text()).items():assert hashlib.sha256((K/rel).read_bytes()).hexdigest()==digest,rel
print('PASS: local links, anchors, CSS assets, JSON, RGBA PNG, English document and optional hashes.',count,'HTML references')
