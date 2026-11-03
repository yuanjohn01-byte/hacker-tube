import {readFile,writeFile as write} from 'node:fs/promises';
// Preserve output bytes and mtimes when a content page has not changed.
export async function writeFile(file,data,options) {
 const next=Buffer.isBuffer(data)?data:Buffer.from(data);
 try {if((await readFile(file)).equals(next))return false;} catch(e){if(e.code!=='ENOENT')throw e;}
 await write(file,data,options);return true;
}
