import {useEffect,useState,type ReactNode} from 'react';
import {SourceShell} from '../shell/SourceShell';
import {DashboardNav,DashboardPeerLink,type DashboardRoute} from './DashboardNav';
declare const __NIGHTJAR_PEER__:string;
export function DashboardFrame({current,children}:{current:DashboardRoute;children:ReactNode}) {
 const [ready,setReady]=useState(false);useEffect(()=>setReady(true),[]);
 return <SourceShell dashboard dashboardCurrent={current}><div className="example-root dash-app" data-dashboard={current} data-ready={ready?'true':undefined}><div className="rd-workspace dash-layout"><DashboardNav current={current}/><div className="rd-content dash-main"><DashboardPeerLink current={current} peerBase={__NIGHTJAR_PEER__}/>{children}</div></div></div></SourceShell>;
}
