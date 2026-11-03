import {cp,lstat,mkdir,mkdtemp,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {execFileSync,spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve,relative} from 'node:path';
import {createSnapshot} from './snapshot.mjs';
import {parseVersion,sha256,validateCatalog,versionTopicURL} from './contract.mjs';
const env=process.env;
for(const key of ['DOCS_ARCHIVE_ROOT','DOCS_BASELINE_PATH','DOCS_BASELINE_SHA256','RELEASE_TAG']) if(!env[key]) throw Error(`Missing ${key}`);
const root=process.cwd(),pkg=JSON.parse(await readFile('package.json','utf8')),pin=JSON.parse(await readFile('docs-release-lock.json','utf8'));
const {version}=parseVersion(pkg.version),family=pin.family;
if(env.RELEASE_TAG!==`v${version}`||pkg.name!==`@${family}/react`||pkg.private!==true||pkg.dependencies?.[pin.core.name]!==pin.core.version||pkg.dependencies?.[`@${family}/theme`]) throw Error('Documentation requires matching private React candidate and exact core');
if(pin.core.name!==`@${family}/core`||!/^\d+\.\d+\.\d+$/.test(pin.core.version)||!/^sha512-[A-Za-z0-9+/]{86}==$/.test(pin.core.integrity)||!/^\d+\.\d+\.\d+$/.test(pin.vite)) throw Error('Invalid exact dependency pin');
const bytes=await readFile(env.DOCS_BASELINE_PATH);
if(sha256(bytes)!==env.DOCS_BASELINE_SHA256)throw Error('Baseline catalog digest mismatch');
const baseline=JSON.parse(bytes);
if(baseline.family!==family||baseline.framework!=='react'||baseline.schemaVersion!==1||!Array.isArray(baseline.versions))throw Error('Baseline authority mismatch');
if(baseline.versions.length)validateCatalog(baseline);else if(baseline.latestStable!==null)throw Error('Invalid empty baseline');
const prefix=env.DOCS_DEPLOY_PREFIX??'';
if(prefix&&(!/^\/(?:[A-Za-z0-9._~-]+)(?:\/[A-Za-z0-9._~-]+)*$/.test(prefix)||prefix.split('/').some(x=>x==='..'||x==='.') ))throw Error('Invalid deployment prefix');
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(env.GITHUB_SHA&&env.GITHUB_SHA!==commit)throw Error('Source commit differs from event');
if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw Error('Documentation source tree must be clean');
try{await lstat(join(resolve(env.DOCS_ARCHIVE_ROOT),version));throw Error('Snapshot version already exists');}catch(e){if(e.code!=='ENOENT')throw e;}
const temp=await mkdtemp(join(tmpdir(),'nightjar-react-docs-'));
const run=(cmd,args,cwd,opts={})=>execFileSync(cmd,args,{cwd,stdio:['ignore','pipe','inherit'],encoding:'utf8',...opts});
async function files(dir){const out=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())out.push(...await files(p));else out.push(p);}return out;}
try{
 const site=join(temp,'site');await mkdir(site);
 const archive=execFileSync('git',['archive','HEAD'],{cwd:root,maxBuffer:16*1024*1024});
 const unpack=spawnSync('tar',['-x','-C',site],{input:archive,stdio:['pipe','ignore','inherit']});if(unpack.status!==0)throw Error('Unable to export source');
 run('npm',['ci','--ignore-scripts','--no-audit','--no-fund'],site);
 const lock=JSON.parse(await readFile(join(site,'package-lock.json'),'utf8')),core=lock.packages?.[`node_modules/${pin.core.name}`];
 if(core?.version!==pin.core.version||core?.integrity!==pin.core.integrity)throw Error('Installed core lock differs from reviewed pin');
 const installed=JSON.parse(await readFile(join(site,'node_modules',pin.core.name,'package.json'),'utf8'));
 if(installed.name!==pin.core.name||installed.version!==pin.core.version)throw Error('Installed core package identity differs from pin');
 const base=`${prefix}/docs/v/${version}/`;
 run('npm',['run','build'],site);
 run('npm',['run','build:gallery'],site,{env:{...env,NIGHTJAR_BASE:base}});
 const dist=join(site,'examples','react-catalog','dist',family);
 await cp(join(dist,'examples','index.html'),join(dist,'index.html'));
 const paths=await files(dist);
 const navScript=`const prefix=${JSON.stringify(prefix)},family=${JSON.stringify(family)},active=${JSON.stringify(version)};\n`+
 `const nav=document.querySelector('[data-version-nav]');if(nav)fetch(prefix+'/docs/catalog.json',{credentials:'same-origin'}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(c=>{if(c.family!==family||c.framework!=='react'||!Array.isArray(c.versions)||c.versions.length>1000||!c.versions.some(v=>v.version===active))return;const topic=nav.dataset.topic,list=nav.querySelector('ul'),frag=document.createDocumentFragment();for(const v of c.versions){if(typeof v.version!=='string'||!/^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?$/.test(v.version)||!Array.isArray(v.topics)||typeof v.supported!=='boolean')return;const use=v.topics.includes(topic)?topic:'';if(use&&(!/^[A-Za-z0-9._~/-]+$/.test(use)||use.split('/').some(x=>!x||x==='.'||x==='..')))return;const li=document.createElement('li'),a=document.createElement('a');a.href=prefix+'/docs/v/'+v.version+'/'+use;a.textContent='v'+v.version+(v.version===active?' (current)':'')+(v.version===c.latestStable?' (latest stable)':'')+(v.supported?'':' (unsupported)')+(v.channel==='prerelease'?' (prerelease)':'');if(v.version===active)a.setAttribute('aria-current','page');li.append(a);frag.append(li);}list.replaceChildren(frag)}).catch(()=>{});\n`;
 await writeFile(join(dist,'version-navigation.js'),navScript);
 for(const path of paths.filter(p=>p.endsWith('.html'))){
  const topic=relative(dist,path).split('\\').join('/');let html=await readFile(path,'utf8');
  if(!/^[A-Za-z0-9._~/-]+$/.test(topic)||!html.includes('</head>')||!html.includes('<body>'))throw Error(`Unexpected HTML: ${topic}`);
  for(const m of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/g))if(m[1].startsWith('/')&&!m[1].startsWith(base))throw Error(`Link escapes archive base: ${m[1]}`);
  const links=baseline.versions.map(x=>`<li><a href="${versionTopicURL(baseline,x.version,topic,prefix||'/')}">v${x.version}${x.version===baseline.latestStable?' (latest stable)':''}${x.supported?'':' (unsupported)'}${x.channel==='prerelease'?' (prerelease)':''}</a></li>`).join('');
  const nav=`<nav aria-label="Documentation versions" data-version-nav data-topic="${topic}"><p>React documentation v${version}</p><ul><li><a aria-current="page" href="${base}${topic}">v${version} (current)</a></li>${links}</ul><p><a href="${prefix}/docs/versions/">All documentation versions</a></p></nav>`;
  html=html.replace('</head>',`<meta name="robots" content="noindex, follow"><script type="module" src="${base}version-navigation.js"></script></head>`).replace('</body>',`${nav}</body>`);
  await writeFile(path,html);
 }
 await mkdir(join(dist,'provenance'),{recursive:true});await cp(join(site,'package-lock.json'),join(dist,'provenance','package-lock.json'));
 const metadata={schemaVersion:1,family,framework:'react',docsVersion:version,basePath:`/docs/v/${version}/`,implementation:{kind:'npm',name:pkg.name,version,tag:`v${version}`},core:pin.core,source:{repository:`${family}design/react`,commit,tag:`v${version}`},fixtures:{source:'workbench',workbenchCommit:'04d3e14b1b1943cbf2a90f1a727822d87327b2ae'},toolchain:{node:process.versions.node,npm:run('npm',['--version'],root).trim(),vite:pin.vite},createdAt:new Date().toISOString(),indexing:'noindex'};
 const snapshot=await createSnapshot({buildRoot:dist,archiveRoot:resolve(env.DOCS_ARCHIVE_ROOT),metadata,coreLock:lock,baselineBytes:bytes,baselineSha256:env.DOCS_BASELINE_SHA256});
 console.log(JSON.stringify({snapshot,baselineSha256:env.DOCS_BASELINE_SHA256,latestPromoted:false}));
}finally{await rm(temp,{recursive:true,force:true});}
