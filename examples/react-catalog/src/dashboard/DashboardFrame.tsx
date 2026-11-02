import type {ReactNode} from 'react';
import {SourceShell} from '../shell/SourceShell';
import {DashboardNav,DashboardPeerLink,type DashboardRoute} from './DashboardNav';
import './dashboard-frame.css';
declare const __NIGHTJAR_PEER__:string;
export function DashboardFrame({current,children}:{current:DashboardRoute;children:ReactNode}) {
 return <SourceShell dashboard>
  <div className="rd-workspace"><DashboardNav current={current}/><div className="rd-content"><DashboardPeerLink current={current} peerBase={__NIGHTJAR_PEER__}/>{children}</div></div>
 </SourceShell>;
}
