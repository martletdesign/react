import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root=fileURLToPath(new URL('.',import.meta.url));
export default defineConfig(({mode})=>{
 if(mode!=='martlet') throw new Error('Choose a family');
 return {root,define:{__NIGHTJAR_PEER__:JSON.stringify(process.env.NIGHTJAR_PEER_URL||'')},base:process.env.NIGHTJAR_BASE || '/',plugins:[{name:'react-family',resolveId(id){if(id==='catalog-family')return '\0catalog-family';},load(id){if(id==='\0catalog-family') return `export * from ${JSON.stringify(resolve(root,'../../src/index.tsx'))}; import ${JSON.stringify(resolve(root,'../../src/styles.css'))}; import '@${mode}/core/fonts.css'; export const family='${mode}';`;}}],build:{outDir:`${root}/dist/${mode}`,emptyOutDir:true,assetsInlineLimit:0,manifest:true,rollupOptions:{input:{catalog:resolve(root,'index.html'),dashboard:resolve(root,'dashboard.html'),scientific:resolve(root,'scientific.html')}}}};
});
