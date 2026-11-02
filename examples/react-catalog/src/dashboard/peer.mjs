import {comparisonSearch} from '../../../page-archetypes/jekyll/assets/js/dashboard-model.mjs';
// A deployer supplies the other family's absolute base; no public host is assumed.
export function peerDashboardURL(base, route, search = '') {
  if (!base) return null;
  if (!['analytics','administration','operations'].includes(route)) throw new Error('Unsupported dashboard route');
  let url;
  try { url = new URL(base); } catch { throw new Error('Peer base must be an absolute HTTP(S) URL'); }
  if (!['http:','https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Peer base must be an HTTP(S) URL without credentials, query or fragment');
  if (search && !search.startsWith('?')) throw new Error('Peer query must begin with ?');
  url.pathname = url.pathname.replace(/\/$/,'') + `/examples/dashboard-${route}/`;
  url.search = comparisonSearch(route, search);
  return url.href;
}
