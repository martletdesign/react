import {readFile,readdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
async function walk(directory){const entries=await readdir(directory,{withFileTypes:true});return (await Promise.all(entries.map(entry=>entry.isDirectory()?walk(resolve(directory,entry.name)):resolve(directory,entry.name)))).flat();}
const sources=[...await walk('src'),...await walk('examples/react-catalog/src')];
for(const file of sources){
 const text=await readFile(file,'utf8');
 if(extname(file)==='.css' && /[{}]/.test(text))throw Error(`CSS definitions must live in Core: ${file}`);
 if(/\.(?:tsx?|jsx?|html|mjs)$/.test(file) && /<style[\s>]|\bstyle\s*=|\.style\s*\.|\.cssText\s*=|\.setProperty\s*\(/i.test(text))throw Error(`Inline CSS is forbidden: ${file}`);
}
const family=JSON.parse(await readFile('package.json','utf8')).name.match(/^@(martlet|krigsvold)\//)[1];
const built=await walk(`examples/react-catalog/dist/${family}`);
let pages=0;
for(const file of built.filter(file=>extname(file)==='.html')){const html=await readFile(file,'utf8');if(/<style[\s>]|\sstyle\s*=/i.test(html))throw Error(`Inline CSS in rendered page: ${file}`);pages++;}
console.log(`${pages} React pages: no inline or page-owned CSS`);
