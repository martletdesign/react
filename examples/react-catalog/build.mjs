import {build,createServer} from 'vite';
import {renderToString} from 'react-dom/server';
import React from 'react';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import catalog from '../page-archetypes/content/catalog.json' with {type:'json'};
import selected from './src/selected.json' with {type:'json'};
import {renderMarkdown} from '../page-archetypes/lib/markdown.mjs';
import {peerDashboardURL} from './src/dashboard/peer.mjs';
import {renderDocument} from './src/template.mjs';
import {pageDataElement} from './src/page-data.mjs';
const family=process.env.NIGHTJAR_FAMILY, base=process.env.NIGHTJAR_BASE || '/';
if(!['martlet','krigsvold'].includes(family)||!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base))throw Error('Provide a family and an absolute directory base');
const root=resolve('examples/react-catalog'),configFile=resolve(root,'vite.config.mjs');
peerDashboardURL(process.env.NIGHTJAR_PEER_URL,'analytics');
// Only the checked-in stress fixture opts into the shared HTML/MathML allowlist.
// Other records use raw HTML disabled. This is not an untrusted ingestion API.
const rendered={};
for(const page of catalog.pages.filter(item=>selected.includes(item.id))) for(const section of page.sections) if(section.body) rendered[`${page.id}-${section.id}`]=renderMarkdown(section.body,base,{fixtureMarkup:page.id==='stress-test',docId:`${page.id}-${section.id}`});
await build({configFile,mode:family});
const server=await createServer({configFile,mode:family,server:{middlewareMode:true},appType:'custom'});
try {
 const {App}=await server.ssrLoadModule('/src/app.tsx');
 const {pages,validatePages,requiresSpecial}=await server.ssrLoadModule('/src/pages.ts');
 const {renderSpecial}=await server.ssrLoadModule('/src/special.tsx');
 validatePages();
 const out=resolve(root,'dist',family),template=await readFile(resolve(out,'index.html'),'utf8'),dashboardTemplate=await readFile(resolve(out,'dashboard.html'),'utf8'),scientificTemplate=await readFile(resolve(out,'scientific.html'),'utf8');
 const manifest=JSON.parse(await readFile(resolve(out,'.vite/manifest.json'),'utf8'));
 const {DashboardFrame}=await server.ssrLoadModule('/src/dashboard/DashboardFrame.tsx');
 const entries=catalog.pages.map(({id,title,summary,category})=>({id,title,summary,category,available:selected.includes(id)}));
 const dashboards=[['analytics','Analytics'],['administration','Administration'],['operations','Operations']];
 const marks=resolve(out,'assets/identity');await mkdir(marks,{recursive:true});await copyFile(resolve(`examples/jekyll/${family}/assets/mark.svg`),resolve(marks,`${family}-mark.svg`));
 const images=resolve(out,'assets/examples');await mkdir(images,{recursive:true});
 for(const file of ['station.svg','coast.svg','notebook.svg','observations.csv']) await copyFile(resolve('examples/page-archetypes/jekyll/assets/examples',file),resolve(images,file));
 for(const page of pages){
  const dir=resolve(out,'examples',page.id);await mkdir(dir,{recursive:true});
  const needsSpecial=requiresSpecial(page.id);
  const pageRendered=Object.fromEntries(page.sections.filter(section=>section.body).map(section=>[`${page.id}-${section.id}`,rendered[`${page.id}-${section.id}`]]));
  const data={id:page.id,page,rendered:pageRendered,entries:page.sections.some(section=>section.kind==='search')?entries:[],requiresSpecial:needsSpecial};
  const markup=renderToString(React.createElement(App,{data,...(needsSpecial?{special:renderSpecial}:{})}));
  const css=needsSpecial?manifest['src/special.tsx']?.css:[];if(needsSpecial&&!css?.length)throw Error('Missing interactive stylesheet in build manifest');
  const styles=css.map(file=>`<link rel="stylesheet" crossorigin href="${base}${file}">`).join('');
  await writeFile(resolve(dir,'index.html'),renderDocument(template,{styles:styles+pageDataElement(data),markup,title:`${page.title} · Northlight`,originalTitle:'<title>Northlight examples</title>'}));
 }
 const indexDir=resolve(out,'examples');await mkdir(indexDir,{recursive:true});
 const indexData={id:'index',page:null,rendered:{},entries,requiresSpecial:false};
 await writeFile(resolve(indexDir,'index.html'),renderDocument(template,{styles:pageDataElement(indexData),markup:renderToString(React.createElement(App,{data:indexData})),title:'All page examples · Northlight',originalTitle:'<title>Northlight examples</title>'}));
 for(const [id,name] of dashboards){
  const module=await server.ssrLoadModule(`/src/dashboard/${name}.tsx`);const dir=resolve(indexDir,`dashboard-${id}`);await mkdir(dir,{recursive:true});
  const markup=renderToString(React.createElement(DashboardFrame,{current:id},React.createElement(module[name])));
  const css=manifest[`src/dashboard/${name}.tsx`]?.css;if(!css?.length)throw Error(`Missing ${name} stylesheet in build manifest`);
  const styles=css.map(file=>`<link rel="stylesheet" crossorigin href="${base}${file}">`).join('');
  await writeFile(resolve(dir,'index.html'),renderDocument(dashboardTemplate,{styles,markup,title:`${name} · Northlight`,originalTitle:'<title>Northlight dashboard</title>'}));
 }
 const {ScientificPage}=await server.ssrLoadModule('/src/scientific/Page.tsx');
 const scientificDir=resolve(indexDir,'scientific-workspace');await mkdir(scientificDir,{recursive:true});
 await writeFile(resolve(scientificDir,'index.html'),renderDocument(scientificTemplate,{markup:renderToString(React.createElement(ScientificPage)),title:'Thermal analysis · Northlight',originalTitle:'<title>Northlight scientific workspace</title>'}));
 // Generic entries cannot render unknown routes; publish only actual records.
 const {rm}=await import('node:fs/promises');await rm(resolve(out,'index.html'));await rm(resolve(out,'dashboard.html'));await rm(resolve(out,'scientific.html'));
 console.log(`${family}: prerendered ${pages.length} content routes, three dashboards, a scientific workspace and an index at ${base}`);
} finally {await server.close();}
