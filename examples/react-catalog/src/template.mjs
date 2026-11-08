// HTML supplied as markup must already be trusted React output. Titles are text.
export function renderDocument(template,{markup,title,originalTitle,styles=''}) {
 const escaped=title.replace(/[&<>]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[char]));
 for(const marker of ['</head>','<!--app-->',originalTitle]) if(!template.includes(marker)) throw Error(`Missing template marker: ${marker}`);
 const canonicalStyles=['fonts','shell','jekyll','examples','examples-family'].map(name=>`<link rel="stylesheet" href="${template.match(/href="([^"]*)assets\/css\/fonts\.css"/)?.[1]||'/'}assets/css/${name}.css">`).join('');
 template=template.replace(/<link rel="stylesheet" href="[^"]*assets\/css\/(?:fonts|shell|jekyll|examples|examples-family)\.css">/g,'');
 const hero=markup.match(/data-reference-hero="(signature|section|compact|plain)"/)?.[1];
 if(hero)template=template.replace('<body class="martlet" data-martlet="light">',`<body class="martlet${['signature','section'].includes(hero)?' has-panoramic-hero':''}${markup.includes('data-reference-dashboard="true"')?' dashboard-page':''}" data-martlet="light" data-hero-variant="${hero}">`);
 return template.replace('</head>',()=>`${styles}${canonicalStyles}</head>`)
  .replace('<!--app-->',()=>markup)
  .replace(originalTitle,()=>`<title>${escaped}</title>`);
}
