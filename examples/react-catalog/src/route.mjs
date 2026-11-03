import {validBase} from './base.mjs';
export function catalogRouteId(pathname,base='/') {
 if(typeof pathname!=='string'||!pathname.startsWith('/')||!validBase(base))return undefined;
 const prefix=base.replace(/\/$/,''),relative=pathname.startsWith(prefix)?pathname.slice(prefix.length):undefined;
 if(['','/','/examples','/examples/'].includes(relative))return 'index';
 return relative?.match(/^\/examples\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/)?.[1];
}
