const allowed=new Set(['/assets/examples/station.svg','/assets/examples/coast.svg','/assets/examples/notebook.svg']);
export function exampleImage(path:string){
 if(!allowed.has(path))throw new Error(`Unsupported image: ${path}`);
 return `${import.meta.env.BASE_URL.replace(/\/$/,'')}${path}`;
}
