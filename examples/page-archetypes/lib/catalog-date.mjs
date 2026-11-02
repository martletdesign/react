// Catalog dates are plain UTC calendar dates; invalid text must stay inert.
/** @param {string} value @param {'short'|'long'} month */
export function formatCatalogDate(value, month='short') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return null;
  const time=Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0,10)!==value) return null;
  return new Intl.DateTimeFormat('en-US',{year:'numeric',month,day:'numeric',timeZone:'UTC'}).format(time);
}
