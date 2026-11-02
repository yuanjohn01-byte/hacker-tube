import http.server,json,os,urllib.parse
from pathlib import Path
root=str(Path(__file__).resolve().parents[1])
routes=json.load(open(root+'/cloudflare/routes.generated.json'))
os.chdir(root+'/dist/client')
class Preview(http.server.SimpleHTTPRequestHandler):
 def do_GET(self):
  u=urllib.parse.urlsplit(self.path); key=urllib.parse.unquote(u.path); source=urllib.parse.parse_qs(u.query).get('source',[''])[0]; entry=routes.get('/search' if key.startswith('/search/') else '/'+source if key=='/' and source in ['books','github','papers','podcasts'] else key)
  if entry:
   page=urllib.parse.parse_qs(u.query).get('page',['1'])[0]; self.path=entry['file']
   if page.isdigit() and int(page)>1:self.path=self.path.replace('.html','--page-'+page+'.html')
  super().do_GET()
http.server.ThreadingHTTPServer(('127.0.0.1',4176),Preview).serve_forever()
