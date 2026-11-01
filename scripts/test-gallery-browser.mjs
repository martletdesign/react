import { chromium,firefox,webkit } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname,resolve,relative } from 'node:path';
import assert from 'node:assert/strict';
import {validBase} from '../examples/react-catalog/src/base.mjs';
const root=resolve('examples/react-catalog/dist/martlet');
const base=process.env.NIGHTJAR_BASE||'/';
if(!validBase(base)) throw Error('Invalid base');
const engine=process.env.DESIGN_BROWSER||'chromium';
if(!['chromium','firefox','webkit'].includes(engine)) throw Error('Invalid engine');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff'};
const server=createServer(async(req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(!pathname.startsWith(base)){res.writeHead(404).end();return;}
 const name=pathname.slice(base.length), file=resolve(root,name+(pathname.endsWith('/')?'index.html':''));
 if(relative(root,file).startsWith('..')){res.writeHead(404).end();return;}
 try{const body=await readFile(file);res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'}).end(body);}catch{res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin=`http://127.0.0.1:${server.address().port}`;
const executablePath=engine==='chromium'?process.env.PLAYWRIGHT_EXECUTABLE_PATH:undefined;
let browser;
try{
 browser=await ({chromium,firefox,webkit})[engine].launch(executablePath?{executablePath}:{});
 for(const js of [true,false]){
  const context=await browser.newContext({javaScriptEnabled:js,viewport:{width:320,height:720}});
  for(const route of ['examples/','examples/article/','examples/dashboard-analytics/','examples/scientific-workspace/']){
   const page=await context.newPage(), failures=[];
   page.on('pageerror',e=>failures.push(e.message));
   page.on('response',r=>{if(r.url().startsWith(origin)&&r.status()>=400)failures.push(`${r.status()} ${r.url()}`);});
   const response=await page.goto(origin+base+route);assert.equal(response.status(),200,route);
   assert.ok(await page.getByRole('heading',{level:1}).count(),route);
   await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,route+' reflow');
   if(js && route==='examples/article/') {const a=await new AxeBuilder({page}).analyze();assert.deepEqual(a.violations.map(v=>v.id),[]);}
   assert.deepEqual(failures,[],route);await page.close();
  }
  await context.close();
 }
 console.log('martlet: '+engine+' gallery browser checks passed at '+base);
}finally{await browser?.close();server.closeAllConnections();await new Promise(done=>server.close(done));}
