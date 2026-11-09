import {cp,mkdir,mkdtemp,readFile,readdir,rm,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {sha256,validateCatalog,verifyArchive} from './docs-versions/contract.mjs';
import {inventory,validateArtifact,verifyLocal,resolveBuildOutput} from './reference-artifact.mjs';
import {prepareReleaseSnapshot} from './reference-release-snapshot.mjs';
const root=process.cwd(),output=await resolveBuildOutput(root,process.argv[2]);
const json=path=>readFile(path,'utf8').then(JSON.parse),pkg=await json('package.json'),pin=await json('docs-release-lock.json'),delivery=await json('docs-delivery.json'),family=pin.family;
if(delivery.mode!=='static-reference'||delivery.advancedArchive?.enabled!==false)throw Error('Unverified advanced archive is not a deployment option');
if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw Error('Reference build requires a clean committed source tree');
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),tree=execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim();
await mkdir(output);const temp=await mkdtemp(join(tmpdir(),'nightjar-react-reference-'));
const run=(script,env={})=>execFileSync(process.execPath,[script],{cwd:root,env:{...process.env,...env},stdio:'inherit',timeout:240000});
const snapshots=[];let release;
try {
 release=await prepareReleaseSnapshot({root,pkg,pin,directory:join(temp,'release-source')});
 for(const prefix of ['', '/preview']){
  const base=prefix+'/',destination=join(output,prefix.slice(1));
  run('examples/react-catalog/build.mjs',{NIGHTJAR_FAMILY:family,NIGHTJAR_BASE:base});run('scripts/check-gallery.mjs');
  await mkdir(destination,{recursive:true});for(const name of await readdir(join(root,'examples/react-catalog/dist',family)))await cp(join(root,'examples/react-catalog/dist',family,name),join(destination,name),{recursive:true,errorOnExist:true,force:false});
  const archive=join(temp,prefix?'preview':'root');await mkdir(archive);
  const baseline=join(temp,(prefix?'preview':'root')+'-baseline.json'),baselineBytes=Buffer.from(JSON.stringify({schemaVersion:1,family,framework:'react',latestStable:null,versions:[]})+'\n');
  await writeFile(baseline,baselineBytes);
  release.build({DOCS_ARCHIVE_ROOT:archive,DOCS_BASELINE_PATH:baseline,DOCS_BASELINE_SHA256:sha256(baselineBytes),DOCS_DEPLOY_PREFIX:prefix,RELEASE_TAG:'v'+pkg.version});
  const snapshot=join(archive,pkg.version),manifestBytes=await readFile(join(snapshot,'manifest.json')),manifest=JSON.parse(manifestBytes),digest=sha256(manifestBytes);
  if(manifest.source.commit!==release.commit||manifest.source.tag!==release.tag||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()!==commit)throw Error('Source moved during reference assembly');
  await verifyArchive(snapshot,manifest,digest);
  const versionRoot=join(destination,'docs/v');await mkdir(versionRoot,{recursive:true});await cp(snapshot,join(versionRoot,pkg.version),{recursive:true,errorOnExist:true,force:false});
  const catalog={schemaVersion:1,family,framework:'react',latestStable:pkg.version,versions:[{version:pkg.version,channel:'stable',manifestSha256:digest,supported:true,topics:manifest.files.filter(x=>x.path.endsWith('.html')).map(x=>x.path)}]};validateCatalog(catalog);
  await writeFile(join(destination,'docs/catalog.json'),JSON.stringify(catalog,null,2)+'\n');
  const page='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="robots" content="noindex, follow"><title>'+family+' React documentation versions</title><main><h1>'+family+' React documentation</h1><p><a href="'+prefix+'/docs/v/'+pkg.version+'/">Version '+pkg.version+'</a></p><p><a href="'+prefix+'/examples/">All 50 examples</a></p><p>The advanced remote archive is disabled. This is a static reference build; administrator-immutable storage is not claimed.</p></main></html>';
  await mkdir(join(destination,'docs/versions'),{recursive:true});
  // Keep the native reference shell and its current-version explanation when
  // the app renders documentation routes. The fallback serves older builders.
  let docsPage;
  try {docsPage=await readFile(join(destination,'docs/index.html'),'utf8');}
  catch(error) {if(error.code!=='ENOENT')throw error;docsPage=page;await writeFile(join(destination,'docs/index.html'),docsPage);}
  try {await readFile(join(destination,'docs/versions/index.html'));}
  catch(error) {if(error.code!=='ENOENT')throw error;await writeFile(join(destination,'docs/versions/index.html'),docsPage);}
  snapshots.push({base,version:pkg.version,manifestSha256:digest,files:manifest.files.length,sourceCommit:manifest.source.commit});
 }
 if(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()!==commit)throw Error('Source moved during reference assembly');
 const provenance={schemaVersion:1,family,framework:'react',package:{name:pkg.name,version:pkg.version},source:{repository:family+'design/react',commit,tree},core:pin.core,referenceCore:JSON.parse(await readFile('examples/react-catalog/public/assets/css/core-styles.json','utf8')),delivery,snapshots};
 await writeFile(join(output,'version.json'),JSON.stringify(provenance,null,2)+'\n');
 const artifact=validateArtifact({schemaVersion:1,family,framework:'react',source:provenance.source,files:await inventory(output)});
 await writeFile(join(output,'artifact.json'),JSON.stringify(artifact,null,2)+'\n');await verifyLocal(output,artifact);
 console.log(JSON.stringify({output,...provenance}));
} finally {release?.close();await rm(temp,{recursive:true,force:true});}
