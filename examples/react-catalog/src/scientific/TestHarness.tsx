import {AppShell,family} from 'catalog-family';
import {ScientificWorkspace} from './Workspace';
export function ScientificHarness(){return <div className={family} {...{[`data-${family}`]:'light'}}><AppShell brand="Northlight" navigationPlacement="none"><h1>Thermal analysis</h1><ScientificWorkspace/></AppShell></div>}
