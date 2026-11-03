import {useEffect,useRef,useState} from 'react';
import {Article,DefinitionList,Pagination,DataTable,Disclosure,family} from 'catalog-family';
import type {CatalogPageData,CatalogEntry} from './data-types';
const specialKinds=['gallery','workspace','chat','sensors','scene'];
import type {ReactNode} from 'react';
import {exampleImage} from './assets';
import {DemoForm,Search} from './interactive';
import './style.css';
import {SourceShell} from './shell/SourceShell';
import {formatCatalogDate} from '../../page-archetypes/lib/catalog-date.mjs';
import {isValidEventDateTime,isEventEndBeforeStart} from '../../page-archetypes/lib/event-time.mjs';

type Item={title:string;summary:string;url:string;date?:string;tag?:string;question?:string;answer?:string;label?:string;value?:string;price?:string;features?:string[];action?:{label:string;url:string;download?:string}};
type Section={id:string;title:string;kind?:string;body?:string;items?:Item[];facts?:{label:string;value:string}[];actions?:{label:string;url:string;download?:string}[];headers?:string[];rows?:string[][];image?:string;alt?:string;caption?:string;form?:string};
const base=import.meta.env.BASE_URL.replace(/\/$/,'');
const href=(url:string)=>url.startsWith('/')&&!url.startsWith('//') ? `${base}${url}` : url;
function Listing({items,title}:{items:Item[];title:string}) {
 const [page,setPage]=useState(1),[enhanced,setEnhanced]=useState(false);
 const nav=useRef<HTMLElement>(null),pendingFocus=useRef(false);
 useEffect(()=>setEnhanced(true),[]);
 const pageCount=Math.ceil(items.length/3);
 useEffect(()=>{if(!pendingFocus.current)return;pendingFocus.current=false;const buttons=nav.current?.querySelectorAll('button');if(page===1)buttons?.[1]?.focus();else if(page===pageCount)buttons?.[0]?.focus();},[page,pageCount]);
 return <><ul className="recipe-listing">{items.map((item,i)=><li key={item.url} hidden={enhanced&&pageCount>1&&(i<3*(page-1)||i>=3*page)}>
  {(item.date||item.tag)&&<p className="recipe-meta">{item.date&&(formatCatalogDate(item.date)?<time dateTime={item.date}>{formatCatalogDate(item.date)}</time>:<span>Invalid date: {item.date}</span>)}{item.date&&item.tag?' · ':''}{item.tag}</p>}
  <h3><a href={href(item.url)}>{item.title}</a></h3><p>{item.summary}</p>
 </li>)}</ul>{enhanced&&pageCount>1&&<Pagination ref={nav} page={page} pageCount={pageCount} onPageChange={next=>{pendingFocus.current=true;setPage(next);}} label={`${title} pages`}/>}</>;
}
function SectionView({section,pageId,special,bodies,entries}:{section:Section;pageId:string;special?:(section:unknown)=>ReactNode;bodies:Record<string,string>;entries:CatalogEntry[]}){
 return <section data-section={section.id} {...(section.kind==='table'?{'aria-label':`${section.title} section`}:{'aria-labelledby':section.id})}><h2 id={section.id} tabIndex={-1}>{section.title}</h2>
  {section.body&&<div className="recipe-prose" dangerouslySetInnerHTML={{__html:bodies[`${pageId}-${section.id}`]}}/>}
  {section.kind==='cards'&&<ul className="recipe-cards">{section.items!.map(item=><li key={item.url}><h3><a href={href(item.url)}>{item.title}</a></h3><p>{item.summary}</p></li>)}</ul>}
  {section.kind==='facts'&&<DefinitionList items={section.facts!.map((fact,i)=>({id:`${section.id}-${i}`,term:fact.label,description:fact.value}))}/>}
  {section.kind==='listing'&&<Listing title={section.title} items={section.items!}/>}
  {section.kind==='figure'&&<figure><img src={exampleImage(section.image!)} alt={section.alt!} width="960" height="640" loading="lazy"/><figcaption>{section.caption}</figcaption></figure>}
  {section.kind==='faq'&&<div>{section.items!.map((item,i)=><Disclosure key={i} summary={item.question}>{item.answer}</Disclosure>)}</div>}
  {section.kind==='stats'&&<DefinitionList items={section.items!.map((item,i)=>({id:`${section.id}-${i}`,term:item.label!,description:item.value!}))}/>}
  {section.kind==='plans'&&<div className="recipe-cards">{section.items!.map(item=><article key={item.title}><h3>{item.title}</h3><p>{item.price}</p><p>{item.summary}</p><ul>{item.features!.map(feature=><li key={feature}>{feature}</li>)}</ul><a className={`${family}-button ${family}-button--primary recipe-action`} href={href(item.action!.url)} download={item.action!.download}>{item.action!.label}</a></article>)}</div>}
  {section.kind==='form'&&<DemoForm kind={section.form!}/>}
  {section.kind==='search'&&<Search entries={entries} title={section.title}/>}
  {section.kind&&specialKinds.includes(section.kind) && (special ? special(section) : (()=>{throw Error(`Missing interactive renderer for ${section.kind}`)})())}
  {section.kind==='table'&&<DataTable caption={section.title}><thead><tr>{section.headers!.map(header=><th key={header} scope="col">{header}</th>)}</tr></thead><tbody>{section.rows!.map((row,i)=><tr key={i}>{row.map((cell,j)=>j===0?<th key={j} scope="row">{cell}</th>:<td key={j}>{cell}</td>)}</tr>)}</tbody></DataTable>}
  {section.actions&&<ul className="recipe-actions">{section.actions.map((action,index)=><li key={action.url}><a className={`${family}-button ${family}-button--${family==='krigsvold'&&index>0?'secondary':'primary'} recipe-action`} href={href(action.url)} download={action.download}>{action.label}</a></li>)}</ul>}
 </section>;
}
export function App({data,special}:{data:CatalogPageData;special?:(section:unknown)=>ReactNode}) {
 const {id,page,rendered:bodies,entries}=data;
 if(id==='index') return <SourceShell current="index" title="All page examples"><Article title="All page examples" summary="Browse the shared Northlight collection."><ul>{entries.map(entry=><li key={entry.id}>{entry.available?<a href={href(`/examples/${entry.id}/`)}>{entry.title}</a>:<>{entry.title} (not yet available in this React preview)</>}</li>)}</ul><section aria-labelledby="experimental-applications"><h2 id="experimental-applications">Experimental applications</h2><p><a href={href('/examples/scientific-workspace/')}>Thermal analysis</a> · Explore an illustrative local calculation.</p></section></Article></SourceShell>;
 if(!page) throw Error(`Unported catalog route: ${id}`);
 return <SourceShell current={page.id} title={page.title}>
  <Article data-composition={page.composition} title={page.title} eyebrow={page.category} summary={page.summary} {...('date' in page && page.date ? {metadata:<>{formatCatalogDate(page.date)?<time dateTime={page.date}>{formatCatalogDate(page.date)}</time>:<span>Invalid date: {page.date}</span>}{'author' in page && page.author && <> · {page.author}</>}</>}: {})}>
   <div data-example={page.id} data-semantic-class={page.semantic_class}>
   {'author' in page && page.author && <nav aria-label="Article context"><a href={href('/examples/person/')}>About {page.author}</a> · <a href={href('/examples/archive/')}>All writing</a></nav>}
   {'tags' in page && page.tags && <ul aria-label="Article subjects">{page.tags.map(tag=><li key={tag}><a href={href('/examples/categories/')}>{tag}</a></li>)}</ul>}
   {'event' in page && page.event && <aside aria-label="Event details"><p><strong>Event details</strong></p><p>{isValidEventDateTime(page.event.start)?<time dateTime={page.event.start}>{page.event.display_start}</time>:<span>{page.event.display_start} (invalid start time)</span>} to {isValidEventDateTime(page.event.end)?<time dateTime={page.event.end}>{page.event.display_end}</time>:<span>{page.event.display_end} (invalid end time)</span>} · {page.event.timezone}</p>{isEventEndBeforeStart(page.event.start,page.event.end)&&<p>Event end is earlier than its start. Check the event times.</p>}<p>{page.event.location} · {page.event.registration}</p></aside>}
   {['reading','document'].includes(page.composition)&&<nav className="recipe-local-index" aria-label="On this page"><p>On this page</p><ol>{page.sections.map(section=><li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}</ol></nav>}
   {page.sections.map(section=><SectionView key={section.id} section={section as Section} pageId={page.id} special={special} bodies={bodies} entries={entries}/>)}</div>
  </Article>
 </SourceShell>;
}
