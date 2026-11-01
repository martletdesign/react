// HTML supplied as markup must already be trusted React output. Titles are text.
export function renderDocument(template,{markup,title,originalTitle,styles=''}) {
 const escaped=title.replace(/[&<>]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[char]));
 for(const marker of ['</head>','<!--app-->',originalTitle]) if(!template.includes(marker)) throw Error(`Missing template marker: ${marker}`);
 return template.replace('</head>',()=>`${styles}</head>`)
  .replace('<!--app-->',()=>markup)
  .replace(originalTitle,()=>`<title>${escaped}</title>`);
}
