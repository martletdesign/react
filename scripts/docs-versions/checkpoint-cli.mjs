import {readFile,writeFile} from 'node:fs/promises';
import {checkpointBytes,verifyCheckpoint} from '../../infra/docs-archive/checkpoint.mjs';
const [command,path,pin,source]=process.argv.slice(2),env=process.env;
const lock=JSON.parse(await readFile('docs-release-lock.json','utf8'));
const identity={family:lock.family,repository:env.GITHUB_REPOSITORY,tag:env.RELEASE_TAG,expectedCommit:source};
if(command==='prepare'){
  if(!path||!pin||!source)throw Error('Usage: checkpoint-cli.mjs prepare OUTPUT INPUT_JSON EXPECTED_COMMIT');
  const value=JSON.parse(await readFile(pin,'utf8'));const bytes=checkpointBytes(value,identity);
  await writeFile(path,bytes,{flag:'wx',mode:0o600});console.log('Checkpoint candidate created; no release was changed.');
}else if(command==='verify'){
  if(!path||!pin||!source)throw Error('Usage: checkpoint-cli.mjs verify ASSET_PATH PINNED_SHA256 EXPECTED_COMMIT');
  const result=await verifyCheckpoint({...identity,assetPath:path,expectedSha256:pin});console.log(JSON.stringify({verified:true,tag:identity.tag,sha256:result.sha256}));
}else throw Error('Unknown checkpoint operation');
