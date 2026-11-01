import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {extname,join,resolve,sep} from 'node:path';
import {chromium,firefox,webkit} from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const [archiveRoot,prefix='',family]=process.argv.slice(2),version=JSON.parse(await readFile('package.json','utf8')).version,base=`${prefix}/docs/v/${version}/`;
if(!archiveRoot||!['martlet','krigsvold'].includes(family)||!['','/preview'].includes(prefix))throw Error('Usage: browser-check.mjs ARCHIVE_ROOT [PREFIX] FAMILY');
const root=resolve(archiveRoot,version),catalog={family,framework:'react',latestStable:version,versions:[{version,channel:'stable',supported:true,topics:['index.html','examples/article/index.html']},{version:'1.0.0',channel:'stable',supported:false,topics:['index.html']}]};
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.woff2':'font/woff2','.json':'application/json'};
const server=createServer(async(req,res)=>{try{
  const path=new URL(req.url,'http://localhost').pathname;
  if(path===`${prefix}/docs/catalog.json`){res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify(catalog));return;}
  if(path.startsWith(`${prefix}/docs/v/1.0.0/`)){res.writeHead(200,{'Content-Type':'text/html'}).end('<h1>Earlier version</h1>');return;}
  if(!path.startsWith(base)){res.writeHead(404).end();return;}
  let tail=decodeURIComponent(path.slice(base.length));if(!tail||tail.endsWith('/'))tail+='index.html';
  const file=resolve(root,tail);if(!file.startsWith(root+sep)){res.writeHead(403).end();return;}
  const bytes=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream'}).end(bytes);
}catch{res.writeHead(404).end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin=`http://127.0.0.1:${server.address().port}`;
const engine=process.env.DESIGN_BROWSER??'chromium';assert.ok(['chromium','firefox','webkit'].includes(engine));
const launchOptions=engine==='chromium'&&process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{};
const browser=await ({chromium,firefox,webkit})[engine].launch(launchOptions);
try{
  for(const enabled of [false,true]){
    console.log(`Checking ${engine} at ${base}, JavaScript ${enabled?'enabled':'disabled'}`);
    const context=await browser.newContext({javaScriptEnabled:enabled}),page=await context.newPage(),assetFailures=[];
    page.on('response',response=>{if(response.url().startsWith(origin)&&response.status()>=400)assetFailures.push(`${response.status()} ${response.url()}`);});
    page.on('requestfailed',request=>{if(request.url().startsWith(origin)&&!(!enabled&&['net::ERR_ABORTED','csp'].includes(request.failure()?.errorText)))assetFailures.push(`failed ${request.url()}: ${request.failure()?.errorText}`);});
    try {
      const response=await page.goto(`${origin}${base}examples/article/`);assert.equal(response.status(),200);
      // Network idle waits for fonts and assets without relying on an in-page
      // promise, which can hang in Firefox with JavaScript disabled.
      await page.waitForLoadState('networkidle',{timeout:15000});
      for(const url of await page.locator('script[src],link[rel=modulepreload],link[rel=stylesheet]').evaluateAll(nodes=>nodes.map(n=>n.src||n.href))){if(url.startsWith(origin)){const asset=await context.request.get(url);assert.equal(asset.status(),200,`Missing asset ${url}`);}}
      const nav=page.getByRole('navigation',{name:'Documentation versions'});assert.equal(await nav.count(),1);
      assert.equal(await nav.getByRole('link',{name:/current/}).getAttribute('aria-current'),'page');
      assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/noindex/);
      if(enabled){
        const earlier=nav.getByRole('link',{name:/v1\.0\.0/});await earlier.waitFor();
        assert.equal(await earlier.getAttribute('href'),`${prefix}/docs/v/1.0.0/`);
        assert.match(await earlier.textContent(),/unsupported/);
        await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.activeElement?.tagName==='A'));
        const result=await new AxeBuilder({page}).analyze();assert.deepEqual(result.violations.map(x=>x.id),[]);
        await earlier.click();assert.equal(new URL(page.url()).pathname,`${prefix}/docs/v/1.0.0/`);
      }
      assert.deepEqual(assetFailures,[], 'Archived local assets must resolve');
    } finally {await context.close();}
  }
}finally{await browser.close();server.closeAllConnections();await new Promise(done=>server.close(done));}
console.log(`${family} ${engine} version navigation passed under ${prefix||'/'} with and without JavaScript`);
