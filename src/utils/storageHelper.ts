export function safeLocalStorageGet(key: string, fallback: string | null = null): string | null {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? val : fallback;
  } catch {
    return fallback;
  }
}

export function safeLocalStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch (e) {
    console.warn(`[storageHelper] Failed to set ${key}:`, e);
  }
}

export function safeLocalStorageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`[storageHelper] Failed to remove ${key}:`, e);
  }
}

export function cleanupLegacyStorage(): void {
  try {
    const legacyKeys = ['old_military_items_cache', 'legacy_session', 'mts_legacy_items'];
    legacyKeys.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch {}
    });
  } catch {}
}
