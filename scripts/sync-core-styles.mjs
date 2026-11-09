import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..'),pkg=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
const name=Object.keys(pkg.dependencies).find(name=>/^@(martlet|krigsvold)\/core$/.test(name));
const require=createRequire(resolve(root,'package.json')),source=dirname(require.resolve(`${name}/package.json`));
const core=JSON.parse(await readFile(resolve(source,'package.json'),'utf8'));
const directory=resolve(root,'examples/react-catalog/public/assets/css');await mkdir(directory,{recursive:true});
const expected={};
for(const [file,exportName] of Object.entries({'reference.css':'reference.css','fonts.css':'reference-fonts.css','react-reference.css':'react-reference.css'})){
 const bytes=await readFile(resolve(source,'dist',exportName));expected[file]=createHash('sha256').update(bytes).digest('hex');
 if(process.argv.includes('--check')){if(!(await readFile(resolve(directory,file))).equals(bytes))throw Error(`${file} differs from Core; edit Core, then run npm run styles:sync`);}else await writeFile(resolve(directory,file),bytes);
}
const unexpected=(await readdir(directory)).filter(file=>file.endsWith('.css')&&!Object.hasOwn(expected,file));if(unexpected.length)throw Error(`Local CSS is forbidden: ${unexpected.join(', ')}`);
const manifest=JSON.stringify({package:name,version:core.version,source:pkg.dependencies[name],files:expected},null,2)+'\n';
if(process.argv.includes('--check')){if(await readFile(resolve(directory,'core-styles.json'),'utf8')!==manifest)throw Error('Stale Core manifest');}else await writeFile(resolve(directory,'core-styles.json'),manifest);
console.log(`${name}: canonical stylesheet bytes verified`);
