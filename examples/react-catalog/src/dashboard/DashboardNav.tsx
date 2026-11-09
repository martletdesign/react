import {validBase} from '../base.mjs';
import {useEffect,useId,useRef,useState,type MouseEvent,type PointerEvent,type FocusEvent} from 'react';
import {Button,family} from 'catalog-family';
import {peerDashboardURL} from './peer.mjs';
export type DashboardRoute='analytics'|'administration'|'operations';
const entries:{id:DashboardRoute;label:string}[]=[{id:'analytics',label:'Analytics'},{id:'administration',label:'Administration'},{id:'operations',label:'Operations'}];
export function DashboardNav({current,base=import.meta.env.BASE_URL,mode='light',onAppearance,ready=false}:{current?:DashboardRoute;base?:string;mode?:'light'|'dark';onAppearance?:()=>void;ready?:boolean}){
 if(!validBase(base))throw Error('Dashboard base must be an absolute directory path');
 const [enhanced,setEnhanced]=useState(false),[open,setOpen]=useState(false),toggle=useRef<HTMLButtonElement>(null),id=useId(),prefix=base.replace(/\/$/,'');
 useEffect(()=>setEnhanced(true),[]);
 const escape=(event:React.KeyboardEvent)=>{if(event.key==='Escape'&&open){event.preventDefault();setOpen(false);toggle.current?.focus();}};
 const destinations=<ul>{entries.map(entry=><li key={entry.id}><a href={`${prefix}/examples/dashboard-${entry.id}/`} aria-current={current===entry.id?'page':undefined}>{entry.label}</a></li>)}</ul>;
 return <aside className="rd-nav dash-sidebar" aria-label="Dashboard workspace" data-enhanced={enhanced?'true':undefined} data-open={open?'true':'false'} onKeyDown={escape}>
 <p>Northlight · Workspace</p><Button ref={toggle} className="rd-nav-toggle dash-nav-toggle" type="button" aria-controls={id} aria-expanded={open} hidden={!enhanced} onClick={()=>setOpen(!open)}>Dashboard navigation</Button>
 <nav id={id} aria-label="Dashboard navigation">{destinations}<a href={`${prefix}/examples/`}>All page examples</a>
 <div className="dashboard-ownership"><a className="dashboard-ownership__identity" href="https://jameshoward.us/" aria-label="James Howard website"><img src={`${prefix}/assets/owner.svg`} alt="" width="56" height="56"/><span><strong>Martlet React</strong><br/>A website of James Howard</span></a><p>Copyright © 2026 <span>James P. Howard, II</span></p></div></nav></aside>;
}
export function DashboardPeerLink({current,peerBase}:{current:DashboardRoute;peerBase?:string}){
 const href=peerDashboardURL(peerBase,current);if(!href)return null;
 const refresh=(event:MouseEvent<HTMLAnchorElement>|PointerEvent<HTMLAnchorElement>|FocusEvent<HTMLAnchorElement>)=>{event.currentTarget.href=peerDashboardURL(peerBase,current,location.search)!;};
 return <a href={href} onPointerEnter={refresh} onFocus={refresh} onClick={refresh} onAuxClick={refresh}>Compare in {family==='martlet'?'Krigsvold':'Martlet'}</a>;
}
