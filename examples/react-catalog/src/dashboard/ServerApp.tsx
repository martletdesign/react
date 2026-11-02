import {AppShell,family} from 'catalog-family';
import {Analytics} from './Analytics';
export function ServerApp(){return <div className={family} {...{[`data-${family}`]:'light'}}><AppShell brand="Northlight Field Institute" navigationPlacement="none"><Analytics/></AppShell></div>}
