import {readFile} from 'node:fs/promises';
import {verifyCheckpointState} from '../../infra/docs-archive/checkpoint-state.mjs';
const [assetPath,expectedSha256,expectedCommit,expectedCatalogHeadSha256,expectedPromotionHeadSha256,base]=process.argv.slice(2);
if(!assetPath||!expectedSha256||!expectedCommit||!expectedCatalogHeadSha256||!expectedPromotionHeadSha256||!base)throw Error('Usage: checkpoint-state-cli.mjs ASSET CHECKPOINT_SHA COMMIT CATALOG_HEAD PROMOTION_HEAD ARCHIVE_HTTPS_BASE');
const {family}=JSON.parse(await readFile('docs-release-lock.json','utf8'));
const result=await verifyCheckpointState({assetPath,expectedSha256,expectedCommit,expectedCatalogHeadSha256,expectedPromotionHeadSha256:expectedPromotionHeadSha256==='none'?null:expectedPromotionHeadSha256,base,family,repository:process.env.GITHUB_REPOSITORY,tag:process.env.RELEASE_TAG});
console.log(JSON.stringify({verified:true,...result}));
