import {rmSync,mkdirSync,copyFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
rmSync('dist',{recursive:true,force:true});mkdirSync('dist',{recursive:true});
const result=spawnSync(process.execPath,['node_modules/typescript/bin/tsc','-p','tsconfig.json'],{stdio:'inherit'});if(result.status!==0)process.exit(result.status??1);copyFileSync('src/styles.css','dist/styles.css');
