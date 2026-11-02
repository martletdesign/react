// GitHub immutable-release checkpoints. This module never creates or changes a
// release: it verifies a local asset supplied by the caller against GitHub's
// signed release attestation and an independently pinned SHA-256.
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {basename} from 'node:path';
import {sha256,parseVersion} from '../../scripts/docs-versions/contract.mjs';
const digest=/^[a-f0-9]{64}$/,commit=/^[a-f0-9]{40}$/;
const assetName='documentation-checkpoint.json';
function required(ok,message){if(!ok)throw Error(message);}
function validTag(t){if(typeof t!=='string'||!t.startsWith('v'))throw Error('Invalid checkpoint tag');parseVersion(t.slice(1));return t;}
function validRepo(repo,family){required(['martlet','krigsvold'].includes(family)&&repo===`${family}design/react`,'Unexpected checkpoint authority');return repo;}
function validate(value,{family,repository,tag,expectedCommit}){
  validRepo(repository,family);validTag(tag);required(commit.test(expectedCommit||''),'Missing expected source commit');
  required(value?.schemaVersion===1&&value.family===family&&value.framework==='react'&&value.version===tag.slice(1),'Checkpoint identity mismatch');
  required(value.source?.repository===repository&&value.source.tag===tag&&value.source.commit===expectedCommit,'Checkpoint source mismatch');
  for(const key of ['manifestSha256','catalogSha256'])required(digest.test(value[key]||''),`Invalid ${key}`);
  required(digest.test(value.promotionSha256||'')||(parseVersion(value.version).channel==='prerelease'&&value.promotionSha256===null),'Invalid promotionSha256');
  if(value.previous!==null){required(value.previous&&digest.test(value.previous.sha256||'')&&value.previous.tag!==tag,'Invalid previous checkpoint');validTag(value.previous.tag);}
  return value;
}
export function checkpointBytes(value,identity){return Buffer.from(JSON.stringify(validate(value,identity),null,2)+'\n');}
function runFile(binary,args,{cwd}={}){try{return execFileSync(binary,args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:60000,maxBuffer:2*1024*1024});}catch{throw Error(`${binary} checkpoint verification failed`);}}
function originMatches(value,repository){return value.trim()===`https://github.com/${repository}.git`||value.trim()===`https://github.com/${repository}`||value.trim()===`git@github.com:${repository}.git`;}
export async function verifyCheckpoint({family,repository,tag,expectedCommit,expectedSha256,assetPath,cwd=process.cwd(),run=runFile}){
  validRepo(repository,family);validTag(tag);
  required(digest.test(expectedSha256||'')&&commit.test(expectedCommit||''),'Independent checkpoint and source pins required');
  required(basename(assetPath||'')===assetName,'Unexpected checkpoint asset name');
  const bytes=await readFile(assetPath);required(bytes.length>0&&bytes.length<=65536&&sha256(bytes)===expectedSha256,'Checkpoint asset digest mismatch');
  let value;try{value=JSON.parse(bytes.toString('utf8'));}catch{throw Error('Invalid checkpoint JSON');}
  validate(value,{family,repository,tag,expectedCommit});
  // Check API state before cryptographic verification. All errors fail closed;
  // never interpret API failures or unknown CLI commands as an absent release.
  let release;try{release=JSON.parse(run('gh',['api',`repos/${repository}/releases/tags/${tag}`],{cwd}));}catch{throw Error('Cannot read immutable release metadata');}
  required(release?.immutable===true&&release.draft===false&&release.tag_name===tag&&Array.isArray(release.assets),'Release is not immutable');
  const assets=release.assets.filter(a=>a.name===assetName);required(assets.length===1&&assets[0].digest===`sha256:${expectedSha256}`&&assets[0].size===bytes.length,'Release asset metadata mismatch');
  // gh verifies the signed release attestation and that the local bytes are an
  // attested asset for precisely this GitHub repository and tag.
  run('gh',['release','verify',tag,'--repo',repository],{cwd});
  run('gh',['release','verify-asset',tag,assetPath,'--repo',repository],{cwd});
  required(originMatches(run('git',['remote','get-url','origin'],{cwd}),repository),'Unexpected Git origin');
  const ref=`refs/tags/${tag}`,localObject=run('git',['rev-parse',ref],{cwd}).trim(),localCommit=run('git',['rev-parse',`${ref}^{commit}`],{cwd}).trim();
  const remote=run('git',['ls-remote','--refs','origin',ref],{cwd}).trim().split(/\s+/);
  required(commit.test(localObject)&&localCommit===expectedCommit&&remote.length===2&&remote[0]===localObject&&remote[1]===ref,'Tag object or commit changed');
  // Reject stale production ancestry before trusting local tracking history.
  const mainRef='refs/heads/main',trackingRef='refs/remotes/origin/main';
  const trackingTip=run('git',['rev-parse',trackingRef],{cwd}).trim();
  const remoteMain=run('git',['ls-remote','--refs','origin',mainRef],{cwd}).trim().split(/\s+/);
  required(commit.test(trackingTip)&&remoteMain.length===2&&remoteMain[0]===trackingTip&&remoteMain[1]===mainRef,'Production tracking ref is stale or unavailable; fetch main before verification');
  const main=run('git',['rev-list','--first-parent',trackingRef],{cwd}).trim().split('\n');
  required(main.includes(expectedCommit),'Checkpoint source is not on approved main first-parent history');
  return {checkpoint:value,sha256:expectedSha256,assetName};
}
export async function verifyCheckpointChain({entries,expectedHeadSha256,anchorSha256,...identity}){
  required(Array.isArray(entries)&&entries.length>0&&entries.length<=1000&&digest.test(anchorSha256||'')&&digest.test(expectedHeadSha256||'')&&entries[0].expectedSha256===expectedHeadSha256,'Trusted head and chain anchor required');
  const seen=new Set();let expected=expectedHeadSha256;
  for(let i=0;i<entries.length;i++){
    const item=entries[i];required(item.expectedSha256===expected&&!seen.has(expected),'Checkpoint chain discontinuity');seen.add(expected);
    // A chain entry supplies only its own pins and local path; it cannot
    // override the trusted repository, family, runner, or working directory.
    const verified=await verifyCheckpoint({...identity,tag:item.tag,expectedCommit:item.expectedCommit,assetPath:item.assetPath,expectedSha256:item.expectedSha256});
    if(expected===anchorSha256){required(i===entries.length-1,'Unexpected trailing checkpoint');return {headSha256:entries[0].expectedSha256,anchorSha256,count:i+1};}
    required(verified.checkpoint.previous&&entries[i+1]?.tag===verified.checkpoint.previous.tag,'Missing previous checkpoint');
    expected=verified.checkpoint.previous.sha256;
  }
  throw Error('Checkpoint history does not contain trusted anchor');
}
