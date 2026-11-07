/**
 * Ask the browser to keep Pulsar's IndexedDB data instead of treating it as a cache it
 * may evict under storage pressure (or, on Safari, after ~7 days without a visit).
 * Chrome grants this silently for installed / frequently used sites; Safari and Firefox
 * may grant or deny. It never hurts to ask, and asking again after a grant is a no-op.
 */
export type PersistenceStatus = 'persistent' | 'not-persistent' | 'unsupported';

export async function getPersistenceStatus(): Promise<PersistenceStatus> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persisted) return 'unsupported';
  try {
    return (await navigator.storage.persisted()) ? 'persistent' : 'not-persistent';
  } catch {
    return 'unsupported';
  }
}

export async function requestPersistentStorage(): Promise<PersistenceStatus> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return 'unsupported';
  try {
    if (await navigator.storage.persisted()) return 'persistent';
    return (await navigator.storage.persist()) ? 'persistent' : 'not-persistent';
  } catch {
    return 'unsupported';
  }
}
