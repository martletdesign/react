import type {CatalogPage} from './data-types';

// Native martlet composition from martletdesign/jekyll e2d24d65b34d73d5f02ec0bf3814a94f34043ade.
function releaseFields(title:string) {
 const parts=title.split(' · ');
 if(parts.length!==2)return null;
 const match=/^(January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}), (\d{4})$/.exec(parts[1]);
 if(!match)return null;
 const month=['January','February','March','April','May','June','July','August','September','October','November','December'].indexOf(match[1]);
 const day=Number(match[2]),year=Number(match[3]),date=new Date(Date.UTC(year,month,day));
 if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month||date.getUTCDate()!==day)return null;
 return {version:parts[0],label:parts[1],iso:date.toISOString().slice(0,10)};
}

export function CanonicalRegister({page,rendered}:{page:CatalogPage;rendered:Record<string,string>}) {
 if(page.id==='changelog')return <ol className="example-release-history" aria-label="Release history">{page.sections.map(section=>{const date=releaseFields(section.title);return <li key={section.id} className="example-release-history__entry"><section className="example-section example-release" aria-labelledby={section.id}><h2 id={section.id}>{date?<><span className="example-release__version">{date.version}</span><span className="example-release__date"> · <time dateTime={date.iso}>{date.label}</time></span></>:section.title}</h2><div className="example-prose" dangerouslySetInnerHTML={{__html:rendered[page.id+'-'+section.id]}}/></section></li>})}</ol>;
 if(page.id==='dashboard-components')return <div className="example-component-catalog">{page.sections.map(section=><section key={section.id} className="example-section example-component-catalog__entry" aria-labelledby={section.id}><h2 id={section.id}>{section.title}</h2><div className="example-prose" dangerouslySetInnerHTML={{__html:rendered[page.id+'-'+section.id]}}/></section>)}</div>;
 return null;
}

