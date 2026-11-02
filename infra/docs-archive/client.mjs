import {readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {parseVersion,sha256,validateCatalog,validateManifest,verifyArchive} from '../../scripts/docs-versions/contract.mjs';

// The base URL is a dedicated archive origin. Do not follow redirects carrying
// credentials. Public verification uses an independently supplied manifest hash.
function origin(value) { const u=new URL(value); if(u.protocol!=='https:' || u.username || u.password || u.search || u.hash || !/^\/(?:[A-Za-z0-9._~-]+\/?)*$/.test(u.pathname) || u.pathname.split('/').some(x=>x==='.'||x==='..'))throw Error('Archive must use a safe HTTPS origin and path'); return u.origin+u.pathname.replace(/\/$/,''); }
async function response(url,options={}) { const r=await fetch(url,{...options,redirect:'error'}); return r; }
async function expectBytes(r,expected){if(!r.ok || sha256(Buffer.from(await r.arrayBuffer()))!==sha256(expected))throw Error('Remote bytes differ');}
export async function publishCandidate({base,token,archiveRoot,version,expectedSha256}) {
  parseVersion(version);
  const url=origin(base),root=resolve(archiveRoot,version),bytes=await readFile(join(root,'manifest.json'));
  if(sha256(bytes)!==expectedSha256)throw Error('Candidate manifest differs from trusted digest');
  const manifest=JSON.parse(bytes);if(manifest.docsVersion!==version)throw Error('Candidate version mismatch');
  await verifyArchive(root,manifest,expectedSha256);
  if(typeof token!=='string'||token.length<32)throw Error('Missing archive authorization');
  const headers={authorization:`Bearer ${token}`};
  async function put(path,content,extra={}) {
    const endpoint=`${url}/_archive/v/${version}/${path}`;
    const result=await response(endpoint,{method:'PUT',headers:{...headers,...extra},body:content});
    if(result.status===409) await expectBytes(await response(endpoint,{headers}),content);
    else if(result.status!==201) throw Error(`Archive write failed: ${result.status}`);
  }
  for(const file of manifest.files) await put(file.path,await readFile(join(root,file.path)));
  await put('manifest.json',bytes,{'x-manifest-sha256':expectedSha256});
  await verifyPublished({base,version,expectedSha256});
}
export async function verifyPublished({base,version,expectedSha256}) {
  parseVersion(version);
  const url=origin(base);if(!/^[a-f0-9]{64}$/.test(expectedSha256))throw Error('Missing trusted manifest digest');
  const r=await response(`${url}/docs/v/${version}/manifest.json`);if(!r.ok)throw Error(`Manifest fetch failed: ${r.status}`);
  const bytes=Buffer.from(await r.arrayBuffer());if(sha256(bytes)!==expectedSha256)throw Error('Published manifest digest mismatch');
  const manifest=validateManifest(JSON.parse(bytes));if(manifest.docsVersion!==version)throw Error('Published manifest identity mismatch');
  for(const f of manifest.files){const object=await response(`${url}/docs/v/${version}/${f.path}`);if(!object.ok)throw Error(`Missing archive file: ${f.path}`);const data=Buffer.from(await object.arrayBuffer());if(data.length!==f.size || sha256(data)!==f.sha256)throw Error(`Published bytes mismatch: ${f.path}`);}
  return {version,manifestSha256:expectedSha256,files:manifest.files.length};
}

// Pin an independently stored history hash. The server cannot convince a
// client that a rewritten history is valid merely by changing its pointer.
export async function verifyCatalogHistory({base,anchorSha256}) {
  const url=origin(base);if(!/^[a-f0-9]{64}$/.test(anchorSha256))throw Error('Missing independent catalog anchor');
  let r=await response(`${url}/docs/catalog.json`);if(!r.ok)throw Error('Catalog unavailable');
  let bytes=Buffer.from(await r.arrayBuffer()),head=sha256(bytes),next=validateCatalog(JSON.parse(bytes));
  const seen=new Set();
  while(sha256(bytes)!==anchorSha256){
    const prev=next.previousSha256;if(!/^[a-f0-9]{64}$/.test(prev||'')||seen.has(prev)||seen.size>=1000)throw Error('Catalog history does not contain trusted anchor');seen.add(prev);
    r=await response(`${url}/docs/catalog-history/${prev}.json`);if(!r.ok)throw Error('Historical catalog unavailable');bytes=Buffer.from(await r.arrayBuffer());if(sha256(bytes)!==prev)throw Error('Historical catalog digest mismatch');
    const earlier=validateCatalog(JSON.parse(bytes));validateCatalog(next,earlier);next=earlier;
  }
  return {headSha256:head,anchorSha256};
}

export async function advanceCatalog({base,token,catalog,expectedPreviousSha256}) {
  const url=origin(base);validateCatalog(catalog);
  if(typeof token!=='string'||token.length<32)throw Error('Missing archive authorization');
  if(catalog.previousSha256!==expectedPreviousSha256 || !(expectedPreviousSha256===null||/^[a-f0-9]{64}$/.test(expectedPreviousSha256)))throw Error('Catalog parent is not independently pinned');
  const bytes=Buffer.from(JSON.stringify(catalog,null,2)+'\n'),digest=sha256(bytes);
  const current=await response(`${url}/docs/catalog.json`);
  const currentBytes=current.ok?Buffer.from(await current.arrayBuffer()):null;
  if(currentBytes&&sha256(currentBytes)===digest){for(const entry of catalog.versions)await verifyPublished({base,version:entry.version,expectedSha256:entry.manifestSha256});return {headSha256:digest,recovered:true};}
  if(expectedPreviousSha256===null){if(current.status!==404)throw Error('Catalog already exists');}
  else {if(!current.ok)throw Error('Catalog unavailable');if(sha256(currentBytes)!==expectedPreviousSha256)throw Error('Catalog changed since independent checkpoint');validateCatalog(catalog,validateCatalog(JSON.parse(currentBytes)));}
  for(const entry of catalog.versions)await verifyPublished({base,version:entry.version,expectedSha256:entry.manifestSha256});
  const write=await response(`${url}/_archive/catalog`,{method:'PUT',headers:{authorization:`Bearer ${token}`,'x-previous-catalog-sha256':expectedPreviousSha256??'none'},body:bytes});
  if(write.status!==200&&write.status!==201)throw Error(`Catalog advance failed: ${write.status}`);
  const read=await response(`${url}/docs/catalog.json`);await expectBytes(read,bytes);return {headSha256:digest};
}

export async function advancePromotion({base,token,promotion,expectedPreviousSha256,expectedCatalogSha256}) {
  const url=origin(base);if(typeof token!=='string'||token.length<32)throw Error('Missing archive authorization');
  if(promotion.previousSha256!==expectedPreviousSha256||promotion.catalogSha256!==expectedCatalogSha256||!/^[a-f0-9]{64}$/.test(expectedCatalogSha256||'')||!(expectedPreviousSha256===null||/^[a-f0-9]{64}$/.test(expectedPreviousSha256)))throw Error('Missing independently pinned promotion or catalog parent');
  const catalog=await response(`${url}/docs/catalog.json`);if(!catalog.ok)throw Error('Catalog unavailable');const catalogBytes=Buffer.from(await catalog.arrayBuffer());
  if(sha256(catalogBytes)!==expectedCatalogSha256)throw Error('Catalog changed since independent checkpoint');
  const c=validateCatalog(JSON.parse(catalogBytes)),entry=c.versions.find(x=>x.version===promotion.version);
  if(!entry||entry.channel!=='stable'||!entry.supported||c.latestStable!==promotion.version)throw Error('Invalid promotion target');
  await verifyPublished({base,version:entry.version,expectedSha256:entry.manifestSha256});
  const bytes=Buffer.from(JSON.stringify(promotion,null,2)+'\n'),digest=sha256(bytes),current=await response(`${url}/docs/latest.json`);
  if(current.ok){const currentBytes=Buffer.from(await current.arrayBuffer());if(sha256(currentBytes)===digest)return {headSha256:digest,recovered:true};if(expectedPreviousSha256===null||sha256(currentBytes)!==expectedPreviousSha256)throw Error('Promotion changed since independent checkpoint');}
  else if(expectedPreviousSha256===null){if(current.status!==404)throw Error('Promotion unavailable');}
  else {
    // A changed catalog deliberately makes the live pointer return 503 until
    // reconciled. The immutable pinned decision remains independently readable.
    const old=await response(`${url}/docs/promotion-history/${expectedPreviousSha256}.json`);if(!old.ok||sha256(Buffer.from(await old.arrayBuffer()))!==expectedPreviousSha256)throw Error('Previous promotion unavailable');
  }
  const write=await response(`${url}/_archive/promotion`,{method:'PUT',headers:{authorization:`Bearer ${token}`,'x-previous-promotion-sha256':expectedPreviousSha256??'none'},body:bytes});
  if(write.status!==200&&write.status!==201)throw Error(`Promotion failed: ${write.status}`);
  await expectBytes(await response(`${url}/docs/latest.json`),bytes);return {headSha256:digest};
}
