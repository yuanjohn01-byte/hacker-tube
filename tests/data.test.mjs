import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {filterVideos,sortVideos,searchVideos,feedVideos} from '../src/catalog.js';
const read=async name=>JSON.parse(await readFile(new URL('../public/data/'+name+'.json',import.meta.url),'utf8'));
const videos=await read('videos');const ids=new Set(videos.map(d=>d.vid));
test('complete import and valid cross-file joins',async()=>{
  assert.equal(videos.length,6454);assert.equal(ids.size,6454);
  const areas=await read('browse');assert.equal(areas.length,16);assert.equal(areas.flatMap(a=>a.categories).length,150);
  const playlists=await read('playlist-details');assert.equal(Object.keys(playlists).length,27);
  for(const p of Object.values(playlists))for(const d of p.videos)assert.ok(ids.has(d.vid));
  let count=0;
  for(const f of await readdir(new URL('../public/data/comments',import.meta.url))){const cs=await read('comments/'+f.replace('.json',''));count+=cs.length;for(const c of cs)assert.ok(ids.has(c.vid)&&c.ym&&c.id);}
  assert.equal(count,39834);
});
test('filters combine and missing duration cannot pass',()=>{
 const p=new URLSearchParams('dur=xlong&type=talk&evergreen=1');const r=filterVideos(videos,p);
 assert.ok(r.length>0);assert.ok(r.every(d=>d.duration_s>3600&&d.content_type==='talk'&&d.shelf_life!=='news'));
 assert.equal(filterVideos([{...videos[0],duration_s:null}],new URLSearchParams('dur=short')).length,0);
});
test('search finds titles/topics and has an honest empty state',()=>{
 assert.ok(searchVideos(videos,'linear algebra').some(d=>d.vid==='fNk_zzaMoSs'));
 assert.equal(searchVideos(videos,'zzzznonexistent789').length,0);
});
test('feed stable within seed, excludes history/dislikes; sort is monotonic',()=>{
 const p=new URLSearchParams({seed:'12',seen:videos[0].vid,dislike:videos[1].vid});
 const a=feedVideos(videos,p);assert.deepEqual(a.map(d=>d.vid),feedVideos(videos,p).map(d=>d.vid));
 assert.ok(!a.some(d=>d.vid===videos[0].vid||d.vid===videos[1].vid));
 const ranked=sortVideos(videos,'hn');assert.ok(ranked.every((d,i)=>!i||ranked[i-1].score>=d.score));
});
