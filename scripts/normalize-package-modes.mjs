import {access,chmod,lstat,readFile,readdir} from 'node:fs/promises';
import {resolve,join,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
export async function normalizePackageModes(directory) {
 const root=resolve(directory);
 try{await access(join(root,'.git'));throw Error('Normalize only an isolated public source export');}catch(error){if(error.code!=='ENOENT')throw error;}
 const pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
 if(!Array.isArray(pkg.files)||pkg.bin)throw Error('Expected an explicit non-executable package payload');
 async function visit(path){const stat=await lstat(path);if(stat.isSymbolicLink())throw Error('Symbolic link in package payload');if(stat.isDirectory()){await chmod(path,0o755);for(const name of await readdir(path))await visit(join(path,name));}else if(stat.isFile())await chmod(path,0o644);else throw Error('Non-regular package payload');}
 await chmod(root,0o755);
 for(const name of ['package.json',...pkg.files]){
  if(typeof name!=='string'||isAbsolute(name))throw Error('Invalid package payload path');
  const path=resolve(root,name),tail=relative(root,path);if(!tail||tail.startsWith('..'))throw Error('Package payload escapes export');
  await visit(path);
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await normalizePackageModes(process.argv[2]||'.');
