import {hydrateRoot} from 'react-dom/client';
import {ScientificPage} from './Page';
import {catalogRouteId} from '../route.mjs';
if(catalogRouteId(location.pathname,import.meta.env.BASE_URL)!=='scientific-workspace')throw Error('Unknown scientific workspace path');
hydrateRoot(document.getElementById('root')!,<ScientificPage/>);
