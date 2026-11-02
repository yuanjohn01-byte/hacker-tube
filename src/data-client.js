import { filterVideos, sortVideos, searchVideos, feedVideos } from './catalog.js';
export const initialPage = (() => { try { return JSON.parse(document.getElementById('page-data')?.textContent || 'null'); } catch { return null; } })();
const cache = new Map();
async function json(name) {
  if (!cache.has(name)) cache.set(name, fetch(`/data/${name}.json`).then(r => { if(!r.ok) throw new Error('Data unavailable'); return r.json(); }).catch(e=>{cache.delete(name);throw e;}));
  return cache.get(name);
}
export async function api(path) {
  const url = new URL(path, 'http://local'); const p = url.searchParams;
  if(url.pathname === '/api/home') {
    const offset = Number(p.get('offset') || 0);
    if (offset === 0 && initialPage?.path === '/' && initialPage.items?.length) return initialPage.items;
    if (!initialPage) return sortVideos((await json('videos')).filter(d=>d.shelf_life!=='news')).slice(offset,offset+36);
    return json('home/' + (Math.floor(offset / 36) + 1));
  }
  if(url.pathname === '/api/config') return {frames_source:'youtube'};
  if(url.pathname === '/api/browse') return json('browse');
  if(url.pathname === '/api/playlists') return json('playlists');
  if(url.pathname === '/api/playlist') {const d=(await json('playlist-details'))[p.get('slug')];if(!d)throw new Error('Not found');return d;}
  if (initialPage?.path === '/watch/'+p.get('vid')) {
    if(url.pathname === '/api/video' && initialPage.video) return {video:initialPage.video,comments:initialPage.comments || await json('comments/'+p.get('vid'))};
    if(url.pathname === '/api/related' && initialPage.related) return initialPage.related;
  }
  const hasFilters=['era','date','type','dur','gems','evergreen','sort'].some(k=>p.get(k));
  if(initialPage?.items?.length && !hasFilters) {
    const start=(initialPage.page-1)*36;
    const expected=initialPage.path.startsWith('/c/')?p.get('cat')===initialPage.path.slice(3):initialPage.path.startsWith('/a/')?p.get('area')===initialPage.path.slice(3):initialPage.path==='/browse'&&!p.get('cat')&&!p.get('area');
    if(url.pathname==='/api/list' && expected && Number(p.get('offset')||0)===start) return initialPage.items;
    if(url.pathname==='/api/feed' && initialPage.path==='/' && Number(p.get('offset')||0)===0) return initialPage.items;
  }
  const videos = await json('videos'); const index = new Map(videos.map(d=>[d.vid,d]));
  const page = list => list.slice(Number(p.get('offset')||0),Number(p.get('offset')||0)+Math.min(100,Number(p.get('n')||36)));
  switch(url.pathname) {
    case '/api/list': return page(sortVideos(filterVideos(videos,p),p.get('sort')));
    case '/api/feed': return page(feedVideos(videos,p));
    case '/api/docs': return (p.get('vids')||'').split(',').map(id=>index.get(id)).filter(Boolean);
    case '/api/video': {
      const video=index.get(p.get('vid'));if(!video)throw new Error('Not found');
      const comments=await json(`comments/${video.vid}`);return {video,comments};
    }
    case '/api/search': {
      let results=searchVideos(filterVideos(videos,p),p.get('q')||'');
      if(p.get('sort'))results=sortVideos(results,p.get('sort'));
      return {results:results.slice(0,100),weak:results.length===0};
    }
    case '/api/related': {
      const d=index.get(p.get('vid'));if(!d)return [];
      const graph=(await json('related'))[d.vid]||[];
      const candidates=graph.map(x=>index.get(x.vid)).filter(Boolean);
      const ids=new Set([d.vid,...candidates.map(x=>x.vid)]);
      const cats=new Set(d.categories.map(c=>c.id));
      candidates.push(...sortVideos(videos.filter(x=>!ids.has(x.vid)&&x.categories.some(c=>cats.has(c.id)))));
      return candidates.slice(0,Number(p.get('n')||20));
    }
    default: throw new Error('Unknown local endpoint');
  }
}
