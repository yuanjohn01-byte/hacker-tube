import {sortVideos} from '../src/catalog.js';
import {typeChips,signal,sourcePage} from '../src/sources.js';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {aboutHTML} from '../src/seo/about.js';
import {pageMeta,metadataHTML,esc,jsonScript,ORIGIN} from '../src/seo/meta.js';
const root=fileURLToPath(new URL('../',import.meta.url)),dist=path.join(root,'dist/client');
const read=async f=>JSON.parse(await readFile(path.join(root,'public/data',f+'.json'),'utf8'));
const videos=await read('videos'),areas=await read('browse'),playlists=await read('playlists'),details=await read('playlist-details');
const byId=new Map(videos.map(d=>[d.vid,d]));
const base=await readFile(path.join(dist,'index.html'),'utf8');
const shell=await readFile(path.join(root,'src/shell.html'),'utf8');
const script=(base.match(/<script type="module"[^>]*><\/script>/)||[''])[0],css=(base.match(/<link rel="stylesheet"[^>]*>/)||[''])[0];
const inlineCSS='<style>'+await readFile(path.join(dist,css.match(/href="([^"]+)/)[1]),'utf8')+'</style>';
const cardData=d=>({vid:d.vid,title:d.title,channel:d.channel,duration_s:d.duration_s,hn:{recommenders:d.hn.recommenders,first_year:d.hn.first_year??d.hn.first,last_year:d.hn.last_year??d.hn.last}});
const ui=await readFile(path.join(root,'src/hackertube-ui.js'),'utf8');
const icon=(key)=>ui.match(new RegExp(`const ${key} = '([^']+)';`))?.[1]||'';
const clock=icon('CLOCK');
const duration=s=>s?`${s>=3600?Math.floor(s/3600)+':':''}${s>=3600?String(Math.floor(s%3600/60)).padStart(2,'0'):Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`:'';
const views=n=>n==null?'':n>=1e6?(n/1e6).toFixed(1).replace(/\.0$/,'')+'M views':n>=1e3?Math.round(n/1e3)+'K views':n+' views';
const img=d=>`https://i.ytimg.com/vi/${d.vid}/hq2.jpg`;
const thumb=(d,hero=false)=>`<div class="thumb"><img ${hero?'loading="eager" fetchpriority="high"':'loading="lazy"'} src="${img(d)}" width="480" height="360" data-vid="${d.vid}" alt="${esc('Video frame: '+d.title)}"><span class="later-btn" role="button" tabindex="0" data-later="${d.vid}" aria-label="Saved" title="Saved">${clock}</span><span class="dur">${duration(d.duration_s)}</span></div>`;
const card=(d,i=1)=>`<a class="vcard" href="/watch/${d.vid}">${thumb(d,i===0)}<div class="info"><div style="min-width:0"><h2 class="vt">${esc(d.title)}</h2><div class="sub">${esc(d.channel)}</div><div class="sub">${signal(d)}</div></div></div></a>`;
const row=(d,i)=>`<a class="srow" href="/watch/${d.vid}">${thumb(d)}<div style="min-width:0"><h2 class="vt">${esc(d.title)}</h2><div class="sub">${esc(d.channel)} · ${signal(d)}</div>${d.note?`<p class="plnote">${esc(d.note)}</p>`:''}</div></a>`;
const hours=m=>m>=60?`${Math.floor(m/60)} hr ${m%60} min`:`${m} min`;
const mosaic=p=>`<div class="mosaic">${p.cover.map(v=>`<img loading="lazy" width="480" height="360" src="https://i.ytimg.com/vi/${v}/hq2.jpg" data-vid="${v}" alt="${esc(byId.get(v)?.title||'Playlist video frame')}">`).join('')}<span class="plcount">${p.count} videos · ${hours(p.minutes)}</span></div>`;
const heading=s=>`<div class="pagehead"><h1>${esc(s)}</h1></div>`;
const crumb=(name,url)=>`<a class="crumb" href="${url}">${esc(name)}</a>`;
const filterIcon=ui.match(/<svg viewBox="0 0 24 24"><path d="M15 17[\s\S]*?<\/svg>/)?.[0]||'';
const filterbar=`<div class="filterbar"><button class="pill" id="filters-btn" aria-expanded="false">${filterIcon} Filters</button></div>`;
const routes={},metrics=[],ogPages=[];let count=0;
const categoryLists=new Map(),areaLists=new Map();
for(const d of videos){for(const c of d.categories){if(!categoryLists.has(c.id))categoryLists.set(c.id,[]);categoryLists.get(c.id).push(d);}for(const a of new Set(d.categories.map(c=>c.area))){if(!areaLists.has(a))areaLists.set(a,[]);areaLists.get(a).push(d);}}
function paging(p,n,total){if(total<=1)return '';return `<nav class="pagination" aria-label="Video pages">${n>1?`<a class="pill" rel="prev" href="${p}${n>2?'?page='+(n-1):''}">Previous page</a>`:''}<span class="sub">Page ${n} of ${total}</span>${n<total?`<a class="pill" rel="next" href="${p}?page=${n+1}">Next page</a>`:''}</nav>`;}
async function emit(p,kind,name,content,{doc,items=[],page=1,totalPages=1,noindex=false,hero,bootstrap={},breadcrumbs=[]}={}){
 const meta=pageMeta({path:p,kind,name,doc,items,page,totalPages,noindex});
 if(kind==='category'||kind==='area'||kind==='playlist'){meta.image=ORIGIN+'/og/'+p.slice(1).replaceAll('/','-')+'.png';meta.imageAlt=name+' — HackerTube';if(page===1)ogPages.push({file:p.slice(1).replaceAll('/','-')+'.png',title:name,subtitle:kind==='playlist'?'A curated viewing path':'Videos shared on Hacker News'});}
 if(breadcrumbs.length){meta.graph.push({'@type':'BreadcrumbList',itemListElement:breadcrumbs.map(([name,url],i)=>({'@type':'ListItem',position:i+1,name,item:ORIGIN+url}))});}
 const isListing=['home','browse','category','area'].includes(kind);
 const payload={path:p,page,meta:isListing?{h1:meta.h1}:meta,items:items.filter(d=>d.vid).map(d=>isListing?cardData(d):d),totalPages,...bootstrap};
 const baseName=p==='/'?'index':p.slice(1),file=baseName+(page>1?'--page-'+page:'')+'.html';
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${metadataHTML(meta)}<link rel="preconnect" href="https://i.ytimg.com"><link rel="icon" href="/favicon.svg" type="image/svg+xml">${hero?`<link rel="preload" as="image" href="${hero}" fetchpriority="high">`:''}${isListing?inlineCSS:css}${script}<script defer src="/analytics.js"></script></head><body><div id="root"><div>${shell.replace('<main id="view"></main>',`<main id="view">${content}</main>`)}</div></div><script id="page-data" type="application/json">${jsonScript(payload)}</script></body></html>`;
 await mkdir(path.dirname(path.join(dist,file)),{recursive:true});await writeFile(path.join(dist,file),html);
 if(!routes[p])routes[p]={file:'/'+file,pages:totalPages,kind,indexable:!noindex};
 const words=content.replace(/<[^>]*>/g,' ').replace(/&[^;]+;/g,' ').match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)||[];
 const query=(kind==='watch'?doc.primary_topic:name||'HackerTube').toLowerCase();
 const plain=content.replace(/<[^>]*>/g,' ').toLowerCase();const occurrences=query?plain.split(query).length-1:0;
 metrics.push({url:meta.canonical,kind,indexable:!noindex,title:meta.title,titleLength:meta.title.length,description:meta.description,descriptionLength:meta.description.length,h1:(content.match(/<h1\b/g)||[]).length,words:words.length,keyword:query,density:words.length?+(occurrences/words.length*100).toFixed(2):0,file});count++;
}
async function listing(p,kind,name,list,lead=''){
 const total=Math.max(1,Math.ceil(list.length/36));
 for(let n=1;n<=total;n++){
  const items=list.slice((n-1)*36,n*36),title=name+(n>1?' — Page '+n:'');
  const content=lead+heading(title)+filterbar+`<div class="grid" id="grid">${items.map(card).join('')}</div>`+paging(p,n,total);
  const a=kind==='category'?areas.find(a=>a.categories.some(c=>c.id===p.split('/')[2])):null;
  const breadcrumbs=kind==='category'?[['Categories','/categories'],[a.name,'/a/'+a.id],[name,p]]:kind==='area'?[['Categories','/categories'],[name,p]]:[];
  await emit(p,kind,name,content,{items,page:n,totalPages:total,hero:items[0]?img(items[0]):null,breadcrumbs});
 }
}
const homeVideos=sortVideos(videos.filter(d=>d.shelf_life!=='news'));
await mkdir(path.join(dist,'data/home'),{recursive:true});
// Small static pages keep scrolling off the full catalog download as well.
for(let start=0;start<homeVideos.length+36;start+=36){
 await writeFile(path.join(dist,'data/home',String(start/36+1)+'.json'),JSON.stringify(homeVideos.slice(start,start+36).map(cardData)));
}
const homeItems=homeVideos.slice(0,36);
await emit('/','home','',`<h1 class="sr-only">Videos shared on Hacker News</h1>${typeChips('all')}${filterbar}<div class="grid" id="grid">${homeItems.map(card).join('')}</div><nav class="pagination"><a class="pill" href="/browse">Browse all videos</a></nav>`,{items:homeItems,hero:img(homeItems[0])});
await emit('/about','about','About',aboutHTML);
const catContent=heading('Categories')+`<div class="quick"><a class="pill" href="/browse?sort=recent">Recently recommended</a><a class="pill" href="/browse?dur=xlong">Longs</a><a class="pill" href="/browse?gems=1">Hidden gems</a><a class="pill" href="/browse">All videos</a></div><div class="areas">${areas.map(a=>`<section class="areacard"><a class="areaname" href="/a/${a.id}">${esc(a.name)}<span class="count">${a.count}</span></a><div class="cats">${a.categories.map(c=>`<a href="/c/${c.id}">${esc(c.name)}<span class="count">${c.count}</span></a>`).join('')}</div></section>`).join('')}</div>`;
await emit('/categories','categories','Categories',`<div class="explore">${catContent}</div>`,{items:areas.map(a=>({name:a.name,path:'/a/'+a.id}))});
for(const a of areas){await listing('/a/'+a.id,'area',a.name,areaLists.get(a.id)||[],crumb('Categories','/categories')+`<div class="catwrap">${a.categories.map(c=>`<a class="chip" href="/c/${c.id}">${esc(c.name)}</a>`).join('')}</div>`);for(const c of a.categories)await listing('/c/'+c.id,'category',c.name,categoryLists.get(c.id)||[],crumb(a.name,'/a/'+a.id));}
await listing('/browse','browse','All videos',videos);
await emit('/playlists','playlists','Playlists',`<div class="explore">${heading('Playlists')}<p class="sub">Curated by Claude from what Hacker News recommends, each in a deliberate order.</p>${[['start','Start here','Broad, essential lists for your first visit.'],['deep','Deep dives','One obsession each, for when you want to go down a rabbit hole.']].map(([tier,t,blurb])=>`<h2 class="sechead">${t}</h2><p class="sub">${blurb}</p><div class="pgrid">${playlists.filter(p=>(p.tier||'deep')===tier).map(p=>`<a class="plcard" href="/p/${p.slug}">${mosaic(p)}<h3 class="vt">${esc(p.title)}</h3><p class="sub">${esc(p.pitch)}</p></a>`).join('')}</div>`).join('')}</div>`,{items:playlists.map(p=>({name:p.title,path:'/p/'+p.slug}))});
for(const p of playlists){const d=details[p.slug];await emit('/p/'+p.slug,'playlist',p.title,`<div class="plpage"><div class="plhead">${mosaic(p)}<div class="plinfo">${crumb('Playlists','/playlists')}<h1>${esc(p.title)}</h1><div class="sub">Curated by Claude · ${p.count} videos · ${hours(p.minutes)}</div><p class="intro">${esc(d.intro)}</p><a class="pill" href="https://www.youtube.com/watch_videos?video_ids=${d.videos.map(v=>v.vid).join(',')}" target="_blank" rel="noopener">Play all on YouTube</a></div></div><ol class="plrows">${d.videos.map((v,i)=>`<li><span class="num">${i+1}</span>${row(v,i)}</li>`).join('')}</ol></div>`,{doc:p,items:d.videos,breadcrumbs:[['Playlists','/playlists'],[p.title,'/p/'+p.slug]]});}
const stance={strong_rec:'Strongly recommends',rec:'Recommends',reference:'Cites',joke:'Joke',critical:'Critical'};
for(const d of videos){const comments=await read('comments/'+d.vid);const related=videos.filter(v=>v.vid!==d.vid&&v.categories.some(c=>d.categories.some(x=>x.id===c.id))).slice(0,8);
 const content=`<div class="watch"><div class="primary"><div class="player"><button class="poster" aria-label="Play ${esc(d.title)}"><img src="${img(d)}" width="480" height="360" fetchpriority="high" alt="${esc('Video frame: '+d.title)}"><span class="play">${ui.match(/<span class="play">(<svg[\s\S]*?<\/svg>)/)?.[1]||''}</span></button><noscript><a href="https://www.youtube.com/watch?v=${d.vid}">Watch ${esc(d.title)} on YouTube</a></noscript></div><h1>${esc(d.title)}</h1><div class="owner"><div class="who"><div><b>${esc(d.channel)}</b><span class="sub">${d.hn.recommenders} HN recommenders · ${d.hn.first}–${d.hn.last}</span></div></div></div><div class="desc"><div class="top-line">${views(d.views)} · ${esc(d.content_type)} · ${esc(d.shelf_life)}${d.published?' · Uploaded '+d.published.slice(0,10):''}</div><p>${esc(d.summary)}</p><p class="why">${esc(d.why_hn)}</p><div class="tags">${d.categories.map(c=>`<a class="tag cat" href="/c/${c.id}">${esc(c.name)}</a>`).join('')}</div><p><a href="https://www.youtube.com/watch?v=${d.vid}">Watch on YouTube</a></p></div><div class="comments"><h2>${comments.length} comments from Hacker News</h2>${comments.map(m=>`<div class="cmt"><div class="body" style="min-width:0"><div class="meta"><b>@${esc(m.author)}</b>${m.ym.slice(0,4)} · in “${esc(m.story)}”</div><p>${esc(m.text)}</p><div class="foot"><span class="stance ${m.stance}">${stance[m.stance]}</span><a href="https://news.ycombinator.com/item?id=${m.id}" target="_blank" rel="noopener">View on HN</a></div></div></div>`).join('')}</div></div><div class="secondary">${related.map(v=>`<a class="next" href="/watch/${v.vid}">${thumb(v)}<div><h2 class="vt">${esc(v.title)}</h2><div class="sub">${esc(v.channel)}</div></div></a>`).join('')}</div></div>`;
 await emit('/watch/'+d.vid,'watch',d.title,content,{doc:d,hero:img(d),bootstrap:{video:d,related,comments}});
}
await emit('/data','data','The data',`<article class="about">${heading('The data')}<p>6,454 videos and 39,834 labeled Hacker News comments, from the October 31, 2026 export of the original HackerTube project initiated by <a href="https://x.com/karpathy">Andrej Karpathy</a>.</p><p>Credit: <a href="https://hackertube.org/data">HackerTube</a> and <a href="https://huggingface.co/datasets/open-index/hacker-news">open-index/hacker-news</a>, under <a href="https://opendatacommons.org/licenses/by/1-0/">ODC-By 1.0</a>.</p><p><a href="/DATA.md">Read the original data documentation</a> · <a href="/about#credits">Credits and disclaimer</a></p></article>`);
for(const [p,n]of [['settings','Settings'],['liked','Liked'],['history','History'],['later','Saved'],['books','Books'],['github','GitHub'],['papers','Papers'],['podcasts','Podcasts'],['search','Search videos']])await emit('/'+p,'utility',n,(['books','github','papers','podcasts'].includes(p)?sourcePage(p):heading(n)+`<div class="status">Loading…</div>`),{noindex:true});
await emit('/404','error','Page not found',heading('Page not found')+'<p>This page is not in the collection. <a href="/categories">Browse categories</a> or <a href="/">return home</a>.</p>',{noindex:true});
const urls=metrics.filter(m=>m.indexable);
const xml=urls.map(m=>`<url><loc>${esc(m.url)}</loc></url>`).join('');
await writeFile(path.join(dist,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${xml}</urlset>`);
await writeFile(path.join(dist,'video-sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">${videos.map(d=>`<url><loc>${ORIGIN}/watch/${d.vid}</loc><video:video><video:thumbnail_loc>${img(d)}</video:thumbnail_loc><video:title>${esc(d.title)}</video:title><video:description>${esc(d.summary)}</video:description><video:player_loc>${esc('https://www.youtube-nocookie.com/embed/'+d.vid)}</video:player_loc>${d.duration_s?`<video:duration>${d.duration_s}</video:duration>`:''}${d.published?`<video:publication_date>${d.published}</video:publication_date>`:''}</video:video></url>`).join('')}</urlset>`);
await writeFile(path.join(root,'cloudflare/routes.generated.json'),JSON.stringify(routes));
await writeFile(path.join(root,'seo/after-metrics.json'),JSON.stringify(metrics,null,2));
await writeFile(path.join(root,'seo/og-pages.json'),JSON.stringify(ogPages));
console.log(`Generated ${count} HTML pages, ${urls.length} indexable URLs, ${videos.length} video sitemap entries.`);
