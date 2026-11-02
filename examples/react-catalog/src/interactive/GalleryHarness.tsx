import {AppShell,family} from 'catalog-family';
import fixture from '../../../page-archetypes/content/catalog.json';
import {Gallery,type GallerySection} from './Gallery';
const section=fixture.pages.find(item=>item.id==='gallery')!.sections.find(item=>'kind' in item&&item.kind==='gallery') as GallerySection;
export function GalleryHarness(){return <div className={family} {...{[`data-${family}`]:'light'}}><AppShell brand="Northlight Field Institute" navigationPlacement="none" navigation={null} utilities={null}><h1>Illustrated galleries</h1><section aria-labelledby="gallery-one" data-first-gallery><h2 id="gallery-one">From the illustrated notebook</h2><Gallery section={section}/></section><section aria-labelledby="gallery-two" data-second-gallery><h2 id="gallery-two">Second notebook</h2><Gallery section={{...section,id:'second',title:'Second notebook'}}/></section></AppShell></div>}
