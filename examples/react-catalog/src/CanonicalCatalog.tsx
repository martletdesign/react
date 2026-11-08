import catalog from '../../page-archetypes/content/catalog.json';
import type {CatalogEntry} from './data-types';

// Native React composition of martletdesign/jekyll e2d24d65b34d73d5f02ec0bf3814a94f34043ade
// _includes/examples/catalog.html. The family-owned canonical CSS supplies its grammar.
export function CanonicalCatalog({entries,href}:{entries:CatalogEntry[];href:(url:string)=>string}) {
 const categories=[...new Set(catalog.pages.map(page=>page.category))];
 const available=new Map(entries.map(entry=>[entry.id,entry.available]));
 const categoryId=(category:string)=>category.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 return <div className="example-root example-frame--landing"><div className="example-wrap">
  <div className="example-catalog-intro"><p>One content collection, two independent design languages. Explore {catalog.pages.length} complete recipes, reusable sections, and local application specimens.</p><p className="example-notice">{catalog.fixture.notice}</p></div>
  <nav className="example-category-nav" aria-label="Example categories">{categories.map(category=><a key={category} href={'#'+categoryId(category)}>{category}</a>)}</nav>
  {categories.map(category=><section key={category} className="example-section" aria-labelledby={categoryId(category)}>
   <div className="example-section__label"><h2 id={categoryId(category)}>{category}</h2></div>
   <div className="example-section__body"><div className="example-cards">{catalog.pages.filter(page=>page.category===category).map(page=><article key={page.id} className="example-card">
    <p className="example-help">{page.semantic_class.replace(/-/g,' ').replace(/^./,letter=>letter.toUpperCase())}</p>
    <h3>{available.get(page.id)!==false?<a href={href('/examples/'+page.id+'/')}>{page.title}</a>:<>{page.title} (not yet available in this React preview)</>}</h3>
    <p>{page.summary}</p>
   </article>)}</div></div>
  </section>)}
  <section className="example-section" aria-labelledby="experimental-applications"><div className="example-section__label"><h2 id="experimental-applications">Experimental applications</h2></div><div className="example-section__body"><p><a href={href('/examples/scientific-workspace/')}>Thermal analysis</a> · Explore an illustrative local calculation.</p></div></section>
 </div></div>;
}

