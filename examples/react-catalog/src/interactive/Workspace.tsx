import {useEffect,useId,useRef,useState} from 'react';
import {Button} from 'catalog-family';
import './workspace.css';
export type WorkspaceItem={id:string;title:string;summary:string;status:string;owner:string};
export type WorkspaceSection={id:string;title:string;items:WorkspaceItem[]};
export function Workspace({section}:{section:WorkspaceSection}) {
 const id=useId(),filterId=`workspace-filter-${id}`,detailId=`workspace-detail-${id}`;
 const filterRef=useRef<HTMLInputElement>(null);
 const [enhanced,setEnhanced]=useState(false),[query,setQuery]=useState(''),[active,setActive]=useState<string|null>(null),[reviewed,setReviewed]=useState<Set<string>>(new Set()),[message,setMessage]=useState('Local demonstration. No changes are saved.'),[filteredOut,setFilteredOut]=useState(false);
 useEffect(()=>setEnhanced(true),[]);
 const matches=(item:WorkspaceItem,status:string,value:string)=>{const needle=value.trim().toLocaleLowerCase();return [`${item.title} ${status} ${item.summary} ${item.id} ${item.owner}`,`${item.id} · ${item.owner}`].some(text=>text.toLocaleLowerCase().includes(needle));};
 const visible=section.items.filter(item=>matches(item,reviewed.has(item.id)?'Reviewed locally':item.status,query));
 const selected=section.items.find(item=>item.id===active);
 const changeQuery=(value:string)=>{setQuery(value);const item=section.items.find(entry=>entry.id===active);if(item&&!matches(item,reviewed.has(item.id)?'Reviewed locally':item.status,value)){setActive(null);setFilteredOut(true);}};
 const select=(item:WorkspaceItem)=>{setActive(item.id);setFilteredOut(false);setMessage(`Selected ${item.title}. Changes affect this preview only.`);};
 const review=()=>{if(!active)return;const item=section.items.find(entry=>entry.id===active);if(!item)return;setReviewed(old=>new Set(old).add(active));if(!matches(item,'Reviewed locally',query)){setActive(null);setFilteredOut(true);setMessage('Marked reviewed in page memory. The record no longer matches this filter. No server record was changed.');filterRef.current?.focus();}else setMessage('Marked reviewed in page memory. No server record was changed.');};
 const reset=()=>{setReviewed(new Set());setActive(null);setFilteredOut(false);setQuery('');setMessage('Demonstration reset. No changes were saved.');};
 return <><div className="react-workspace" data-workspace={section.id}>
  <div><label htmlFor={filterId}>Filter records</label><input ref={filterRef} id={filterId} type="search" value={query} onChange={event=>changeQuery(event.target.value)} disabled={!enhanced}/><p role="status">{enhanced?`${visible.length} of ${section.items.length} records shown.`:''}</p>
   <ul className="rw-records">{section.items.map(item=><li key={item.id} hidden={!visible.includes(item)}><Button type="button" aria-pressed={active===item.id} onClick={()=>select(item)} disabled={!enhanced}>{item.title}</Button> <span>{reviewed.has(item.id)?'Reviewed locally':item.status}</span><p>{item.summary}</p><p>{item.id} · {item.owner}</p></li>)}</ul>
  </div><section aria-label={`Selected record — ${section.title}`}><h3 id={detailId}>Selected record</h3><div>{selected?<><p>{selected.title}</p><p>{reviewed.has(selected.id)?'Reviewed locally':selected.status}</p><p>{selected.summary}</p><p>{selected.id} · {selected.owner}</p></>:<p>{filteredOut?'The selected record is outside this filter. Select a visible record.':'Select a record to inspect it.'}</p>}</div>
  <div className="rw-actions"><Button type="button" onClick={review} disabled={!enhanced||!active}>Mark reviewed locally</Button><Button type="button" variant="secondary" onClick={reset} disabled={!enhanced}>Reset demonstration</Button></div><p role="status">{message}</p></section>
 </div><noscript><p>The full record list is shown above. Selection and local review require JavaScript.</p></noscript></>;
}
