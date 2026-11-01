import {AppShell,family} from 'catalog-family';
import {Administration} from './Administration';
export function AdminServerApp(){return <div className={family} {...{[`data-${family}`]:'light'}}><AppShell brand="Northlight Field Institute" navigationPlacement="none" navigation={null} utilities={null}><Administration/></AppShell></div>}
