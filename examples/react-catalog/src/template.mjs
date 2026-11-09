// Markup is trusted React output; titles are text.
export function renderDocument(template,{markup,title,originalTitle,styles=''}) {
 const escaped=title.replace(/[&<>]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[char]));
 for(const marker of ['</head>','<!--app-->',originalTitle]) if(!template.includes(marker)) throw Error(`Missing template marker: ${marker}`);
 const base=template.match(/href="([^"]*)assets\/css\/fonts\.css"/)?.[1]||'/';
 template=template.replace(/<link rel="stylesheet" href="[^"]*assets\/css\/[^"]+">/g,'');
 const canonicalStyles=['fonts','reference','react-reference'].map(name=>`<link rel="stylesheet" href="${base}assets/css/${name}.css">`).join('');
 const hero=markup.match(/data-reference-hero="(signature|section|compact|plain)"/)?.[1]||'plain';
 const dashboard=markup.includes('data-reference-dashboard="true"');
 template=template.replace('class="martlet" data-martlet="light"',`class="martlet react-reference${['signature','section'].includes(hero)?' has-panoramic-hero':''}${dashboard?' dashboard-page':''}" data-martlet="light" data-hero-variant="${hero}"`);
 return template.replace('</head>',()=>`${styles}${canonicalStyles}</head>`).replace('<!--app-->',()=>markup).replace(originalTitle,()=>`<title>${escaped}</title>`);
}
