import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {signal,sourcePage,examples,typeChips} from '../src/sources.js';
import {filterVideos,sortVideos} from '../src/catalog.js';
test('real HN signals preserve zero recommendations and same-year spans',()=>{
 assert.equal(signal({hn:{recommenders:0,first_year:2021,last_year:2021}}),'Picked by 0 · 2021');
 assert.equal(signal({hn:{recommenders:14,first_year:2021,last_year:2026}}),'Picked by 14 · 2021–2026');
 assert.match(signal({}),/evidence not collected/);
});
test('examples cannot masquerade as verified community recommendations',()=>{
 assert.ok(examples.every(d=>!d.hn));
 assert.match(sourcePage('books'),/not verified HN picks/);
 assert.match(typeChips('books','/later'),/\/later\?source=books/);
});
test('first recommendation era and durability are independent of upload date',()=>{
 const rows=[{vid:'a',score:2,hn:{first_year:2012,rec_months:15},published:'2024-01-01'},{vid:'b',score:3,hn:{first_year:2022,rec_months:2},published:'2010-01-01'}];
 assert.deepEqual(filterVideos(rows,new URLSearchParams('era=2010s')).map(d=>d.vid),['a']);
 assert.deepEqual(sortVideos(rows,'durable').map(d=>d.vid),['a','b']);
});
test('generated primary pages retain metadata and original favicon',async()=>{
 for(const path of ['index','about','categories','books']){
  const html=await readFile(new URL('../dist/client/'+path+'.html',import.meta.url),'utf8');
  assert.equal((html.match(/<h1\b/g)||[]).length,1);
  assert.match(html,/<link rel="canonical"/);assert.match(html,/<meta property="og:image"/);
  assert.match(html,/href="\/favicon.svg"/);assert.ok(!html.includes('src="/logo.png"'));
 }
});
