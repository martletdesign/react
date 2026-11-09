// Registry-backed release fixture; development may use an immutable Core commit.
import {readFile} from 'node:fs/promises';
const read=name=>readFile(new URL('../../'+name,import.meta.url),'utf8').then(JSON.parse);
export const [developmentPkg,developmentLock,pin]=await Promise.all(['package.json','package-lock.json','docs-release-lock.json'].map(read));
export const pkg=structuredClone(developmentPkg),lock=structuredClone(developmentLock);
pkg.dependencies[pin.core.name]=pin.core.version;
lock.packages[''].dependencies[pin.core.name]=pin.core.version;
lock.packages['node_modules/'+pin.core.name]={version:pin.core.version,resolved:`https://registry.npmjs.org/${pin.core.name}/-/core-${pin.core.version}.tgz`,integrity:pin.core.integrity};
