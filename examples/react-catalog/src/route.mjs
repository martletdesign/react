import {validBase} from './base.mjs';
export function catalogRouteId(pathname,base='/') {
 if(typeof pathname!=='string'||!pathname.startsWith('/')||!validBase(base))return undefined;
 const prefix=base.replace(/\/$/,''),relative=pathname.startsWith(prefix)?pathname.slice(prefix.length):undefined;
 if(['','/','/index.html'].includes(relative))return 'site-home';
 if(['/examples','/examples/','/examples/index.html'].includes(relative))return 'index';
 const reference=relative?.match(/^\/(language|journal|setup|image-credits|docs)(?:\/(?:index\.html)?)?$/)?.[1];if(reference)return reference;
 if(['/docs/versions','/docs/versions/','/docs/versions/index.html'].includes(relative))return 'docs-versions';
 return relative?.match(/^\/examples\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/(?:index\.html)?)?$/)?.[1];
}
