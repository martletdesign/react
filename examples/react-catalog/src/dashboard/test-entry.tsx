import {hydrateRoot} from 'react-dom/client';
import {AppShell,family} from 'catalog-family';
import {Analytics} from './Analytics';
export function TestApp(){return <div className={family} {...{[`data-${family}`]:'light'}}><AppShell brand="Northlight Field Institute" navigationPlacement="none"><Analytics/></AppShell></div>}
hydrateRoot(document.getElementById('root')!,<TestApp/>);
