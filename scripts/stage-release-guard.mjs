import {validateIdentity} from './tag-release-guard.mjs';
export function validateStage({pkg,lock,pin,delivery,repository,expectedRepository,ref,protectedRef,sourceSha,eventSha,checkoutSha,remoteMainSha}) {
  const expectedName='@'+expectedRepository.split('/')[0].replace(/design$/,'')+'/react';
  validateIdentity({tag:'v'+pkg.version,pkg,source:{version:pkg.version},lock,repository,expectedRepository,expectedName});
  if(ref!=='refs/heads/main'||protectedRef!=='true'||![sourceSha,eventSha,checkoutSha,remoteMainSha].every(x=>/^[a-f0-9]{40}$/.test(x))||new Set([sourceSha,eventSha,checkoutSha,remoteMainSha]).size!==1)throw Error('Staging requires the exact protected live main revision');
  const core=lock.packages?.['node_modules/'+pin.core?.name];
  if(pin.family!==expectedName.split('/')[0].slice(1)||pin.core.name!=='@'+pin.family+'/core'||pkg.dependencies?.[pin.core.name]!==pin.core.version||core?.version!==pin.core.version||core?.integrity!==pin.core.integrity||!core?.resolved?.startsWith('https://registry.npmjs.org/'))throw Error('Core dependency must match the registry-backed documentation pin');
  for(const entry of Object.values(lock.packages))if(entry.resolved&&!entry.resolved.startsWith('https://registry.npmjs.org/'))throw Error('Non-registry dependency in publish source');
  if(delivery.schemaVersion!==1||delivery.mode!=='static-reference'||delivery.advancedArchive?.enabled!==false||delivery.advancedArchive.administratorImmutable!==false)throw Error('Only the verified static reference path is enabled');
  return {name:pkg.name,version:pkg.version};
}
