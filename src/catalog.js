// Pure catalog operations; all input records come from the attributed local snapshot.
export function filterVideos(videos, params, now = Date.now()) {
  const get = k => params.get(k);
  return videos.filter(d => {
    if (get('cat') && !d.categories.some(c => c.id === get('cat'))) return false;
    if (get('area') && !d.categories.some(c => c.area === get('area'))) return false;
    if (get('type') && d.content_type !== get('type')) return false;
    if (get('evergreen') && d.shelf_life === 'news') return false;
    if (get('gems') && !(d.views != null && d.views < 100000 && d.hn.recommenders > 0)) return false;
    const era=get('era'), first=d.hn.first_year??d.hn.first;
    if(era && !(first>=Number(era.slice(0,4))&&first<Number(era.slice(0,4))+10))return false;
    const t = d.duration_s;
    if (get('dur') && (!t || !({short:t<240,medium:t>=240&&t<1200,long:t>=1200&&t<=3600,xlong:t>3600}[get('dur')]))) return false;
    const date = get('date'), year = Number(d.published?.slice(0,4));
    if (date === 'year' && !(Date.parse(d.published) >= now - 365.25*86400000)) return false;
    if (['2020s','2010s','2000s'].includes(date) && !(year >= Number(date.slice(0,4)) && year < Number(date.slice(0,4))+10)) return false;
    return true;
  });
}
export function sortVideos(videos, sort = '') {
  const value = d => ({durable:d.hn.rec_months||0,recent:Date.parse(d.hn.last_rec)||0,date:Date.parse(d.published)||0,old:-(Date.parse(d.published)||0),views:d.views||0,liked:(d.likes||0)/Math.max(1,d.views||0),hn:d.score}[sort] ?? d.score);
  return [...videos].sort((a,b) => value(b)-value(a) || b.score-a.score || a.vid.localeCompare(b.vid));
}
export function searchVideos(videos, query) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return videos.map(d => {
    const title = (d.title+' '+d.channel).toLowerCase();
    const topics = [...d.tags,d.primary_topic,...d.categories.map(c=>c.name)].join(' ').toLowerCase();
    const prose = (d.summary+' '+d.why_hn).toLowerCase();
    let points = 0;
    for (const term of terms) {
      const p = title.includes(term)?8:topics.includes(term)?5:prose.includes(term)?1:0;
      if (!p) return null;
      points += p;
    }
    return {d,points};
  }).filter(Boolean).sort((a,b)=>b.points-a.points||b.d.score-a.d.score).map(x=>x.d);
}
function hash(str) { let h=2166136261; for(const ch of str) h=Math.imul(h^ch.charCodeAt(0),16777619); return (h>>>0)/4294967296; }
export function feedVideos(videos, params) {
  const excluded = new Set([params.get('dislike'),params.get('seen')].filter(Boolean).join(',').split(','));
  const liked = new Set((params.get('like')||'').split(','));
  const topics = new Set(videos.filter(d=>liked.has(d.vid)).flatMap(d=>d.categories.map(c=>c.id)));
  return videos.filter(d=>!excluded.has(d.vid)&&d.shelf_life!=='news').map(d=>({d,
    value:hash((params.get('seed')||'')+d.vid)*4 + Math.log1p(d.score)*0.9 + (d.categories.some(c=>topics.has(c.id))?1.2:0)
  })).sort((a,b)=>b.value-a.value).map(({d})=>d);
}
