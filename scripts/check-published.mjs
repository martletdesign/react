import { registryState } from './tag-release-guard.mjs';
const state = await registryState(url => fetch(url, {signal:AbortSignal.timeout(15000), redirect:'error'}), 'https://registry.npmjs.org/', '@martlet/react', '0.1.0');
if (state !== 'present') throw Error(`Published release was not classified present: ${state}`);
console.log('Existing published package version is rejected');
