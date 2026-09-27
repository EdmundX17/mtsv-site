/**
 * Storage Helper
 * Provides safe localStorage wrappers with automatic legacy key cleanup
 * and graceful QuotaExceededError handling.
 */

export const ACTIVE_STORAGE_KEYS = [
  'mts_services_items_v12_clean',
  'mts_services_logs_v10_clean',
  'mts_services_star_config_v2',
  'mts_services_soldier_drone_star_config_v2',
  'mts_services_site_info_v1',
  'mts_services_trade_calculator_v2',
  'mts_services_staff_migration_v1',
  'mts_theme_mode',
  'mts_search_menu_collapsed',
  'mts_services_info_minimized',
  'mts_services_saved_trades_v1',
  'mts_services_item_star_tiers_v2',
  'mts_lang',
  'mts_global_card_layout_mode',
  'mts_view_mode'
];

const LEGACY_STAFF_ROSTER_KEY = 'mts_services_custom_staff_roster_v3';
const STAFF_MIGRATION_KEY = 'mts_services_staff_migration_v1';

export interface LegacyStaffProfileMigration {
  id: string;
  username: string;
  displayName?: string;
  role: 'Admin' | 'Analyst' | 'Staff' | 'Moderator' | 'Consultant';
  addedBy?: string;
  addedAt: string;
  lastLogin?: string;
}

let inMemoryLegacyStaffProfiles: LegacyStaffProfileMigration[] = [];

function safeLegacyText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLength) || undefined;
}

function parseLegacyStaffProfiles(value: unknown): LegacyStaffProfileMigration[] {
  if (!Array.isArray(value)) return [];
  const validRoles = new Set(['Admin', 'Analyst', 'Staff', 'Moderator', 'Consultant']);
  const byId = new Map<string, LegacyStaffProfileMigration>();
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const id = safeLegacyText((raw as any).id, 120)?.replace(/[^a-zA-Z0-9_-]/g, '_');
    const username = safeLegacyText((raw as any).username, 80);
    const role = (raw as any).role;
    if (!id || !username || !validRoles.has(role)) continue;
    byId.set(id, {
      id,
      username,
      ...(safeLegacyText((raw as any).displayName, 120) ? { displayName: safeLegacyText((raw as any).displayName, 120) } : {}),
      role,
      ...(safeLegacyText((raw as any).addedBy, 120) ? { addedBy: safeLegacyText((raw as any).addedBy, 120) } : {}),
      addedAt: safeLegacyText((raw as any).addedAt, 80) || new Date(0).toISOString(),
      ...(safeLegacyText((raw as any).lastLogin, 80) ? { lastLogin: safeLegacyText((raw as any).lastLogin, 80) } : {})
    });
  }
  return [...byId.values()];
}

function captureLegacyStaffRoster(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const rawRoster = localStorage.getItem(LEGACY_STAFF_ROSTER_KEY);
    if (!rawRoster) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawRoster);
    } catch {
      parsed = [];
    }
    const existingCache = localStorage.getItem(STAFF_MIGRATION_KEY);
    let cachedProfiles: LegacyStaffProfileMigration[] = [];
    if (existingCache) {
      try { cachedProfiles = parseLegacyStaffProfiles(JSON.parse(existingCache)); } catch {}
    }
    const safeProfiles = parseLegacyStaffProfiles(parsed);
    const merged = parseLegacyStaffProfiles([...cachedProfiles, ...safeProfiles]);
    inMemoryLegacyStaffProfiles = merged;
    if (merged.length > 0) {
      // Persist only usernames and role metadata; plaintext password fields are never copied.
      safeLocalStorageSet(STAFF_MIGRATION_KEY, JSON.stringify(merged));
    }
    localStorage.removeItem(LEGACY_STAFF_ROSTER_KEY);
  } catch {
    try { localStorage.removeItem(LEGACY_STAFF_ROSTER_KEY); } catch {}
  }
}

export function getPendingLegacyStaffProfiles(): LegacyStaffProfileMigration[] {
  const combined = [...inMemoryLegacyStaffProfiles];
  try {
    const raw = safeLocalStorageGet(STAFF_MIGRATION_KEY);
    if (raw) combined.push(...parseLegacyStaffProfiles(JSON.parse(raw)));
  } catch {}
  return parseLegacyStaffProfiles(combined);
}

export function clearPendingLegacyStaffProfiles(): void {
  inMemoryLegacyStaffProfiles = [];
  safeLocalStorageRemove(STAFF_MIGRATION_KEY);
}

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
      if (key === 'mt_deleted_staff_usernames' || (key && (key.startsWith('mts_') || key.startsWith('mts-')))) {
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

// Salvage safe role metadata from the old browser roster, then clear legacy credentials.
captureLegacyStaffRoster();

// Run cleanup immediately on module initialization
cleanupLegacyStorage();
