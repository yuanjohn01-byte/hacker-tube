import routes from './routes.generated.json';
const ORIGIN='https://hacker-tube.org';
const FILTERS=['source','item','cat','era','date','type','dur','gems','evergreen','sort'];
function responseHeaders(response,robots){const h=new Headers(response.headers);h.set('X-Content-Type-Options','nosniff');h.set('Referrer-Policy','strict-origin-when-cross-origin');if(robots)h.set('X-Robots-Tag',robots);return h;}
export default {async fetch(request,env){
 const u=new URL(request.url);
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
 let pathname;
 try{if(/%2f|%5c/i.test(u.pathname))throw 0;pathname=decodeURIComponent(u.pathname);}catch{return errorPage(request,env);}
 pathname=pathname.replace(/\/{2,}/g,'/').replace(/\/$/,'')||'/';
 if(pathname.endsWith('.html'))pathname=pathname.slice(0,-5)||'/';
 const segments=pathname.split('/');segments[1]=(segments[1]||'').toLowerCase();
 if(['a','c','p'].includes(segments[1]))segments[2]=segments[2]?.toLowerCase();
 pathname=segments.join('/')||'/';
 const canonicalPath=pathname.split('/').map(encodeURIComponent).join('/');
 // One hop for scheme, hostname, path case and trailing slash. Preserve the query during host normalization.
 if(u.origin!==ORIGIN||u.pathname!==canonicalPath)return Response.redirect(ORIGIN+canonicalPath+u.search,308);
 const isSearch=pathname.startsWith('/search/')||pathname==='/search';
 const source=u.searchParams.get('source');
 const entry=routes[isSearch?'/search':pathname==='/'&&['books','github','papers','podcasts'].includes(source)?'/'+source:pathname];
 if(!entry||pathname==='/404')return errorPage(request,env);
 let page=1;
 if(u.searchParams.has('page')){
  const raw=u.searchParams.get('page');if(!/^[1-9]\d*$/.test(raw))return errorPage(request,env);page=Number(raw);
  if(page===1){u.searchParams.delete('page');return Response.redirect(ORIGIN+pathname+(u.searchParams.size?'?'+u.searchParams:''),308);}
  if(page>entry.pages)return errorPage(request,env);
 }
 const filtered=FILTERS.some(k=>u.searchParams.has(k));
 const allowed=new URLSearchParams();for(const k of [...FILTERS,'page'].sort())if(u.searchParams.get(k))allowed.set(k,u.searchParams.get(k));
 const canonical=ORIGIN+canonicalPath+(allowed.size?'?'+allowed:'');
 const file=page>1?entry.file.replace(/\.html$/,'--page-'+page+'.html'):entry.file;
 const target=new URL(file,ORIGIN);
 const asset=await env.ASSETS.fetch(new Request(target,{method:request.method,headers:request.headers}));
 if(asset.status!==200)return errorPage(request,env);
 const noindex=filtered||isSearch||!entry.indexable;
 let response=new Response(asset.body,{status:200,headers:responseHeaders(asset,noindex?'noindex, follow':undefined)});
 response=new HTMLRewriter()
  .on('link[rel="canonical"]',{element(e){e.setAttribute('href',canonical);}})
  .on('meta[property="og:url"]',{element(e){e.setAttribute('content',canonical);}})
  .on('meta[name="robots"]',{element(e){if(noindex)e.setAttribute('content','noindex,follow');}})
  .on('script[type="application/ld+json"]',{element(e){if(noindex)e.remove();}})
  .transform(response);
 return response;
}};
async function errorPage(request,env){
 const asset=await env.ASSETS.fetch(new Request(new URL('/404.html',ORIGIN),{method:request.method}));
 return new Response(asset.body,{status:404,headers:responseHeaders(asset,'noindex, follow')});
}
