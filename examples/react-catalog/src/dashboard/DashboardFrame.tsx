import {useEffect,useState,type ReactNode} from 'react';
import {SourceShell} from '../shell/SourceShell';
import {DashboardNav,type DashboardRoute} from './DashboardNav';
export function DashboardFrame({current,children}:{current:DashboardRoute;children:ReactNode}) {
 const [ready,setReady]=useState(false);useEffect(()=>setReady(true),[]);
 return <SourceShell dashboard dashboardCurrent={current}><div className="example-root dash-app" data-dashboard={current} data-ready={ready?'true':undefined}><div className="rd-workspace dash-layout"><DashboardNav current={current}/><div className="rd-content dash-main">{children}</div></div></div></SourceShell>;
}
