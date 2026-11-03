import gateway from './worker.mjs';
import {oversizedProbes} from './streamed-probes.mjs';
// Test-only entry: construct unknown-length streams in the native Worker runtime.
// Production entry remains worker.mjs; this fixture is never deployed.
export default {async fetch(request,env){
 const url=new URL(request.url),probe=url.pathname.match(/^\/__stream_smoke\/([0-2])$/);
 if(!probe)return gateway.fetch(request,env);
 const [path,chunkSize,count]=oversizedProbes[Number(probe[1])];let produced=0,cancelled=false;
 const body=new ReadableStream({pull(controller){produced++;controller.enqueue(new Uint8Array(chunkSize));if(produced===count)controller.close();},cancel(){cancelled=true;}});
 const input=new Request(new URL('/preview'+path,url),{method:'PUT',body,headers:{authorization:'Bearer '+env.ARCHIVE_WRITE_TOKEN}});
 if(input.headers.has('content-length'))throw Error('Streamed probe must not supply Content-Length');
 const response=await gateway.fetch(input,env),headers=new Headers(response.headers);
 headers.set('x-smoke-source-chunks',String(produced));headers.set('x-smoke-source-cancelled',String(cancelled));
 return new Response(response.body,{status:response.status,headers});
}};
