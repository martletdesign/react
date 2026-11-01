import {useEffect,useId,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {family} from 'catalog-family';
import './source-shell.css';
const base=import.meta.env.BASE_URL.replace(/\/$/,'');
const href=(path:string)=>`${base}${path}`;
type Props={children:ReactNode;current?:string;title?:string;dashboard?:boolean};
export function SourceShell({children,current,title,dashboard=false}:Props){
 const [mode,setMode]=useState<'light'|'dark'>('light'),[enhanced,setEnhanced]=useState(false),[open,setOpen]=useState(false),menu=useRef<HTMLButtonElement>(null),id=useId();
 useEffect(()=>{try{setMode(localStorage.getItem('nightjar-appearance')==='dark'?'dark':'light')}catch{}setEnhanced(true)},[]);
 const changeMode=()=>setMode(old=>{const next=old==='light'?'dark':'light';try{localStorage.setItem('nightjar-appearance',next)}catch{}return next});
 const links=[['Home','/examples/home/','home'],['About','/examples/about/','about'],['Archive','/examples/archive/','archive'],['Examples','/examples/','index']] as const;
 const tokens=Object.fromEntries(['font-sans','font-serif','font-display','bg','text','line'].map(key=>[`--ss-${key}`,`var(--${family}-${key})`])) as CSSProperties;
 return <div className={`${family} source-shell ${dashboard?'source-shell--dashboard':'source-shell--reading'} ${family==='krigsvold'?'source-shell--aligned':'source-shell--editorial'}`} {...{[`data-${family}`]:mode}} data-mode={mode} data-enhanced={enhanced?'true':undefined} data-open={open?'true':'false'} style={tokens}>
  <a className="ss-skip" href="#main">Skip to content</a><header className="ss-header" onKeyDown={event=>{if(event.key==='Escape'&&open){event.preventDefault();setOpen(false);menu.current?.focus()}}}><div className="ss-header-inner">
   <a className="ss-brand" href={href('/examples/')}><img src={href(`/assets/identity/${family}-mark.svg`)} width="40" height="40" alt=""/><span>{family==='martlet'?'Martlet':'Krigsvold'} examples</span></a>
   <button ref={menu} className="ss-menu" type="button" aria-expanded={open} aria-controls={id} hidden={!enhanced} onClick={()=>setOpen(!open)}>Menu</button>
   <nav id={id} aria-label="Primary navigation"><ul>{links.map(([label,path,key])=><li key={key}><a href={href(path)} aria-current={current===key?'page':undefined}>{label}</a></li>)}</ul><button type="button" className="ss-appearance" disabled={!enhanced} aria-pressed={mode==='dark'} onClick={changeMode}>{mode==='dark'?'Light mode':'Dark mode'}</button></nav>
  </div></header>
  {!dashboard&&current!=='home'&&<nav className="ss-breadcrumb" aria-label="Breadcrumb"><a href={href('/examples/home/')}>Home</a><span aria-hidden="true"> / </span>{current!=='index'&&<><a href={href('/examples/')}>Examples</a><span aria-hidden="true"> / </span></>}{title&&<span aria-current="page">{title}</span>}</nav>}
  <main id="main" tabIndex={-1}>{children}</main>
  <footer className="ss-footer"><div className="ss-footer-inner"><div><strong>Northlight Field Institute</strong><p>Fictional example using synthetic content.</p></div><nav aria-label="Explore"><h2>Explore</h2><ul>{links.map(([label,path,key])=><li key={key}><a href={href(path)}>{label}</a></li>)}</ul></nav><nav aria-label="Dashboards"><h2>Dashboards</h2><ul>{(['analytics','administration','operations'] as const).map(route=><li key={route}><a href={href(`/examples/dashboard-${route}/`)}>{route[0].toUpperCase()+route.slice(1)}</a></li>)}</ul></nav></div></footer>
 </div>;
}
