import {useEffect,useRef,useState} from 'react';
import {Pagination,DataTable,Disclosure,family} from 'catalog-family';
import type {CatalogPageData,CatalogEntry} from './data-types';
const specialKinds=['gallery','workspace','chat','sensors','scene'];
import type {ReactNode} from 'react';
import {exampleImage} from './assets';
import {DemoForm,Search} from './interactive';
import {SourceShell} from './shell/SourceShell';
import {CanonicalCatalog} from './CanonicalCatalog';
import {CanonicalRegister} from './CanonicalRegister';
import {ReferencePages,referencePageIds} from './ReferencePages';
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
 return <><ul className="example-list">{items.map((item,i)=><li key={item.url} hidden={enhanced&&pageCount>1&&(i<3*(page-1)||i>=3*page)}>
  <div className="example-list__meta">{item.date&&(formatCatalogDate(item.date)?<time dateTime={item.date}>{formatCatalogDate(item.date)}</time>:<span>Invalid date: {item.date}</span>)}{item.tag&&<span className="example-tag">{item.tag}</span>}</div>
  <div><h3><a href={href(item.url)}>{item.title}</a></h3><p>{item.summary}</p></div>
 </li>)}</ul>{enhanced&&pageCount>1&&<Pagination className="example-pagination" ref={nav} page={page} pageCount={pageCount} onPageChange={next=>{pendingFocus.current=true;setPage(next);}} label={`${title} pages`}/>}</>;
}
function SectionView({section,pageId,special,bodies,entries}:{section:Section;pageId:string;special?:(section:unknown)=>ReactNode;bodies:Record<string,string>;entries:CatalogEntry[]}){
 return <section className={`example-section example-section--${section.kind||'prose'}`} data-section={section.id} {...(section.kind==='table'?{'aria-label':`${section.title} section`}:{'aria-labelledby':section.id})}><div className="example-section__label"><h2 id={section.id} tabIndex={-1}>{section.title}</h2></div><div className="example-section__body">
  {section.body&&<div className="example-prose" dangerouslySetInnerHTML={{__html:bodies[`${pageId}-${section.id}`]}}/>}
  {section.kind==='cards'&&(pageId==='documentation'?<ol className="example-documentation-entries" aria-label="Guides and reference">{section.items!.map(item=><li key={item.url}><article><h3><a href={href(item.url)}>{item.title}</a></h3><p>{item.summary}</p></article></li>)}</ol>:<div className="example-cards">{section.items!.map(item=><article className="example-card" key={item.url}><h3><a href={href(item.url)}>{item.title}</a></h3><p>{item.summary}</p></article>)}</div>)}
  {section.kind==='facts'&&<dl className="example-facts">{section.facts!.map((fact,i)=><div key={i}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>}
  {section.kind==='listing'&&<Listing title={section.title} items={section.items!}/>}
  {section.kind==='figure'&&<figure><img src={exampleImage(section.image!)} alt={section.alt!} width="960" height="640" loading="lazy"/><figcaption>{section.caption}</figcaption></figure>}
  {section.kind==='faq'&&(pageId==='faq'?<div className="example-faq example-faq--grouped">{[['About these examples','faq-about',section.items!.slice(0,2)],['Using these examples','faq-using',section.items!.slice(2)]].map(([label,id,items])=><section key={id as string} className="example-faq__group" aria-labelledby={id as string}><h3 id={id as string}>{label as string}</h3><div className="example-faq__questions">{(items as Item[]).map((item,i)=><details key={i}><summary>{item.question}</summary><div className="example-faq__answer"><p>{item.answer}</p></div></details>)}</div></section>)}</div>:<div className="example-faq">{section.items!.map((item,i)=><Disclosure key={i} summary={item.question}>{item.answer}</Disclosure>)}</div>)}
  {section.kind==='stats'&&<dl className="example-stats">{section.items!.map((item,i)=><div key={i}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>}
  {section.kind==='plans'&&<div className="example-cards example-plans">{section.items!.map(item=><article className="example-card" key={item.title}><h3>{item.title}</h3><p className="example-price">{item.price}</p><p>{item.summary}</p><ul>{item.features!.map(feature=><li key={feature}>{feature}</li>)}</ul><a className={`${family}-button ${family}-button--primary example-button recipe-action`} href={href(item.action!.url)} download={item.action!.download}>{item.action!.label}</a></article>)}</div>}
  {section.kind==='form'&&<DemoForm kind={section.form!}/>}
  {section.kind==='search'&&<Search entries={entries} title={section.title}/>}
  {section.kind&&specialKinds.includes(section.kind) && (special ? special(section) : (()=>{throw Error(`Missing interactive renderer for ${section.kind}`)})())}
  {section.kind==='table'&&<DataTable caption={section.title}><thead><tr>{section.headers!.map(header=><th key={header} scope="col">{header}</th>)}</tr></thead><tbody>{section.rows!.map((row,i)=><tr key={i}>{row.map((cell,j)=>j===0?<th key={j} scope="row">{cell}</th>:<td key={j}>{cell}</td>)}</tr>)}</tbody></DataTable>}
  {section.actions&&<ul className="example-actions">{section.actions.map((action,index)=><li key={action.url}><a className={`${family}-button ${family}-button--${family==='krigsvold'&&index>0?'secondary':'primary'} example-button recipe-action`} href={href(action.url)} download={action.download}>{action.label}</a></li>)}</ul>}
 </div></section>;
}
export function App({data,special}:{data:CatalogPageData;special?:(section:unknown)=>ReactNode}) {
 const {id,page,rendered:bodies,entries}=data;
 if(referencePageIds.includes(id))return <ReferencePages id={id}/>;
 if(id==='index')return <SourceShell current="index" page={{id:'index',title:'A collection of possibilities.',eyebrow:'The example library',summary:'Shared content, independent compositions, and clear boundaries between publishing and applications.'}}><CanonicalCatalog entries={entries} href={href}/></SourceShell>;
 if(!page) throw Error(`Unported catalog route: ${id}`);
 return <SourceShell current={page.id} page={page}>
  <div className={`example-root example-frame--${page.composition}${['faq','changelog','dashboard-components'].includes(page.id)?' example-reference-exemplar':''}`} data-example={page.id} data-semantic-class={page.semantic_class}><div className={`example-wrap${['reading','document'].includes(page.composition)?' example-reading':''}`}>
   <nav className="example-breadcrumb" aria-label="Breadcrumb"><a href={href('/')}>Overview</a><span aria-hidden="true">/</span><a href={href('/examples/')}>Examples</a><span aria-hidden="true">/</span><span aria-current="page">{page.semantic_class.replaceAll('-',' ')}</span></nav>
   <div className={page.composition==='document'?'example-document':page.id==='report'?'example-report-layout':undefined}>{(['reading','document'].includes(page.composition)||page.id==='report')&&<nav className={`example-local-index${page.id==='article'?' toc':''}`} aria-label={page.id==='report'?'Report sections':'On this page'}><p className="eyebrow">On this page</p><ol>{page.sections.map(section=><li key={section.id}><a href={'#'+section.id}>{section.title}</a></li>)}</ol></nav>}<div><article aria-labelledby="page-title">
   <div className="example-recipe">
   {'author' in page && page.author && <nav className="example-context" aria-label="Article context"><a href={href('/examples/person/')}>About {page.author}</a><a href={href('/examples/archive/')}>All writing</a></nav>}
   {'tags' in page && page.tags && <ul className="example-context recipe-tags" role="list" aria-label="Article subjects">{page.tags.map(tag=><li key={tag}><a href={href('/examples/categories/')}>{tag}</a></li>)}</ul>}
   {'event' in page && page.event && <aside aria-label="Event details"><p><strong>Event details</strong></p><p>{isValidEventDateTime(page.event.start)?<time dateTime={page.event.start}>{page.event.display_start}</time>:<span>{page.event.display_start} (invalid start time)</span>} to {isValidEventDateTime(page.event.end)?<time dateTime={page.event.end}>{page.event.display_end}</time>:<span>{page.event.display_end} (invalid end time)</span>} · {page.event.timezone}</p>{isEventEndBeforeStart(page.event.start,page.event.end)&&<p>Event end is earlier than its start. Check the event times.</p>}<p>{page.event.location} · {page.event.registration}</p></aside>}
   {['changelog','dashboard-components'].includes(page.id)?<CanonicalRegister page={page} rendered={bodies}/>:page.sections.map(section=><SectionView key={section.id} section={section as Section} pageId={page.id} special={special} bodies={bodies} entries={entries}/>)}</div>
  </article></div></div><p className="example-port-note">A {page.semantic_class.replaceAll('-',' ')} recipe in Martlet. <a href={href('/examples/integrations/')}>Capabilities and integration boundaries</a> · <a href={href('/examples/')}>All examples</a></p></div></div>
 </SourceShell>;
}
