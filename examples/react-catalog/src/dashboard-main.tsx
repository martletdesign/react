import {hydrateRoot} from 'react-dom/client';
import {DashboardFrame} from './dashboard/DashboardFrame';
import {catalogRouteId} from './route.mjs';
const current=catalogRouteId(location.pathname,import.meta.env.BASE_URL)?.match(/^dashboard-(analytics|administration|operations)$/)?.[1];
if(current!=='analytics'&&current!=='administration'&&current!=='operations')throw Error('Unknown dashboard route');
const load={analytics:()=>import('./dashboard/Analytics').then(m=>m.Analytics),administration:()=>import('./dashboard/Administration').then(m=>m.Administration),operations:()=>import('./dashboard/Operations').then(m=>m.Operations)};
load[current]().then(Screen=>hydrateRoot(document.getElementById('root')!,<DashboardFrame current={current}><Screen/></DashboardFrame>));
