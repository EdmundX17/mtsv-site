/**
 * Storage Helper
 * Provides safe localStorage wrappers with automatic legacy key cleanup
 * and graceful QuotaExceededError handling.
 */

export const ACTIVE_STORAGE_KEYS = [
  'mts_services_items_v12_clean',
  'mts_services_reports_v10_clean',
  'mts_services_logs_v10_clean',
  'mts_services_custom_staff_roster_v3',
  'mts_services_star_config_v2',
  'mts_services_soldier_drone_star_config_v2',
  'mts_services_custom_staff_session_v3',
  'mts_services_site_info_v1',
  'mts_services_trade_calculator_v2',
  'mts_services_site_backups_v1',
  'mts_theme_mode',
  'mts_search_menu_collapsed',
  'mts_services_info_minimized',
  'mts_services_saved_trades_v1',
  'mts_services_item_star_tiers_v2',
  'mts_lang',
  'mts_global_card_layout_mode',
  'mts_view_mode'
];

/**
 * Remove any legacy or outdated keys from localStorage to prevent quota exhaustion
 */
export function cleanupLegacyStorage(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const activeSet = new Set(ACTIVE_STORAGE_KEYS);
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('mts_') || key.startsWith('mts-'))) {
        if (!activeSet.has(key)) {
          keysToRemove.push(key);
        }
      }
    }

    for (const k of keysToRemove) {
      try {
        localStorage.removeItem(k);
      } catch (e) {
        // ignore
      }
    }
  } catch (e) {
    console.warn('Storage cleanup encountered an error:', e);
  }
}

/**
 * Safely sets an item in localStorage, catching QuotaExceededError and cleaning up legacy keys if needed.
 * Will never throw an unhandled exception.
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`localStorage.setItem failed for "${key}". Attempting cleanup of legacy keys...`, err);
    cleanupLegacyStorage();
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (retryErr) {
      console.warn(`localStorage quota still exceeded for "${key}". Freeing non-critical caches...`, retryErr);
      try {
        // Evict non-critical logs or backups if space is needed
        localStorage.removeItem('mts_services_logs_v10_clean');
        localStorage.removeItem('mts_services_site_backups_v1');
        localStorage.setItem(key, value);
        return true;
      } catch (fallbackErr) {
        console.warn(`Failed to store "${key}" in localStorage. State remains active in memory.`, fallbackErr);
      }
      return false;
    }
  }
}

/**
 * Safely gets an item from localStorage without throwing
 */
export function safeLocalStorageGet(key: string): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return localStorage.getItem(key);
  } catch (e) {
    console.warn(`localStorage.getItem failed for "${key}":`, e);
    return null;
  }
}

/**
 * Safely removes an item from localStorage without throwing
 */
export function safeLocalStorageRemove(key: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`localStorage.removeItem failed for "${key}":`, e);
  }
}

// Run cleanup immediately on module initialization
cleanupLegacyStorage();
