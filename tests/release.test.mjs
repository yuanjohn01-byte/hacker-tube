import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {splitPage,assemblePage} from '../scripts/prepare-cloudflare-build.mjs';
import {writeFile} from '../scripts/write-if-changed.mjs';
const runtime=JSON.parse(await readFile(new URL('../cloudflare/runtime.generated.json',import.meta.url)));
const routes=JSON.parse(await readFile(new URL('../cloudflare/routes.generated.json',import.meta.url)));
test('all content templates reassemble to exact preview HTML and ignore shared releases',async()=>{
 let count=0;
 const next={...runtime,inlineStyles:runtime.inlineStyles.replace('</style>','/* next release */</style>'),styles:runtime.styles.replace('.css','-next.css'),entry:runtime.entry.replace('.js','-next.js'),before:runtime.before.replace('Hacker<b>Tube','Hacker<b>Tube (test)')};
 for(const r of Object.values(routes))for(let n=1;n<=r.pages;n++){
  const file=(n===1?r.file:r.file.replace(/\.html$/,'--page-'+n+'.html')).slice(1);
  const full=await readFile(new URL('../dist/client/'+file,import.meta.url),'utf8');
  const partial=await readFile(new URL('../dist/cloudflare/'+file,import.meta.url),'utf8');
  assert.equal(assemblePage(partial,runtime),full,file);
  assert.equal(splitPage(assemblePage(partial,next),next),partial,file);
  assert.ok(!partial.includes(runtime.entry),file);count++;
 }
 assert.ok(count>7000);
});
test('unchanged content preserves mtime and changed content is written',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'ht-incremental-'));const file=path.join(dir,'page.html');
 try{assert.equal(await writeFile(file,'first'),true);const before=await stat(file);assert.equal(await writeFile(file,'first'),false);assert.equal((await stat(file)).mtimeMs,before.mtimeMs);assert.equal(await writeFile(file,'second'),true);assert.equal(await readFile(file,'utf8'),'second');}finally{await rm(dir,{recursive:true});}
});
