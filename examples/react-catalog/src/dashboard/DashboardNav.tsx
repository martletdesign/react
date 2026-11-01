import {useEffect,useId,useRef,useState,type MouseEvent,type PointerEvent,type FocusEvent,type CSSProperties} from 'react';
import {Button,family} from 'catalog-family';
import {peerDashboardURL} from './peer.mjs';
import './dashboard-nav.css';
export type DashboardRoute='analytics'|'administration'|'operations';
const entries:{id:DashboardRoute;label:string}[]=[{id:'analytics',label:'Analytics'},{id:'administration',label:'Administration'},{id:'operations',label:'Operations'}];
function routeBase(base:string){if(!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base))throw Error('Dashboard base must be an absolute directory path');return base.replace(/\/$/,'');}
export function DashboardNav({current,base=import.meta.env.BASE_URL}:{current:DashboardRoute;base?:string}){
 const [enhanced,setEnhanced]=useState(false),[open,setOpen]=useState(false),toggle=useRef<HTMLButtonElement>(null),id=useId(),prefix=routeBase(base);
 const tokens=Object.fromEntries(['text','bg','panel','line','link','accent'].map(name=>[`--rd-${name}`,`var(--${family}-${name})`])) as CSSProperties;
 useEffect(()=>setEnhanced(true),[]);
 return <aside className={`rd-nav ${family==='krigsvold'?'rd-nav--aligned':''}`} style={tokens} aria-label="Dashboard workspace" data-enhanced={enhanced?'true':undefined} data-open={open?'true':'false'} onKeyDown={event=>{if(event.key==='Escape'&&open){event.preventDefault();setOpen(false);toggle.current?.focus();}}}>
  <p>Northlight · Workspace</p><Button ref={toggle} className="rd-nav-toggle" type="button" aria-controls={id} aria-expanded={open} hidden={!enhanced} onClick={()=>setOpen(!open)}>Dashboard navigation</Button>
  <nav id={id} aria-label="Dashboard navigation"><ul>{entries.map(entry=><li key={entry.id}><a href={`${prefix}/examples/dashboard-${entry.id}/`} aria-current={current===entry.id?'page':undefined}>{entry.label}</a></li>)}</ul><p>One dataset. Two design languages.</p><a href={`${prefix}/examples/`}>All page examples</a></nav>
 </aside>;
}
export function DashboardPeerLink({current,peerBase}:{current:DashboardRoute;peerBase?:string}){
 const href=peerDashboardURL(peerBase,current);if(!href)return null;
 const refresh=(event:MouseEvent<HTMLAnchorElement>|PointerEvent<HTMLAnchorElement>|FocusEvent<HTMLAnchorElement>)=>{event.currentTarget.href=peerDashboardURL(peerBase,current,location.search)!;};
 return <a href={href} onPointerEnter={refresh} onFocus={refresh} onClick={refresh} onAuxClick={refresh}>Compare in {family==='martlet'?'Krigsvold':'Martlet'}</a>;
}
