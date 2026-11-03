// Read-only checkpoint-to-archive integration. All three current heads must be
// independently pinned; a gateway-provided latest pointer is not an authority.
import {parseVersion,sha256,validateCatalog,validateManifest} from '../../scripts/docs-versions/contract.mjs';
import {verifyCheckpoint} from './checkpoint.mjs';
const digest=/^[a-f0-9]{64}$/;
function need(ok,message){if(!ok)throw Error(message);}
function safeBase(base){const u=new URL(base);need(u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&/^\/(?:[A-Za-z0-9._~-]+\/?)*$/.test(u.pathname)&&!u.pathname.split('/').some(x=>x==='.'||x==='..'),'Invalid archive origin');return u.origin+u.pathname.replace(/\/$/,'');}
async function bytesAt(url,expected,maxBytes=2*1024*1024){
 need(digest.test(expected||''),'Independent digest required');
 const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error(`Archive history unavailable: ${r.status}`);
 const reader=r.body.getReader(),chunks=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw Error('Remote record exceeds expected size');}chunks.push(Buffer.from(value));}
 const bytes=Buffer.concat(chunks);need(sha256(bytes)===expected,'Historical digest mismatch');return bytes;
}
function promotion(bytes,family){
 let p;try{p=JSON.parse(bytes.toString('utf8'));}catch{throw Error('Invalid promotion JSON');}
 need(p?.schemaVersion===1&&p.family===family&&p.framework==='react'&&['promote','rollback'].includes(p.operation)&&digest.test(p.catalogSha256||'')&&(p.previousSha256===null||digest.test(p.previousSha256||'')),'Invalid promotion identity');
 const ver=parseVersion(p.version);need(ver.channel==='stable','Promotion must identify a stable version');return p;
}
export async function verifyCheckpointState({base,expectedCatalogHeadSha256,expectedPromotionHeadSha256,...checkpointArgs}){
 const url=safeBase(base);need(digest.test(expectedCatalogHeadSha256||'')&&(expectedPromotionHeadSha256===null||digest.test(expectedPromotionHeadSha256||'')),'Independent catalog and promotion heads required');
 const trusted=await verifyCheckpoint(checkpointArgs),cp=trusted.checkpoint;
 const archiveManifest=validateManifest(JSON.parse((await bytesAt(`${url}/docs/v/${cp.version}/manifest.json`,cp.manifestSha256)).toString('utf8')));
 need(archiveManifest.family===cp.family&&archiveManifest.framework===cp.framework&&archiveManifest.docsVersion===cp.version&&archiveManifest.source.repository===cp.source.repository&&archiveManifest.source.tag===cp.source.tag&&archiveManifest.source.commit===cp.source.commit,'Checkpoint archive source mismatch');
 for(const file of archiveManifest.files){
  need(file.size<=16*1024*1024,'Archive file exceeds gateway limit');
  const bytes=await bytesAt(`${url}/docs/v/${cp.version}/${file.path}`,file.sha256,file.size);
  need(bytes.length===file.size,`Archive size mismatch: ${file.path}`);
  if(file.path.endsWith('.html'))need((bytes.toString('utf8').match(/<meta\b[^>]*>/gi)??[]).some(t=>/\bname\s*=\s*["']robots["']/i.test(t)&&/\bcontent\s*=\s*["'][^"']*\bnoindex\b/i.test(t)),`Archive noindex missing: ${file.path}`);
 }
 const checkpointCatalog=validateCatalog(JSON.parse((await bytesAt(`${url}/docs/catalog-history/${cp.catalogSha256}.json`,cp.catalogSha256)).toString('utf8')));
 need(checkpointCatalog.family===cp.family&&checkpointCatalog.framework===cp.framework&&checkpointCatalog.versions.some(v=>v.version===cp.version&&v.manifestSha256===cp.manifestSha256),'Checkpoint catalog does not contain archive');
 let catalogHash=expectedCatalogHeadSha256,catalogCurrent=validateCatalog(JSON.parse((await bytesAt(`${url}/docs/catalog.json`,catalogHash)).toString('utf8')));
 const catalogsSeen=new Map();
 for(let count=0;;count++){
  need(count<1000&&!catalogsSeen.has(catalogHash),'Catalog history cycle or limit');
  catalogsSeen.set(catalogHash,count);
  const previous=catalogCurrent.previousSha256;if(previous===null)break;need(digest.test(previous||''),'Invalid catalog history parent');
  const earlier=validateCatalog(JSON.parse((await bytesAt(`${url}/docs/catalog-history/${previous}.json`,previous)).toString('utf8')));
  validateCatalog(catalogCurrent,earlier);catalogHash=previous;catalogCurrent=earlier;
 }
 need(catalogsSeen.has(cp.catalogSha256),'Catalog history does not contain checkpoint');
 const prerelease=parseVersion(cp.version).channel==='prerelease';
 if(cp.promotionSha256===null)need(prerelease&&checkpointCatalog.latestStable===null,'Missing checkpoint promotion for stable catalog');
 if(expectedPromotionHeadSha256===null){
  need(cp.promotionSha256===null&&checkpointCatalog.latestStable===null,'Independent promotion head cannot be absent');
  const latestCatalog=validateCatalog(JSON.parse((await bytesAt(`${url}/docs/catalog.json`,expectedCatalogHeadSha256)).toString('utf8')));
  need(latestCatalog.latestStable===null,'Stable promotion is missing');
  const latest=await fetch(`${url}/docs/latest.json`,{redirect:'error',signal:AbortSignal.timeout(15000)});need(latest.status===404,'Unexpected promotion pointer');
  return {checkpointSha256:trusted.sha256,manifestSha256:cp.manifestSha256,catalogHeadSha256:expectedCatalogHeadSha256,promotionHeadSha256:null,files:archiveManifest.files.length};
 }
 let current=promotion(await bytesAt(`${url}/docs/latest.json`,expectedPromotionHeadSha256),cp.family),hash=expectedPromotionHeadSha256;
 const seen=new Set();
 for(let count=0;count<1000;count++){
  need(!seen.has(hash),'Promotion cycle');seen.add(hash);
  const associated=validateCatalog(JSON.parse((await bytesAt(`${url}/docs/catalog-history/${current.catalogSha256}.json`,current.catalogSha256)).toString('utf8')));
  need(catalogsSeen.has(current.catalogSha256),'Promotion catalog is outside pinned catalog history');
  need(associated.family===cp.family&&associated.framework===cp.framework&&associated.latestStable===current.version&&associated.versions.some(v=>v.version===current.version&&v.channel==='stable'&&v.supported),'Promotion is not backed by its catalog');
  if(cp.promotionSha256===null)need(catalogsSeen.get(current.catalogSha256)<catalogsSeen.get(cp.catalogSha256),'Promotion predates prerelease checkpoint');
  if(hash===cp.promotionSha256){
   if(prerelease)need(current.version===checkpointCatalog.latestStable&&catalogsSeen.get(current.catalogSha256)>=catalogsSeen.get(cp.catalogSha256),'Prerelease changed stable promotion');
   else need(current.catalogSha256===cp.catalogSha256&&current.version===cp.version,'Checkpoint promotion mismatch');
   return {checkpointSha256:trusted.sha256,manifestSha256:cp.manifestSha256,catalogHeadSha256:expectedCatalogHeadSha256,promotionHeadSha256:expectedPromotionHeadSha256,files:archiveManifest.files.length};
  }
  if(current.previousSha256===null&&cp.promotionSha256===null)return {checkpointSha256:trusted.sha256,manifestSha256:cp.manifestSha256,catalogHeadSha256:expectedCatalogHeadSha256,promotionHeadSha256:expectedPromotionHeadSha256,files:archiveManifest.files.length};
  need(digest.test(current.previousSha256||''),'Promotion history does not contain checkpoint');hash=current.previousSha256;
  current=promotion(await bytesAt(`${url}/docs/promotion-history/${hash}.json`,hash),cp.family);
 }
 throw Error('Promotion history limit exceeded');
}
