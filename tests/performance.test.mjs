import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sortVideos} from '../src/catalog.js';
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
const html=await readFile(new URL('../dist/client/index.html',import.meta.url),'utf8');
const initial=JSON.parse(html.match(/<script id="page-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
test('home pagination preserves SSR order without gaps or duplicates',async()=>{
 const expected=sortVideos((await read('public/data/videos.json')).filter(d=>d.shelf_life!=='news'));
 const actual=[];
 for(let n=1;n<=Math.ceil(expected.length/36)+1;n++)actual.push(...await read(`dist/client/data/home/${n}.json`));
 assert.deepEqual(actual.map(d=>d.vid),expected.map(d=>d.vid));
 assert.deepEqual(initial.items.map(d=>d.vid),actual.slice(0,36).map(d=>d.vid));
 assert.match(html,/<img loading="eager" fetchpriority="high"/);
 assert.match(html,/<h2 class="vt">/);
 assert.ok(!html.includes('rel="stylesheet"'));
 assert.ok(!initial.items.some(d=>'summary' in d));
 for(const d of actual) assert.ok(d.title && d.channel && d.hn && Number.isFinite(d.hn.recommenders));
});
test('home API uses embedded first page and small static continuation, never full catalog',async()=>{
 const calls=[];
 globalThis.document={getElementById:()=>({textContent:JSON.stringify(initial)})};
 globalThis.fetch=async url=>{calls.push(url);return {ok:true,json:()=>read('dist/client'+url)};};
 try {
  const {api}=await import('../src/data-client.js');
  assert.deepEqual(await api('/api/home?offset=0&n=36'),initial.items);
  assert.equal(calls.length,0);
  const second=await api('/api/home?offset=36&n=36');
  assert.equal(second.length,36);
  assert.deepEqual(calls,['/data/home/2.json']);
  assert.ok(!second.some(d=>initial.items.some(first=>first.vid===d.vid)));
 } finally {delete globalThis.document;delete globalThis.fetch;}
});
