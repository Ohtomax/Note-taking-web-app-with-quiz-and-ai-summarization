import {readFile,stat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..','client','dist');
const manifest=JSON.parse(await readFile(resolve(root,'.vite','manifest.json'),'utf8'));
const entry=Object.keys(manifest).find(key=>manifest[key].isEntry);
if(!entry)throw Error('Build client with npm run build -- --manifest first');
const collect=(key,seen=new Set())=>{
if(seen.has(key))return seen;
seen.add(key);
for(const dependency of manifest[key]?.imports??[])collect(dependency,seen);
return seen;
};
const assets=new Map();
for(const item of Object.values(manifest)){
if(!item.file.endsWith('.js'))continue;
const path=resolve(root,item.file);
if(!path.startsWith(root))throw Error('Invalid artifact path');
const bytes=await readFile(path);
assets.set(item.file,{file:item.file,bytes:(await stat(path)).size,gzipBytes:gzipSync(bytes).length});
}
const routes=[];
for(const name of ['Dashboard','NotePage','AnalyticsPage']){
const key=Object.keys(manifest).find(key=>key.endsWith('/'+name+'.tsx'));if(!key)throw Error('Missing route '+name);
const keys=new Set([...collect(entry),...collect(key)]);
const files=[...keys].map(key=>manifest[key].file);
routes.push({route:name,initialAndStaticJsBytes:files.reduce((sum,file)=>sum+(assets.get(file)?.bytes??0),0),initialAndStaticJsGzipBytes:files.reduce((sum,file)=>sum+(assets.get(file)?.gzipBytes??0),0),files});
}
process.stdout.write(JSON.stringify({scope:'Static production JS only; no browser network/CPU/typing measurements',entry:manifest[entry].file,routes,assets:[...assets.values()].sort((a,b)=>b.bytes-a.bytes)},null,2)+'\n');
