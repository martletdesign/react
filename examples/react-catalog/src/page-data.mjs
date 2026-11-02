// JSON is embedded as inert HTML data, so prevent authored text from closing it.
export function serializePageData(data){return JSON.stringify(data).replace(/</g,'\\u003c');}
export function pageDataElement(data){return `<script type="application/json" id="catalog-page-data">${serializePageData(data)}</script>`;}
