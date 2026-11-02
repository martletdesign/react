import {execFileSync} from 'node:child_process';
import {createHash, timingSafeEqual} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {isDeepStrictEqual} from 'node:util';

export function releaseVersion(tag) {
  const match=/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(tag);
  if (!match || (match[4] && match[4].split('.').some(x=>/^\d+$/.test(x)&&x.length>1&&x.startsWith('0')))) throw Error('Invalid release tag');
  return {version:tag.slice(1),channel:match[4]?'next':'latest'};
}

export function validateIdentity({tag,pkg,source,lock,repository,expectedRepository,expectedName}) {
  const result=releaseVersion(tag);
  if(repository!==expectedRepository || pkg.name!==expectedName || pkg.private!==true || pkg.version!==result.version || source.version!==result.version) throw Error('Release identity mismatch');
  if(pkg.repository?.url!==`git+https://github.com/${expectedRepository}.git`) throw Error('Repository metadata mismatch');
  const scope=expectedName.split('/')[0];
  if(!/^\d+\.\d+\.\d+$/.test(pkg.dependencies?.[`${scope}/core`] || '') || pkg.dependencies?.[`${scope}/theme`]) throw Error('Release requires an exact published core dependency');
  if(lock.name!==pkg.name || lock.version!==pkg.version || lock.packages?.['']?.name!==pkg.name || lock.packages?.['']?.version!==pkg.version || !['dependencies','devDependencies','peerDependencies','optionalDependencies'].every(key=>isDeepStrictEqual(lock.packages?.['']?.[key]??{},pkg[key]??{}))) throw Error('Lockfile metadata mismatch');
  return result;
}

export function productionCommit({git,tag,sha,protectedRef}) {
  if(protectedRef!=='true' || !/^[0-9a-f]{40}$/.test(sha)) throw Error('Unprotected ref or invalid event commit');
  releaseVersion(tag);
  const peeled=git(['rev-parse',`refs/tags/${tag}^{commit}`]).trim();
  if(peeled!==sha || git(['rev-parse','HEAD']).trim()!==sha) throw Error('Tag, event and checkout differ');
  if(!git(['rev-list','--first-parent','refs/remotes/origin/main']).trim().split('\n').includes(sha)) throw Error('Commit is not on main first-parent history');
  const local=git(['rev-parse',`refs/tags/${tag}`]).trim();
  const remote=git(['ls-remote','--refs','origin',`refs/tags/${tag}`]).trim().split(/\s+/);
  if(remote.length!==2 || remote[0]!==local || remote[1]!==`refs/tags/${tag}`) throw Error('Tag differs from remote');
}

export async function registryState(fetcher,registry,name,version) {
  try {
    const root=new URL(registry); if(root.protocol!=='https:') return 'unknown';
    const url=new URL(encodeURIComponent(name),root).href;
    const pkg=await fetcher(url); if(pkg.status!==200) return 'unknown';
    const metadata=await pkg.json();
    if(metadata?.name!==name || !metadata.versions || typeof metadata.versions!=='object' || Array.isArray(metadata.versions)) return 'unknown';
    if(Object.hasOwn(metadata.versions,version)) {
      const existing=metadata.versions[version];
      return existing?.name===name && existing.version===version?'present':'unknown';
    }
    const found=await fetcher(`${url}/${encodeURIComponent(version)}`);
    if(found.status===404) return 'absent';
    if(found.status!==200) return 'unknown';
    const data=await found.json(); return data.name===name && data.version===version?'present':'unknown';
  } catch {return 'unknown';}
}

export function verifyArchive({local,remote,metadata,name,version}) {
  if(metadata?.name!==name || metadata?.version!==version || !Buffer.isBuffer(local) || !Buffer.isBuffer(remote)) return false;
  const digest=b=>createHash('sha512').update(b).digest();
  const integrity=metadata?.dist?.integrity;
  if(typeof integrity!=='string' || !/^sha512-[A-Za-z0-9+/]{86}==$/.test(integrity)) return false;
  const a=digest(local),b=digest(remote),c=Buffer.from(integrity.slice(7),'base64');
  return c.length===a.length && timingSafeEqual(a,b) && timingSafeEqual(a,c);
}

// The caller must supply output from a successful `npm audit signatures
// --json --include-attestations`; npm cryptographically verifies these bundles.
export function verifyProvenance({audit,archive,name,version,repository,tag,commit,expectedWorkflow='.github/workflows/tag-release.yml',expectedRef=`refs/tags/${tag}`,expectedEvent='push'}) {
  if(!Array.isArray(audit?.invalid)||audit.invalid.length||!Array.isArray(audit?.missing)||audit.missing.length) return false;
  const entry=audit?.verified?.find(x=>x.name===name&&x.version===version);
  const bundle=entry?.attestationBundles?.find(x=>x.predicateType==='https://slsa.dev/provenance/v1')?.bundle;
  if(!bundle?.dsseEnvelope?.payload || !Buffer.isBuffer(archive)) return false;
  try {
    const statement=JSON.parse(Buffer.from(bundle.dsseEnvelope.payload,'base64').toString('utf8'));
    const [scope,pkg]=name.split('/');
    const subject=`pkg:npm/${encodeURIComponent(scope)}/${pkg}@${version}`;
    const digest=createHash('sha512').update(archive).digest('hex');
    const definition=statement.predicate?.buildDefinition;
    const workflow=definition?.externalParameters?.workflow;
    const dependencies=definition?.resolvedDependencies??[];
    return statement._type==='https://in-toto.io/Statement/v1' &&
      statement.predicateType==='https://slsa.dev/provenance/v1' &&
      definition?.buildType==='https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1' &&
      statement.predicate?.runDetails?.builder?.id==='https://github.com/actions/runner/github-hosted' &&
      statement.subject?.some(x=>x.name===subject&&x.digest?.sha512===digest) &&
      workflow?.repository===`https://github.com/${repository}` && workflow.path===expectedWorkflow && workflow.ref===expectedRef &&
      definition?.internalParameters?.github?.event_name===expectedEvent && dependencies.some(x=>x.uri===`git+https://github.com/${repository}@${expectedRef}`&&x.digest?.gitCommit===commit);
  } catch {return false;}
}

export async function identityFromFiles({tag,repository,expectedRepository,expectedName}) {
  const [pkg,lock,changelog]=await Promise.all([readFile('package.json','utf8').then(JSON.parse),readFile('package-lock.json','utf8').then(JSON.parse),readFile('CHANGELOG.md','utf8')]);
  if(!changelog.split('\n').some(line=>line.startsWith(`## ${pkg.version} `)||line===`## ${pkg.version}`)) throw Error('Changelog lacks exact source version');
  return validateIdentity({tag,pkg,source:{version:pkg.version},lock,repository,expectedRepository,expectedName});
}
export function realGit(args) {return execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']});}
