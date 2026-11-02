from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont
root=Path(__file__).resolve().parents[1]
out=root/'dist/client/og';out.mkdir(parents=True,exist_ok=True)
font='/Library/Fonts/Arial Unicode.ttf'
if not Path(font).exists():
 font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def f(n):return ImageFont.truetype(font,n)
def render(filename,title,subtitle):
 im=Image.new('RGB',(1200,630),'#ffffff');d=ImageDraw.Draw(im)
 d.text((72,50),'Hacker',font=f(54),fill='#0f0f0f');x=72+d.textlength('Hacker',font=f(54));d.text((x,50),'Tube',font=f(54),fill='#ff6600')
 d.line((72,137,1128,137),fill='#e5e5e5',width=2)
 lines=[];line=''
 for word in title.split():
  candidate=(line+' '+word).strip()
  if d.textlength(candidate,font=f(58))>1050 and line:lines.append(line);line=word
  else:line=candidate
 if line:lines.append(line)
 y=185
 for line in lines[:4]:d.text((72,y),line,font=f(58),fill='#0f0f0f');y+=75
 d.text((72,max(y+20,435)),subtitle,font=f(27),fill='#606060')
 d.text((72,546),'hacker-tube.org · Independent recreation',font=f(25),fill='#606060')
 im.save(out/filename,optimize=True)
render('site.png','Videos shared on Hacker News','Inspired by Andrej Karpathy’s original HackerTube project')
render('about.png','About, credits & the original idea','Andrej Karpathy · HackerTube · Community recommendations')
for p in json.loads((root/'seo/og-pages.json').read_text()):render(p['file'],p['title'],p['subtitle'])
print('Generated',len(list(out.glob('*.png'))),'OG images, 1200 × 630.')
