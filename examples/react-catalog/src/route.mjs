import {validBase} from './base.mjs';
export function catalogRouteId(pathname,base='/') {
 if(typeof pathname!=='string'||!pathname.startsWith('/')||!validBase(base))return undefined;
 const prefix=base.replace(/\/$/,''),relative=pathname.startsWith(prefix)?pathname.slice(prefix.length):undefined;
 if(['','/','/index.html','/examples','/examples/','/examples/index.html'].includes(relative))return 'index';
 return relative?.match(/^\/examples\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/(?:index\.html)?)?$/)?.[1];
}
