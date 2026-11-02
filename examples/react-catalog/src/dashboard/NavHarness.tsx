import {AppShell,family} from 'catalog-family';
import {DashboardNav,DashboardPeerLink} from './DashboardNav';
export function NavHarness(){return <div className={family} {...{[`data-${family}`]:'light'}}><AppShell brand="Northlight" navigationPlacement="none"><DashboardNav current="analytics"/><div><h1>Analytics</h1><DashboardPeerLink current="analytics" peerBase="https://peer.example/other/"/><button type="button" onClick={()=>history.replaceState(null,'','?start=2026-10-15&category=Research')}>Set sample filter</button></div></AppShell></div>}
