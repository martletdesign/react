import {hydrateRoot} from 'react-dom/client';
import {ScientificPage} from './Page';
const relative=location.pathname.slice(import.meta.env.BASE_URL.replace(/\/$/,'').length);
if(!/^\/examples\/scientific-workspace\/?$/.test(relative))throw Error('Unknown scientific workspace path');
hydrateRoot(document.getElementById('root')!,<ScientificPage/>);
