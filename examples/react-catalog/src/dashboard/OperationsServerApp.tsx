import {AppShell,family} from 'catalog-family';
import {Operations} from './Operations';
export function OperationsServerApp(){return <div className={family} {...{[`data-${family}`]:'light'}}><AppShell brand="Northlight Field Institute" navigationPlacement="none"><Operations/></AppShell></div>}
