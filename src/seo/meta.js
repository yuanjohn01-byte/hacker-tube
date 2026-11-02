export const ORIGIN='https://hacker-tube.org';
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const jsonScript=o=>JSON.stringify(o).replace(/</g,'\\u003c');
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
export function excerpt(s,max=155){s=clean(s);if(s.length<=max)return s;const cut=s.slice(0,max-1);return cut.slice(0,cut.lastIndexOf(' ')>max*.6?cut.lastIndexOf(' '):cut.length)+'…';}
export function pageMeta({path='/',kind,name='',doc,items=[],page=1,totalPages=1,noindex=false}){
 const canonical=ORIGIN+path+(page>1?'?page='+page:'');
 let title,description,h1=name||'HackerTube',image=ORIGIN+'/og/site.png',imageAlt='HackerTube — videos shared on Hacker News',type='website';
 const credit="Independent archive based on Karpathy’s HackerTube.";
 if(kind==='home'){title='HackerTube: HN Video Archive, Inspired by Andrej Karpathy';description='Explore videos shared on Hacker News, with topics, playlists and original comments. An independent recreation of Andrej Karpathy’s original HackerTube project.';h1='Videos shared on Hacker News';}
 else if(kind==='about'){title='About HackerTube: Andrej Karpathy, Credits & Purpose';description='Learn how this independent HackerTube recreation builds on Andrej Karpathy’s original project. Read the source credits, future plans and independence disclaimer.';h1='About HackerTube and Andrej Karpathy’s original project';image=ORIGIN+'/og/about.png';}
 else if(kind==='watch'){
  // Preserve the original title and uploader rather than erase authorship to meet a character target.
  title=doc.title+' | '+doc.channel+' | HackerTube';h1=doc.title;
  description=excerpt(`${doc.channel}: ${doc.summary}`,155);image=`https://i.ytimg.com/vi/${doc.vid}/hq2.jpg`;imageAlt=`Video frame from ${doc.title}`;type='video.other';
 }else if(kind==='category'||kind==='area'){
  title=`${name} Videos & HN Discussions | HackerTube`;
  description=excerpt(`Explore ${name.toLowerCase()} videos with original Hacker News comments and source channels. ${credit}`,160);
 }else if(kind==='playlist'){
  title=`${name}: Curated Video Playlist | HackerTube`;
  description=excerpt(`${name}: ${doc.pitch} ${credit}`,160);
 }else if(kind==='categories'){title='Video Topics & Categories from Hacker News | HackerTube';description='Browse 150 video topics across 16 areas, from software to science and culture, with source discussions. Based on Andrej Karpathy’s original HackerTube project.';h1='Categories';}
 else if(kind==='playlists'){title='Curated Hacker News Video Playlists | HackerTube';description='Explore 27 video playlists, from programming talks to science and history, with viewing notes. From the collection behind Andrej Karpathy’s original HackerTube.';h1='Playlists';}
 else if(kind==='browse'){title='Browse All Videos Shared on Hacker News | HackerTube';description='Browse the video archive with source channels and Hacker News discussions. Find talks and lectures from the collection behind Andrej Karpathy’s HackerTube.';h1='All videos';}
 else if(kind==='data'){title='HackerTube Data, Sources & Attribution | Andrej Karpathy';description='Explore the source data behind this HackerTube recreation: videos, labeled HN comments and categories, with credits to Andrej Karpathy and the original project.';h1='The data';}
 else {title=`${h1} | HackerTube`;description=`${h1} on this independent HackerTube recreation.`;noindex=true;}
 if(page>1){title+=` — Page ${page}`;description=excerpt(`Page ${page} of ${totalPages}: ${description}`,160);h1+=` — Page ${page}`;}
 const pageNode={'@type':kind==='about'?'AboutPage':(['watch','home'].includes(kind)?'WebPage':'CollectionPage'),'@id':canonical+'#webpage',url:canonical,name:title,description,inLanguage:'en',isPartOf:{'@id':ORIGIN+'/#website'},isBasedOn:'https://hackertube.org/'};
 const graph=[{'@type':'WebSite','@id':ORIGIN+'/#website',url:ORIGIN+'/',name:'HackerTube',description:'Independent recreation of the original HackerTube project initiated by Andrej Karpathy.',inLanguage:'en',isBasedOn:'https://hackertube.org/'},pageNode];
 if(kind==='watch'){
  const video={'@type':'VideoObject','@id':canonical+'#video',name:doc.title,description:doc.summary,thumbnailUrl:[image],embedUrl:`https://www.youtube-nocookie.com/embed/${doc.vid}`,mainEntityOfPage:{'@id':canonical+'#webpage'}};
  if(doc.published)video.uploadDate=doc.published;
  if(doc.duration_s)video.duration=`PT${doc.duration_s}S`;
  // A channel is not always a person or an organization; creditText avoids inventing its legal entity type.
  video.creditText=`YouTube channel: ${doc.channel}`;graph.push(video);pageNode.mainEntity={'@id':video['@id']};
 }
 if(items.length&&kind!=='watch')graph.push({'@type':'ItemList','@id':canonical+'#list',itemListElement:items.map((d,i)=>({'@type':'ListItem',position:(page-1)*36+i+1,name:d.title||d.name,url:ORIGIN+(d.vid?'/watch/'+d.vid:d.path)}))});
 return {title,description,h1,canonical,image,imageAlt,type,robots:noindex?'noindex,follow':'index,follow,max-image-preview:large,max-video-preview:-1',graph,kind,page,totalPages};
}
export function metadataHTML(m){return `<title>${esc(m.title)}</title><meta name="description" content="${esc(m.description)}"><link rel="canonical" href="${esc(m.canonical)}"><meta name="robots" content="${m.robots}"><meta property="og:site_name" content="HackerTube"><meta property="og:type" content="${m.type}"><meta property="og:title" content="${esc(m.title)}"><meta property="og:description" content="${esc(m.description)}"><meta property="og:url" content="${esc(m.canonical)}"><meta property="og:image" content="${m.image}"><meta property="og:image:alt" content="${esc(m.imageAlt)}"><meta property="og:locale" content="en_US"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(m.title)}"><meta name="twitter:description" content="${esc(m.description)}"><meta name="twitter:image" content="${m.image}"><script type="application/ld+json">${jsonScript({'@context':'https://schema.org','@graph':m.graph})}</script>`;}
