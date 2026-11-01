import MarkdownIt from 'markdown-it';
import footnote from 'markdown-it-footnote';
import sanitizeHtml from 'sanitize-html';

// Raw HTML is disabled by default. The trusted checked-in stress fixture alone
// opts into a narrow sanitized subset for its semantic HTML/MathML example.
export function renderMarkdown(source, base = '/', {fixtureMarkup = false, docId = 'document'} = {}) {
  if (typeof docId !== 'string' || !/^[a-z0-9-]+$/.test(docId)) throw new Error('Invalid Markdown document ID');
  const markdown = new MarkdownIt({html: fixtureMarkup}).use(footnote);
  const prefix = base.replace(/\/$/, '');
  const rebase = value => {
    if (!prefix || !value?.startsWith('/') || value.startsWith('//')) return value;
    if (value === prefix || ['/', '?', '#'].some(separator => value.startsWith(prefix + separator))) return value;
    return prefix + value;
  };
  for (const rule of ['fence', 'code_block']) {
    const render = markdown.renderer.rules[rule];
    markdown.renderer.rules[rule] = (...args) => render(...args).replace('<pre', '<pre tabindex="0" aria-label="Code example"');
  }
  const original = markdown.renderer.rules.link_open ?? ((tokens, index, options, _env, renderer) => renderer.renderToken(tokens, index, options));
  markdown.renderer.rules.link_open = (tokens, index, options, env, renderer) => {
    const href = tokens[index].attrGet('href');
    if (href) tokens[index].attrSet('href', rebase(href));
    return original(tokens, index, options, env, renderer);
  };
  const image = markdown.renderer.rules.image;
  markdown.renderer.rules.image = (tokens, index, options, env, renderer) => {
    const src = tokens[index].attrGet('src');
    if (src) tokens[index].attrSet('src', rebase(src));
    return image(tokens, index, options, env, renderer);
  };
  const rendered = markdown.render(source, {docId});
  if (!fixtureMarkup) return rendered;
  return sanitizeHtml(rendered, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'math', 'mrow', 'mi', 'mn', 'mo', 'msup'],
    allowedAttributes: {'*':['id','class'], a:['href','title'], pre:['tabindex','aria-label'], img:['src','alt','title','width','height','loading'], math:['xmlns','display']},
    allowedSchemes: ['http','https','mailto'],
    allowProtocolRelative: false,
    transformTags: {math: (_tag, attributes) => ({tagName:'math', attribs: Object.fromEntries(Object.entries(attributes).filter(([key,value]) => key === 'xmlns' ? value === 'http://www.w3.org/1998/Math/MathML' : key === 'display' ? ['block','inline'].includes(value) : true))})}
  });
}
