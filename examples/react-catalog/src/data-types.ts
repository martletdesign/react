import type catalog from '../../page-archetypes/content/catalog.json';
export type CatalogPage = (typeof catalog.pages)[number];
export type CatalogEntry = {id:string;title:string;summary:string;category:string;available:boolean};
export type CatalogPageData = {id:string;page:CatalogPage|null;rendered:Record<string,string>;entries:CatalogEntry[];requiresSpecial:boolean};
