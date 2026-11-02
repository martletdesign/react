import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {extname,join,resolve,sep} from 'node:path';
import {chromium,firefox,webkit} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {bounded,OPERATION_TIMEOUT_MS,NAVIGATION_TIMEOUT_MS,SCRIPT_TIMEOUT_MS} from '../gallery-browser-runtime.mjs';

const [archiveRoot,prefix='',family]=process.argv.slice(2),version=JSON.parse(await readFile('package.json','utf8')).version,base=`${prefix}/docs/v/${version}/`;
if(!archiveRoot||!['martlet','krigsvold'].includes(family)||!['','/preview'].includes(prefix))throw Error('Usage: browser-check.mjs ARCHIVE_ROOT [PREFIX] FAMILY');
const engine=process.env.DESIGN_BROWSER??'chromium';assert.ok(['chromium','firefox','webkit'].includes(engine));
let phase='startup';
const run=(operation,work,timeoutMs=OPERATION_TIMEOUT_MS)=>{phase=operation;return bounded(operation,work,{timeoutMs,log:event=>console.log(JSON.stringify({suite:'archive',family,engine,prefix,...event}))});};
const watchdog=setTimeout(()=>{console.error(JSON.stringify({suite:'archive',family,engine,prefix,operation:phase,state:'failed',error:`Browser script exceeded ${SCRIPT_TIMEOUT_MS}ms`}));process.exit(1);},SCRIPT_TIMEOUT_MS);
watchdog.unref();

const root=resolve(archiveRoot,version),catalog={family,framework:'react',latestStable:version,versions:[{version,channel:'stable',supported:true,topics:['index.html','examples/article/index.html']},{version:'1.0.0',channel:'stable',supported:false,topics:['index.html']}]};
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.woff2':'font/woff2','.json':'application/json'};
const server=createServer(async(req,res)=>{try{
  const path=new URL(req.url,'http://localhost').pathname;
  if(path===`${prefix}/docs/catalog.json`){res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify(catalog));return;}
  if(path===`${prefix}/docs/versions/`){res.writeHead(200,{'Content-Type':'text/html'}).end(`<h1>React documentation versions</h1><a href="${prefix}/docs/v/3.0.0/">v3.0.0</a>`);return;}
  if(path.startsWith(`${prefix}/docs/v/1.0.0/`)){res.writeHead(200,{'Content-Type':'text/html'}).end('<h1>Earlier version</h1>');return;}
  if(!path.startsWith(base)){res.writeHead(404).end();return;}
  let tail=decodeURIComponent(path.slice(base.length));if(!tail||tail.endsWith('/'))tail+='index.html';
  const file=resolve(root,tail);if(!file.startsWith(root+sep)){res.writeHead(403).end();return;}
  const bytes=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream'}).end(bytes);
}catch{res.writeHead(404).end();}});
await run('server.listen',()=>new Promise((done,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',done);}));const origin=`http://127.0.0.1:${server.address().port}`;
const launchOptions=engine==='chromium'&&process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{};
const browser=await run('browser.launch',()=>({chromium,firefox,webkit})[engine].launch({...launchOptions,timeout:NAVIGATION_TIMEOUT_MS}),NAVIGATION_TIMEOUT_MS);
try{
  for(const enabled of [false,true]){
    console.log(`Checking ${engine} at ${base}, JavaScript ${enabled?'enabled':'disabled'}`);
    const context=await run('context.new '+enabled,()=>browser.newContext({javaScriptEnabled:enabled}));
    context.setDefaultTimeout(OPERATION_TIMEOUT_MS);context.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);
    const page=await run('page.new '+enabled,()=>context.newPage()),assetFailures=[];
    page.on('response',response=>{if(response.url().startsWith(origin)&&response.status()>=400)assetFailures.push(`${response.status()} ${response.url()}`);});
    page.on('requestfailed',request=>{if(request.url().startsWith(origin)&&!(!enabled&&['net::ERR_ABORTED','csp'].includes(request.failure()?.errorText)))assetFailures.push(`failed ${request.url()}: ${request.failure()?.errorText}`);});
    try {
      const response=await run('page.goto '+enabled,()=>page.goto(`${origin}${base}examples/article/`),NAVIGATION_TIMEOUT_MS);assert.equal(response.status(),200);
      // Network idle waits for fonts and assets without relying on an in-page
      // promise, which can hang in Firefox with JavaScript disabled.
      await run('networkidle '+enabled,()=>page.waitForLoadState('networkidle',{timeout:15000}));
      for(const url of await page.locator('script[src],link[rel=modulepreload],link[rel=stylesheet]').evaluateAll(nodes=>nodes.map(n=>n.src||n.href))){if(url.startsWith(origin)){const asset=await run('asset.get '+url,()=>context.request.get(url,{timeout:OPERATION_TIMEOUT_MS}));assert.equal(asset.status(),200,`Missing asset ${url}`);}}
      const nav=page.getByRole('navigation',{name:'Documentation versions'});assert.equal(await nav.count(),1);
      assert.equal(await nav.getByRole('link',{name:/current/}).getAttribute('aria-current'),'page');
      const all=nav.getByRole('link',{name:'All documentation versions'});assert.equal(await all.getAttribute('href'),`${prefix}/docs/versions/`);
      assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/noindex/);
      if(enabled){
        const earlier=nav.getByRole('link',{name:/v1\.0\.0/});await earlier.waitFor();
        assert.equal(await earlier.getAttribute('href'),`${prefix}/docs/v/1.0.0/`);
        assert.match(await earlier.textContent(),/unsupported/);
        await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.activeElement?.tagName==='A'));
        const result=await run('axe.analyze',()=>new AxeBuilder({page}).analyze(),45_000);assert.deepEqual(result.violations.map(x=>x.id),[]);
        await earlier.click();assert.equal(new URL(page.url()).pathname,`${prefix}/docs/v/1.0.0/`);
      } else {await all.click();assert.equal(new URL(page.url()).pathname,`${prefix}/docs/versions/`);assert.equal(await page.getByRole('link',{name:'v3.0.0'}).getAttribute('href'),`${prefix}/docs/v/3.0.0/`);}
      assert.deepEqual(assetFailures,[], 'Archived local assets must resolve');
    } finally {await run('context.close '+enabled,()=>context.close(),5_000);}
  }
}finally{await run('browser.close',()=>browser.close(),5_000);server.closeAllConnections();await run('server.close',()=>new Promise((done,reject)=>server.close(error=>error?reject(error):done())),5_000);clearTimeout(watchdog);}
console.log(`${family} ${engine} version navigation passed under ${prefix||'/'} with and without JavaScript`);
