import catalog from '../../page-archetypes/content/catalog.json';
import selectedIds from './selected.json';
export const selectedPages=catalog.pages.filter(page=>selectedIds.includes(page.id));
export const pages=selectedPages.filter(page=>!('dashboard' in page && page.dashboard));
export const specialKinds=['gallery','workspace','chat','sensors','scene'];
export function requiresSpecial(id:string){const page=pages.find(entry=>entry.id===id);return !!page&&page.sections.some(section=>'kind' in section&&!!section.kind&&specialKinds.includes(section.kind));}
export function validatePages() {
 if(selectedPages.length!==selectedIds.length||new Set(selectedIds).size!==selectedIds.length) throw Error('A selected catalog page is missing or duplicated');
 for(const page of pages) for(const section of page.sections) {
  if('kind' in section && section.kind && !['cards','facts','listing','figure','table','faq','plans','stats','search','form',...specialKinds].includes(section.kind)) throw Error(`Unsupported section in ${page.id}`);
  if('form' in section && section.form && !['contact','sign-in','sign-up','password-reset','two-factor','newsletter'].includes(section.form)) throw Error(`Unsupported form in ${page.id}`);
 }
}
