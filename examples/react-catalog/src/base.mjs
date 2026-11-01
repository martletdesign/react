// Safe absolute URL directory prefixes, including immutable SemVer paths.
export function validBase(base) {
  return typeof base === 'string' && /^\/(?:[A-Za-z0-9._~-]+\/)*$/.test(base) && !base.split('/').some(part => part === '.' || part === '..');
}
