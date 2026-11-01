import {hydrateRoot} from 'react-dom/client';
import {AppShell,family} from 'catalog-family';
import {Operations} from './Operations';
export function OperationsTestApp(){return <div className={family} {...{[`data-${family}`]:'light'}}><AppShell brand="Northlight Field Institute" navigationPlacement="none"><Operations/></AppShell></div>}
hydrateRoot(document.getElementById('root')!,<OperationsTestApp/>);
