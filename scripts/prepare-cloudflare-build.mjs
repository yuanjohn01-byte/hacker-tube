import {readFile,mkdir,readdir,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {writeFile} from './write-if-changed.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const client=path.join(root,'dist/client'),out=path.join(root,'dist/cloudflare');
const hash=data=>createHash('sha256').update(data).digest('hex');
export function splitPage(html,runtime){
 const styles=html.includes(runtime.inlineStyles)?runtime.inlineStyles:runtime.styles;
 for(const part of [styles,runtime.entry,runtime.before])if(!part||!html.includes(part))throw new Error('Missing shared HTML fragment');
 return html.replace(styles,`<template data-site-styles="${styles===runtime.inlineStyles?'inline':'link'}"></template>`)
  .replace(runtime.entry,'<template data-site-entry></template>')
  .replace(runtime.before,'<template data-site-before></template>')
  .replace('</main>'+runtime.after,'</main><template data-site-after></template>');
}
export function assemblePage(html,runtime){
 return html.replace('<template data-site-styles="inline"></template>',runtime.inlineStyles)
  .replace('<template data-site-styles="link"></template>',runtime.styles)
  .replace('<template data-site-entry></template>',runtime.entry)
  .replace('<template data-site-before></template>',runtime.before)
  .replace('<template data-site-after></template>',runtime.after);
}
export async function prepare(){
 const routes=JSON.parse(await readFile(path.join(root,'cloudflare/routes.generated.json')));
 const manifest=JSON.parse(await readFile(path.join(client,'.vite/manifest.json')));
 const entry=Object.values(manifest).find(x=>x.isEntry);
 const styles=`<link rel="stylesheet" crossorigin href="/${entry.css[0]}">`;
 const home=await readFile(path.join(client,'index.html'),'utf8');
 const script=home.match(/<script type="module"[^>]*><\/script>/)[0];
 const [before,after]= (await readFile(path.join(root,'src/shell.html'),'utf8')).split('<main id="view"></main>');
 if(after===undefined)throw new Error('Shell must have a single view placeholder');
 const runtime={styles,inlineStyles:'<style>'+await readFile(path.join(client,entry.css[0]),'utf8')+'</style>',entry:script+'<script defer src="/analytics.js"></script>',before,after};
 runtime.version=hash(JSON.stringify(runtime));
 await writeFile(path.join(root,'cloudflare/runtime.generated.json'),JSON.stringify(runtime));
 const htmlFiles=new Set();for(const r of Object.values(routes))for(let n=1;n<=r.pages;n++)htmlFiles.add((n===1?r.file:r.file.replace(/\.html$/,'--page-'+n+'.html')).slice(1));
 const assets=new Set(Object.values(manifest).flatMap(x=>[x.file,...x.css||[],...x.assets||[]]));
 const publicFiles=new Set();
 async function publicInventory(dir=''){for(const e of await readdir(path.join(root,'public',dir),{withFileTypes:true})){const f=path.posix.join(dir,e.name);if(e.isDirectory())await publicInventory(f);else publicFiles.add(f);}}await publicInventory();
 const next={};let changed=0,unchanged=0;
 async function emit(file,data){next[file]=hash(data);await mkdir(path.dirname(path.join(out,file)),{recursive:true});if(await writeFile(path.join(out,file),data))changed++;else unchanged++;}
 for(const file of htmlFiles){const full=await readFile(path.join(client,file),'utf8');const partial=splitPage(full,runtime);if(assemblePage(partial,runtime)!==full)throw new Error('Non-lossless page split: '+file);await emit(file,partial);}
 const homeCount=Math.ceil(JSON.parse(await readFile(path.join(root,'public/data/videos.json'))).filter(x=>x.shelf_life!=='news').length/36)+1;
 const ogFiles=new Set(['site.png','about.png',...JSON.parse(await readFile(path.join(root,'seo/og-pages.json'))).map(x=>x.file)]);
 async function walk(dir=''){for(const e of await readdir(path.join(client,dir),{withFileTypes:true})){const file=path.posix.join(dir,e.name);if(e.isDirectory()){if(e.name!=='.vite')await walk(file);continue;}
  if(file.endsWith('.html'))continue;
  if(file.startsWith('assets/')&&!assets.has(file))continue;
  if(file.startsWith('data/home/')&&Number(e.name.replace('.json',''))>homeCount)continue;
  if(file.startsWith('og/')&&!ogFiles.has(e.name))continue;
  if(!publicFiles.has(file)&&!assets.has(file)&&!file.startsWith('data/home/')&&!file.startsWith('og/')&&!['sitemap.xml','video-sitemap.xml'].includes(file))continue;
  await emit(file,await readFile(path.join(client,file)));
 }}await walk();
 // Remove obsolete assets, pages and data shards from the next deployment.
 async function prune(dir=''){for(const e of await readdir(path.join(out,dir),{withFileTypes:true})){const f=path.posix.join(dir,e.name);if(e.isDirectory())await prune(f);else if(!next[f])await rm(path.join(out,f));}}await prune();
 // Vite retains the directory for incremental writes; remove artifacts no longer owned by this build.
 async function pruneClient(dir=''){for(const e of await readdir(path.join(client,dir),{withFileTypes:true})){const f=path.posix.join(dir,e.name);if(e.name==='.vite')continue;if(e.isDirectory())await pruneClient(f);else if(!next[f])await rm(path.join(client,f));}}await pruneClient();
 await mkdir(path.join(root,'.build-cache'),{recursive:true});
 await writeFile(path.join(root,'.build-cache/cloudflare-manifest.json'),JSON.stringify(next));
 console.log(`Cloudflare package: ${changed} changed, ${unchanged} unchanged files; ${htmlFiles.size} independent content pages.`);
 return {changed,unchanged,pages:htmlFiles.size};
}
if(process.argv[1]===fileURLToPath(import.meta.url))await prepare();
