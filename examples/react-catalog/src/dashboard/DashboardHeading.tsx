import {DashboardPeerLink,type DashboardRoute} from './DashboardNav';
declare const __NIGHTJAR_PEER__:string;
type Props={current:DashboardRoute;title:string;summary:string;snapshot:string;snapshotLabel:string|null};
export function DashboardHeading({current,title,summary,snapshot,snapshotLabel}:Props) {
 return <><header className="dash-heading"><p className="eyebrow">Dashboards</p><h1>{title}</h1><p>{summary}</p></header>
 <p>Snapshot: {snapshotLabel?<time dateTime={snapshot}>{snapshotLabel}</time>:<span>Invalid snapshot timestamp</span>} <DashboardPeerLink current={current} peerBase={__NIGHTJAR_PEER__}/></p></>;
}
