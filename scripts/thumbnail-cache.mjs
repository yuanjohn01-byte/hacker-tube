import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
// Cache only video IDs in this local catalog. No user-controlled remote URLs.
export function thumbnailCache(root) {
  let ids;const pending=new Map();
  return {name:'local-video-thumbnails',configureServer(server) {
    server.middlewares.use(async(req,res,next)=>{
      const match=/^\/thumbs\/([\w-]{11})\/(hq2|hqdefault)\.jpg(?:\?.*)?$/.exec(req.url||'');
      if(!match)return next();
      const [,vid,kind]=match;
      try {
        ids ||= new Set(JSON.parse(await readFile(path.join(root,'public/data/videos.json'),'utf8')).map(d=>d.vid));
        if(!ids.has(vid)){res.statusCode=404;return res.end();}
        const file=path.join(root,'public/thumbs',vid,kind+'.jpg');
        let bytes;try{bytes=await readFile(file);}catch {
          if(!pending.has(file))pending.set(file,(async()=>{
            const r=await fetch(`https://i.ytimg.com/vi/${vid}/${kind}.jpg`,{signal:AbortSignal.timeout(12000)});
            if(!r.ok)throw new Error('Thumbnail unavailable');
            const b=Buffer.from(await r.arrayBuffer());await mkdir(path.dirname(file),{recursive:true});await writeFile(file,b);return b;
          })().finally(()=>pending.delete(file)));
          bytes=await pending.get(file);
        }
        res.setHeader('Content-Type','image/jpeg');res.setHeader('Cache-Control','public,max-age=86400');res.end(bytes);
      }catch{res.statusCode=404;res.end();}
    });
  }};
}
