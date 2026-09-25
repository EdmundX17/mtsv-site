import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc,
  writeBatch,
  deleteField
} from 'firebase/firestore';
import { db, cleanForFirestore } from '../lib/firebase';
import {
  MilitaryItem,
  ReportedValue,
  AuditLog,
  AuditLogChange,
  ItemCategory,
  ItemRarity,
  PriceTrend,
  PriceHistoryPoint,
  StaffMember,
  StaffRole,
  StaffSessionLog,
  WeeklyQuotaRecord,
  ConsultantProposal,
  ConsultantProposedChanges,
  ConsultantFieldDiff,
  StarTier,
  SoldierDroneStarTier,
  StarTierOverrideData,
  UniversalStarConfig,
  UniversalSoldierDroneStarConfig,
  ActiveStaffSession,
  SiteInfoConfig,
  StarTierChange,
  TeamMemberEntry,
  BatchDemandAutomationParams,
  TradeSide,
  TradeSideItem,
  TradeCalculatorState,
  SiteBackup,
  BackupType
} from '../types';
import { INITIAL_ITEMS, INITIAL_REPORTS } from '../data/initialItems';
import { DEFAULT_SITE_INFO } from '../data/initialSiteInfo';
import { DEFAULT_CONSULTANT_WEEKLY_QUOTA, getWeekInfo } from '../utils/quotaHelper';
import { getVehicleImageUrl } from '../data/vehicleImageMap';
import {
  calculateItemStarValue,
  getAllItemStarTiersData,
  getItemStarTierData,
  getItemLowestStarTierData,
  parseMilitaryValueInput,
  DEFAULT_SOLDIER_DRONE_STAR_CONFIG,
  isSoldierOrDroneCategory,
  isVehicleCategory,
  shouldSortToTagsCategory,
  STAR_TIERS,
  SOLDIER_DRONE_STAR_TIERS,
  getItemSlug
} from '../utils/formatters';
import { getSafeImageUrl, isDiscordCdnUrl } from '../utils/imageOptimizer';
import { generateMonthOfHistory, hasItemPriceChanges } from '../utils/historyHelper';
import {
  safeLocalStorageSet,
  safeLocalStorageGet,
  safeLocalStorageRemove,
  cleanupLegacyStorage
} from '../utils/storageHelper';
import {
  SupportedLanguage,
  TranslationDictionary,
  TRANSLATIONS,
  getTranslatedCategory,
  getTranslatedRarity,
  getTranslatedTrend,
  getTranslatedDemandLabel
} from '../i18n/translations';
import {
  uploadBackupToGoogleDrive,
  getGoogleDriveAutoSync,
  isGoogleDriveConnected
} from '../lib/googleDrive';

const STORAGE_KEYS = {
  ITEMS: 'mts_services_items_v12_clean',
  REPORTS: 'mts_services_reports_v10_clean',
  LOGS: 'mts_services_logs_v10_clean',
  STAFF_ROSTER: 'mts_services_custom_staff_roster_v3',
  STAR_CONFIG: 'mts_services_star_config_v2',
  SOLDIER_DRONE_STAR_CONFIG: 'mts_services_soldier_drone_star_config_v2',
  STAFF_SESSION: 'mts_services_custom_staff_session_v3',
  SITE_INFO: 'mts_services_site_info_v1',
  TRADE_CALC: 'mts_services_trade_calculator_v2',
  SITE_BACKUPS: 'mts_services_site_backups_v1',
  CONSULTANT_PROPOSALS: 'mts_services_consultant_proposals_v1'
};

const DEFAULT_UNIVERSAL_STAR_CONFIG: UniversalStarConfig = {
  fresh: 0,
  '0': 0,
  '1': 10000,
  '2': 25000,
  '3': 50000,
  '4': 100000,
  '5': 60000
};

const INITIAL_STAFF_MEMBERS: StaffMember[] = [
  {
    id: 'staff-root-admin',
    username: 'Admin',
    password: 'AdminPassword2026!',
    role: 'Admin',
    displayName: 'Administrator',
    addedBy: 'System',
    addedAt: '2026-01-01T00:00:00.000Z'
  }
];

interface ValueListContextType {
  items: MilitaryItem[];
  reports: ReportedValue[];
  auditLogs: AuditLog[];
  isStaffMode: boolean;
  isAdmin: boolean;
  isAnalyst: boolean;
  isConsultant: boolean;
  canExport: boolean;
  activeStaff: ActiveStaffSession | null;

  // Consultant Proposals & Commentator Mode
  consultantProposals: ConsultantProposal[];
  submitConsultantProposal: (proposalData: Omit<ConsultantProposal, 'id' | 'createdAt' | 'status'>) => Promise<{ success: boolean; id: string; message: string }>;
  approveConsultantProposal: (proposalId: string, adminComment?: string) => Promise<{ success: boolean; message: string }>;
  denyConsultantProposal: (proposalId: string, adminComment?: string) => Promise<{ success: boolean; message: string }>;
  deleteConsultantProposal: (proposalId: string) => Promise<{ success: boolean; message: string }>;
  
  // Data Export Feature (Analyst & Admin only)
  exportAllDataText: (format: 'json' | 'csv' | 'summary', options?: {
    includeItems?: boolean;
    includeReports?: boolean;
    includeAuditLogs?: boolean;
    includeConfigs?: boolean;
    headerCase?: 'lowercase' | 'titlecase';
    columnLayout?: 'metric_first' | 'tier_paired';
  }) => string;
  downloadExportedData: (format: 'json' | 'csv' | 'summary', options?: {
    includeItems?: boolean;
    includeReports?: boolean;
    includeAuditLogs?: boolean;
    includeConfigs?: boolean;
    asPlainTextFile?: boolean;
    headerCase?: 'lowercase' | 'titlecase';
    columnLayout?: 'metric_first' | 'tier_paired';
  }) => { success: boolean; message: string; filename: string };
  
  // Database sync indicator
  isDbConnected: boolean;
  dbSyncStatus: 'synced' | 'syncing' | 'error';
  isQuotaExceeded: boolean;
  isQuotaBannerDismissed: boolean;
  dismissQuotaBanner: () => void;
  
  // Custom Staff Auth
  loginStaff: (username: string, password: string) => { success: boolean; message: string };
  logoutStaff: () => void;

  // Staff Management (Admin Only)
  staffMembers: StaffMember[];
  addStaffMember: (username: string, password: string, role: StaffRole, displayName?: string) => { success: boolean; message: string };
  updateStaffRole: (id: string, newRole: StaffRole) => { success: boolean; message: string };
  updateStaffPassword: (id: string, newPassword: string) => { success: boolean; message: string };
  removeStaffMember: (id: string) => { success: boolean; message: string };

  // Quota & Performance Analytics (Admin & Staff)
  updateStaffWeeklyQuota: (id: string, quota: number) => { success: boolean; message: string };
  acknowledgeUnmetQuota: (staffId: string, weekKey: string) => { success: boolean; message: string };
  excuseUnmetQuota: (staffId: string, weekKey: string, reason?: string) => { success: boolean; message: string };
  simulatedDayOverride: 'none' | 'sunday' | 'monday';
  setSimulatedDayOverride: (override: 'none' | 'sunday' | 'monday') => void;
  effectiveDate: Date;

  searchQuery: string;
  setSearchQuery: (q: string) => void;
  debouncedSearchQuery: string;
  isSearchBuffering: boolean;
  flushSearch: () => void;
  selectedCategory: ItemCategory | 'All';
  setSelectedCategory: (cat: ItemCategory | 'All') => void;
  selectedRarities: ItemRarity[];
  toggleRarityFilter: (rarity: ItemRarity) => void;
  clearRarityFilters: () => void;
  demandFilter: number; // 0 = all, 1-10 = minimum demand
  setDemandFilter: (demand: number) => void;
  selectedTrend: PriceTrend | 'All';
  setSelectedTrend: (trend: PriceTrend | 'All') => void;
  sortBy: 'highest_value' | 'lowest_value' | 'highest_demand' | 'lowest_demand' | 'name_asc' | 'recently_updated' | 'biggest_gain';
  setSortBy: (sort: 'highest_value' | 'lowest_value' | 'highest_demand' | 'lowest_demand' | 'name_asc' | 'recently_updated' | 'biggest_gain') => void;
  
  // Theme & Search Menu Collapse
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  isSearchMenuCollapsed: boolean;
  setIsSearchMenuCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  toggleSearchMenuCollapsed: () => void;

  // Settings & Localization
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isInfoSectionMinimized: boolean;
  setIsInfoSectionMinimized: (minimized: boolean) => void;
  toggleInfoSectionMinimized: () => void;
  t: (key: keyof TranslationDictionary, fallback?: string) => string;
  translateCategory: (category: string) => string;
  translateRarity: (rarity: string) => string;
  translateTrend: (trend: string) => string;
  translateDemand: (demand: number) => string;

  // Card Layout & Expansion Mode (Default: Expanded for Desktop, Compact for Mobile)
  globalCardLayoutMode: 'expanded' | 'compact';
  setGlobalCardLayoutMode: (mode: 'expanded' | 'compact') => void;
  toggleGlobalCardLayoutMode: () => void;
  toggleGlobalCardViewMode: () => void;
  expandedCardIds: Record<string, boolean>;
  isCardExpanded: (itemId: string) => boolean;
  toggleCardExpanded: (itemId: string, rowItemIds?: string[]) => void;
  setCardExpanded: (itemId: string, expanded: boolean, rowItemIds?: string[]) => void;

  // Individual Item Detail Page Routing & Navigation
  activeItemDetailPage: MilitaryItem | null;
  setActiveItemDetailPage: (item: MilitaryItem | null) => void;
  navigateToItem: (itemOrId: MilitaryItem | string) => void;
  navigateToCatalog: () => void;

  // Terms of Service (TOS) Page Routing
  isTOSOpen: boolean;
  setIsTOSOpen: (open: boolean) => void;
  navigateToTOS: () => void;

  // Shared Star Tier State across views
  itemStarTiers: Record<string, StarTier>;
  setItemStarTier: (itemId: string, tier: StarTier) => void;
  getItemSelectedTier: (itemId: string, itemObj?: MilitaryItem) => StarTier;

  // Modals & UI triggers
  activeReportModalItem: MilitaryItem | null;
  setActiveReportModalItem: (item: MilitaryItem | null) => void;
  activeChartModalItem: MilitaryItem | null;
  setActiveChartModalItem: (item: MilitaryItem | null) => void;
  activeEditModalItem: MilitaryItem | null;
  setActiveEditModalItem: (item: MilitaryItem | null) => void;
  isStaffPanelOpen: boolean;
  setIsStaffPanelOpen: (open: boolean) => void;
  isTradeCalcOpen: boolean;
  setIsTradeCalcOpen: (open: boolean) => void;

  // Trade Calculator State & Actions
  tradeState: TradeCalculatorState;
  setTradeState: React.Dispatch<React.SetStateAction<TradeCalculatorState>>;
  addTradeItem: (side: TradeSide, item: MilitaryItem, starTier?: StarTier) => void;
  removeTradeItem: (side: TradeSide, instanceId: string) => void;
  moveTradeItem: (fromSide: TradeSide, instanceId: string) => void;
  swapTradeSides: () => void;
  updateTradeItemTier: (side: TradeSide, instanceId: string, tier: StarTier) => void;
  updateTradeItemQuantity: (side: TradeSide, instanceId: string, qty: number) => void;
  updateTradeGems: (side: TradeSide, gems: number) => void;
  clearTrade: () => void;
  openTradeCalculatorWithItem: (side: TradeSide, item: MilitaryItem, starTier?: StarTier) => void;

  // Universal Star Config for Vehicles (Air, Sea, Land)
  universalStarConfig: UniversalStarConfig;
  updateUniversalStarConfig: (newConfig: UniversalStarConfig) => void;

  // Universal Star Multipliers for Soldiers & Drones (0★ - 3★)
  universalSoldierDroneStarConfig: UniversalSoldierDroneStarConfig;
  updateUniversalSoldierDroneStarConfig: (newConfig: UniversalSoldierDroneStarConfig) => void;

  getItemStarValue: (item: MilitaryItem, tier?: string) => { totalValue: number; bonus: number; multiplier?: number; isOverride: boolean; isMultiplier?: boolean };

  // Site Info & Our Team Section (Admin Editable)
  siteInfo: SiteInfoConfig;
  updateSiteInfo: (newInfo: SiteInfoConfig) => Promise<void>;
  resetSiteInfoToDefault: () => Promise<void>;

  // Actions
  submitReport: (reportData: Omit<ReportedValue, 'id' | 'status' | 'createdAt'>) => string;
  acceptReport: (reportId: string, staffComment?: string) => void;
  editAndAcceptReport: (
    reportId: string, 
    edits: { value: number; demand: number; trend: PriceTrend; notes?: string; staffComment?: string }
  ) => void;
  declineReport: (reportId: string, staffComment?: string) => void;
  updateItem: (itemUpdates: Partial<MilitaryItem> & { id: string }, auditReason?: string) => void;
  batchUpdateThumbnails: (updates: { itemId: string; thumbnail: string }[]) => Promise<void>;
  batchAutomateItemDemands: (params: BatchDemandAutomationParams) => Promise<{ updatedCount: number }>;
  resetSoldiersAndDronesToUniversal: () => Promise<{ updatedCount: number }>;
  addItem: (newItem: Omit<MilitaryItem, 'id' | 'lastUpdated' | 'history'> & { initialHistoryNote?: string }) => void;
  deleteItem: (id: string) => void;
  addPriceHistoryPoint: (itemId: string, point: { value: number; note?: string; date?: string; tier?: string; tierValues?: Record<string, number> }) => void;
  resetToDefaults: () => void;

  // Graph & Recently Updated Controls (Admin & Staff)
  resetAllGraphs: (note?: string) => Promise<{ success: boolean; count: number }>;
  resetRecentlyUpdated: (baselineDate?: string) => Promise<{ success: boolean; count: number }>;
  adjustItemRecentlyUpdated: (itemId: string, newTimestamp: string, customReason?: string) => { success: boolean; message: string };
  batchAdjustRecentlyUpdated: (itemIds: string[], newTimestamp: string, customReason?: string) => Promise<{ success: boolean; count: number }>;
  addToRecentlyUpdated: (itemId: string, reason?: string) => Promise<{ success: boolean; message: string }>;
  removeFromRecentlyUpdated: (itemId: string, reason?: string) => Promise<{ success: boolean; message: string }>;
  bulkClearRecentlyUpdated: (itemIds?: string[]) => Promise<{ success: boolean; count: number }>;
  removePriceHistoryPoint: (itemId: string, pointIndex: number, reason?: string) => Promise<{ success: boolean; message: string }>;
  resetItemGraph: (itemId: string) => void;
  autoSortTagsCategory: () => Promise<{ success: boolean; count: number; message: string }>;

  // Site Backups & Disaster Recovery (Daily Snapshots & Manual Restores)
  siteBackups: SiteBackup[];
  isBackingUp: boolean;
  lastBackupDate: string | null;
  createBackup: (name?: string, type?: BackupType, notes?: string) => Promise<{ success: boolean; backup?: SiteBackup; message: string }>;
  restoreBackup: (backupOrId: string | SiteBackup) => Promise<{ success: boolean; count: number; message: string }>;
  deleteBackup: (backupId: string) => Promise<{ success: boolean; message: string }>;
  exportBackupJSON: (backup?: SiteBackup) => string;
  importBackupJSON: (jsonString: string) => Promise<{ success: boolean; count: number; message: string }>;
}

const ValueListContext = createContext<ValueListContextType | undefined>(undefined);

export const ValueListProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Safe helper to cache items without exceeding localStorage quota
  const saveItemsCache = (itemsToCache: MilitaryItem[]) => {
    try {
      // Store compact representation to prevent quota exhaustion
      const compact = itemsToCache.map(i => ({
        id: i.id,
        name: i.name,
        category: i.category,
        rarity: i.rarity,
        value: i.value,
        demand: i.demand,
        trend: i.trend,
        thumbnail: i.thumbnail,
        notes: i.notes || undefined,
        lastUpdated: i.lastUpdated,
        tradeable: i.tradeable,
        acronym: i.acronym,
        tags: i.tags && i.tags.length > 0 ? i.tags : undefined,
        history: i.history && i.history.length > 0 ? i.history.slice(-10) : undefined,
        hasCustomStarOverrides: i.hasCustomStarOverrides,
        starTierOverrides: i.starTierOverrides,
        hasCustomMultiplierOverrides: i.hasCustomMultiplierOverrides,
        multiplierOverrides: i.multiplierOverrides,
        hasManualGemRange: i.hasManualGemRange,
        gemOverrideMin: i.gemOverrideMin,
        gemOverrideMax: i.gemOverrideMax
      }));
      safeLocalStorageSet(STORAGE_KEYS.ITEMS, JSON.stringify(compact));
    } catch (e) {
      console.warn('saveItemsCache failed to write to localStorage:', e);
    }
  };

  const [items, setItems] = useState<MilitaryItem[]>(() => {
    cleanupLegacyStorage();
    const initialMap = new Map(INITIAL_ITEMS.map(i => [i.id, i]));
    const initialByName = new Map(INITIAL_ITEMS.map(i => [i.name.toLowerCase().trim(), i]));
    const saved = safeLocalStorageGet(STORAGE_KEYS.ITEMS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const seenIds = new Set<string>();
          const seenNames = new Set<string>();
          const result: MilitaryItem[] = [];

          for (const item of parsed) {
            if (item.id === 'item-super-hovercraft' || item.name === 'Super HoverisOverflow') {
              continue;
            }
            const canonical = initialMap.get(item.id) || initialByName.get(item.name?.toLowerCase()?.trim());
            const base = canonical || item;
            let cat: ItemCategory = item.category === 'Sea' ? 'Naval' : ((item.category || base.category) as ItemCategory);
            if (cat === 'Sea') cat = 'Naval';
            if (canonical && canonical.category && canonical.category !== 'Tags' && cat === 'Tags') {
              cat = (canonical.category === 'Sea' ? 'Naval' : canonical.category) as ItemCategory;
            }
            if (shouldSortToTagsCategory(item) || (canonical && canonical.category === 'Tags')) {
              cat = 'Tags';
            }
            let rarity = item.rarity || canonical?.rarity || 'Rare';
            if (canonical && canonical.rarity === 'Limited Edition') {
              rarity = 'Limited Edition';
            } else if ((item.name || '').toLowerCase().startsWith('le ') || (item.name || '').toLowerCase().includes('limited')) {
              rarity = 'Limited Edition';
            }

            const modernImg = getVehicleImageUrl(item.name) || getVehicleImageUrl(item.id) || getVehicleImageUrl(canonical?.name);
            const isOutdatedExternalThumb = !item.thumbnail || 
              item.thumbnail.trim() === '' || 
              item.thumbnail.includes('tr.rbxcdn.com') ||
              ((item.thumbnail.includes('wixstatic.com') || item.thumbnail.includes('googleusercontent.com')) && Boolean(modernImg));
            const cleanThumb = isOutdatedExternalThumb
              ? (modernImg || canonical?.thumbnail || item.thumbnail || '')
              : item.thumbnail;

            const cleanItem: MilitaryItem = {
              ...base,
              ...item,
              id: item.id || base.id,
              name: item.name || base.name,
              category: cat,
              rarity,
              thumbnail: cleanThumb,
              history: Array.isArray(item.history) ? item.history : []
            };

            const itemId = cleanItem.id;
            const normName = (cleanItem.name || '').toLowerCase().trim();
            if (itemId && !seenIds.has(itemId) && (!normName || !seenNames.has(normName))) {
              seenIds.add(itemId);
              if (normName) seenNames.add(normName);
              result.push(cleanItem);
            }
          }

          if (result.length > 0) {
            return result;
          }
        }
      } catch (e) {
        console.error('Failed to parse cached items', e);
      }
    }
    return INITIAL_ITEMS.filter(i => i.id !== 'item-super-hovercraft' && i.name !== 'Super HoverisOverflow').map(i => ({ ...i, history: [] }));
  });

  const [reports, setReports] = useState<ReportedValue[]>(() => {
    const saved = safeLocalStorageGet(STORAGE_KEYS.REPORTS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((rep: ReportedValue) => ({
            ...rep,
            itemCategory: rep.itemCategory === 'Sea' ? 'Naval' : rep.itemCategory
          }));
        }
      } catch (e) {
        console.error('Failed to parse cached reports', e);
      }
    }
    return INITIAL_REPORTS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = safeLocalStorageGet(STORAGE_KEYS.LOGS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((l: AuditLog) => l.id !== 'log-01');
        }
      } catch (e) {
        console.error('Failed to parse cached logs', e);
      }
    }
    return [];
  });

  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(() => {
    const saved = safeLocalStorageGet(STORAGE_KEYS.STAFF_ROSTER);
    let list: StaffMember[] = INITIAL_STAFF_MEMBERS;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out legacy hardcoded accounts if any
          const filtered = parsed.filter(s => s.username?.toLowerCase() !== 'voiddarkreaper');
          if (filtered.length > 0) {
            list = filtered;
          }
        }
      } catch (e) {
        console.error('Failed to parse cached staff roster', e);
      }
    }

    // Filter out any explicitly deleted usernames
    const deletedList = safeLocalStorageGet('mt_deleted_staff_usernames');
    if (deletedList) {
      try {
        const deletedArr: string[] = JSON.parse(deletedList);
        if (Array.isArray(deletedArr) && deletedArr.length > 0) {
          list = list.filter(s => !deletedArr.includes(s.username?.toLowerCase()?.trim() || ''));
        }
      } catch (e) {
        console.error('Failed to parse deleted staff list', e);
      }
    }

    // Normalize any legacy 'Moderator' role to 'Staff'
    list = list.map(s => {
      if ((s.role as any) === 'Moderator') {
        return { ...s, role: 'Staff' as StaffRole };
      }
      return s;
    });

    // Ensure there is at least one admin account
    const hasAdmin = list.some(s => s.role === 'Admin');
    if (!hasAdmin) {
      list = [...INITIAL_STAFF_MEMBERS.filter(init => init.role === 'Admin'), ...list];
    }
    // Deduplicate by username and id, ensuring valid unique ids
    const seenStaff = new Set<string>();
    list = list.filter((m, idx) => {
      const userKey = (m.username || '').toLowerCase().trim();
      const idKey = m.id || `staff-${userKey || idx}`;
      m.id = idKey;
      if (seenStaff.has(userKey) || seenStaff.has(idKey)) return false;
      seenStaff.add(userKey);
      seenStaff.add(idKey);
      return true;
    });
    return list;
  });

  const [activeStaff, setActiveStaff] = useState<ActiveStaffSession | null>(() => {
    const savedSession = safeLocalStorageGet(STORAGE_KEYS.STAFF_SESSION);
    if (savedSession) {
      try {
        const session: ActiveStaffSession = JSON.parse(savedSession);
        if (session && session.username) {
          if ((session.role as any) === 'Moderator') {
            session.role = 'Staff';
          }
          return session;
        }
      } catch (e) {
        console.error('Failed to parse saved staff session', e);
      }
    }
    return null;
  });

  const isStaffMode = Boolean(activeStaff);
  const isAdmin = Boolean(activeStaff && activeStaff.role === 'Admin');
  const isAnalyst = Boolean(activeStaff && activeStaff.role === 'Analyst');
  const isConsultant = Boolean(activeStaff && activeStaff.role === 'Consultant');
  const canExport = Boolean(activeStaff && (activeStaff.role === 'Admin' || activeStaff.role === 'Analyst'));

  // Consultant Proposals State
  const [consultantProposals, setConsultantProposals] = useState<ConsultantProposal[]>(() => {
    const saved = safeLocalStorageGet(STORAGE_KEYS.CONSULTANT_PROPOSALS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Failed to parse cached consultant proposals', e);
      }
    }
    return [];
  });

  // Universal Star Config state for Vehicles
  const [universalStarConfig, setUniversalStarConfig] = useState<UniversalStarConfig>(() => {
    const saved = safeLocalStorageGet(STORAGE_KEYS.STAR_CONFIG);
    if (saved) {
      try {
        return { ...DEFAULT_UNIVERSAL_STAR_CONFIG, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Failed to parse cached star config', e);
      }
    }
    return DEFAULT_UNIVERSAL_STAR_CONFIG;
  });

  // Universal Star Multipliers for Soldiers & Drones (0★ - 3★)
  const [universalSoldierDroneStarConfig, setUniversalSoldierDroneStarConfig] = useState<UniversalSoldierDroneStarConfig>(() => {
    const saved = safeLocalStorageGet(STORAGE_KEYS.SOLDIER_DRONE_STAR_CONFIG);
    if (saved) {
      try {
        return { ...DEFAULT_SOLDIER_DRONE_STAR_CONFIG, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Failed to parse cached soldier/drone star config', e);
      }
    }
    return DEFAULT_SOLDIER_DRONE_STAR_CONFIG;
  });

  // Site Information & Our Team Config
  const [siteInfo, setSiteInfo] = useState<SiteInfoConfig>(() => {
    const saved = safeLocalStorageGet(STORAGE_KEYS.SITE_INFO);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const isOldDefaultDesc = !parsed.description || parsed.description.includes('community-driven valuation guide');
          return {
            ...DEFAULT_SITE_INFO,
            ...parsed,
            description: isOldDefaultDesc ? DEFAULT_SITE_INFO.description : parsed.description,
            discordUrl: parsed.discordUrl && parsed.discordUrl !== 'https://discord.gg' ? parsed.discordUrl : DEFAULT_SITE_INFO.discordUrl,
            robloxGroupUrl: undefined,
            teamMembers: Array.isArray(parsed.teamMembers) ? parsed.teamMembers : DEFAULT_SITE_INFO.teamMembers
          };
        }
      } catch (e) {
        console.error('Failed to parse cached site info', e);
      }
    }
    return DEFAULT_SITE_INFO;
  });

  // Site Backups & Disaster Recovery state
  const [siteBackups, setSiteBackups] = useState<SiteBackup[]>(() => {
    const saved = safeLocalStorageGet(STORAGE_KEYS.SITE_BACKUPS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Failed to parse cached site backups', e);
      }
    }
    return [];
  });
  const [isBackingUp, setIsBackingUp] = useState(false);

  // DB Sync status
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [dbSyncStatus, setDbSyncStatus] = useState<'synced' | 'syncing' | 'error'>('syncing');
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [isQuotaBannerDismissed, setIsQuotaBannerDismissed] = useState(false);
  const dismissQuotaBanner = () => setIsQuotaBannerDismissed(true);

  // Synchronize with Firestore
  useEffect(() => {
    let isMounted = true;

    const isQuotaError = (error: any): boolean => {
      const msg = error?.message || String(error || '');
      return (
        msg.includes('Quota limit exceeded') ||
        msg.includes('Quota exceeded') ||
        msg.includes('ResourceExhausted') ||
        msg.includes('quota metric')
      );
    };

    const handleSnapshotError = (resourceName: string, error: any) => {
      if (!isMounted) return;
      if (isQuotaError(error)) {
        setIsQuotaExceeded(true);
        setDbSyncStatus('error');
        console.warn(
          `Firestore free daily read quota reached for '${resourceName}'. Operating with local cache and preloaded catalog.`
        );
      } else {
        console.error(`Firestore ${resourceName} snapshot error:`, error);
        setDbSyncStatus('error');
      }
    };

    // Test Firestore connection on boot
    const testConnection = async () => {
      try {
        await getDoc(doc(db, 'system', 'connectionCheck'));
        if (isMounted) {
          setIsDbConnected(true);
          setDbSyncStatus('synced');
        }
      } catch (err: any) {
        if (isQuotaError(err)) {
          if (isMounted) {
            setIsQuotaExceeded(true);
            setIsDbConnected(true);
            setDbSyncStatus('error');
          }
        } else if (err?.message?.includes('the client is offline')) {
          if (isMounted) {
            setIsDbConnected(true);
            setDbSyncStatus('synced');
          }
        } else {
          if (isMounted) {
            setIsDbConnected(true);
            setDbSyncStatus('synced');
          }
        }
      }
    };
    testConnection();

    // 1. Subscribe to Items collection
    const unsubItems = onSnapshot(
      collection(db, 'items'),
      async (snapshot) => {
        if (!isMounted) return;
        if (snapshot.empty) {
          // If snapshot is empty (e.g. initial empty local cache or connection initialization),
          // NEVER overwrite remote Firestore with defaults! Wait for server snapshot.
          console.log('[Firestore] Items collection snapshot is currently empty; awaiting server data.');
          setDbSyncStatus('syncing');
          return;
        }

        const initialMap = new Map(INITIAL_ITEMS.map(i => [i.id, i]));
        const initialByName = new Map(INITIAL_ITEMS.map(i => [i.name.toLowerCase().trim(), i]));
        const loadedItems: MilitaryItem[] = [];
        const seenIds = new Set<string>();
        const seenNames = new Set<string>();
        const itemsToMigrateToNaval: string[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as MilitaryItem;

          // Purge corrupt / bogus items automatically
          if (docSnap.id === 'item-super-hovercraft' || data.name === 'Super HoverisOverflow' || (data.id === 'item-super-hovercraft')) {
            deleteDoc(doc(db, 'items', docSnap.id)).catch(() => {});
            return;
          }

          const canonical = initialMap.get(data.id) || initialByName.get(data.name?.toLowerCase()?.trim());
          const modernImg = getVehicleImageUrl(data.name) || getVehicleImageUrl(data.id) || getVehicleImageUrl(canonical?.name);
          const isOutdatedExternalThumb = !data.thumbnail || 
            data.thumbnail.trim() === '' || 
            data.thumbnail.includes('tr.rbxcdn.com') ||
            ((data.thumbnail.includes('wixstatic.com') || data.thumbnail.includes('googleusercontent.com')) && Boolean(modernImg));
          const thumbnail = isOutdatedExternalThumb
            ? (modernImg || canonical?.thumbnail || data.thumbnail || '')
            : data.thumbnail;

            let cat: ItemCategory = data.category === 'Sea' ? 'Naval' : (data.category as ItemCategory);
            if (data.category === 'Sea') {
              itemsToMigrateToNaval.push(docSnap.id);
            }

            // If canonical has a known category other than Tags, restore it if corrupted to Tags
            if (canonical && canonical.category && canonical.category !== 'Tags' && cat === 'Tags') {
              cat = (canonical.category === 'Sea' ? 'Naval' : canonical.category) as ItemCategory;
            }

            // Only sort genuine cosmetic tags to Tags category
            if (cat !== 'Tags' && (shouldSortToTagsCategory(data) || (canonical && canonical.category === 'Tags'))) {
              cat = 'Tags';
            }

            let rarity = data.rarity || canonical?.rarity || 'Rare';
            if (canonical && canonical.rarity === 'Limited Edition') {
              rarity = 'Limited Edition';
            } else if ((data.name || canonical?.name || '').toLowerCase().startsWith('le ') || (data.name || canonical?.name || '').toLowerCase().includes('limited')) {
              rarity = 'Limited Edition';
            }

            // Retain all recorded history points
            const cleanHistory = Array.isArray(data.history) ? data.history : [];
            const cleanItem: MilitaryItem = {
              ...data,
              id: data.id || docSnap.id,
              name: data.name || canonical?.name || docSnap.id,
              category: cat,
              rarity,
              thumbnail,
              history: cleanHistory
            };

            const itemId = cleanItem.id;
            const normName = (cleanItem.name || '').toLowerCase().trim();

            if (itemId && !seenIds.has(itemId) && (!normName || !seenNames.has(normName))) {
              seenIds.add(itemId);
              if (normName) seenNames.add(normName);
              loadedItems.push(cleanItem);
            }
          });

          setItems(loadedItems);
          saveItemsCache(loadedItems);
          setDbSyncStatus('synced');

          // Keep active modals and detail page synced with real-time updates
          setActiveItemDetailPage(prev => {
            if (!prev) return null;
            const updated = loadedItems.find(i => i.id === prev.id);
            return updated || prev;
          });
          setActiveChartModalItem(prev => {
            if (!prev) return null;
            const updated = loadedItems.find(i => i.id === prev.id);
            return updated || prev;
          });

          // Auto-migrate any existing Firestore items from 'Sea' to 'Naval'
          if (itemsToMigrateToNaval.length > 0) {
            try {
              const batch = writeBatch(db);
              itemsToMigrateToNaval.forEach((itemId) => {
                batch.update(doc(db, 'items', itemId), { category: 'Naval' });
              });
              batch.commit().then(() => {
                console.log(`Auto-migrated ${itemsToMigrateToNaval.length} legacy Sea items to Naval in Firestore.`);
              }).catch((e) => {
                console.error('Failed to auto-migrate Sea items to Naval in Firestore:', e);
              });
            } catch (err) {
              console.error('Batch setup error for Sea to Naval migration:', err);
            }
          }
      },
      (error) => handleSnapshotError('items', error)
    );

    // 2. Subscribe to Reports collection
    const unsubReports = onSnapshot(
      collection(db, 'reports'),
      async (snapshot) => {
        if (!isMounted) return;
        if (snapshot.empty) {
          // Seed initial reports if empty
          try {
            const batch = writeBatch(db);
            INITIAL_REPORTS.forEach((rep) => {
              const repRef = doc(db, 'reports', rep.id);
              batch.set(repRef, {
                ...rep,
                itemCategory: rep.itemCategory === 'Sea' ? 'Naval' : rep.itemCategory
              });
            });
            await batch.commit();
          } catch (e) {
            console.error('Failed to seed initial reports to Firestore:', e);
          }
        } else {
          const loadedReports: ReportedValue[] = [];
          const seenReportIds = new Set<string>();
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as ReportedValue;
            const repId = data.id || docSnap.id;
            if (!seenReportIds.has(repId)) {
              seenReportIds.add(repId);
              loadedReports.push({
                ...data,
                id: repId,
                itemCategory: data.itemCategory === 'Sea' ? 'Naval' : data.itemCategory
              });
            }
          });
          // Sort newest first
          loadedReports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setReports(loadedReports);
          safeLocalStorageSet(STORAGE_KEYS.REPORTS, JSON.stringify(loadedReports));
        }
      },
      (error) => handleSnapshotError('reports', error)
    );

    // 3. Subscribe to Audit Logs
    const unsubLogs = onSnapshot(
      collection(db, 'auditLogs'),
      (snapshot) => {
        if (!isMounted) return;
        if (!snapshot.empty) {
          const loadedLogs: AuditLog[] = [];
          const seenLogIds = new Set<string>();
          snapshot.forEach((docSnap) => {
            const logItem = docSnap.data() as AuditLog;
            const logId = logItem.id || docSnap.id;
            if (logId !== 'log-01' && !seenLogIds.has(logId)) {
              seenLogIds.add(logId);
              loadedLogs.push({
                ...logItem,
                id: logId
              });
            }
          });
          loadedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setAuditLogs(loadedLogs);
          safeLocalStorageSet(STORAGE_KEYS.LOGS, JSON.stringify(loadedLogs));
        }
      },
      (error) => handleSnapshotError('auditLogs', error)
    );

    // 4. Subscribe to System Star Config
    const unsubStarConfig = onSnapshot(
      doc(db, 'system', 'starConfig'),
      (docSnap) => {
        if (!isMounted) return;
        if (docSnap.exists()) {
          const cfg = docSnap.data() as UniversalStarConfig;
          setUniversalStarConfig(cfg);
          safeLocalStorageSet(STORAGE_KEYS.STAR_CONFIG, JSON.stringify(cfg));
        }
      },
      (error) => handleSnapshotError('starConfig', error)
    );

    // 4b. Subscribe to Soldier & Drone Star Multipliers
    const unsubSoldierDroneStarConfig = onSnapshot(
      doc(db, 'system', 'soldierDroneStarConfig'),
      (docSnap) => {
        if (!isMounted) return;
        if (docSnap.exists()) {
          const cfg = docSnap.data() as UniversalSoldierDroneStarConfig;
          if (cfg) {
            setUniversalSoldierDroneStarConfig(cfg);
            safeLocalStorageSet(STORAGE_KEYS.SOLDIER_DRONE_STAR_CONFIG, JSON.stringify(cfg));
          }
        }
      },
      (error) => handleSnapshotError('soldierDroneStarConfig', error)
    );

    // 5. Subscribe to System Staff Roster
    const unsubStaff = onSnapshot(
      doc(db, 'system', 'staffRoster'),
      (docSnap) => {
        if (!isMounted) return;
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data?.members) && data.members.length > 0) {
            let normalized: StaffMember[] = data.members.map((m: any) => ({
              ...m,
              role: (m.role === 'Moderator' ? 'Staff' : m.role) as StaffRole
            }));

            // Filter out any explicitly deleted usernames
            const deletedList = safeLocalStorageGet('mt_deleted_staff_usernames');
            if (deletedList) {
              try {
                const deletedArr: string[] = JSON.parse(deletedList);
                if (Array.isArray(deletedArr) && deletedArr.length > 0) {
                  normalized = normalized.filter(m => !deletedArr.includes((m.username || '').toLowerCase().trim()));
                }
              } catch {}
            }

            // Ensure there is at least one admin account
            const hasAdmin = normalized.some(m => m.role === 'Admin');
            if (!hasAdmin) {
              normalized = [...INITIAL_STAFF_MEMBERS.filter(init => init.role === 'Admin'), ...normalized];
            }

            const seenSnapStaff = new Set<string>();
            normalized = normalized.filter((m, idx) => {
              const userKey = (m.username || '').toLowerCase().trim();
              const idKey = m.id || `staff-${userKey || idx}`;
              m.id = idKey;
              if (seenSnapStaff.has(userKey) || seenSnapStaff.has(idKey)) return false;
              seenSnapStaff.add(userKey);
              seenSnapStaff.add(idKey);
              return true;
            });
            setStaffMembers(normalized);
            safeLocalStorageSet(STORAGE_KEYS.STAFF_ROSTER, JSON.stringify(normalized));
          }
        }
      },
      (error) => handleSnapshotError('staffRoster', error)
    );

    // 6. Subscribe to Site Information & Our Team Config
    const unsubSiteInfo = onSnapshot(
      doc(db, 'system', 'siteInfo'),
      (docSnap) => {
        if (!isMounted) return;
        if (docSnap.exists()) {
          const data = docSnap.data() as Partial<SiteInfoConfig>;
          if (data && typeof data === 'object') {
            const isOldDefaultDesc = !data.description || data.description.includes('community-driven valuation guide');
            const merged: SiteInfoConfig = {
              ...DEFAULT_SITE_INFO,
              ...data,
              description: isOldDefaultDesc ? DEFAULT_SITE_INFO.description : data.description,
              discordUrl: data.discordUrl && data.discordUrl !== 'https://discord.gg' ? data.discordUrl : DEFAULT_SITE_INFO.discordUrl,
              robloxGroupUrl: undefined,
              teamMembers: Array.isArray(data.teamMembers) ? data.teamMembers : DEFAULT_SITE_INFO.teamMembers
            };
            setSiteInfo(merged);
            safeLocalStorageSet(STORAGE_KEYS.SITE_INFO, JSON.stringify(merged));
          }
        }
      },
      (error) => handleSnapshotError('siteInfo', error)
    );

    // 7. Subscribe to Site Backups collection
    const unsubSiteBackups = onSnapshot(
      collection(db, 'siteBackups'),
      (snapshot) => {
        if (!isMounted) return;
        if (!snapshot.empty) {
          const loadedBackups: SiteBackup[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as SiteBackup;
            if (data && (data.id || docSnap.id)) {
              loadedBackups.push({
                ...data,
                id: docSnap.id
              });
            }
          });
          loadedBackups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setSiteBackups(loadedBackups);
        }
      },
      (error) => handleSnapshotError('siteBackups', error)
    );

    // 8. Subscribe to Consultant Proposals collection
    const unsubConsultantProposals = onSnapshot(
      collection(db, 'consultantProposals'),
      (snapshot) => {
        if (!isMounted) return;
        const loadedProposals: ConsultantProposal[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as ConsultantProposal;
          if (data) {
            loadedProposals.push({
              ...data,
              id: docSnap.id
            });
          }
        });
        loadedProposals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setConsultantProposals(loadedProposals);
        safeLocalStorageSet(STORAGE_KEYS.CONSULTANT_PROPOSALS, JSON.stringify(loadedProposals));
      },
      (error) => handleSnapshotError('consultantProposals', error)
    );

    return () => {
      isMounted = false;
      unsubItems();
      unsubReports();
      unsubLogs();
      unsubStarConfig();
      unsubSoldierDroneStarConfig();
      unsubStaff();
      unsubSiteInfo();
      unsubSiteBackups();
      unsubConsultantProposals();
    };
  }, []);

  // Sync active staff session to LocalStorage
  useEffect(() => {
    if (activeStaff) {
      safeLocalStorageSet(STORAGE_KEYS.STAFF_SESSION, JSON.stringify(activeStaff));
    } else {
      safeLocalStorageRemove(STORAGE_KEYS.STAFF_SESSION);
    }
  }, [activeStaff]);

  // Daily Automated Backup Runner (Ensures full snapshot is taken every calendar day)
  useEffect(() => {
    if (items.length === 0 || dbSyncStatus === 'syncing') return;
    const todayKey = new Date().toISOString().split('T')[0];
    const hasTodayDaily = siteBackups.some(b => b.dateKey === todayKey && b.type === 'daily_auto');
    const lastDailyDone = safeLocalStorageGet('mts_daily_backup_completed_key');

    if (!hasTodayDaily && lastDailyDone !== todayKey) {
      safeLocalStorageSet('mts_daily_backup_completed_key', todayKey);
      const todayFormatted = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      createBackup(
        `Daily Automated Backup - ${todayFormatted}`,
        'daily_auto',
        `Automated daily snapshot of complete catalog (${items.length} items)`
      ).catch(err => console.error('[Site Backup] Daily auto backup error:', err));
    }
  }, [items.length, dbSyncStatus, siteBackups]);

  const updateSiteInfo = async (newInfo: SiteInfoConfig) => {
    setSiteInfo(newInfo);
    safeLocalStorageSet(STORAGE_KEYS.SITE_INFO, JSON.stringify(newInfo));
    addAuditLog(
      'MANUAL_EDIT',
      'Site Info & Team',
      `Admin updated site information and team directory (${newInfo.teamMembers.length} members)`
    );
    try {
      await setDoc(doc(db, 'system', 'siteInfo'), cleanForFirestore(newInfo));
    } catch (e) {
      console.error('Failed to sync site info to Firestore:', e);
    }
  };

  const resetSiteInfoToDefault = async () => {
    setSiteInfo(DEFAULT_SITE_INFO);
    safeLocalStorageSet(STORAGE_KEYS.SITE_INFO, JSON.stringify(DEFAULT_SITE_INFO));
    addAuditLog(
      'MANUAL_EDIT',
      'Site Info & Team',
      'Admin reset site information and team section to default'
    );
    try {
      await setDoc(doc(db, 'system', 'siteInfo'), cleanForFirestore(DEFAULT_SITE_INFO));
    } catch (e) {
      console.error('Failed to reset site info in Firestore:', e);
    }
  };

  const updateUniversalStarConfig = async (newConfig: UniversalStarConfig) => {
    const oldConfig = universalStarConfig;
    setUniversalStarConfig(newConfig);
    safeLocalStorageSet(STORAGE_KEYS.STAR_CONFIG, JSON.stringify(newConfig));
    const starChanges: AuditLogChange[] = [
      { field: 'Fresh Bonus', from: `+$${(oldConfig.fresh/1e3).toFixed(0)}k`, to: `+$${(newConfig.fresh/1e3).toFixed(0)}k` },
      { field: '0★ Bonus', from: `+$${(oldConfig['0']/1e3).toFixed(0)}k`, to: `+$${(newConfig['0']/1e3).toFixed(0)}k` },
      { field: '1★ Bonus', from: `+$${(oldConfig['1']/1e3).toFixed(0)}k`, to: `+$${(newConfig['1']/1e3).toFixed(0)}k` },
      { field: '2★ Bonus', from: `+$${(oldConfig['2']/1e3).toFixed(0)}k`, to: `+$${(newConfig['2']/1e3).toFixed(0)}k` },
      { field: '3★ Bonus', from: `+$${(oldConfig['3']/1e3).toFixed(0)}k`, to: `+$${(newConfig['3']/1e3).toFixed(0)}k` },
      { field: '4★ Bonus', from: `+$${(oldConfig['4']/1e3).toFixed(0)}k`, to: `+$${(newConfig['4']/1e3).toFixed(0)}k` },
      { field: '5★ Bonus', from: `+$${(oldConfig['5']/1e3).toFixed(0)}k`, to: `+$${(newConfig['5']/1e3).toFixed(0)}k` }
    ].filter(c => c.from !== c.to);

    addAuditLog({
      action: 'MANUAL_EDIT',
      itemName: 'Universal Vehicle Stars',
      details: `Admin updated universal vehicle star values: Fresh (+$${(newConfig.fresh/1e3).toFixed(0)}k), 0★ (+$${(newConfig['0']/1e3).toFixed(0)}k), 1★ (+$${(newConfig['1']/1e3).toFixed(0)}k), 2★ (+$${(newConfig['2']/1e3).toFixed(0)}k), 3★ (+$${(newConfig['3']/1e3).toFixed(0)}k), 4★ (+$${(newConfig['4']/1e3).toFixed(0)}k), 5★ (+$${(newConfig['5']/1e3).toFixed(0)}k)`,
      oldValue: oldConfig['1'],
      newValue: newConfig['1'],
      changes: starChanges
    });
    try {
      await setDoc(doc(db, 'system', 'starConfig'), cleanForFirestore(newConfig));
    } catch (e) {
      console.error('Failed to sync star config to Firestore:', e);
    }
  };

  const updateUniversalSoldierDroneStarConfig = async (newConfig: UniversalSoldierDroneStarConfig) => {
    const oldConfig = universalSoldierDroneStarConfig;
    setUniversalSoldierDroneStarConfig(newConfig);
    safeLocalStorageSet(STORAGE_KEYS.SOLDIER_DRONE_STAR_CONFIG, JSON.stringify(newConfig));
    const multChanges: AuditLogChange[] = [
      { field: '0★ Multiplier', from: `${oldConfig['0']}x base`, to: `${newConfig['0']}x base` },
      { field: '1★ Multiplier', from: `${oldConfig['1']}x base`, to: `${newConfig['1']}x base` },
      { field: '2★ Multiplier', from: `${oldConfig['2']}x base`, to: `${newConfig['2']}x base` },
      { field: '3★ Multiplier', from: `${oldConfig['3']}x base`, to: `${newConfig['3']}x base` }
    ].filter(c => c.from !== c.to);

    addAuditLog({
      action: 'MANUAL_EDIT',
      itemName: 'Universal Soldier & Drone Multipliers',
      details: `Admin updated universal multipliers: 0★ (${newConfig['0']}x base), 1★ (${newConfig['1']}x base), 2★ (${newConfig['2']}x base), 3★ (${newConfig['3']}x base)`,
      oldValue: oldConfig['2'],
      newValue: newConfig['2'],
      changes: multChanges
    });
    try {
      await setDoc(doc(db, 'system', 'soldierDroneStarConfig'), cleanForFirestore(newConfig));
    } catch (e) {
      console.error('Failed to sync soldier/drone star config to Firestore:', e);
    }
  };

  const getItemStarValue = (item: MilitaryItem, tier: string = 'fresh') => {
    return calculateItemStarValue(item, tier, universalStarConfig, universalSoldierDroneStarConfig);
  };

  // Custom Staff Login
  const loginStaff = (username: string, pass: string): { success: boolean; message: string } => {
    const cleanUser = username.trim();
    const cleanPass = pass.trim();

    if (!cleanUser || !cleanPass) {
      return { success: false, message: 'Please enter both username and password.' };
    }

    const matched = staffMembers.find(
      s => s.username.toLowerCase() === cleanUser.toLowerCase()
    );

    if (!matched) {
      return {
        success: false,
        message: 'Account not found. Please verify your username.'
      };
    }

    if (matched.password !== cleanPass) {
      return {
        success: false,
        message: 'Incorrect password. Please try again.'
      };
    }

    const nowIso = new Date().toISOString();
    const session: ActiveStaffSession = {
      id: matched.id,
      username: matched.username,
      displayName: matched.displayName || matched.username,
      role: matched.role,
      loginTime: nowIso
    };

    setActiveStaff(session);

    // Create session log entry
    const sessionLogId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newSessionLog: StaffSessionLog = {
      id: sessionLogId,
      loginAt: nowIso,
      durationMinutes: 0,
      deviceInfo: typeof navigator !== 'undefined' ? `${navigator.platform || 'Desktop'} (${navigator.userAgent.slice(0, 35)}...)` : 'Web Browser',
      activePing: nowIso
    };

    // Update last login timestamp and session logs in staff roster
    const updatedRoster = staffMembers.map(s => {
      if (s.id === matched.id) {
        const existingLogs = Array.isArray(s.sessionLogs) ? s.sessionLogs : [];
        return {
          ...s,
          lastLogin: nowIso,
          lastActive: nowIso,
          sessionLogs: [newSessionLog, ...existingLogs].slice(0, 50)
        };
      }
      return s;
    });

    setStaffMembers(updatedRoster);
    safeLocalStorageSet(STORAGE_KEYS.STAFF_ROSTER, JSON.stringify(updatedRoster));
    setDoc(doc(db, 'system', 'staffRoster'), cleanForFirestore({ members: updatedRoster })).catch(err => console.error('Staff login roster update error:', err));

    addAuditLog('MANUAL_EDIT', 'Staff Auth', `${session.displayName} logged in successfully as [${session.role}].`);

    return {
      success: true,
      message: `Welcome back, ${session.displayName} (${session.role})!`
    };
  };

  const logoutStaff = () => {
    if (activeStaff) {
      const nowIso = new Date().toISOString();
      const loginTime = activeStaff.loginTime ? new Date(activeStaff.loginTime).getTime() : Date.now();
      const duration = Math.max(1, Math.round((Date.now() - loginTime) / 60000));

      const updatedRoster = staffMembers.map(s => {
        if (s.id === activeStaff.id) {
          const logs = Array.isArray(s.sessionLogs) ? [...s.sessionLogs] : [];
          if (logs.length > 0 && !logs[0].logoutAt) {
            logs[0] = {
              ...logs[0],
              logoutAt: nowIso,
              durationMinutes: duration
            };
          }
          return {
            ...s,
            lastLogout: nowIso,
            lastActive: nowIso,
            totalSessionMinutes: (s.totalSessionMinutes || 0) + duration,
            sessionLogs: logs
          };
        }
        return s;
      });

      setStaffMembers(updatedRoster);
      safeLocalStorageSet(STORAGE_KEYS.STAFF_ROSTER, JSON.stringify(updatedRoster));
      setDoc(doc(db, 'system', 'staffRoster'), cleanForFirestore({ members: updatedRoster })).catch(err => console.error('Staff logout roster update error:', err));

      addAuditLog('MANUAL_EDIT', 'Staff Auth', `${activeStaff.displayName || activeStaff.username} logged out (session: ${duration} min${duration === 1 ? '' : 's'}).`);
    }
    setActiveStaff(null);
    safeLocalStorageRemove(STORAGE_KEYS.STAFF_SESSION);
  };

  // Staff Management Methods (Admin only)
  const addStaffMember = (
    username: string,
    password: string,
    role: StaffRole,
    displayName?: string
  ): { success: boolean; message: string } => {
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || cleanUser.length < 3) {
      return { success: false, message: 'Username must be at least 3 characters long.' };
    }

    if (!cleanPass || cleanPass.length < 4) {
      return { success: false, message: 'Password must be at least 4 characters long.' };
    }

    const exists = staffMembers.some(
      s => s.username.toLowerCase() === cleanUser.toLowerCase()
    );

    if (exists) {
      return { success: false, message: `Username "${cleanUser}" is already taken.` };
    }

    const newMember: StaffMember = {
      id: `staff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      username: cleanUser,
      password: cleanPass,
      displayName: displayName?.trim() || cleanUser,
      role,
      addedBy: activeStaff?.displayName || activeStaff?.username || 'Admin',
      addedAt: new Date().toISOString()
    };

    // Clear from deleted list if re-adding intentionally
    const deletedList = safeLocalStorageGet('mt_deleted_staff_usernames');
    if (deletedList) {
      try {
        let deletedArr: string[] = JSON.parse(deletedList);
        deletedArr = deletedArr.filter(u => u !== cleanUser.toLowerCase());
        safeLocalStorageSet('mt_deleted_staff_usernames', JSON.stringify(deletedArr));
      } catch {}
    }

    const updated = [...staffMembers, newMember];
    setStaffMembers(updated);
    safeLocalStorageSet(STORAGE_KEYS.STAFF_ROSTER, JSON.stringify(updated));
    setDoc(doc(db, 'system', 'staffRoster'), cleanForFirestore({ members: updated })).catch(err => console.error('Firestore staff sync error:', err));

    addAuditLog(
      'MANUAL_EDIT',
      'Staff Management',
      `Created new staff account [${cleanUser}] with role [${role}] by Admin ${activeStaff?.displayName || 'Admin'}.`
    );

    return { success: true, message: `Staff member "${cleanUser}" created successfully as ${role}.` };
  };

  const updateStaffRole = (id: string, newRole: StaffRole): { success: boolean; message: string } => {
    const member = staffMembers.find(s => s.id === id);
    if (!member) {
      return { success: false, message: 'Staff member not found.' };
    }

    if (member.role === 'Admin' && newRole !== 'Admin') {
      const adminCount = staffMembers.filter(s => s.role === 'Admin').length;
      if (adminCount <= 1) {
        return { success: false, message: 'Cannot demote the only remaining Administrator.' };
      }
    }

    const updated = staffMembers.map(s => {
      if (s.id === id) {
        return { ...s, role: newRole };
      }
      return s;
    });

    setStaffMembers(updated);
    safeLocalStorageSet(STORAGE_KEYS.STAFF_ROSTER, JSON.stringify(updated));
    setDoc(doc(db, 'system', 'staffRoster'), cleanForFirestore({ members: updated })).catch(err => console.error('Firestore staff sync error:', err));

    if (activeStaff && activeStaff.id === id) {
      setActiveStaff(prev => prev ? { ...prev, role: newRole } : null);
    }

    addAuditLog(
      'MANUAL_EDIT',
      'Staff Management',
      `Changed role of [${member.username}] to [${newRole}] by Admin ${activeStaff?.displayName || 'Admin'}.`
    );

    return { success: true, message: `Updated role for ${member.username} to ${newRole}.` };
  };

  const updateStaffPassword = (id: string, newPassword: string): { success: boolean; message: string } => {
    const cleanPass = newPassword.trim();
    if (!cleanPass || cleanPass.length < 4) {
      return { success: false, message: 'New password must be at least 4 characters long.' };
    }

    const member = staffMembers.find(s => s.id === id);
    if (!member) {
      return { success: false, message: 'Staff member not found.' };
    }

    const updated = staffMembers.map(s => {
      if (s.id === id) {
        return { ...s, password: cleanPass };
      }
      return s;
    });

    setStaffMembers(updated);
    safeLocalStorageSet(STORAGE_KEYS.STAFF_ROSTER, JSON.stringify(updated));
    setDoc(doc(db, 'system', 'staffRoster'), cleanForFirestore({ members: updated })).catch(err => console.error('Firestore staff sync error:', err));

    addAuditLog(
      'MANUAL_EDIT',
      'Staff Management',
      `Updated password for [${member.username}] by Admin ${activeStaff?.displayName || 'Admin'}.`
    );

    return { success: true, message: `Password for ${member.username} has been updated.` };
  };

  const removeStaffMember = (id: string): { success: boolean; message: string } => {
    const memberToRemove = staffMembers.find(s => s.id === id || s.username?.toLowerCase() === id.toLowerCase());
    if (!memberToRemove) {
      return { success: false, message: 'Staff member not found.' };
    }

    if (memberToRemove.role === 'Admin') {
      const adminCount = staffMembers.filter(s => s.role === 'Admin').length;
      if (adminCount <= 1) {
        return { success: false, message: 'Cannot remove the only remaining Administrator.' };
      }
    }

    const targetUsername = (memberToRemove.username || '').toLowerCase().trim();
    const updated = staffMembers.filter(s => s.id !== memberToRemove.id && (s.username || '').toLowerCase().trim() !== targetUsername);
    setStaffMembers(updated);
    safeLocalStorageSet(STORAGE_KEYS.STAFF_ROSTER, JSON.stringify(updated));

    // Save to deleted staff list so it is never resurrected
    const deletedList = safeLocalStorageGet('mt_deleted_staff_usernames');
    let deletedArr: string[] = [];
    if (deletedList) {
      try {
        deletedArr = JSON.parse(deletedList);
      } catch {}
    }
    if (targetUsername && !deletedArr.includes(targetUsername)) {
      deletedArr.push(targetUsername);
    }
    safeLocalStorageSet('mt_deleted_staff_usernames', JSON.stringify(deletedArr));

    setDoc(doc(db, 'system', 'staffRoster'), cleanForFirestore({ members: updated })).catch(err => console.error('Firestore staff sync error:', err));

    if (activeStaff && (activeStaff.id === memberToRemove.id || (activeStaff.username || '').toLowerCase().trim() === targetUsername)) {
      logoutStaff();
    }

    addAuditLog(
      'MANUAL_EDIT',
      'Staff Management',
      `Removed staff account [${memberToRemove.username}] by Admin ${activeStaff?.displayName || 'Admin'}.`
    );

    return { success: true, message: `Removed "${memberToRemove.username}" from staff roster.` };
  };

  // Heartbeat tracking for active staff session
  useEffect(() => {
    if (!activeStaff) return;

    const interval = setInterval(() => {
      const nowIso = new Date().toISOString();
      const loginTime = activeStaff.loginTime ? new Date(activeStaff.loginTime).getTime() : Date.now();
      const duration = Math.max(1, Math.round((Date.now() - loginTime) / 60000));

      setStaffMembers(prev => {
        const updated = prev.map(s => {
          if (s.id === activeStaff.id) {
            const logs = Array.isArray(s.sessionLogs) ? [...s.sessionLogs] : [];
            if (logs.length > 0 && !logs[0].logoutAt) {
              logs[0] = {
                ...logs[0],
                durationMinutes: duration,
                activePing: nowIso
              };
            }
            return {
              ...s,
              lastActive: nowIso,
              sessionLogs: logs
            };
          }
          return s;
        });
        safeLocalStorageSet(STORAGE_KEYS.STAFF_ROSTER, JSON.stringify(updated));
        return updated;
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [activeStaff]);

  // Window unload listener to record session duration on page exit
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeStaff) {
        const nowIso = new Date().toISOString();
        const loginTime = activeStaff.loginTime ? new Date(activeStaff.loginTime).getTime() : Date.now();
        const duration = Math.max(1, Math.round((Date.now() - loginTime) / 60000));

        const updated = staffMembers.map(s => {
          if (s.id === activeStaff.id) {
            const logs = Array.isArray(s.sessionLogs) ? [...s.sessionLogs] : [];
            if (logs.length > 0 && !logs[0].logoutAt) {
              logs[0] = { ...logs[0], logoutAt: nowIso, durationMinutes: duration };
            }
            return {
              ...s,
              lastActive: nowIso,
              totalSessionMinutes: (s.totalSessionMinutes || 0) + duration,
              sessionLogs: logs
            };
          }
          return s;
        });
        safeLocalStorageSet(STORAGE_KEYS.STAFF_ROSTER, JSON.stringify(updated));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeStaff, staffMembers]);

  // Quota & Performance Analytics Management
  const updateStaffWeeklyQuota = (id: string, quota: number): { success: boolean; message: string } => {
    if (!isAdmin) {
      return { success: false, message: 'Only Administrators can change weekly quotas.' };
    }

    const cleanQuota = Math.max(1, Math.min(100, Math.floor(quota)));
    const targetMember = staffMembers.find(s => s.id === id);
    if (!targetMember) {
      return { success: false, message: 'Staff member not found.' };
    }

    const updated = staffMembers.map(s => {
      if (s.id === id) {
        return { ...s, weeklyQuota: cleanQuota };
      }
      return s;
    });

    setStaffMembers(updated);
    safeLocalStorageSet(STORAGE_KEYS.STAFF_ROSTER, JSON.stringify(updated));
    setDoc(doc(db, 'system', 'staffRoster'), cleanForFirestore({ members: updated })).catch(err => console.error('Firestore staff sync error:', err));

    addAuditLog(
      'MANUAL_EDIT',
      'Staff Management',
      `Admin ${activeStaff?.displayName || 'Admin'} updated weekly suggestions quota for [${targetMember.username}] to ${cleanQuota} suggestions/week.`
    );

    return { success: true, message: `Weekly quota for ${targetMember.displayName || targetMember.username} set to ${cleanQuota} suggestions/week.` };
  };

  const acknowledgeUnmetQuota = (staffId: string, weekKey: string): { success: boolean; message: string } => {
    if (!isAdmin) {
      return { success: false, message: 'Only Administrators can acknowledge quota warnings.' };
    }
    const targetMember = staffMembers.find(s => s.id === staffId);
    if (!targetMember) return { success: false, message: 'Staff member not found.' };

    const currentAck = Array.isArray(targetMember.acknowledgedUnmetWeeks) ? targetMember.acknowledgedUnmetWeeks : [];
    if (currentAck.includes(weekKey)) {
      return { success: true, message: 'Warning already acknowledged.' };
    }

    const updated = staffMembers.map(s => {
      if (s.id === staffId) {
        return { ...s, acknowledgedUnmetWeeks: [...currentAck, weekKey] };
      }
      return s;
    });

    setStaffMembers(updated);
    safeLocalStorageSet(STORAGE_KEYS.STAFF_ROSTER, JSON.stringify(updated));
    setDoc(doc(db, 'system', 'staffRoster'), cleanForFirestore({ members: updated })).catch(err => console.error('Firestore staff sync error:', err));

    return { success: true, message: `Acknowledged unmet quota for ${targetMember.username} (${weekKey}).` };
  };

  const excuseUnmetQuota = (staffId: string, weekKey: string, reason: string = 'Excused by Administrator'): { success: boolean; message: string } => {
    if (!isAdmin) {
      return { success: false, message: 'Only Administrators can excuse quotas.' };
    }
    const targetMember = staffMembers.find(s => s.id === staffId);
    if (!targetMember) return { success: false, message: 'Staff member not found.' };

    const prevHistory = Array.isArray(targetMember.weeklyQuotaHistory) ? targetMember.weeklyQuotaHistory : [];
    const filteredHistory = prevHistory.filter(h => h.weekKey !== weekKey);
    const excuseRecord: WeeklyQuotaRecord = {
      weekKey,
      weekStartDate: new Date().toISOString(),
      weekEndDate: new Date().toISOString(),
      targetQuota: targetMember.weeklyQuota || DEFAULT_CONSULTANT_WEEKLY_QUOTA,
      completedCount: 0,
      status: 'excused',
      excuseReason: reason,
      evaluatedAt: new Date().toISOString()
    };

    const updated = staffMembers.map(s => {
      if (s.id === staffId) {
        return {
          ...s,
          weeklyQuotaHistory: [excuseRecord, ...filteredHistory]
        };
      }
      return s;
    });

    setStaffMembers(updated);
    safeLocalStorageSet(STORAGE_KEYS.STAFF_ROSTER, JSON.stringify(updated));
    setDoc(doc(db, 'system', 'staffRoster'), cleanForFirestore({ members: updated })).catch(err => console.error('Firestore staff sync error:', err));

    addAuditLog(
      'MANUAL_EDIT',
      'Staff Management',
      `Admin ${activeStaff?.displayName || 'Admin'} excused weekly quota for [${targetMember.username}] for week ${weekKey}. Reason: ${reason}`
    );

    return { success: true, message: `Excused quota for ${targetMember.username} for week ${weekKey}.` };
  };

  // Date Simulation & Testing Mode
  const [simulatedDayOverride, setSimulatedDayOverride] = useState<'none' | 'sunday' | 'monday'>('none');

  const effectiveDate = React.useMemo(() => {
    const now = new Date();
    if (simulatedDayOverride === 'none') {
      return now;
    }
    if (simulatedDayOverride === 'sunday') {
      const info = getWeekInfo(now);
      return new Date(info.weekEnd.getTime() - 1000 * 60 * 60 * 2); // Sunday 10 PM
    }
    if (simulatedDayOverride === 'monday') {
      const info = getWeekInfo(now);
      return new Date(info.weekEnd.getTime() + 1000 * 60 * 60 * 9); // Next Monday 9 AM
    }
    return now;
  }, [simulatedDayOverride]);

  // Filter States (with 0.45s debounce buffer on search to prevent client lag and excessive image requests)
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isSearchBuffering, setIsSearchBuffering] = useState(false);

  useEffect(() => {
    // If empty or cleared, update immediately with zero delay
    if (!searchQuery || searchQuery.trim() === '') {
      setDebouncedSearchQuery('');
      setIsSearchBuffering(false);
      return;
    }

    setIsSearchBuffering(true);
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setIsSearchBuffering(false);
    }, 450); // 0.45s buffer

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const flushSearch = () => {
    setDebouncedSearchQuery(searchQuery);
    setIsSearchBuffering(false);
  };
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'All'>('All');
  const [selectedRarities, setSelectedRarities] = useState<ItemRarity[]>([]);
  const [demandFilter, setDemandFilter] = useState(0);
  const [selectedTrend, setSelectedTrend] = useState<PriceTrend | 'All'>('All');
  const [sortBy, setSortBy] = useState<'highest_value' | 'lowest_value' | 'highest_demand' | 'lowest_demand' | 'name_asc' | 'recently_updated' | 'biggest_gain'>('highest_value');

  // Theme State (Dark / Light)
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    const saved = safeLocalStorageGet('mts_theme_mode');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark';
  });

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    safeLocalStorageSet('mts_theme_mode', newTheme);
  };

  const toggleTheme = () => {
    setThemeState(prev => {
      const nextTheme = prev === 'dark' ? 'light' : 'dark';
      safeLocalStorageSet('mts_theme_mode', nextTheme);
      return nextTheme;
    });
  };

  // Language State (English default, Spanish optional)
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    const saved = safeLocalStorageGet('mts_language');
    if (saved === 'es' || saved === 'en') return saved;
    return 'en'; // English default!
  });

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    safeLocalStorageSet('mts_language', lang);
  };

  // Settings Modal Open/Close State
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Info & Team Section Minimization State (Permanently saved in localStorage)
  const [isInfoSectionMinimized, setIsInfoSectionMinimizedState] = useState<boolean>(() => {
    return safeLocalStorageGet('mts_services_info_minimized') === 'true';
  });

  const setIsInfoSectionMinimized = (minimized: boolean) => {
    setIsInfoSectionMinimizedState(minimized);
    safeLocalStorageSet('mts_services_info_minimized', String(minimized));
  };

  const toggleInfoSectionMinimized = () => {
    setIsInfoSectionMinimizedState(prev => {
      const next = !prev;
      safeLocalStorageSet('mts_services_info_minimized', String(next));
      return next;
    });
  };

  const t = (key: keyof TranslationDictionary, fallback?: string): string => {
    const dict = TRANSLATIONS[language];
    return (dict && dict[key]) || fallback || key;
  };

  const translateCategory = (category: string): string => {
    return getTranslatedCategory(category, language);
  };

  const translateRarity = (rarity: string): string => {
    return getTranslatedRarity(rarity, language);
  };

  const translateTrend = (trend: string): string => {
    return getTranslatedTrend(trend, language);
  };

  const translateDemand = (demand: number): string => {
    return getTranslatedDemandLabel(demand, language);
  };

  const [isSearchMenuCollapsed, setIsSearchMenuCollapsed] = useState<boolean>(() => {
    return safeLocalStorageGet('mts_search_menu_collapsed') === 'true';
  });

  const toggleSearchMenuCollapsed = () => {
    setIsSearchMenuCollapsed(prev => {
      const nextVal = !prev;
      safeLocalStorageSet('mts_search_menu_collapsed', String(nextVal));
      return nextVal;
    });
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [theme]);

  // Card Layout & Expansion Mode State
  // Desktop/Tablet default: Expanded Mode; Mobile (< 768px): Compact Mode
  const [globalCardLayoutMode, setGlobalCardLayoutModeState] = useState<'expanded' | 'compact'>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768 ? 'expanded' : 'compact';
    }
    return 'expanded';
  });
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});

  const setGlobalCardLayoutMode = (mode: 'expanded' | 'compact') => {
    setGlobalCardLayoutModeState(mode);
    setExpandedCardIds({});
  };

  const toggleGlobalCardViewMode = () => {
    const nextMode = globalCardLayoutMode === 'expanded' ? 'compact' : 'expanded';
    setGlobalCardLayoutMode(nextMode);
  };

  const isCardExpanded = (itemId: string): boolean => {
    if (expandedCardIds[itemId] !== undefined) {
      return expandedCardIds[itemId];
    }
    return globalCardLayoutMode === 'expanded';
  };

  const toggleCardExpanded = (itemId: string, rowItemIds?: string[]) => {
    const currentlyExpanded = isCardExpanded(itemId);
    const targetState = !currentlyExpanded;

    setExpandedCardIds((prev) => {
      const updated = { ...prev };
      if (rowItemIds && rowItemIds.length > 0) {
        // Expand/Collapse entire row together for uniform height and alignment
        rowItemIds.forEach((id) => {
          updated[id] = targetState;
        });
      } else {
        updated[itemId] = targetState;
      }
      return updated;
    });
  };

  const setCardExpanded = (itemId: string, expanded: boolean, rowItemIds?: string[]) => {
    setExpandedCardIds((prev) => {
      const updated = { ...prev };
      if (rowItemIds && rowItemIds.length > 0) {
        rowItemIds.forEach((id) => {
          updated[id] = expanded;
        });
      } else {
        updated[itemId] = expanded;
      }
      return updated;
    });
  };

  // Modals & Navigation state
  const [activeItemDetailPage, setActiveItemDetailPage] = useState<MilitaryItem | null>(null);
  const [isTOSOpen, setIsTOSOpen] = useState(false);
  const [activeReportModalItem, setActiveReportModalItem] = useState<MilitaryItem | null>(null);
  const [activeChartModalItem, setActiveChartModalItem] = useState<MilitaryItem | null>(null);
  const [activeEditModalItem, setActiveEditModalItem] = useState<MilitaryItem | null>(null);
  const [isStaffPanelOpen, setIsStaffPanelOpen] = useState(false);
  const [isTradeCalcOpen, setIsTradeCalcOpen] = useState(false);

  // Trade Calculator State with memory / tab persistence
  const [tradeState, setTradeState] = useState<TradeCalculatorState>(() => {
    try {
      const saved = safeLocalStorageGet(STORAGE_KEYS.TRADE_CALC);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            youItems: Array.isArray(parsed.youItems) ? parsed.youItems : [],
            youGems: typeof parsed.youGems === 'number' ? parsed.youGems : 0,
            themItems: Array.isArray(parsed.themItems) ? parsed.themItems : [],
            themGems: typeof parsed.themGems === 'number' ? parsed.themGems : 0
          };
        }
      }
    } catch (e) {
      console.error('Failed to parse cached trade calculator state', e);
    }
    return {
      youItems: [],
      youGems: 0,
      themItems: [],
      themGems: 0
    };
  });

  // Sync tradeState to localStorage on every change
  useEffect(() => {
    try {
      safeLocalStorageSet(STORAGE_KEYS.TRADE_CALC, JSON.stringify(tradeState));
    } catch (e) {
      console.error('Failed to save trade state to localStorage', e);
    }
  }, [tradeState]);

  const addTradeItem = (side: TradeSide, item: MilitaryItem, starTier?: StarTier) => {
    // Automatically default to the lowest value variation when selecting/adding an item in trade calculator
    let tier = starTier;
    if (!tier) {
      if (isVehicleCategory(item.category) || isSoldierOrDroneCategory(item.category)) {
        const lowest = getItemLowestStarTierData(item, universalStarConfig, universalSoldierDroneStarConfig);
        tier = lowest.tierId as StarTier;
      } else {
        tier = '0';
      }
    }

    const newEntry: TradeSideItem = {
      instanceId: `trade-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      itemId: item.id,
      starTier: tier,
      quantity: 1
    };

    setTradeState(prev => {
      const key = side === 'you' ? 'youItems' : 'themItems';
      return {
        ...prev,
        [key]: [...prev[key], newEntry]
      };
    });
  };

  const removeTradeItem = (side: TradeSide, instanceId: string) => {
    setTradeState(prev => {
      const key = side === 'you' ? 'youItems' : 'themItems';
      return {
        ...prev,
        [key]: prev[key].filter(entry => entry.instanceId !== instanceId)
      };
    });
  };

  const moveTradeItem = (fromSide: TradeSide, instanceId: string) => {
    setTradeState(prev => {
      const fromKey = fromSide === 'you' ? 'youItems' : 'themItems';
      const toKey = fromSide === 'you' ? 'themItems' : 'youItems';
      const itemToMove = prev[fromKey].find(entry => entry.instanceId === instanceId);
      if (!itemToMove) return prev;
      return {
        ...prev,
        [fromKey]: prev[fromKey].filter(entry => entry.instanceId !== instanceId),
        [toKey]: [...prev[toKey], { ...itemToMove, instanceId: `trade-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` }]
      };
    });
  };

  const swapTradeSides = () => {
    setTradeState(prev => ({
      youItems: prev.themItems,
      youGems: prev.themGems,
      themItems: prev.youItems,
      themGems: prev.youGems
    }));
  };

  const updateTradeItemTier = (side: TradeSide, instanceId: string, tier: StarTier) => {
    setTradeState(prev => {
      const key = side === 'you' ? 'youItems' : 'themItems';
      return {
        ...prev,
        [key]: prev[key].map(entry => entry.instanceId === instanceId ? { ...entry, starTier: tier } : entry)
      };
    });
  };

  const updateTradeItemQuantity = (side: TradeSide, instanceId: string, qty: number) => {
    const validQty = Math.max(1, qty);
    setTradeState(prev => {
      const key = side === 'you' ? 'youItems' : 'themItems';
      return {
        ...prev,
        [key]: prev[key].map(entry => entry.instanceId === instanceId ? { ...entry, quantity: validQty } : entry)
      };
    });
  };

  const MAX_TRADE_GEMS = 1_000_000_000;

  const updateTradeGems = (side: TradeSide, gems: number) => {
    const validGems = Math.min(MAX_TRADE_GEMS, Math.max(0, Math.round(gems || 0)));
    setTradeState(prev => {
      const key = side === 'you' ? 'youGems' : 'themGems';
      return {
        ...prev,
        [key]: validGems
      };
    });
  };

  const clearTrade = () => {
    setTradeState({
      youItems: [],
      youGems: 0,
      themItems: [],
      themGems: 0
    });
  };

  const openTradeCalculatorWithItem = (side: TradeSide, item: MilitaryItem, starTier?: StarTier) => {
    addTradeItem(side, item, starTier);
    setIsTradeCalcOpen(true);
  };

  // Shared Star Tier state across views (persisted to localStorage)
  const [itemStarTiers, setItemStarTiers] = useState<Record<string, StarTier>>(() => {
    try {
      const saved = safeLocalStorageGet('mts_services_item_star_tiers_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse cached star tiers', e);
    }
    return {};
  });

  const setItemStarTier = (itemId: string, tier: StarTier) => {
    setItemStarTiers(prev => {
      const updated = { ...prev, [itemId]: tier };
      try {
        safeLocalStorageSet('mts_services_item_star_tiers_v2', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save star tiers to localStorage', e);
      }
      return updated;
    });
  };

  const getItemSelectedTier = (itemId: string, itemObj?: MilitaryItem): StarTier => {
    if (itemStarTiers[itemId]) {
      return itemStarTiers[itemId];
    }
    const targetItem = itemObj || items.find(i => i.id === itemId);
    if (!targetItem) return '0';

    if (isSoldierOrDroneCategory(targetItem.category) || isVehicleCategory(targetItem.category)) {
      const lowest = getItemLowestStarTierData(targetItem, universalStarConfig, universalSoldierDroneStarConfig);
      return lowest.tierId as StarTier;
    }

    return '0';
  };

  // Helper to parse item from URL path/hash
  const parseUrlForItem = (itemsList: MilitaryItem[]): MilitaryItem | null => {
    if (typeof window === 'undefined' || !itemsList.length) return null;
    const path = window.location.pathname;
    const hash = window.location.hash;

    let targetId = '';
    if (path.startsWith('/item/')) {
      targetId = decodeURIComponent(path.replace('/item/', '')).trim();
    } else if (hash.startsWith('#/item/')) {
      targetId = decodeURIComponent(hash.replace('#/item/', '')).trim();
    } else if (hash.startsWith('#item/')) {
      targetId = decodeURIComponent(hash.replace('#item/', '')).trim();
    }

    if (!targetId) return null;

    const lowerTarget = targetId.toLowerCase();
    const cleanTarget = lowerTarget.replace(/[^a-z0-9]/g, '');

    return itemsList.find(i => {
      if (!i) return false;
      const lowerId = (i.id || '').toLowerCase();
      if (lowerId === lowerTarget) return true;
      if (i.acronym && i.acronym.toLowerCase() === lowerTarget) return true;
      if (i.name) {
        const lowerName = i.name.toLowerCase();
        if (lowerName === lowerTarget) return true;
        if (lowerName.replace(/[^a-z0-9]/g, '') === cleanTarget) return true;
        if (lowerName.replace(/[^a-z0-9]+/g, '-') === lowerTarget) return true;
      }
      return false;
    }) || null;
  };

  // Initialize and listen to URL changes
  useEffect(() => {
    const handleLocationChange = () => {
      const pathname = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();

      if (
        pathname === '/staff/portal' || 
        pathname === '/admin/login' || 
        pathname === '/staff' || 
        pathname === '/admin' ||
        hash === '#staff/portal' ||
        hash === '#admin/login' ||
        hash === '#staff' ||
        hash === '#admin'
      ) {
        setIsStaffPanelOpen(true);
      }

      if (
        pathname === '/tos' || 
        pathname === '/terms' || 
        pathname === '/terms-of-service' ||
        hash === '#tos' || 
        hash === '#terms' || 
        hash === '#terms-of-service'
      ) {
        setIsTOSOpen(true);
      } else {
        setIsTOSOpen(false);
      }

      const matched = parseUrlForItem(items);
      setActiveItemDetailPage(matched);
      if (matched) {
        const canonicalSlug = getItemSlug(matched);
        const canonicalPath = `/item/${encodeURIComponent(canonicalSlug)}`;
        if (window.location.pathname.startsWith('/item/') && window.location.pathname !== canonicalPath) {
          window.history.replaceState({ itemId: matched.id, itemSlug: canonicalSlug }, '', canonicalPath);
        }
      }
    };

    handleLocationChange();

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, [items]);

  const navigateToItem = (itemOrId: MilitaryItem | string) => {
    let target: MilitaryItem | undefined;
    if (typeof itemOrId === 'string') {
      const lower = itemOrId.toLowerCase();
      const clean = lower.replace(/[^a-z0-9]/g, '');
      target = items.find(i => 
        (i.id || '').toLowerCase() === lower || 
        (i.acronym && i.acronym.toLowerCase() === lower) ||
        (i.name && i.name.toLowerCase().replace(/[^a-z0-9]/g, '') === clean) ||
        (i.name && i.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === lower)
      );
    } else {
      target = itemOrId;
    }
    if (target) {
      setIsTOSOpen(false);
      setActiveItemDetailPage(target);
      const targetSlug = getItemSlug(target);
      const targetUrl = `/item/${encodeURIComponent(targetSlug)}`;
      if (window.location.pathname !== targetUrl) {
        window.history.pushState({ itemId: target.id, itemSlug: targetSlug }, '', targetUrl);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navigateToCatalog = () => {
    setActiveItemDetailPage(null);
    setIsTOSOpen(false);
    if (window.location.pathname !== '/' || window.location.hash) {
      window.history.pushState({}, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToTOS = () => {
    setActiveItemDetailPage(null);
    setIsTOSOpen(true);
    if (window.location.hash !== '#tos') {
      window.history.pushState({ page: 'tos' }, '', '#tos');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleRarityFilter = (rarity: ItemRarity) => {
    setSelectedRarities(prev => 
      prev.includes(rarity) ? prev.filter(r => r !== rarity) : [...prev, rarity]
    );
  };

  const clearRarityFilters = () => {
    setSelectedRarities([]);
  };

  const addAuditLog = (
    actionOrOptions: AuditLog['action'] | Partial<AuditLog> & { action: AuditLog['action']; itemName: string; details: string }, 
    itemName?: string, 
    details?: string, 
    itemId?: string, 
    oldValue?: number, 
    newValue?: number,
    oldDemand?: number,
    newDemand?: number
  ) => {
    const isObject = typeof actionOrOptions === 'object';
    const action = isObject ? actionOrOptions.action : actionOrOptions;
    const finalItemName = isObject ? actionOrOptions.itemName : (itemName || 'Market Item');
    const finalDetails = isObject ? actionOrOptions.details : (details || '');
    const finalItemId = isObject ? actionOrOptions.itemId : itemId;
    const finalOldValue = isObject ? actionOrOptions.oldValue : oldValue;
    const finalNewValue = isObject ? actionOrOptions.newValue : newValue;
    const finalOldDemand = isObject ? actionOrOptions.oldDemand : oldDemand;
    const finalNewDemand = isObject ? actionOrOptions.newDemand : newDemand;
    const finalOldTrend = isObject ? actionOrOptions.oldTrend : undefined;
    const finalNewTrend = isObject ? actionOrOptions.newTrend : undefined;
    const finalOldName = isObject ? actionOrOptions.oldName : undefined;
    const finalNewName = isObject ? actionOrOptions.newName : undefined;
    const finalOldNotes = isObject ? actionOrOptions.oldNotes : undefined;
    const finalNewNotes = isObject ? actionOrOptions.newNotes : undefined;
    const finalThumbnail = isObject ? actionOrOptions.thumbnail : undefined;
    const finalOldThumbnail = isObject ? actionOrOptions.oldThumbnail : undefined;
    const finalCategory = isObject ? actionOrOptions.category : undefined;
    const finalRarity = isObject ? actionOrOptions.rarity : undefined;
    const finalChanges = isObject ? actionOrOptions.changes : undefined;
    const finalStarChanges = isObject ? actionOrOptions.starChanges : undefined;
    const finalSkipWebhook = isObject ? actionOrOptions.skipWebhook : false;

    // Do not dispatch public changelogs webhook for Site Backup or internal admin tasks
    const lowerItemName = finalItemName.toLowerCase();
    const shouldSkipWebhook =
      Boolean(finalSkipWebhook) ||
      lowerItemName === 'site backup' ||
      lowerItemName.includes('site backup') ||
      lowerItemName.includes('site recovery') ||
      lowerItemName === 'staff auth' ||
      lowerItemName.includes('data export') ||
      lowerItemName === 'demand automation' ||
      lowerItemName.includes('universal reset') ||
      lowerItemName.includes('auto-sort') ||
      action === 'DATA_EXPORT' ||
      action === 'SYSTEM_RESET';

    const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newLog: AuditLog = {
      id: logId,
      timestamp: new Date().toISOString(),
      action,
      itemId: finalItemId,
      itemName: finalItemName,
      details: finalDetails,
      moderator: activeStaff ? `${activeStaff.displayName || activeStaff.username} [${activeStaff.role}]` : 'System Staff',
      oldValue: finalOldValue,
      newValue: finalNewValue,
      oldDemand: finalOldDemand,
      newDemand: finalNewDemand,
      oldTrend: finalOldTrend,
      newTrend: finalNewTrend,
      oldName: finalOldName,
      newName: finalNewName,
      oldNotes: finalOldNotes,
      newNotes: finalNewNotes,
      thumbnail: finalThumbnail,
      oldThumbnail: finalOldThumbnail,
      category: finalCategory,
      rarity: finalRarity,
      changes: finalChanges,
      starChanges: finalStarChanges,
      skipWebhook: shouldSkipWebhook ? true : undefined
    };

    setAuditLogs(prev => {
      const updated = [newLog, ...prev];
      safeLocalStorageSet(STORAGE_KEYS.LOGS, JSON.stringify(updated));
      return updated;
    });

    // Commit to Firestore (keeps complete internal staff audit trail)
    setDoc(doc(db, 'auditLogs', logId), cleanForFirestore(newLog)).catch(err => {
      console.error('Failed to commit audit log to Firestore:', err);
    });

    // Dispatch to Backend Discord Webhook API (/api/webhooks/changelog) ONLY if public changes exist
    const hasBaseValueChange = finalOldValue !== undefined && finalNewValue !== undefined && Number(finalOldValue) !== Number(finalNewValue);
    const hasBaseDemandChange = finalOldDemand !== undefined && finalNewDemand !== undefined && Number(finalOldDemand) !== Number(finalNewDemand);
    const hasBaseTrendChange = Boolean(finalOldTrend && finalNewTrend && finalOldTrend !== finalNewTrend);
    const hasNameChange = Boolean(finalOldName && finalNewName && finalOldName !== finalNewName);
    const hasStarChanges = Boolean(finalStarChanges && Array.isArray(finalStarChanges) && finalStarChanges.length > 0);

    const isPublicMarketChange =
      action === 'ITEM_ADDED' ||
      action === 'ITEM_DELETED' ||
      hasNameChange ||
      hasBaseValueChange ||
      hasBaseDemandChange ||
      hasBaseTrendChange ||
      hasStarChanges;

    if (!shouldSkipWebhook && isPublicMarketChange) {
      try {
        fetch('/api/webhooks/changelog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            itemName: finalItemName,
            itemId: finalItemId,
            oldValue: hasBaseValueChange ? finalOldValue : undefined,
            newValue: (hasBaseValueChange || action === 'ITEM_ADDED') ? finalNewValue : undefined,
            oldDemand: hasBaseDemandChange ? finalOldDemand : undefined,
            newDemand: (hasBaseDemandChange || action === 'ITEM_ADDED') ? finalNewDemand : undefined,
            oldTrend: hasBaseTrendChange ? finalOldTrend : undefined,
            newTrend: (hasBaseTrendChange || action === 'ITEM_ADDED') ? finalNewTrend : undefined,
            oldName: hasNameChange ? finalOldName : undefined,
            newName: hasNameChange ? finalNewName : undefined,
            thumbnail: finalThumbnail,
            oldThumbnail: finalOldThumbnail,
            category: finalCategory,
            rarity: finalRarity,
            starChanges: finalStarChanges,
            isNewItem: action === 'ITEM_ADDED',
            timestamp: newLog.timestamp,
          }),
        }).catch(e => {
          // Non-blocking log
          console.log('Changelog webhook endpoint dispatched (local):', e?.message || e);
        });
      } catch (e) {
        // ignore
      }
    }
  };

  const submitReport = (reportData: Omit<ReportedValue, 'id' | 'status' | 'createdAt'>): string => {
    const reportId = `rep-${Date.now()}`;
    const newReport: ReportedValue = {
      ...reportData,
      id: reportId,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    setReports(prev => {
      const updated = [newReport, ...prev];
      safeLocalStorageSet(STORAGE_KEYS.REPORTS, JSON.stringify(updated));
      return updated;
    });

    // Save to Firestore
    setDoc(doc(db, 'reports', reportId), cleanForFirestore(newReport)).catch(err => {
      console.error('Failed to submit report to Firestore:', err);
    });

    // Dispatch to Backend Discord Webhook API (/api/webhooks/reports)
    try {
      fetch('/api/webhooks/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          itemId: reportData.itemId,
          itemName: reportData.itemName,
          itemCategory: reportData.itemCategory,
          itemThumbnail: reportData.itemThumbnail,
          starTier: reportData.starTier,
          starLabel: reportData.starLabel,
          currentValue: reportData.currentValue,
          suggestedValue: reportData.suggestedValue,
          currentDemand: reportData.currentDemand,
          suggestedDemand: reportData.suggestedDemand,
          currentTrend: reportData.currentTrend,
          suggestedTrend: reportData.suggestedTrend,
          reason: reportData.reason,
          proofLinks: reportData.proofLink ? [reportData.proofLink] : [],
          username: reportData.playerUsername,
          userContact: reportData.discordTag,
          timestamp: newReport.createdAt,
        }),
      }).catch(e => {
        console.log('Reports webhook endpoint dispatched (local):', e?.message || e);
      });
    } catch (e) {
      // ignore
    }

    return reportId;
  };

  const acceptReport = async (reportId: string, staffComment?: string) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    const targetItem = items.find(i => i.id === report.itemId);
    if (targetItem) {
      const now = new Date();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dateStr = `${monthNames[now.getMonth()]} ${now.getDate() < 10 ? '0' : ''}${now.getDate()}`;
      
      let updatedHistory = targetItem.history && targetItem.history.length > 0 ? [...targetItem.history] : [];
      const lastPoint = updatedHistory.length > 0 ? updatedHistory[updatedHistory.length - 1] : null;
      const isValueChanged = report.suggestedValue !== targetItem.value || (lastPoint && lastPoint.value !== report.suggestedValue);

      // Only add point to history if the value actually changed
      if (isValueChanged) {
        if (updatedHistory.length === 0) {
          const prevTime = targetItem.lastUpdated
            ? new Date(targetItem.lastUpdated)
            : new Date(now.getTime() - 7 * 24 * 3600 * 1000);
          const prevMonth = monthNames[prevTime.getMonth()];
          const prevDateStr = `${prevMonth} ${prevTime.getDate() < 10 ? '0' : ''}${prevTime.getDate()}`;
          updatedHistory.push({
            timestamp: prevTime.toISOString(),
            date: prevDateStr,
            value: targetItem.value,
            note: 'Previous Market Valuation',
            updatedBy: 'System'
          });
        }
        const newHistoryPoint: PriceHistoryPoint = {
          timestamp: now.toISOString(),
          date: dateStr,
          value: report.suggestedValue,
          note: `Approved suggestion from @${report.playerUsername}`,
          updatedBy: activeStaff?.username || 'Staff'
        };
        updatedHistory.push(newHistoryPoint);
      }

      const isStarReport = Boolean(report.starTier && report.starTier !== '0');
      let starChanges: StarTierChange[] | undefined;
      const updatedStarTierOverrides = { ...(targetItem.starTierOverrides || {}) };

      if (isStarReport && report.starTier) {
        updatedStarTierOverrides[report.starTier] = {
          ...updatedStarTierOverrides[report.starTier],
          value: report.suggestedValue,
          demand: report.suggestedDemand,
          trend: report.suggestedTrend,
        };
        starChanges = [{
          tierId: report.starTier,
          tierLabel: report.starLabel || `${report.starTier}★`,
          oldValue: report.currentValue,
          newValue: report.suggestedValue,
          oldDemand: report.currentDemand,
          newDemand: report.suggestedDemand,
          oldTrend: report.currentTrend,
          newTrend: report.suggestedTrend,
        }];
      }

      const updatedItem: MilitaryItem = {
        ...targetItem,
        value: isStarReport ? targetItem.value : report.suggestedValue,
        demand: isStarReport ? targetItem.demand : report.suggestedDemand,
        trend: isStarReport ? targetItem.trend : report.suggestedTrend,
        starTierOverrides: isStarReport ? updatedStarTierOverrides : targetItem.starTierOverrides,
        history: updatedHistory,
        lastUpdated: now.toISOString()
      };

      setItems(prev => {
        const updated = prev.map(item => item.id === report.itemId ? updatedItem : item);
        saveItemsCache(updated);
        return updated;
      });
      setDoc(doc(db, 'items', targetItem.id), cleanForFirestore(updatedItem), { merge: true }).catch(err => console.error('Failed to update item in Firestore:', err));

      const reportChanges: AuditLogChange[] = [
        { field: isStarReport ? `${report.starLabel || `${report.starTier}★`} Value` : 'Value', from: `$${(isStarReport ? report.currentValue : targetItem.value).toLocaleString()}`, to: `$${report.suggestedValue.toLocaleString()}` },
        { field: isStarReport ? `${report.starLabel || `${report.starTier}★`} Demand` : 'Demand', from: `${(isStarReport ? report.currentDemand : targetItem.demand)}/10`, to: `${report.suggestedDemand}/10` },
        { field: isStarReport ? `${report.starLabel || `${report.starTier}★`} Trend` : 'Trend', from: isStarReport ? report.currentTrend : targetItem.trend, to: report.suggestedTrend },
        { field: 'Submitted By', to: `@${report.playerUsername}${report.discordTag ? ` (${report.discordTag})` : ''}` },
        { field: 'Submission Reason', to: report.reason }
      ];
      if (staffComment) {
        reportChanges.push({ field: 'Staff Comment', to: staffComment });
      }

      addAuditLog({
        action: 'REPORT_ACCEPTED',
        itemName: targetItem.name,
        details: `Approved valuation report from @${report.playerUsername}: $${(isStarReport ? report.currentValue : targetItem.value).toLocaleString()} ➔ $${report.suggestedValue.toLocaleString()} (Demand: ${report.suggestedDemand}/10). ${staffComment ? `Staff note: "${staffComment}"` : ''}`,
        itemId: targetItem.id,
        oldValue: !isStarReport ? targetItem.value : undefined,
        newValue: !isStarReport ? report.suggestedValue : undefined,
        oldDemand: !isStarReport ? targetItem.demand : undefined,
        newDemand: !isStarReport ? report.suggestedDemand : undefined,
        oldTrend: !isStarReport ? targetItem.trend : undefined,
        newTrend: !isStarReport ? report.suggestedTrend : undefined,
        starChanges,
        thumbnail: targetItem.thumbnail,
        category: targetItem.category,
        rarity: targetItem.rarity,
        changes: reportChanges
      });
    }

    const updatedReport: Partial<ReportedValue> = {
      status: 'accepted',
      staffComment: staffComment || 'Approved by staff review.',
      moderator: activeStaff?.username || 'Staff Member',
      resolvedAt: new Date().toISOString()
    };

    setReports(prev => {
      const updated = prev.map(r => r.id === reportId ? { ...r, ...updatedReport } : r);
      safeLocalStorageSet(STORAGE_KEYS.REPORTS, JSON.stringify(updated));
      return updated;
    });
    setDoc(doc(db, 'reports', reportId), cleanForFirestore(updatedReport), { merge: true }).catch(err => console.error('Failed to update report in Firestore:', err));
  };

  const editAndAcceptReport = async (
    reportId: string, 
    edits: { value: number; demand: number; trend: PriceTrend; notes?: string; staffComment?: string }
  ) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    const targetItem = items.find(i => i.id === report.itemId);
    if (targetItem) {
      const now = new Date();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dateStr = `${monthNames[now.getMonth()]} ${now.getDate() < 10 ? '0' : ''}${now.getDate()}`;

      let updatedHistory = targetItem.history && targetItem.history.length > 0 ? [...targetItem.history] : [];
      const lastPoint = updatedHistory.length > 0 ? updatedHistory[updatedHistory.length - 1] : null;
      const isValueChanged = edits.value !== targetItem.value || (lastPoint && lastPoint.value !== edits.value);

      // Only add point to history if the value actually changed
      if (isValueChanged) {
        if (updatedHistory.length === 0) {
          const prevTime = targetItem.lastUpdated
            ? new Date(targetItem.lastUpdated)
            : new Date(now.getTime() - 7 * 24 * 3600 * 1000);
          const prevMonth = monthNames[prevTime.getMonth()];
          const prevDateStr = `${prevMonth} ${prevTime.getDate() < 10 ? '0' : ''}${prevTime.getDate()}`;
          updatedHistory.push({
            timestamp: prevTime.toISOString(),
            date: prevDateStr,
            value: targetItem.value,
            note: 'Previous Market Valuation',
            updatedBy: 'System'
          });
        }
        const newHistoryPoint: PriceHistoryPoint = {
          timestamp: now.toISOString(),
          date: dateStr,
          value: edits.value,
          note: `Staff Adjusted & Approved (reported by @${report.playerUsername})`,
          updatedBy: activeStaff?.username || 'Staff'
        };
        updatedHistory.push(newHistoryPoint);
      }

      const isStarReport = Boolean(report.starTier && report.starTier !== '0');
      let starChanges: StarTierChange[] | undefined;
      const updatedStarTierOverrides = { ...(targetItem.starTierOverrides || {}) };

      if (isStarReport && report.starTier) {
        updatedStarTierOverrides[report.starTier] = {
          ...updatedStarTierOverrides[report.starTier],
          value: edits.value,
          demand: edits.demand,
          trend: edits.trend,
        };
        starChanges = [{
          tierId: report.starTier,
          tierLabel: report.starLabel || `${report.starTier}★`,
          oldValue: report.currentValue,
          newValue: edits.value,
          oldDemand: report.currentDemand,
          newDemand: edits.demand,
          oldTrend: report.currentTrend,
          newTrend: edits.trend,
        }];
      }

      const updatedItem: MilitaryItem = {
        ...targetItem,
        value: isStarReport ? targetItem.value : edits.value,
        demand: isStarReport ? targetItem.demand : edits.demand,
        trend: isStarReport ? targetItem.trend : edits.trend,
        starTierOverrides: isStarReport ? updatedStarTierOverrides : targetItem.starTierOverrides,
        notes: edits.notes || targetItem.notes,
        history: updatedHistory,
        lastUpdated: now.toISOString()
      };

      setItems(prev => {
        const updated = prev.map(item => item.id === report.itemId ? updatedItem : item);
        saveItemsCache(updated);
        return updated;
      });
      setDoc(doc(db, 'items', targetItem.id), cleanForFirestore(updatedItem), { merge: true }).catch(err => console.error('Failed to update item in Firestore:', err));

      const editChanges: AuditLogChange[] = [
        { field: isStarReport ? `${report.starLabel || `${report.starTier}★`} Value` : 'Value', from: `$${(isStarReport ? report.currentValue : targetItem.value).toLocaleString()}`, to: `$${edits.value.toLocaleString()} (User requested: $${report.suggestedValue.toLocaleString()})` },
        { field: isStarReport ? `${report.starLabel || `${report.starTier}★`} Demand` : 'Demand', from: `${(isStarReport ? report.currentDemand : targetItem.demand)}/10`, to: `${edits.demand}/10 (User requested: ${report.suggestedDemand}/10)` },
        { field: isStarReport ? `${report.starLabel || `${report.starTier}★`} Trend` : 'Trend', from: isStarReport ? report.currentTrend : targetItem.trend, to: edits.trend },
        { field: 'Reported By', to: `@${report.playerUsername}` }
      ];
      if (edits.staffComment) {
        editChanges.push({ field: 'Staff Comment', to: edits.staffComment });
      }

      addAuditLog({
        action: 'REPORT_ACCEPTED',
        itemName: targetItem.name,
        details: `Staff customized & approved report from @${report.playerUsername}. Final value: $${edits.value.toLocaleString()}, Demand: ${edits.demand}/10. ${edits.staffComment ? `Staff note: "${edits.staffComment}"` : ''}`,
        itemId: targetItem.id,
        oldValue: !isStarReport ? targetItem.value : undefined,
        newValue: !isStarReport ? edits.value : undefined,
        oldDemand: !isStarReport ? targetItem.demand : undefined,
        newDemand: !isStarReport ? edits.demand : undefined,
        oldTrend: !isStarReport ? targetItem.trend : undefined,
        newTrend: !isStarReport ? edits.trend : undefined,
        oldNotes: targetItem.notes,
        newNotes: edits.notes || targetItem.notes,
        starChanges,
        thumbnail: targetItem.thumbnail,
        category: targetItem.category,
        rarity: targetItem.rarity,
        changes: editChanges
      });
    }

    const updatedReport: Partial<ReportedValue> = {
      status: 'edited_accepted',
      suggestedValue: edits.value,
      suggestedDemand: edits.demand,
      suggestedTrend: edits.trend,
      staffComment: edits.staffComment || 'Customized and approved by staff.',
      moderator: activeStaff?.username || 'Staff Member',
      resolvedAt: new Date().toISOString()
    };

    setReports(prev => {
      const updated = prev.map(r => r.id === reportId ? { ...r, ...updatedReport } : r);
      safeLocalStorageSet(STORAGE_KEYS.REPORTS, JSON.stringify(updated));
      return updated;
    });
    setDoc(doc(db, 'reports', reportId), cleanForFirestore(updatedReport), { merge: true }).catch(err => console.error('Failed to update report in Firestore:', err));
  };

  const declineReport = (reportId: string, staffComment?: string) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    const updatedReport: Partial<ReportedValue> = {
      status: 'declined',
      staffComment: staffComment || 'Declined: Value does not align with verified market transactions.',
      moderator: activeStaff?.username || 'Staff Member',
      resolvedAt: new Date().toISOString()
    };

    setReports(prev => {
      const updated = prev.map(r => r.id === reportId ? { ...r, ...updatedReport } : r);
      safeLocalStorageSet(STORAGE_KEYS.REPORTS, JSON.stringify(updated));
      return updated;
    });
    setDoc(doc(db, 'reports', reportId), cleanForFirestore(updatedReport), { merge: true }).catch(err => console.error('Failed to decline report in Firestore:', err));

    addAuditLog({
      action: 'REPORT_DECLINED',
      itemName: report.itemName,
      details: `Declined suggestion from @${report.playerUsername} (suggested $${(report.suggestedValue/1e6).toFixed(1)}M). Reason: "${staffComment || 'Insufficient verified trade proof'}"`,
      itemId: report.itemId,
      changes: [
        { field: 'Reporter', to: `@${report.playerUsername}${report.discordTag ? ` (${report.discordTag})` : ''}` },
        { field: 'Suggested Value', to: `$${report.suggestedValue.toLocaleString()}` },
        { field: 'Suggested Demand', to: `${report.suggestedDemand}/10` },
        { field: 'Decline Reason', to: staffComment || 'Insufficient verified trade proof' }
      ]
    });
  };

  const updateItem = (itemUpdates: Partial<MilitaryItem> & { id: string }, auditReason?: string) => {
    const targetItem = items.find(i => i.id === itemUpdates.id);
    if (!targetItem) return;

    const finalValue = itemUpdates.value !== undefined ? parseMilitaryValueInput(itemUpdates.value) : targetItem.value;

    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateStr = `${monthNames[now.getMonth()]} ${now.getDate() < 10 ? '0' : ''}${now.getDate()}`;

    // Calculate previous and next star tier states to detect specific tier value adjustments
    const prevTiers = getAllItemStarTiersData(targetItem, universalStarConfig, universalSoldierDroneStarConfig);
    const tempUpdatedItem: MilitaryItem = {
      ...targetItem,
      ...itemUpdates,
      value: finalValue
    };
    const nextTiers = getAllItemStarTiersData(tempUpdatedItem, universalStarConfig, universalSoldierDroneStarConfig);

    const prevTierValues: Record<string, number> = {};
    prevTiers.forEach(t => { prevTierValues[t.tierId] = t.value; });
    const nextTierValues: Record<string, number> = {};
    nextTiers.forEach(t => { nextTierValues[t.tierId] = t.value; });

    const changedTiers: { tierId: string; label: string; oldVal: number; newVal: number }[] = [];
    nextTiers.forEach(nt => {
      const pt = prevTiers.find(p => p.tierId === nt.tierId);
      if (pt && pt.value !== nt.value) {
        changedTiers.push({ tierId: nt.tierId, label: nt.tierLabel || nt.shortLabel, oldVal: pt.value, newVal: nt.value });
      }
    });

    const anyTierValueChanged = changedTiers.length > 0;
    const baseValueChanged = finalValue !== targetItem.value;

    let updatedHistory = targetItem.history && targetItem.history.length > 0 ? [...targetItem.history] : [];
    if (baseValueChanged || anyTierValueChanged) {
      // Ensure the previous value is anchored as a distinct preceding point in history
      // so the chart immediately displays a proper curve from the old value to the new value!
      const lastPoint = updatedHistory.length > 0 ? updatedHistory[updatedHistory.length - 1] : null;
      const lastMatches = lastPoint && lastPoint.value === targetItem.value && (
        Boolean(lastPoint.tierValues) && Object.entries(prevTierValues).every(([k, v]) => lastPoint.tierValues?.[k] === v)
      );

      if (!lastMatches) {
        let prevTime: Date;
        if (targetItem.lastUpdated) {
          const parsed = new Date(targetItem.lastUpdated);
          // If lastUpdated is at least 30 minutes in the past, use it; otherwise space back 7 days
          if (!isNaN(parsed.getTime()) && (now.getTime() - parsed.getTime() > 30 * 60 * 1000)) {
            prevTime = parsed;
          } else {
            prevTime = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
          }
        } else {
          prevTime = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
        }
        const prevMonth = monthNames[prevTime.getMonth()];
        const prevDateStr = `${prevMonth} ${prevTime.getDate() < 10 ? '0' : ''}${prevTime.getDate()}`;
        updatedHistory.push({
          timestamp: prevTime.toISOString(),
          date: prevDateStr,
          value: targetItem.value,
          tierValues: prevTierValues,
          note: 'Previous Market Valuation',
          updatedBy: 'System'
        });
      }

      const specificTierNote = changedTiers.length > 0
        ? `Updated ${changedTiers.map(c => `${c.label} ($${c.newVal.toLocaleString()})`).join(', ')}`
        : 'Manual staff price adjustment';

      updatedHistory.push({
        timestamp: now.toISOString(),
        date: dateStr,
        value: finalValue,
        tierValues: nextTierValues,
        tier: changedTiers.length === 1 ? changedTiers[0].tierId : undefined,
        note: auditReason || specificTierNote,
        updatedBy: activeStaff?.username || 'Staff'
      });
    }

    // Clean up star overrides
    const isVehicle = isVehicleCategory(itemUpdates.category || targetItem.category);
    let updatedStarOverrides = itemUpdates.starOverrides !== undefined ? itemUpdates.starOverrides : targetItem.starOverrides;
    const finalHasCustomOverrides = itemUpdates.hasCustomStarOverrides !== undefined 
      ? itemUpdates.hasCustomStarOverrides 
      : Boolean(targetItem.hasCustomStarOverrides);

    if (updatedStarOverrides && finalHasCustomOverrides) {
      if (updatedStarOverrides['0'] === undefined || updatedStarOverrides['0'] === 0) {
        updatedStarOverrides = {
          ...updatedStarOverrides,
          '0': finalValue
        };
      }
    }

    // Clean up multiplier overrides for Soldier/Drone
    const isSoldierDrone = isSoldierOrDroneCategory(itemUpdates.category || targetItem.category);
    let updatedMultiplierOverrides = itemUpdates.multiplierOverrides !== undefined ? itemUpdates.multiplierOverrides : targetItem.multiplierOverrides;
    const finalHasCustomMultiplierOverrides = itemUpdates.hasCustomMultiplierOverrides !== undefined
      ? itemUpdates.hasCustomMultiplierOverrides
      : Boolean(targetItem.hasCustomMultiplierOverrides);

    let updatedStarTierOverrides = itemUpdates.starTierOverrides !== undefined ? itemUpdates.starTierOverrides : targetItem.starTierOverrides;
    
    // When manual override is deselected for vehicles, clear all custom star overrides
    if (isVehicle && !finalHasCustomOverrides) {
      updatedStarOverrides = undefined;
      updatedStarTierOverrides = undefined;
    }

    // When manual override is deselected for soldiers/drones, clear all multiplier overrides
    if (isSoldierDrone && !finalHasCustomMultiplierOverrides) {
      updatedMultiplierOverrides = undefined;
      updatedStarTierOverrides = undefined;
    }

    const safeThumbnail = itemUpdates.thumbnail ? getSafeImageUrl(itemUpdates.thumbnail) : targetItem.thumbnail;

    const finalAcronym = itemUpdates.acronym !== undefined
      ? (itemUpdates.acronym && itemUpdates.acronym.trim() ? itemUpdates.acronym.trim() : undefined)
      : targetItem.acronym;

    const mergedItem: MilitaryItem = {
      ...targetItem,
      ...itemUpdates,
      acronym: finalAcronym,
      thumbnail: safeThumbnail,
      value: finalValue,
      hasCustomStarOverrides: isVehicle ? finalHasCustomOverrides : false,
      starOverrides: isVehicle && finalHasCustomOverrides ? updatedStarOverrides : undefined,
      hasCustomMultiplierOverrides: isSoldierDrone ? finalHasCustomMultiplierOverrides : false,
      multiplierOverrides: isSoldierDrone && finalHasCustomMultiplierOverrides ? updatedMultiplierOverrides : undefined,
      starTierOverrides: (isVehicle && !finalHasCustomOverrides) || (isSoldierDrone && !finalHasCustomMultiplierOverrides) ? undefined : updatedStarTierOverrides,
      category: itemUpdates.category === 'Sea' ? 'Naval' : (itemUpdates.category || targetItem.category),
      history: itemUpdates.history !== undefined ? itemUpdates.history : updatedHistory,
      lastUpdated: itemUpdates.lastUpdated || now.toISOString(),
      excludeFromRecentlyUpdated: itemUpdates.excludeFromRecentlyUpdated !== undefined ? itemUpdates.excludeFromRecentlyUpdated : false,
      inRecentlyUpdated: itemUpdates.inRecentlyUpdated !== undefined ? itemUpdates.inRecentlyUpdated : targetItem.inRecentlyUpdated
    };

    setItems(prev => {
      const updated = prev.map(item => item.id === itemUpdates.id ? mergedItem : item);
      saveItemsCache(updated);
      return updated;
    });

    if (activeItemDetailPage && activeItemDetailPage.id === itemUpdates.id) {
      setActiveItemDetailPage(mergedItem);
    }
    if (activeChartModalItem && activeChartModalItem.id === itemUpdates.id) {
      setActiveChartModalItem(mergedItem);
    }

    // Commit change directly to Firestore database with auto-retry
    const cleanPayload: Record<string, any> = cleanForFirestore(mergedItem);
    if (!mergedItem.acronym) {
      cleanPayload.acronym = deleteField();
    }
    if (!mergedItem.hasManualGemRange) {
      cleanPayload.gemOverrideMin = deleteField();
      cleanPayload.gemOverrideMax = deleteField();
    }
    if (!mergedItem.hasCustomStarOverrides) {
      cleanPayload.hasCustomStarOverrides = false;
      cleanPayload.starOverrides = deleteField();
      if (isVehicle) {
        cleanPayload.starTierOverrides = deleteField();
      }
    }
    if (!mergedItem.hasCustomMultiplierOverrides) {
      cleanPayload.hasCustomMultiplierOverrides = false;
      cleanPayload.multiplierOverrides = deleteField();
      if (isSoldierDrone) {
        cleanPayload.starTierOverrides = deleteField();
      }
    }
    if (!mergedItem.hasCustomStarOverrides && !mergedItem.hasCustomMultiplierOverrides && (!mergedItem.starTierOverrides || Object.keys(mergedItem.starTierOverrides).length === 0)) {
      cleanPayload.starTierOverrides = deleteField();
    }
    setDoc(doc(db, 'items', itemUpdates.id), cleanPayload, { merge: true }).catch(err => {
      console.error('Failed to commit item update to Firestore (attempt 1):', err);
      setTimeout(() => {
        setDoc(doc(db, 'items', itemUpdates.id), cleanPayload, { merge: true })
          .catch(e => console.error('Failed to commit item update to Firestore (attempt 2):', e));
      }, 1000);
    });

    // Track field-by-field changes for public changelog
    const nameChanged = itemUpdates.name && itemUpdates.name !== targetItem.name;
    const notesChanged = itemUpdates.notes !== undefined && itemUpdates.notes !== targetItem.notes;
    const thumbChanged = itemUpdates.thumbnail && itemUpdates.thumbnail !== targetItem.thumbnail;
    const trendChanged = itemUpdates.trend && itemUpdates.trend !== targetItem.trend;
    const demandChanged = itemUpdates.demand !== undefined && itemUpdates.demand !== targetItem.demand;
    const valueChanged = finalValue !== targetItem.value;
    const categoryChanged = itemUpdates.category && itemUpdates.category !== targetItem.category;
    const rarityChanged = itemUpdates.rarity && itemUpdates.rarity !== targetItem.rarity;
    const acronymChanged = itemUpdates.acronym !== undefined && itemUpdates.acronym !== targetItem.acronym;
    const tradeableChanged = itemUpdates.tradeable !== undefined && itemUpdates.tradeable !== targetItem.tradeable;
    const starOverridesChanged = itemUpdates.hasCustomStarOverrides !== undefined && itemUpdates.hasCustomStarOverrides !== targetItem.hasCustomStarOverrides;
    const multiplierOverridesChanged = itemUpdates.hasCustomMultiplierOverrides !== undefined && itemUpdates.hasCustomMultiplierOverrides !== targetItem.hasCustomMultiplierOverrides;

    const summaryParts: string[] = [];
    const itemChanges: AuditLogChange[] = [];

    if (nameChanged) {
      summaryParts.push(`Name: "${targetItem.name}" ➔ "${itemUpdates.name}"`);
      itemChanges.push({ field: 'Name', from: targetItem.name, to: itemUpdates.name });
    }
    if (valueChanged) {
      const delta = finalValue - targetItem.value;
      const pct = targetItem.value > 0 ? ((delta / targetItem.value) * 100).toFixed(1) : '0';
      summaryParts.push(`Value: $${targetItem.value.toLocaleString()} ➔ $${finalValue.toLocaleString()} (${delta > 0 ? `+$${delta.toLocaleString()} (+${pct}%)` : `-$${Math.abs(delta).toLocaleString()} (${pct}%)`})`);
      itemChanges.push({ field: 'Value', from: `$${targetItem.value.toLocaleString()}`, to: `$${finalValue.toLocaleString()}` });
    }
    if (demandChanged) {
      summaryParts.push(`Demand: ${targetItem.demand}/10 ➔ ${itemUpdates.demand}/10`);
      itemChanges.push({ field: 'Demand', from: `${targetItem.demand}/10`, to: `${itemUpdates.demand}/10` });
    }
    if (trendChanged) {
      summaryParts.push(`Trend: ${targetItem.trend} ➔ ${itemUpdates.trend}`);
      itemChanges.push({ field: 'Trend', from: targetItem.trend, to: itemUpdates.trend });
    }
    if (tradeableChanged) {
      const fromTrade = targetItem.tradeable === false ? 'Untradeable' : 'Tradeable';
      const toTrade = itemUpdates.tradeable === false ? 'Untradeable' : 'Tradeable';
      summaryParts.push(`Tradeability: ${fromTrade} ➔ ${toTrade}`);
      itemChanges.push({ field: 'Tradeability', from: fromTrade, to: toTrade });
    }
    if (acronymChanged) {
      summaryParts.push(`Acronym: "${targetItem.acronym || 'None'}" ➔ "${itemUpdates.acronym || 'None'}"`);
      itemChanges.push({ field: 'Acronym', from: targetItem.acronym || 'None', to: itemUpdates.acronym || 'None' });
    }
    if (categoryChanged) {
      summaryParts.push(`Category: ${targetItem.category} ➔ ${itemUpdates.category}`);
      itemChanges.push({ field: 'Category', from: targetItem.category, to: itemUpdates.category });
    }
    if (rarityChanged) {
      summaryParts.push(`Rarity: ${targetItem.rarity} ➔ ${itemUpdates.rarity}`);
      itemChanges.push({ field: 'Rarity', from: targetItem.rarity, to: itemUpdates.rarity });
    }
    if (starOverridesChanged) {
      summaryParts.push(itemUpdates.hasCustomStarOverrides ? 'Enabled custom vehicle star overrides' : 'Reverted vehicle stars to universal rates');
      itemChanges.push({ field: 'Vehicle Stars Override', from: targetItem.hasCustomStarOverrides ? 'Custom Rates' : 'Universal Rates', to: itemUpdates.hasCustomStarOverrides ? 'Custom Rates' : 'Universal Rates' });
    }
    if (multiplierOverridesChanged) {
      summaryParts.push(itemUpdates.hasCustomMultiplierOverrides ? 'Enabled manual soldier/drone multiplier overrides' : 'Reverted soldier/drone to universal multipliers');
      itemChanges.push({ field: 'Soldier/Drone Multiplier Override', from: targetItem.hasCustomMultiplierOverrides ? 'Manual Multipliers' : 'Universal Multipliers', to: itemUpdates.hasCustomMultiplierOverrides ? 'Manual Multipliers' : 'Universal Multipliers' });
    }
    if (notesChanged) {
      summaryParts.push(`Updated description`);
      itemChanges.push({ field: 'Description', from: targetItem.notes ? (targetItem.notes.slice(0, 30) + '...') : 'Empty', to: itemUpdates.notes ? (itemUpdates.notes.slice(0, 30) + '...') : 'Empty' });
    }
    if (thumbChanged) {
      summaryParts.push(`Updated unit thumbnail image`);
      itemChanges.push({ field: 'Thumbnail', from: targetItem.thumbnail ? 'Existing URL' : 'Empty', to: itemUpdates.thumbnail ? 'New Image URL' : 'Empty' });
    }

    // Calculate star tier specific adjustments (values, demand, trend)
    const starTierChanges: StarTierChange[] = [];
    const isVehicleItem = isVehicleCategory(itemUpdates.category || targetItem.category);
    const isSoldierDroneItem = isSoldierOrDroneCategory(itemUpdates.category || targetItem.category);
    const hasStars = isVehicleItem || isSoldierDroneItem;

    if (hasStars) {
      nextTiers.forEach(nt => {
        const pt = prevTiers.find(p => p.tierId === nt.tierId);
        if (pt) {
          const valDiff = pt.value !== nt.value;
          const demDiff = pt.demand !== nt.demand;
          const trendDiff = pt.trend !== nt.trend;

          if (valDiff || demDiff || trendDiff) {
            // When base value did NOT change (e.g. only 5* value set to 1 gem),
            // ANY change in this tier is an explicit star tier modification.
            // When base value changed, only record tiers that have explicit overrides or differing shifts.
            const isExplicitTierChange = !valueChanged ||
              Boolean(targetItem.hasCustomStarOverrides || targetItem.hasCustomMultiplierOverrides ||
                itemUpdates.hasCustomStarOverrides || itemUpdates.hasCustomMultiplierOverrides ||
                targetItem.starTierOverrides?.[nt.tierId] || itemUpdates.starTierOverrides?.[nt.tierId] ||
                demDiff || trendDiff);

            if (isExplicitTierChange) {
              const label = nt.shortLabel || nt.label || (nt.tierId === 'fresh' ? 'Fresh' : `${nt.tierId}★`);
              starTierChanges.push({
                tierId: nt.tierId,
                tierLabel: label,
                oldValue: valDiff ? pt.value : undefined,
                newValue: valDiff ? nt.value : undefined,
                oldDemand: demDiff ? pt.demand : undefined,
                newDemand: demDiff ? nt.demand : undefined,
                oldTrend: trendDiff ? pt.trend : undefined,
                newTrend: trendDiff ? nt.trend : undefined,
              });

              if (valDiff) {
                summaryParts.push(`${label} Value: $${pt.value.toLocaleString()} ➔ $${nt.value.toLocaleString()}`);
                itemChanges.push({ field: `${label} Value`, from: `$${pt.value.toLocaleString()}`, to: `$${nt.value.toLocaleString()}` });
              }
              if (demDiff) {
                summaryParts.push(`${label} Demand: ${pt.demand}/10 ➔ ${nt.demand}/10`);
                itemChanges.push({ field: `${label} Demand`, from: `${pt.demand}/10`, to: `${nt.demand}/10` });
              }
              if (trendDiff) {
                summaryParts.push(`${label} Trend: ${pt.trend} ➔ ${nt.trend}`);
                itemChanges.push({ field: `${label} Trend`, from: pt.trend, to: nt.trend });
              }
            }
          }
        }
      });
    }

    const isValuationOrTrendUpdate = valueChanged || demandChanged || trendChanged || starTierChanges.length > 0;
    addAuditLog({
      action: isValuationOrTrendUpdate ? 'PRICE_UPDATE' : 'MANUAL_EDIT',
      itemName: itemUpdates.name || targetItem.name,
      details: auditReason || (summaryParts.length > 0 ? summaryParts.join(' • ') : 'Catalog unit update'),
      itemId: targetItem.id,
      oldValue: valueChanged ? targetItem.value : undefined,
      newValue: valueChanged ? finalValue : undefined,
      oldDemand: demandChanged ? targetItem.demand : undefined,
      newDemand: demandChanged ? (itemUpdates.demand ?? targetItem.demand) : undefined,
      oldTrend: trendChanged ? targetItem.trend : undefined,
      newTrend: trendChanged ? (itemUpdates.trend ?? targetItem.trend) : undefined,
      oldName: nameChanged ? targetItem.name : undefined,
      newName: nameChanged ? itemUpdates.name : undefined,
      oldNotes: notesChanged ? targetItem.notes : undefined,
      newNotes: notesChanged ? itemUpdates.notes : undefined,
      oldThumbnail: thumbChanged ? targetItem.thumbnail : undefined,
      thumbnail: itemUpdates.thumbnail || targetItem.thumbnail,
      category: itemUpdates.category || targetItem.category,
      rarity: itemUpdates.rarity || targetItem.rarity,
      changes: itemChanges,
      starChanges: starTierChanges.length > 0 ? starTierChanges : undefined
    });
  };

  // ==========================================
  // CONSULTANT PROPOSALS (COMMENTATOR MODE)
  // ==========================================
  const submitConsultantProposal = async (
    proposalData: Omit<ConsultantProposal, 'id' | 'createdAt' | 'status'>
  ): Promise<{ success: boolean; id: string; message: string }> => {
    const newId = `proposal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullProposal: ConsultantProposal = {
      ...proposalData,
      id: newId,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    setConsultantProposals(prev => [fullProposal, ...prev.filter(p => p.id !== newId)]);
    const updated = [fullProposal, ...consultantProposals.filter(p => p.id !== newId)];
    safeLocalStorageSet(STORAGE_KEYS.CONSULTANT_PROPOSALS, JSON.stringify(updated));

    try {
      await setDoc(doc(db, 'consultantProposals', newId), cleanForFirestore(fullProposal));
    } catch (err) {
      console.error('Failed to save consultant proposal to Firestore:', err);
    }

    addAuditLog({
      action: 'MANUAL_EDIT',
      itemName: proposalData.itemName,
      itemId: proposalData.itemId,
      details: `Consultant suggestion submitted by @${proposalData.consultantUsername} (Commentator Mode): "${proposalData.commentary}"`,
      moderator: `@${proposalData.consultantUsername} (Consultant)`
    });

    return {
      success: true,
      id: newId,
      message: 'Suggestion submitted successfully to the Admin Review Panel!'
    };
  };

  const approveConsultantProposal = async (
    proposalId: string,
    adminComment?: string
  ): Promise<{ success: boolean; message: string }> => {
    const proposal = consultantProposals.find(p => p.id === proposalId);
    if (!proposal) {
      return { success: false, message: 'Proposal not found.' };
    }

    const now = new Date().toISOString();
    const resolvedBy = activeStaff?.displayName || activeStaff?.username || 'Admin';

    // 1. If this is an existing item, apply the updates directly using updateItem
    if (proposal.type === 'NEW_ITEM') {
      const pData = proposal.proposedChanges;
      addItem({
        name: pData.name || proposal.itemName,
        acronym: pData.acronym,
        category: pData.category || proposal.itemCategory || 'Air',
        rarity: pData.rarity || proposal.itemRarity || 'Legendary',
        value: pData.value ?? 100000,
        demand: pData.demand ?? 5,
        trend: pData.trend || 'Stable',
        tradeable: pData.tradeable !== false,
        thumbnail: pData.thumbnail || proposal.itemThumbnail || '',
        notes: pData.notes || 'Catalog unit approved from consultant proposal.',
        initialHistoryNote: `Added via approved consultant proposal from @${proposal.consultantUsername}`
      });
    } else {
      updateItem(
        {
          id: proposal.itemId,
          ...proposal.proposedChanges
        },
        `Approved Consultant proposal from @${proposal.consultantUsername}: "${proposal.commentary}"`
      );
    }

    // 2. Mark proposal as approved
    const feedback = adminComment?.trim() || 'Approved by Administrator';
    const updatedList = consultantProposals.map(p => {
      if (p.id === proposalId) {
        return {
          ...p,
          status: 'approved' as const,
          resolvedAt: now,
          resolvedBy,
          adminFeedback: feedback
        };
      }
      return p;
    });

    setConsultantProposals(updatedList);
    safeLocalStorageSet(STORAGE_KEYS.CONSULTANT_PROPOSALS, JSON.stringify(updatedList));

    try {
      await updateDoc(doc(db, 'consultantProposals', proposalId), {
        status: 'approved',
        resolvedAt: now,
        resolvedBy,
        adminFeedback: feedback
      });
    } catch (err) {
      console.error('Failed to update proposal status in Firestore:', err);
    }

    // 3. Log Audit entry with dedicated CONSULTANT_PROPOSAL_APPROVED action
    addAuditLog({
      action: 'CONSULTANT_PROPOSAL_APPROVED',
      itemId: proposal.itemId,
      itemName: proposal.itemName,
      details: `Admin ${resolvedBy} approved consultant proposal for "${proposal.itemName}" from @${proposal.consultantUsername}. Commentary: "${proposal.commentary}"`,
      moderator: `${resolvedBy} (Admin)`,
      oldValue: proposal.originalSnapshot?.value,
      newValue: proposal.proposedChanges?.value,
      oldDemand: proposal.originalSnapshot?.demand,
      newDemand: proposal.proposedChanges?.demand,
      oldTrend: proposal.originalSnapshot?.trend,
      newTrend: proposal.proposedChanges?.trend
    });

    return {
      success: true,
      message: `Proposal for "${proposal.itemName}" approved and changes applied instantly!`
    };
  };

  const denyConsultantProposal = async (
    proposalId: string,
    adminComment?: string
  ): Promise<{ success: boolean; message: string }> => {
    const proposal = consultantProposals.find(p => p.id === proposalId);
    if (!proposal) {
      return { success: false, message: 'Proposal not found.' };
    }

    const now = new Date().toISOString();
    const resolvedBy = activeStaff?.displayName || activeStaff?.username || 'Admin';
    const feedback = adminComment?.trim() || 'Denied by Administrator';

    const updatedList = consultantProposals.map(p => {
      if (p.id === proposalId) {
        return {
          ...p,
          status: 'denied' as const,
          resolvedAt: now,
          resolvedBy,
          adminFeedback: feedback
        };
      }
      return p;
    });

    setConsultantProposals(updatedList);
    safeLocalStorageSet(STORAGE_KEYS.CONSULTANT_PROPOSALS, JSON.stringify(updatedList));

    try {
      await updateDoc(doc(db, 'consultantProposals', proposalId), {
        status: 'denied',
        resolvedAt: now,
        resolvedBy,
        adminFeedback: feedback
      });
    } catch (err) {
      console.error('Failed to update denied proposal in Firestore:', err);
    }

    addAuditLog({
      action: 'CONSULTANT_PROPOSAL_DENIED',
      itemId: proposal.itemId,
      itemName: proposal.itemName,
      details: `Admin ${resolvedBy} denied consultant proposal for "${proposal.itemName}" from @${proposal.consultantUsername}. Feedback: "${feedback}"`,
      moderator: `${resolvedBy} (Admin)`
    });

    return {
      success: true,
      message: `Proposal for "${proposal.itemName}" has been denied.`
    };
  };

  const deleteConsultantProposal = async (proposalId: string): Promise<{ success: boolean; message: string }> => {
    const updatedList = consultantProposals.filter(p => p.id !== proposalId);
    setConsultantProposals(updatedList);
    safeLocalStorageSet(STORAGE_KEYS.CONSULTANT_PROPOSALS, JSON.stringify(updatedList));

    try {
      await deleteDoc(doc(db, 'consultantProposals', proposalId));
    } catch (err) {
      console.error('Failed to delete proposal document from Firestore:', err);
    }

    return { success: true, message: 'Proposal removed.' };
  };

  const batchUpdateThumbnails = async (updates: { itemId: string; thumbnail: string }[]) => {
    if (!updates || updates.length === 0) return;
    const sanitizedUpdates = updates.map(u => ({
      itemId: u.itemId,
      thumbnail: getSafeImageUrl(u.thumbnail)
    }));
    const updateMap = new Map(sanitizedUpdates.map(u => [u.itemId, u.thumbnail]));

    setItems(prev => {
      const updated = prev.map(item => {
        if (updateMap.has(item.id)) {
          return {
            ...item,
            thumbnail: updateMap.get(item.id)!,
            lastUpdated: new Date().toISOString().split('T')[0]
          };
        }
        return item;
      });
      saveItemsCache(updated);
      return updated;
    });

    addAuditLog({
      action: 'MANUAL_EDIT',
      itemName: 'Batch Image Sync',
      details: `Admin uploaded thumbnails for ${sanitizedUpdates.length} units simultaneously`,
      changes: [
        { field: 'Batch Update Size', to: `${sanitizedUpdates.length} units` },
        { field: 'Target Unit IDs', to: sanitizedUpdates.slice(0, 5).map(u => u.itemId).join(', ') + (sanitizedUpdates.length > 5 ? ` +${sanitizedUpdates.length - 5} more` : '') }
      ]
    });

    // Firestore batch update in safe 200-item chunks with merge
    try {
      const chunkSize = 200;
      for (let i = 0; i < sanitizedUpdates.length; i += chunkSize) {
        const chunk = sanitizedUpdates.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(u => {
          const itemRef = doc(db, 'items', u.itemId);
          batch.set(itemRef, { 
            thumbnail: u.thumbnail, 
            lastUpdated: new Date().toISOString() 
          }, { merge: true });
        });
        await batch.commit();
      }
    } catch (err) {
      console.error('Failed to commit batch thumbnails to Firestore:', err);
    }
  };

  const batchAutomateItemDemands = async (params: BatchDemandAutomationParams): Promise<{ updatedCount: number }> => {
    if (!params.itemIds || params.itemIds.length === 0) return { updatedCount: 0 };
    const idSet = new Set(params.itemIds);
    const nowIso = new Date().toISOString();

    const updatedItemList: MilitaryItem[] = [];

    setItems(prev => {
      const next = prev.map(item => {
        if (!idSet.has(item.id)) return item;

        // Double protection: skip soldiers and drones if excludeSoldiersAndDrones is requested
        if (params.excludeSoldiersAndDrones && isSoldierOrDroneCategory(item.category)) {
          return item;
        }

        const isVehicle = isVehicleCategory(item.category);
        const isSoldierDrone = isSoldierOrDroneCategory(item.category);

        // Filter requested star tiers to only those applicable to this item's category
        const applicableTiers = params.starTiers.filter(t => {
          if (isVehicle) return ['fresh', '0', '1', '2', '3', '4', '5'].includes(t);
          if (isSoldierDrone) return ['0', '1', '2', '3'].includes(t);
          return t === '0';
        });

        const nextStarTierOverrides: Record<string, StarTierOverrideData> = {
          ...(item.starTierOverrides || {})
        };

        // For soldiers and drones, if only base demand was updated, don't generate starTierOverrides
        const hasSpecificStarTiers = applicableTiers.some(t => t !== '0');
        if (hasSpecificStarTiers) {
          applicableTiers.forEach(tier => {
            const currentTierData = nextStarTierOverrides[tier] || {};
            nextStarTierOverrides[tier] = {
              ...currentTierData,
              demand: params.newDemand,
              ...(params.newTrend ? { trend: params.newTrend } : {})
            };
          });
        }

        // Determine if base demand should also update
        const shouldUpdateBase = params.updateBaseDemand || params.starTiers.includes('0') || !hasSpecificStarTiers;
        const nextDemand = shouldUpdateBase ? params.newDemand : item.demand;
        const nextTrend = (shouldUpdateBase && params.newTrend) ? params.newTrend : item.trend;
        const nextTradeable = params.newTradeable !== undefined ? params.newTradeable : item.tradeable;

        let nextValue = item.value;
        if (params.valueAdjustmentPercent !== undefined && params.valueAdjustmentPercent !== 0) {
          const multiplier = 1 + (params.valueAdjustmentPercent / 100);
          nextValue = Math.max(1000, Math.round((item.value * multiplier) / 1000) * 1000);
        }

        const finalOverrides = Object.keys(nextStarTierOverrides).length > 0 ? nextStarTierOverrides : undefined;

        const merged: MilitaryItem = {
          ...item,
          value: nextValue,
          demand: nextDemand,
          trend: nextTrend,
          tradeable: nextTradeable,
          starTierOverrides: finalOverrides,
          hasCustomMultiplierOverrides: isSoldierDrone ? Boolean(item.hasCustomMultiplierOverrides) : undefined,
          lastUpdated: nowIso
        };

        updatedItemList.push(merged);
        return merged;
      });

      saveItemsCache(next);
      return next;
    });

    const updatedCount = updatedItemList.length;
    if (updatedCount === 0) return { updatedCount: 0 };

    // Record comprehensive audit log
    const starTierLabels = params.starTiers.map(t => t === 'fresh' ? 'Fresh' : `${t}★`).join(', ');
    addAuditLog({
      action: 'MANUAL_EDIT',
      itemName: 'Demand Automation',
      details: params.auditReason || `Automated demand set to ${params.newDemand}/10 on star level(s) [${starTierLabels}] across ${updatedCount} units`,
      changes: [
        { field: 'Automation Action', to: 'Bulk Star Tier Demand Adjustment' },
        { field: 'Updated Units Count', to: `${updatedCount} units` },
        { field: 'Target Star Levels', to: starTierLabels || 'Base' },
        { field: 'New Demand Rating', to: `${params.newDemand}/10` },
        ...(params.excludeSoldiersAndDrones ? [{ field: 'Soldiers & Drones', to: 'Excluded (Protected from changes)' }] : []),
        ...(params.newTrend ? [{ field: 'New Trend', to: params.newTrend }] : []),
        ...(params.valueAdjustmentPercent ? [{ field: 'Value Scaler', to: `${params.valueAdjustmentPercent > 0 ? '+' : ''}${params.valueAdjustmentPercent}%` }] : []),
        { field: 'Sample Updated Units', to: updatedItemList.slice(0, 8).map(i => i.name).join(', ') + (updatedCount > 8 ? ` +${updatedCount - 8} more` : '') }
      ],
      skipWebhook: true
    });

    // Firestore batch commit in safe 200-document batches with cleanForFirestore
    try {
      const chunkSize = 200;
      for (let i = 0; i < updatedItemList.length; i += chunkSize) {
        const chunk = updatedItemList.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(u => {
          const itemRef = doc(db, 'items', u.id);
          const cleanPayload: Record<string, any> = cleanForFirestore({
            value: u.value,
            demand: u.demand,
            trend: u.trend,
            tradeable: u.tradeable,
            starTierOverrides: u.starTierOverrides,
            hasCustomMultiplierOverrides: u.hasCustomMultiplierOverrides,
            lastUpdated: nowIso
          });
          if (!u.starTierOverrides || Object.keys(u.starTierOverrides).length === 0) {
            cleanPayload.starTierOverrides = deleteField();
          }
          batch.set(itemRef, cleanPayload, { merge: true });
        });
        await batch.commit();
      }
    } catch (err) {
      console.error('Failed to commit automated demand updates to Firestore:', err);
    }

    return { updatedCount };
  };

  /**
   * Reset all soldiers and drones to pure universal multipliers (1x, 5x, 20x, 50x)
   * Cleans any lingering manual overrides, starOverrides, or custom multipliers
   */
  const resetSoldiersAndDronesToUniversal = async (): Promise<{ updatedCount: number }> => {
    const soldierDroneItems = items.filter(i => 
      isSoldierOrDroneCategory(i.category) && 
      (i.hasCustomMultiplierOverrides || (i.multiplierOverrides && Object.keys(i.multiplierOverrides).length > 0) || i.hasCustomStarOverrides || i.starOverrides || (i.starTierOverrides && Object.keys(i.starTierOverrides).length > 0))
    );

    if (soldierDroneItems.length === 0) return { updatedCount: 0 };

    const nowIso = new Date().toISOString();
    const updatedIds = new Set(soldierDroneItems.map(i => i.id));

    setItems(prev => {
      const next = prev.map(item => {
        if (!updatedIds.has(item.id)) return item;
        const cleaned: MilitaryItem = {
          ...item,
          hasCustomMultiplierOverrides: false,
          multiplierOverrides: undefined,
          hasCustomStarOverrides: false,
          starOverrides: undefined,
          starTierOverrides: undefined,
          lastUpdated: nowIso
        };
        return cleaned;
      });
      saveItemsCache(next);
      return next;
    });

    addAuditLog({
      action: 'MANUAL_EDIT',
      itemName: 'Soldiers & Drones Universal Reset',
      details: `Reverted ${soldierDroneItems.length} soldiers and drones to universal multipliers (1x, 5x, 20x, 50x) and purged manual overrides.`,
      changes: [
        { field: 'Reset Target', to: 'Infantry Soldiers & Drones' },
        { field: 'Overridden Units Cleared', to: `${soldierDroneItems.length} units` },
        { field: 'Multiplier Mode', to: 'Universal Standard (0★: 1x, 1★: 5x, 2★: 20x, 3★: 50x)' }
      ],
      skipWebhook: true
    });

    // Firestore batch update
    try {
      const chunkSize = 200;
      for (let i = 0; i < soldierDroneItems.length; i += chunkSize) {
        const chunk = soldierDroneItems.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(item => {
          const itemRef = doc(db, 'items', item.id);
          batch.set(itemRef, {
            hasCustomMultiplierOverrides: false,
            multiplierOverrides: deleteField(),
            hasCustomStarOverrides: false,
            starOverrides: deleteField(),
            starTierOverrides: deleteField(),
            lastUpdated: nowIso
          }, { merge: true });
        });
        await batch.commit();
      }
    } catch (err) {
      console.error('Error committing soldiers/drones reset to Firestore:', err);
    }

    return { updatedCount: soldierDroneItems.length };
  };

  const addItem = (newItemData: Omit<MilitaryItem, 'id' | 'lastUpdated' | 'history'> & { initialHistoryNote?: string }) => {
    const id = newItemData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `item-${Date.now()}`;
    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateStr = `${monthNames[now.getMonth()]} ${now.getDate() < 10 ? '0' : ''}${now.getDate()}`;
    const finalVal = parseMilitaryValueInput(newItemData.value);

    const newItem: MilitaryItem = {
      ...newItemData,
      id,
      thumbnail: getSafeImageUrl(newItemData.thumbnail),
      value: finalVal,
      category: newItemData.category === 'Sea' ? 'Naval' : newItemData.category,
      lastUpdated: now.toISOString(),
      history: [
        {
          timestamp: now.toISOString(),
          date: dateStr,
          value: finalVal,
          note: newItemData.initialHistoryNote || 'Initial catalog listing',
          updatedBy: activeStaff?.username || 'Staff'
        }
      ]
    };

    setItems(prev => {
      const updated = [newItem, ...prev];
      saveItemsCache(updated);
      return updated;
    });

    // Commit to Firestore with retry
    const cleanItem = cleanForFirestore(newItem);
    setDoc(doc(db, 'items', id), cleanItem, { merge: true }).catch(err => {
      console.error('Failed to add item to Firestore (attempt 1):', err);
      setTimeout(() => {
        setDoc(doc(db, 'items', id), cleanItem, { merge: true })
          .catch(e => console.error('Failed to add item to Firestore (attempt 2):', e));
      }, 1000);
    });

    addAuditLog({
      action: 'ITEM_ADDED',
      itemName: newItem.name,
      details: newItemData.initialHistoryNote || `Added new ${newItem.category} (${newItem.rarity}) listing valued at $${newItem.value.toLocaleString()}`,
      itemId: newItem.id,
      oldValue: 0,
      newValue: newItem.value,
      oldDemand: 0,
      newDemand: newItem.demand,
      newTrend: newItem.trend,
      newNotes: newItem.notes,
      thumbnail: newItem.thumbnail,
      category: newItem.category,
      rarity: newItem.rarity,
      changes: [
        { field: 'Unit Name', to: newItem.name },
        { field: 'Category', to: newItem.category },
        { field: 'Rarity', to: newItem.rarity },
        { field: 'Initial Valuation', to: `$${newItem.value.toLocaleString()}` },
        { field: 'Demand', to: `${newItem.demand}/10` },
        { field: 'Trend', to: newItem.trend },
        { field: 'Tradeability', to: newItem.tradeable === false ? 'Untradeable' : 'Tradeable' },
        ...(newItem.acronym ? [{ field: 'Acronym', to: newItem.acronym }] : [])
      ]
    });
  };

  const deleteItem = (id: string) => {
    const targetItem = items.find(i => i.id === id);
    if (!targetItem) return;

    setActiveEditModalItem(prev => (prev?.id === id ? null : prev));
    setActiveChartModalItem(prev => (prev?.id === id ? null : prev));
    setActiveReportModalItem(prev => (prev?.id === id ? null : prev));

    setItems(prev => {
      const updated = prev.filter(i => i.id !== id);
      saveItemsCache(updated);
      return updated;
    });

    // Delete from Firestore
    deleteDoc(doc(db, 'items', id)).catch(err => {
      console.error('Failed to delete item from Firestore:', err);
    });

    addAuditLog({
      action: 'ITEM_DELETED',
      itemName: targetItem.name,
      details: `Removed unit "${targetItem.name}" from public catalog (Last value: $${targetItem.value.toLocaleString()})`,
      itemId: targetItem.id,
      oldValue: targetItem.value,
      oldDemand: targetItem.demand,
      thumbnail: targetItem.thumbnail,
      category: targetItem.category,
      rarity: targetItem.rarity,
      changes: [
        { field: 'Deleted Unit', from: targetItem.name },
        { field: 'Category', from: targetItem.category },
        { field: 'Rarity', from: targetItem.rarity },
        { field: 'Final Value', from: `$${targetItem.value.toLocaleString()}` },
        { field: 'Demand', from: `${targetItem.demand}/10` }
      ]
    });
  };

  const addPriceHistoryPoint = (itemId: string, point: { value: number; note?: string; date?: string; tier?: string; tierValues?: Record<string, number> }) => {
    const targetItem = items.find(i => i.id === itemId);
    if (!targetItem) return;

    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateStr = point.date || `${monthNames[now.getMonth()]} ${now.getDate() < 10 ? '0' : ''}${now.getDate()}`;

    // Get current tier values map
    const currentTiers = getAllItemStarTiersData(targetItem, universalStarConfig, universalSoldierDroneStarConfig);
    const currentTierMap: Record<string, number> = {};
    currentTiers.forEach(t => { currentTierMap[t.tierId] = t.value; });

    const newTierMap = point.tierValues ? { ...point.tierValues } : { ...currentTierMap };
    if (point.tier && point.tier !== '0') {
      newTierMap[point.tier] = point.value;
    } else {
      newTierMap['0'] = point.value;
    }

    const isStarTierPoint = Boolean(point.tier && point.tier !== '0');

    const newPoint: PriceHistoryPoint = {
      timestamp: now.toISOString(),
      date: dateStr,
      value: isStarTierPoint ? targetItem.value : point.value,
      tier: point.tier,
      tierValues: newTierMap,
      note: point.note || (isStarTierPoint ? `Updated ${point.tier}★ star valuation` : 'Historical transaction point'),
      updatedBy: activeStaff?.username || 'Staff'
    };

    let updatedHistory = targetItem.history && targetItem.history.length > 0 ? [...targetItem.history] : [];
    if (updatedHistory.length === 0) {
      const prevTime = targetItem.lastUpdated
        ? new Date(targetItem.lastUpdated)
        : new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      const prevMonth = monthNames[prevTime.getMonth()];
      const prevDateStr = `${prevMonth} ${prevTime.getDate() < 10 ? '0' : ''}${prevTime.getDate()}`;
      updatedHistory.push({
        timestamp: prevTime.toISOString(),
        date: prevDateStr,
        value: targetItem.value,
        tierValues: currentTierMap,
        note: 'Previous Market Valuation',
        updatedBy: 'System'
      });
    } else {
      // Ensure previous point had tierValues
      const lastPoint = updatedHistory[updatedHistory.length - 1];
      if (!lastPoint.tierValues) {
        lastPoint.tierValues = currentTierMap;
      }
    }
    updatedHistory.push(newPoint);

    const updatedItem: MilitaryItem = {
      ...targetItem,
      value: isStarTierPoint ? targetItem.value : point.value,
      history: updatedHistory,
      lastUpdated: now.toISOString()
    };

    if (isStarTierPoint && point.tier) {
      const isVehicle = isVehicleCategory(targetItem.category);
      if (isVehicle) {
        updatedItem.hasCustomStarOverrides = true;
      } else {
        updatedItem.hasCustomMultiplierOverrides = true;
      }
      updatedItem.starTierOverrides = {
        ...targetItem.starTierOverrides,
        [point.tier]: {
          ...targetItem.starTierOverrides?.[point.tier],
          value: point.value
        }
      };
    }

    setItems(prev => {
      const updated = prev.map(item => item.id === itemId ? updatedItem : item);
      saveItemsCache(updated);
      return updated;
    });

    if (activeItemDetailPage && activeItemDetailPage.id === itemId) {
      setActiveItemDetailPage(updatedItem);
    }
    if (activeChartModalItem && activeChartModalItem.id === itemId) {
      setActiveChartModalItem(updatedItem);
    }

    setDoc(doc(db, 'items', itemId), cleanForFirestore(updatedItem), { merge: true }).catch(err => console.error('Failed to sync history point to Firestore:', err));

    addAuditLog({
      action: 'PRICE_UPDATE',
      itemName: targetItem.name,
      details: `Recorded historical price point: $${(point.value/1e6).toFixed(0)}M (${point.note || 'Manual plot'})`,
      itemId: targetItem.id,
      oldValue: targetItem.value,
      newValue: point.value,
      oldDemand: targetItem.demand,
      newDemand: targetItem.demand,
      oldTrend: targetItem.trend,
      newTrend: targetItem.trend,
      thumbnail: targetItem.thumbnail,
      category: targetItem.category,
      rarity: targetItem.rarity,
    });
  };

  const resetToDefaults = async () => {
    setItems(INITIAL_ITEMS);
    setReports(INITIAL_REPORTS);
    safeLocalStorageRemove(STORAGE_KEYS.ITEMS);
    safeLocalStorageRemove(STORAGE_KEYS.REPORTS);
    
    try {
      const batch = writeBatch(db);
      INITIAL_ITEMS.forEach(item => {
        batch.set(doc(db, 'items', item.id), item);
      });
      await batch.commit();
    } catch (e) {
      console.error('Failed to reset Firestore items to default:', e);
    }

    addAuditLog('MANUAL_EDIT', 'Global Catalog', 'Reset all items and reported values back to default catalog.', undefined);
  };

  const resetAllGraphs = async (note?: string): Promise<{ success: boolean; count: number }> => {
    const updated = items.map(item => ({
      ...item,
      history: []
    }));

    setItems(updated);
    saveItemsCache(updated);

    try {
      const chunkSize = 150;
      for (let i = 0; i < updated.length; i += chunkSize) {
        const chunk = updated.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(item => {
          batch.set(doc(db, 'items', item.id), { history: [] }, { merge: true });
        });
        await batch.commit();
      }
    } catch (e) {
      console.error('Firestore batch reset graphs error:', e);
    }

    addAuditLog({
      action: 'SYSTEM_RESET',
      itemName: 'All Valuation Graphs',
      details: `Administrator ${activeStaff?.displayName || 'Admin'} reset price graphs for all ${items.length} items to a clean baseline line until changes are added.${note ? ` Note: "${note}"` : ''}`
    });

    return { success: true, count: items.length };
  };

  const resetRecentlyUpdated = async (baselineDate?: string): Promise<{ success: boolean; count: number }> => {
    const targetDate = baselineDate ? new Date(baselineDate) : new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const targetIso = !isNaN(targetDate.getTime()) ? targetDate.toISOString() : new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    const updated = items.map(item => ({
      ...item,
      lastUpdated: targetIso
    }));

    setItems(updated);
    saveItemsCache(updated);

    // Clear price update logs from auditLogs so Recently Updated becomes completely blank
    setAuditLogs(prev => prev.filter(l => l.action !== 'PRICE_UPDATE' && l.action !== 'REPORT_ACCEPTED'));
    safeLocalStorageSet(STORAGE_KEYS.LOGS, JSON.stringify([]));

    try {
      const chunkSize = 150;
      for (let i = 0; i < updated.length; i += chunkSize) {
        const chunk = updated.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(item => {
          batch.set(doc(db, 'items', item.id), { lastUpdated: targetIso }, { merge: true });
        });
        await batch.commit();
      }
    } catch (e) {
      console.error('Firestore batch reset recently updated error:', e);
    }

    addAuditLog({
      action: 'SYSTEM_RESET',
      itemName: 'Recently Updated Catalog',
      details: `Administrator ${activeStaff?.displayName || 'Admin'} cleared all recently updated items. Section will remain blank until new updates happen.`
    });

    return { success: true, count: items.length };
  };

  const adjustItemRecentlyUpdated = (itemId: string, newTimestamp: string, customReason?: string): { success: boolean; message: string } => {
    const target = items.find(i => i.id === itemId);
    if (!target) return { success: false, message: 'Item not found' };

    const parsedDate = new Date(newTimestamp);
    const validIso = !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : new Date().toISOString();

    const updatedItem: MilitaryItem = {
      ...target,
      lastUpdated: validIso
    };

    setItems(prev => {
      const updated = prev.map(i => i.id === itemId ? updatedItem : i);
      saveItemsCache(updated);
      return updated;
    });

    setDoc(doc(db, 'items', target.id), { lastUpdated: validIso }, { merge: true }).catch(err => {
      console.error('Failed to update recently updated in Firestore:', err);
    });

    addAuditLog({
      action: 'MANUAL_EDIT',
      itemName: target.name,
      itemId: target.id,
      thumbnail: target.thumbnail,
      category: target.category,
      rarity: target.rarity,
      details: `Manually adjusted Recently Updated timestamp for "${target.name}" to ${parsedDate.toLocaleString()}.${customReason ? ` Reason: "${customReason}"` : ''}`,
      changes: [
        { field: 'Last Updated', from: new Date(target.lastUpdated).toLocaleString(), to: parsedDate.toLocaleString() }
      ]
    });

    return { success: true, message: `Updated "${target.name}" timestamp to ${parsedDate.toLocaleString()}` };
  };

  const batchAdjustRecentlyUpdated = async (itemIds: string[], newTimestamp: string, customReason?: string): Promise<{ success: boolean; count: number }> => {
    const parsedDate = new Date(newTimestamp);
    const validIso = !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : new Date().toISOString();
    const idSet = new Set(itemIds);

    const updated = items.map(item => {
      if (idSet.has(item.id)) {
        return {
          ...item,
          lastUpdated: validIso
        };
      }
      return item;
    });

    setItems(updated);
    saveItemsCache(updated);

    try {
      const chunkSize = 150;
      for (let i = 0; i < itemIds.length; i += chunkSize) {
        const chunk = itemIds.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(id => {
          batch.set(doc(db, 'items', id), { lastUpdated: validIso }, { merge: true });
        });
        await batch.commit();
      }
    } catch (e) {
      console.error('Firestore batch error:', e);
    }

    addAuditLog({
      action: 'BATCH_AUTOMATION',
      itemName: `${itemIds.length} Catalog Items`,
      details: `Administrator ${activeStaff?.displayName || 'Admin'} batch adjusted Recently Updated timestamps for ${itemIds.length} items to ${parsedDate.toLocaleString()}.${customReason ? ` (${customReason})` : ''}`
    });

    return { success: true, count: itemIds.length };
  };

  const addToRecentlyUpdated = async (
    itemId: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> => {
    const target = items.find(i => i.id === itemId);
    if (!target) return { success: false, message: 'Item not found' };

    const now = new Date();
    const validIso = now.toISOString();

    const updatedItem: MilitaryItem = {
      ...target,
      inRecentlyUpdated: true,
      excludeFromRecentlyUpdated: false,
      lastUpdated: validIso
    };

    setItems(prev => {
      const updated = prev.map(i => i.id === itemId ? updatedItem : i);
      saveItemsCache(updated);
      return updated;
    });

    if (activeItemDetailPage && activeItemDetailPage.id === itemId) {
      setActiveItemDetailPage(updatedItem);
    }

    try {
      await setDoc(
        doc(db, 'items', itemId),
        cleanForFirestore({
          inRecentlyUpdated: true,
          excludeFromRecentlyUpdated: false,
          lastUpdated: validIso
        }),
        { merge: true }
      );
    } catch (err) {
      console.error('Failed to add item to Recently Updated in Firestore:', err);
    }

    addAuditLog({
      action: 'PRICE_UPDATE',
      itemName: target.name,
      itemId: target.id,
      thumbnail: target.thumbnail,
      category: target.category,
      rarity: target.rarity,
      oldValue: target.value,
      newValue: target.value,
      details: `Staff ${activeStaff?.displayName || activeStaff?.username || 'Staff'} manually added "${target.name}" to Recently Updated.${reason ? ` Reason: "${reason}"` : ''}`,
      changes: [
        { field: 'Recently Updated', from: 'Standard', to: 'Added' }
      ]
    });

    return { success: true, message: `Added "${target.name}" to Recently Updated.` };
  };

  const removeFromRecentlyUpdated = async (
    itemId: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> => {
    const target = items.find(i => i.id === itemId);
    if (!target) return { success: false, message: 'Item not found' };

    // Set lastUpdated to a past date (90 days ago) so it won't sort as recent
    const pastIso = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();

    const updatedItem: MilitaryItem = {
      ...target,
      inRecentlyUpdated: false,
      excludeFromRecentlyUpdated: true,
      lastUpdated: pastIso
    };

    setItems(prev => {
      const updated = prev.map(i => i.id === itemId ? updatedItem : i);
      saveItemsCache(updated);
      return updated;
    });

    if (activeItemDetailPage && activeItemDetailPage.id === itemId) {
      setActiveItemDetailPage(updatedItem);
    }

    try {
      await setDoc(
        doc(db, 'items', itemId),
        cleanForFirestore({
          inRecentlyUpdated: false,
          excludeFromRecentlyUpdated: true,
          lastUpdated: pastIso
        }),
        { merge: true }
      );
    } catch (err) {
      console.error('Failed to remove item from Recently Updated in Firestore:', err);
    }

    addAuditLog({
      action: 'MANUAL_EDIT',
      itemName: target.name,
      itemId: target.id,
      thumbnail: target.thumbnail,
      category: target.category,
      rarity: target.rarity,
      oldValue: target.value,
      newValue: target.value,
      details: `Staff ${activeStaff?.displayName || activeStaff?.username || 'Staff'} manually removed "${target.name}" from Recently Updated.${reason ? ` Reason: "${reason}"` : ''}`,
      changes: [
        { field: 'Recently Updated', from: 'Visible', to: 'Removed / Excluded' }
      ],
      skipWebhook: true
    });

    return { success: true, message: `Removed "${target.name}" from Recently Updated.` };
  };

  const bulkClearRecentlyUpdated = async (itemIds?: string[]): Promise<{ success: boolean; count: number }> => {
    const pastIso = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
    const idSet = itemIds && itemIds.length > 0 ? new Set(itemIds) : null;

    const targetsToClear = items.filter(item => {
      if (idSet) return idSet.has(item.id);
      return item.inRecentlyUpdated === true || !item.excludeFromRecentlyUpdated;
    });

    const targetIds = new Set<string>(targetsToClear.map(t => t.id));
    if (targetIds.size === 0) {
      return { success: true, count: 0 };
    }

    const updated = items.map(item => {
      if (targetIds.has(item.id)) {
        return {
          ...item,
          inRecentlyUpdated: false,
          excludeFromRecentlyUpdated: true,
          lastUpdated: pastIso
        };
      }
      return item;
    });

    setItems(updated);
    saveItemsCache(updated);

    if (activeItemDetailPage && targetIds.has(activeItemDetailPage.id)) {
      setActiveItemDetailPage({
        ...activeItemDetailPage,
        inRecentlyUpdated: false,
        excludeFromRecentlyUpdated: true,
        lastUpdated: pastIso
      });
    }

    try {
      const idsArray: string[] = Array.from(targetIds);
      const chunkSize = 150;
      for (let i = 0; i < idsArray.length; i += chunkSize) {
        const chunk = idsArray.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((id: string) => {
          batch.set(
            doc(db, 'items', id),
            {
              inRecentlyUpdated: false,
              excludeFromRecentlyUpdated: true,
              lastUpdated: pastIso
            },
            { merge: true }
          );
        });
        await batch.commit();
      }
    } catch (e) {
      console.error('Firestore batch error clearing recently updated:', e);
    }

    addAuditLog({
      action: 'BATCH_AUTOMATION',
      itemName: `${targetIds.size} Items Cleared`,
      details: `Administrator ${activeStaff?.displayName || activeStaff?.username || 'Staff'} bulk cleared ${targetIds.size} items from Recently Updated.`,
      skipWebhook: true
    });

    return { success: true, count: targetIds.size };
  };

  const removePriceHistoryPoint = async (
    itemId: string,
    pointIndex: number,
    reason?: string
  ): Promise<{ success: boolean; message: string }> => {
    const targetItem = items.find(i => i.id === itemId);
    if (!targetItem) return { success: false, message: 'Item not found' };
    const currentHistory = targetItem.history || [];
    if (pointIndex < 0 || pointIndex >= currentHistory.length) {
      return { success: false, message: 'Invalid point index' };
    }

    const removedPoint = currentHistory[pointIndex];
    const updatedHistory = currentHistory.filter((_, idx) => idx !== pointIndex);
    
    // Determine new item value: if the removed point was the last point (latest),
    // revert to the previous point's value if one exists
    let finalValue = targetItem.value;
    if (pointIndex === currentHistory.length - 1) {
      if (updatedHistory.length > 0) {
        finalValue = updatedHistory[updatedHistory.length - 1].value;
      }
    }

    const now = new Date();
    const updatedItem: MilitaryItem = {
      ...targetItem,
      value: finalValue,
      history: updatedHistory,
      lastUpdated: now.toISOString()
    };

    setItems(prev => {
      const updated = prev.map(item => item.id === itemId ? updatedItem : item);
      saveItemsCache(updated);
      return updated;
    });

    if (activeItemDetailPage && activeItemDetailPage.id === itemId) {
      setActiveItemDetailPage(updatedItem);
    }

    try {
      await setDoc(
        doc(db, 'items', itemId),
        cleanForFirestore({
          value: finalValue,
          history: updatedHistory,
          lastUpdated: now.toISOString()
        }),
        { merge: true }
      );
    } catch (err) {
      console.error('Failed to sync removed history point to Firestore:', err);
    }

    addAuditLog({
      action: 'PRICE_UPDATE',
      itemName: targetItem.name,
      details: `Staff ${activeStaff?.displayName || activeStaff?.username || 'Staff'} removed valuation graph point #${pointIndex + 1} (${removedPoint.date || 'Point'}: $${removedPoint.value.toLocaleString()})${reason ? ` - ${reason}` : ''}`,
      itemId: targetItem.id,
      oldValue: removedPoint.value,
      newValue: finalValue,
      oldDemand: targetItem.demand,
      newDemand: targetItem.demand,
      oldTrend: targetItem.trend,
      newTrend: targetItem.trend,
      thumbnail: targetItem.thumbnail,
      category: targetItem.category,
      rarity: targetItem.rarity,
    });

    return {
      success: true,
      message: `Successfully removed graph point (${removedPoint.date}: $${removedPoint.value.toLocaleString()})`
    };
  };

  const resetItemGraph = (itemId: string) => {
    const target = items.find(i => i.id === itemId);
    if (!target) return;

    const updatedItem: MilitaryItem = {
      ...target,
      history: []
    };

    setItems(prev => {
      const updated = prev.map(i => i.id === itemId ? updatedItem : i);
      saveItemsCache(updated);
      return updated;
    });

    setDoc(doc(db, 'items', target.id), { history: [] }, { merge: true }).catch(err => console.error(err));

    addAuditLog({
      action: 'SYSTEM_RESET',
      itemName: target.name,
      itemId: target.id,
      thumbnail: target.thumbnail,
      category: target.category,
      rarity: target.rarity,
      details: `Reset valuation graph for "${target.name}" to clean baseline line until changes are added.`,
      skipWebhook: true
    });
  };

  const autoSortTagsCategory = async (): Promise<{ success: boolean; count: number; message: string }> => {
    const itemsToUpdate: MilitaryItem[] = [];
    const updated = items.map(item => {
      if (item.category !== 'Tags' && shouldSortToTagsCategory(item)) {
        const updatedItem = { ...item, category: 'Tags' as ItemCategory };
        itemsToUpdate.push(updatedItem);
        return updatedItem;
      }
      return item;
    });

    if (itemsToUpdate.length === 0) {
      return { success: true, count: 0, message: 'All taglines, taunts, emblems, banners, and non-weapon cosmetic assets are already sorted into the Tags category.' };
    }

    setItems(updated);
    saveItemsCache(updated);

    try {
      const chunkSize = 150;
      for (let i = 0; i < itemsToUpdate.length; i += chunkSize) {
        const chunk = itemsToUpdate.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(item => {
          batch.set(doc(db, 'items', item.id), { category: 'Tags' }, { merge: true });
        });
        await batch.commit();
      }
    } catch (e) {
      console.error('Firestore batch auto-sort tags error:', e);
    }

    addAuditLog({
      action: 'BATCH_AUTOMATION',
      itemName: 'Tags Category Auto-Sort',
      details: `Administrator ${activeStaff?.displayName || 'Admin'} auto-sorted ${itemsToUpdate.length} cosmetic items (taglines, taunts, emblems, banners) into the Tags category.`,
      skipWebhook: true
    });

    return {
      success: true,
      count: itemsToUpdate.length,
      message: `Successfully sorted ${itemsToUpdate.length} item(s) (taglines, taunts, emblems, banners) into the Tags category.`
    };
  };

  const exportAllDataText = (
    format: 'json' | 'csv' | 'summary',
    options?: {
      includeItems?: boolean;
      includeReports?: boolean;
      includeAuditLogs?: boolean;
      includeConfigs?: boolean;
      headerCase?: 'lowercase' | 'titlecase';
      columnLayout?: 'metric_first' | 'tier_paired';
    }
  ): string => {
    if (!canExport) {
      throw new Error('Access Denied: Only Analyst and Administrator accounts are authorized to export system data.');
    }

    const includeItems = options?.includeItems ?? true;
    const includeReports = options?.includeReports ?? false;
    const includeAuditLogs = options?.includeAuditLogs ?? false;
    const includeConfigs = options?.includeConfigs ?? false;

    const exportedAt = new Date().toISOString();
    const exportedBy = activeStaff ? `${activeStaff.displayName || activeStaff.username} (${activeStaff.role})` : 'System Export';
    const totalValuation = items.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

    if (format === 'json') {
      const payload: Record<string, any> = {
        exportMetadata: {
          title: 'Military Tycoon Services (MTS) Official Data Export',
          exportedAt,
          exportedBy,
          totalCatalogItems: items.length,
          totalMarketValuation: totalValuation,
          systemVersion: '2.5.0'
        }
      };

      if (includeItems) {
        payload.catalogItems = items.map(item => {
          const isVehicle = isVehicleCategory(item.category);
          const isSoldierDrone = isSoldierOrDroneCategory(item.category);
          return {
            id: item.id,
            name: item.name,
            type: item.category,
            class: item.rarity,
            tradeable: item.tradeable !== false ? 'Tradable' : 'Untradable',
            value: item.value ?? 0,
            demand: item.demand ?? 0,
            trend: item.trend,
            starValues: {
              fresh: isVehicle ? getItemStarTierData(item, 'fresh', universalStarConfig, universalSoldierDroneStarConfig).value : undefined,
              '0': (isVehicle || isSoldierDrone) ? getItemStarTierData(item, '0', universalStarConfig, universalSoldierDroneStarConfig).value : undefined,
              '1': (isVehicle || isSoldierDrone) ? getItemStarTierData(item, '1', universalStarConfig, universalSoldierDroneStarConfig).value : undefined,
              '2': (isVehicle || isSoldierDrone) ? getItemStarTierData(item, '2', universalStarConfig, universalSoldierDroneStarConfig).value : undefined,
              '3': (isVehicle || isSoldierDrone) ? getItemStarTierData(item, '3', universalStarConfig, universalSoldierDroneStarConfig).value : undefined,
              '4': isVehicle ? getItemStarTierData(item, '4', universalStarConfig, universalSoldierDroneStarConfig).value : undefined,
              '5': isVehicle ? getItemStarTierData(item, '5', universalStarConfig, universalSoldierDroneStarConfig).value : undefined,
            },
            starDemands: {
              fresh: isVehicle ? getItemStarTierData(item, 'fresh', universalStarConfig, universalSoldierDroneStarConfig).demand : undefined,
              '0': (isVehicle || isSoldierDrone) ? getItemStarTierData(item, '0', universalStarConfig, universalSoldierDroneStarConfig).demand : undefined,
              '1': (isVehicle || isSoldierDrone) ? getItemStarTierData(item, '1', universalStarConfig, universalSoldierDroneStarConfig).demand : undefined,
              '2': (isVehicle || isSoldierDrone) ? getItemStarTierData(item, '2', universalStarConfig, universalSoldierDroneStarConfig).demand : undefined,
              '3': (isVehicle || isSoldierDrone) ? getItemStarTierData(item, '3', universalStarConfig, universalSoldierDroneStarConfig).demand : undefined,
              '4': isVehicle ? getItemStarTierData(item, '4', universalStarConfig, universalSoldierDroneStarConfig).demand : undefined,
              '5': isVehicle ? getItemStarTierData(item, '5', universalStarConfig, universalSoldierDroneStarConfig).demand : undefined,
            },
            starTrends: {
              fresh: isVehicle ? getItemStarTierData(item, 'fresh', universalStarConfig, universalSoldierDroneStarConfig).trend : undefined,
              '0': (isVehicle || isSoldierDrone) ? getItemStarTierData(item, '0', universalStarConfig, universalSoldierDroneStarConfig).trend : undefined,
              '1': (isVehicle || isSoldierDrone) ? getItemStarTierData(item, '1', universalStarConfig, universalSoldierDroneStarConfig).trend : undefined,
              '2': (isVehicle || isSoldierDrone) ? getItemStarTierData(item, '2', universalStarConfig, universalSoldierDroneStarConfig).trend : undefined,
              '3': (isVehicle || isSoldierDrone) ? getItemStarTierData(item, '3', universalStarConfig, universalSoldierDroneStarConfig).trend : undefined,
              '4': isVehicle ? getItemStarTierData(item, '4', universalStarConfig, universalSoldierDroneStarConfig).trend : undefined,
              '5': isVehicle ? getItemStarTierData(item, '5', universalStarConfig, universalSoldierDroneStarConfig).trend : undefined,
            }
          };
        });
      }

      if (includeConfigs) {
        payload.universalStarConfig = universalStarConfig;
        payload.universalSoldierDroneStarConfig = universalSoldierDroneStarConfig;
        payload.siteInformation = siteInfo;
      }

      if (includeReports) {
        payload.playerReports = reports;
      }

      if (includeAuditLogs) {
        payload.systemAuditLogs = auditLogs;
      }

      return JSON.stringify(payload, null, 2);
    }

    if (format === 'csv') {
      const headerCase = options?.headerCase ?? 'lowercase';
      const columnLayout = options?.columnLayout ?? 'metric_first';
      const isTitle = headerCase === 'titlecase';

      let headers: string[] = [];

      if (columnLayout === 'tier_paired') {
        headers = isTitle ? [
          'Name', 'Type', 'Class', 'Tradable/Untradable', 'Value', 'Demand', 'Trend',
          'Fresh Value', 'Fresh Demand', 'Fresh Trend',
          '0-Star Value', '0-Star Demand', '0-Star Trend',
          '1-Star Value', '1-Star Demand', '1-Star Trend',
          '2-Star Value', '2-Star Demand', '2-Star Trend',
          '3-Star Value', '3-Star Demand', '3-Star Trend',
          '4-Star Value', '4-Star Demand', '4-Star Trend',
          '5-Star Value', '5-Star Demand', '5-Star Trend'
        ] : [
          'name', 'type', 'class', 'tradable/untradable', 'value', 'demand', 'trend',
          'fresh_value', 'fresh_demand', 'fresh_trend',
          '0_star_value', '0_star_demand', '0_star_trend',
          '1_star_value', '1_star_demand', '1_star_trend',
          '2_star_value', '2_star_demand', '2_star_trend',
          '3_star_value', '3_star_demand', '3_star_trend',
          '4_star_value', '4_star_demand', '4_star_trend',
          '5_star_value', '5_star_demand', '5_star_trend'
        ];
      } else {
        // Default 'metric_first' - star values, then star demands, then star trends
        headers = isTitle ? [
          'Name', 'Type', 'Class', 'Tradable/Untradable', 'Value', 'Demand', 'Trend',
          'Fresh Value', '0-Star Value', '1-Star Value', '2-Star Value', '3-Star Value', '4-Star Value', '5-Star Value',
          'Fresh Demand', '0-Star Demand', '1-Star Demand', '2-Star Demand', '3-Star Demand', '4-Star Demand', '5-Star Demand',
          'Fresh Trend', '0-Star Trend', '1-Star Trend', '2-Star Trend', '3-Star Trend', '4-Star Trend', '5-Star Trend'
        ] : [
          'name', 'type', 'class', 'tradable/untradable', 'value', 'demand', 'trend',
          'fresh_value', '0_star_value', '1_star_value', '2_star_value', '3_star_value', '4_star_value', '5_star_value',
          'fresh_demand', '0_star_demand', '1_star_demand', '2_star_demand', '3_star_demand', '4_star_demand', '5_star_demand',
          'fresh_trend', '0_star_trend', '1_star_trend', '2_star_trend', '3_star_trend', '4_star_trend', '5_star_trend'
        ];
      }

      const escapeCsv = (val: any): string => {
        if (val === null || val === undefined || val === '') return '';
        if (typeof val === 'number') return String(val);
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows: string[] = [headers.map(h => escapeCsv(h)).join(',')];

      items.forEach(item => {
        const isVehicle = isVehicleCategory(item.category);
        const isSoldierDrone = isSoldierOrDroneCategory(item.category);

        const tradeStatus = isTitle
          ? (item.tradeable === false ? 'Untradable' : 'Tradable')
          : (item.tradeable === false ? 'untradable' : 'tradable');

        const freshData = isVehicle ? getItemStarTierData(item, 'fresh', universalStarConfig, universalSoldierDroneStarConfig) : null;
        const star0Data = (isVehicle || isSoldierDrone) ? getItemStarTierData(item, '0', universalStarConfig, universalSoldierDroneStarConfig) : null;
        const star1Data = (isVehicle || isSoldierDrone) ? getItemStarTierData(item, '1', universalStarConfig, universalSoldierDroneStarConfig) : null;
        const star2Data = (isVehicle || isSoldierDrone) ? getItemStarTierData(item, '2', universalStarConfig, universalSoldierDroneStarConfig) : null;
        const star3Data = (isVehicle || isSoldierDrone) ? getItemStarTierData(item, '3', universalStarConfig, universalSoldierDroneStarConfig) : null;
        const star4Data = isVehicle ? getItemStarTierData(item, '4', universalStarConfig, universalSoldierDroneStarConfig) : null;
        const star5Data = isVehicle ? getItemStarTierData(item, '5', universalStarConfig, universalSoldierDroneStarConfig) : null;

        const fVal = freshData ? freshData.value : '';
        const s0Val = star0Data ? star0Data.value : '';
        const s1Val = star1Data ? star1Data.value : '';
        const s2Val = star2Data ? star2Data.value : '';
        const s3Val = star3Data ? star3Data.value : '';
        const s4Val = star4Data ? star4Data.value : '';
        const s5Val = star5Data ? star5Data.value : '';

        const fDem = freshData ? freshData.demand : '';
        const s0Dem = star0Data ? star0Data.demand : '';
        const s1Dem = star1Data ? star1Data.demand : '';
        const s2Dem = star2Data ? star2Data.demand : '';
        const s3Dem = star3Data ? star3Data.demand : '';
        const s4Dem = star4Data ? star4Data.demand : '';
        const s5Dem = star5Data ? star5Data.demand : '';

        const fTr = freshData ? freshData.trend : '';
        const s0Tr = star0Data ? star0Data.trend : '';
        const s1Tr = star1Data ? star1Data.trend : '';
        const s2Tr = star2Data ? star2Data.trend : '';
        const s3Tr = star3Data ? star3Data.trend : '';
        const s4Tr = star4Data ? star4Data.trend : '';
        const s5Tr = star5Data ? star5Data.trend : '';

        let rowValues: any[] = [];
        if (columnLayout === 'tier_paired') {
          rowValues = [
            item.name,
            item.category,
            item.rarity,
            tradeStatus,
            item.value ?? 0,
            item.demand ?? 0,
            item.trend,
            fVal, fDem, fTr,
            s0Val, s0Dem, s0Tr,
            s1Val, s1Dem, s1Tr,
            s2Val, s2Dem, s2Tr,
            s3Val, s3Dem, s3Tr,
            s4Val, s4Dem, s4Tr,
            s5Val, s5Dem, s5Tr
          ];
        } else {
          rowValues = [
            item.name,
            item.category,
            item.rarity,
            tradeStatus,
            item.value ?? 0,
            item.demand ?? 0,
            item.trend,
            fVal, s0Val, s1Val, s2Val, s3Val, s4Val, s5Val,
            fDem, s0Dem, s1Dem, s2Dem, s3Dem, s4Dem, s5Dem,
            fTr, s0Tr, s1Tr, s2Tr, s3Tr, s4Tr, s5Tr
          ];
        }

        rows.push(rowValues.map(v => escapeCsv(v)).join(','));
      });

      return rows.join('\r\n');
    }

    // Default 'summary': Plain Text Ledger
    const lines: string[] = [];
    const divider = '='.repeat(84);
    const subDivider = '-'.repeat(84);

    lines.push(divider);
    lines.push('MILITARY TYCOON SERVICES (MTS) - CATALOG ITEMS DATA EXPORT');
    lines.push(divider);
    lines.push(`Generated On:      ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'long' })}`);
    lines.push(`Exported By:       ${exportedBy}`);
    lines.push(`Total Items:       ${items.length} registered assets`);
    lines.push(`Total Valuation:   $${totalValuation.toLocaleString()} in-game cash`);
    lines.push(`Average Value:     $${items.length ? Math.round(totalValuation / items.length).toLocaleString() : 0}`);
    lines.push(divider);
    lines.push('');

    // Category Breakdown
    lines.push('[1. VALUATION SUMMARY BY CATEGORY]');
    lines.push(subDivider);
    const categories = ['Air', 'Land', 'Naval', 'Sea', 'Soldier', 'Drone', 'Tags', 'Other'] as const;
    categories.forEach(cat => {
      const catItems = items.filter(i => i.category === cat || (cat === 'Naval' && (i.category as any) === 'Sea'));
      if (catItems.length === 0) return;
      const catTotal = catItems.reduce((acc, i) => acc + (Number(i.value) || 0), 0);
      const avgDemand = (catItems.reduce((acc, i) => acc + (Number(i.demand) || 0), 0) / catItems.length).toFixed(1);
      lines.push(`${cat.toUpperCase().padEnd(12)} | Count: ${String(catItems.length).padStart(3)} | Total Value: $${catTotal.toLocaleString().padEnd(16)} | Avg Demand: ${avgDemand}/10`);
    });
    lines.push('');

    // High Demand Items
    const highDemand = [...items].filter(i => (i.demand || 0) >= 8).sort((a, b) => (b.demand || 0) - (a.demand || 0));
    if (highDemand.length > 0) {
      lines.push('[2. HIGH DEMAND ITEMS (Demand 8 - 10)]');
      lines.push(subDivider);
      highDemand.slice(0, 15).forEach(item => {
        lines.push(`• ${item.name} (${item.category}) [${item.tradeable === false ? 'Untradable' : 'Tradable'}] - Value: $${item.value.toLocaleString()} | Demand: ${item.demand}/10 | Trend: ${item.trend}`);
      });
      lines.push('');
    }

    // Complete Item Master List (NO notes, includes Star Values and Star Demands)
    if (includeItems) {
      lines.push('[3. COMPLETE ITEM CATALOG LISTING]');
      lines.push(subDivider);
      items.forEach((item, idx) => {
        const isVehicle = isVehicleCategory(item.category);
        const isSoldierDrone = isSoldierOrDroneCategory(item.category);

        const fData = isVehicle ? getItemStarTierData(item, 'fresh', universalStarConfig, universalSoldierDroneStarConfig) : null;
        const s0 = (isVehicle || isSoldierDrone) ? getItemStarTierData(item, '0', universalStarConfig, universalSoldierDroneStarConfig) : null;
        const s1 = (isVehicle || isSoldierDrone) ? getItemStarTierData(item, '1', universalStarConfig, universalSoldierDroneStarConfig) : null;
        const s2 = (isVehicle || isSoldierDrone) ? getItemStarTierData(item, '2', universalStarConfig, universalSoldierDroneStarConfig) : null;
        const s3 = (isVehicle || isSoldierDrone) ? getItemStarTierData(item, '3', universalStarConfig, universalSoldierDroneStarConfig) : null;
        const s4 = isVehicle ? getItemStarTierData(item, '4', universalStarConfig, universalSoldierDroneStarConfig) : null;
        const s5 = isVehicle ? getItemStarTierData(item, '5', universalStarConfig, universalSoldierDroneStarConfig) : null;

        lines.push(`${String(idx + 1).padStart(3)}. [${item.category.toUpperCase()}] ${item.name} (${item.rarity}) - ${item.tradeable === false ? 'Untradable' : 'Tradable'}`);
        lines.push(`     Base Value: $${item.value.toLocaleString()} | Base Demand: ${item.demand}/10 | Trend: ${item.trend}`);
        if (isVehicle) {
          lines.push(`     Star Values: Fresh: $${fData?.value.toLocaleString()} | 0★: $${s0?.value.toLocaleString()} | 1★: $${s1?.value.toLocaleString()} | 2★: $${s2?.value.toLocaleString()} | 3★: $${s3?.value.toLocaleString()} | 4★: $${s4?.value.toLocaleString()} | 5★: $${s5?.value.toLocaleString()}`);
          lines.push(`     Star Demands: Fresh: ${fData?.demand}/10 | 0★: ${s0?.demand}/10 | 1★: ${s1?.demand}/10 | 2★: ${s2?.demand}/10 | 3★: ${s3?.demand}/10 | 4★: ${s4?.demand}/10 | 5★: ${s5?.demand}/10`);
        } else if (isSoldierDrone) {
          lines.push(`     Star Values: 0★: $${s0?.value.toLocaleString()} | 1★: $${s1?.value.toLocaleString()} | 2★: $${s2?.value.toLocaleString()} | 3★: $${s3?.value.toLocaleString()}`);
          lines.push(`     Star Demands: 0★: ${s0?.demand}/10 | 1★: ${s1?.demand}/10 | 2★: ${s2?.demand}/10 | 3★: ${s3?.demand}/10`);
        }
        lines.push('');
      });
    }

    if (includeReports && reports.length > 0) {
      lines.push('[4. COMMUNITY VALUE REPORTS QUEUE]');
      lines.push(subDivider);
      reports.forEach(r => {
        lines.push(`• [${r.status.toUpperCase()}] Item: ${r.itemName} | Suggested Value: $${r.suggestedValue.toLocaleString()} | Submitter: @${r.playerUsername} | Submitted: ${r.createdAt}`);
      });
      lines.push('');
    }

    if (includeAuditLogs && auditLogs.length > 0) {
      lines.push('[5. AUDIT LOGS]');
      lines.push(subDivider);
      auditLogs.slice(0, 20).forEach(log => {
        lines.push(`• [${log.action}] ${log.itemName} - ${log.details} (${log.moderator} @ ${log.timestamp})`);
      });
      lines.push('');
    }

    lines.push(divider);
    lines.push('END OF OFFICIAL DATA EXPORT - MILITARY TYCOON SERVICES');
    lines.push(divider);

    return lines.join('\r\n');
  };

  const downloadExportedData = (
    format: 'json' | 'csv' | 'summary',
    options?: {
      includeItems?: boolean;
      includeReports?: boolean;
      includeAuditLogs?: boolean;
      includeConfigs?: boolean;
      asPlainTextFile?: boolean;
      headerCase?: 'lowercase' | 'titlecase';
      columnLayout?: 'metric_first' | 'tier_paired';
    }
  ): { success: boolean; message: string; filename: string } => {
    if (!canExport) {
      return {
        success: false,
        message: 'Access Denied: Only Analyst and Administrator accounts are authorized to download data exports.',
        filename: ''
      };
    }

    try {
      const textContent = exportAllDataText(format, options);
      const dateStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
      
      let extension = 'csv';
      let mimeType = 'text/csv;charset=utf-8';

      if (options?.asPlainTextFile) {
        extension = 'txt';
        mimeType = 'text/plain;charset=utf-8';
      } else if (format === 'json') {
        extension = 'json';
        mimeType = 'application/json;charset=utf-8';
      } else if (format === 'csv') {
        extension = 'csv';
        mimeType = 'text/csv;charset=utf-8';
      } else {
        extension = 'txt';
        mimeType = 'text/plain;charset=utf-8';
      }

      const filename = `military_tycoon_items_${dateStr}_${timeStr}.${extension}`;
      // Prepend UTF-8 BOM (\uFEFF) for CSV format so Microsoft Excel & Google Sheets display cleanly without encoding errors
      const payloadString = (format === 'csv' && !options?.asPlainTextFile)
        ? '\uFEFF' + textContent
        : textContent;
      const blob = new Blob([payloadString], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addAuditLog(
        'DATA_EXPORT',
        'Data Export Center',
        `${activeStaff?.displayName || activeStaff?.username} [${activeStaff?.role}] downloaded items export in ${format.toUpperCase()} format (${(blob.size / 1024).toFixed(1)} KB).`
      );

      return {
        success: true,
        message: `Successfully exported ${filename} (${(blob.size / 1024).toFixed(1)} KB)`,
        filename
      };
    } catch (err: any) {
      console.error('Download export failed:', err);
      return {
        success: false,
        message: err?.message || 'Failed to generate data export download.',
        filename: ''
      };
    }
  };

  // Site Backups & Disaster Recovery Implementations
  const lastBackupDate = siteBackups.length > 0 ? siteBackups[0].createdAt : null;

  const createBackup = async (
    name?: string,
    type: BackupType = 'manual',
    notes?: string
  ): Promise<{ success: boolean; backup?: SiteBackup; message: string }> => {
    try {
      setIsBackingUp(true);
      const now = new Date();
      const dateKey = now.toISOString().split('T')[0];
      const backupId = type === 'daily_auto' 
        ? `daily_${dateKey}`
        : `backup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      const backupTitle = name || (type === 'daily_auto' 
        ? `Daily Automated Backup - ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        : `Manual Snapshot - ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`);

      const cleanItems = items.map(item => cleanForFirestore(item));
      const backupDoc: SiteBackup = {
        id: backupId,
        name: backupTitle,
        type,
        createdAt: now.toISOString(),
        dateKey,
        itemCount: items.length,
        items: cleanItems,
        siteInfo: cleanForFirestore(siteInfo),
        starConfig: cleanForFirestore(universalStarConfig),
        soldierDroneStarConfig: cleanForFirestore(universalSoldierDroneStarConfig),
        createdBy: activeStaff ? `${activeStaff.displayName || activeStaff.username} (${activeStaff.role})` : (type === 'daily_auto' ? 'Automated Daily System' : 'System Snapshot'),
        notes: notes || (type === 'daily_auto' ? `Automated daily snapshot of ${items.length} items` : `Manual snapshot of ${items.length} items`)
      };

      await setDoc(doc(db, 'siteBackups', backupId), backupDoc);

      setSiteBackups(prev => {
        const filtered = prev.filter(b => b.id !== backupId);
        return [backupDoc, ...filtered];
      });

      addAuditLog({
        action: 'BATCH_AUTOMATION',
        itemName: 'Site Backup',
        details: `${type === 'daily_auto' ? 'Automated Daily Backup created' : `Staff created manual backup "${backupTitle}"`} (${items.length} items preserved).`,
        skipWebhook: true
      });

      // If Google Drive Auto-Sync is enabled, upload to Drive in background
      if (getGoogleDriveAutoSync() && isGoogleDriveConnected()) {
        uploadBackupToGoogleDrive(backupDoc)
          .then(driveRes => {
            if (driveRes.success) {
              console.log('[Google Drive] Auto-uploaded backup to Drive:', driveRes.fileName);
            } else {
              console.warn('[Google Drive] Auto-upload warning:', driveRes.message);
            }
          })
          .catch(err => {
            console.error('[Google Drive] Auto-upload background error:', err);
          });
      }

      setIsBackingUp(false);
      return {
        success: true,
        backup: backupDoc,
        message: `Successfully created backup with ${items.length} items!`
      };
    } catch (err: any) {
      setIsBackingUp(false);
      console.error('Failed to create site backup:', err);
      return {
        success: false,
        message: err?.message || 'Failed to create site backup.'
      };
    }
  };

  const restoreBackup = async (
    backupOrId: string | SiteBackup
  ): Promise<{ success: boolean; count: number; message: string }> => {
    try {
      setIsBackingUp(true);
      let targetBackup: SiteBackup | undefined;
      if (typeof backupOrId === 'string') {
        targetBackup = siteBackups.find(b => b.id === backupOrId);
        if (!targetBackup) {
          const docSnap = await getDoc(doc(db, 'siteBackups', backupOrId));
          if (docSnap.exists()) {
            targetBackup = docSnap.data() as SiteBackup;
          }
        }
      } else {
        targetBackup = backupOrId;
      }

      if (!targetBackup || !Array.isArray(targetBackup.items) || targetBackup.items.length === 0) {
        setIsBackingUp(false);
        return { success: false, count: 0, message: 'Invalid or empty backup selected.' };
      }

      const restoredItems = targetBackup.items;
      setItems(restoredItems);
      saveItemsCache(restoredItems);

      const chunkSize = 150;
      for (let i = 0; i < restoredItems.length; i += chunkSize) {
        const chunk = restoredItems.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(item => {
          batch.set(doc(db, 'items', item.id), cleanForFirestore(item), { merge: true });
        });
        await batch.commit();
      }

      if (targetBackup.starConfig) {
        setUniversalStarConfig(targetBackup.starConfig as UniversalStarConfig);
        await setDoc(doc(db, 'system', 'starConfig'), cleanForFirestore(targetBackup.starConfig));
      }
      if (targetBackup.soldierDroneStarConfig) {
        setUniversalSoldierDroneStarConfig(targetBackup.soldierDroneStarConfig as UniversalSoldierDroneStarConfig);
        await setDoc(doc(db, 'system', 'soldierDroneStarConfig'), cleanForFirestore(targetBackup.soldierDroneStarConfig));
      }
      if (targetBackup.siteInfo) {
        setSiteInfo(targetBackup.siteInfo as SiteInfoConfig);
        await setDoc(doc(db, 'system', 'siteInfo'), cleanForFirestore(targetBackup.siteInfo));
      }

      addAuditLog({
        action: 'SYSTEM_RESET',
        itemName: 'Site Recovery & Restoration',
        details: `Disaster Recovery: Restored entire catalog from backup "${targetBackup.name}" (${restoredItems.length} items recovered).`,
        skipWebhook: true
      });

      setIsBackingUp(false);
      return {
        success: true,
        count: restoredItems.length,
        message: `Successfully restored ${restoredItems.length} items and configs from "${targetBackup.name}"!`
      };
    } catch (err: any) {
      setIsBackingUp(false);
      console.error('Failed to restore backup:', err);
      return {
        success: false,
        count: 0,
        message: err?.message || 'Failed to restore backup.'
      };
    }
  };

  const deleteBackup = async (backupId: string): Promise<{ success: boolean; message: string }> => {
    try {
      await deleteDoc(doc(db, 'siteBackups', backupId));
      setSiteBackups(prev => prev.filter(b => b.id !== backupId));
      return { success: true, message: 'Backup snapshot deleted successfully.' };
    } catch (err: any) {
      console.error('Failed to delete backup:', err);
      return { success: false, message: err?.message || 'Failed to delete backup snapshot.' };
    }
  };

  const exportBackupJSON = (backup?: SiteBackup): string => {
    const target = backup || {
      id: `export_${Date.now()}`,
      name: `MTS Catalog Export - ${new Date().toISOString()}`,
      type: 'manual' as BackupType,
      createdAt: new Date().toISOString(),
      dateKey: new Date().toISOString().split('T')[0],
      itemCount: items.length,
      items,
      siteInfo,
      starConfig: universalStarConfig,
      soldierDroneStarConfig: universalSoldierDroneStarConfig,
      createdBy: activeStaff?.displayName || 'Staff Export',
      notes: `Offline snapshot containing ${items.length} items.`
    };
    return JSON.stringify(target, null, 2);
  };

  const importBackupJSON = async (jsonString: string): Promise<{ success: boolean; count: number; message: string }> => {
    try {
      const parsed = JSON.parse(jsonString);
      let backupPayload: SiteBackup;
      if (Array.isArray(parsed)) {
        const now = new Date();
        backupPayload = {
          id: `import_${Date.now()}`,
          name: `Imported Items File (${parsed.length} items)`,
          type: 'manual',
          createdAt: now.toISOString(),
          dateKey: now.toISOString().split('T')[0],
          itemCount: parsed.length,
          items: parsed,
          notes: 'Imported from uploaded JSON file'
        };
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.items)) {
        backupPayload = {
          ...parsed,
          id: parsed.id || `import_${Date.now()}`,
          name: parsed.name || `Imported Backup (${parsed.items.length} items)`,
          type: 'manual',
          createdAt: parsed.createdAt || new Date().toISOString(),
          dateKey: parsed.dateKey || new Date().toISOString().split('T')[0],
          itemCount: parsed.items.length
        };
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.catalogItems)) {
        backupPayload = {
          id: `import_${Date.now()}`,
          name: `Imported Catalog Export (${parsed.catalogItems.length} items)`,
          type: 'manual',
          createdAt: new Date().toISOString(),
          dateKey: new Date().toISOString().split('T')[0],
          itemCount: parsed.catalogItems.length,
          items: parsed.catalogItems
        };
      } else {
        return { success: false, count: 0, message: 'Unrecognized JSON format. File must contain items array or backup object.' };
      }

      await createBackup(backupPayload.name, 'pre_import', `Archived before importing external JSON backup with ${backupPayload.items.length} items`);
      return await restoreBackup(backupPayload);
    } catch (e: any) {
      return { success: false, count: 0, message: 'Invalid JSON file: ' + (e?.message || 'Parse error') };
    }
  };

  return (
    <ValueListContext.Provider
      value={{
        items,
        reports,
        auditLogs,
        isStaffMode,
        isAdmin,
        isAnalyst,
        isConsultant,
        consultantProposals,
        submitConsultantProposal,
        approveConsultantProposal,
        denyConsultantProposal,
        deleteConsultantProposal,
        canExport,
        activeStaff,
        exportAllDataText,
        downloadExportedData,
        isDbConnected,
        dbSyncStatus,
        isQuotaExceeded,
        isQuotaBannerDismissed,
        dismissQuotaBanner,
        loginStaff,
        logoutStaff,
        staffMembers,
        addStaffMember,
        updateStaffRole,
        updateStaffPassword,
        removeStaffMember,
        updateStaffWeeklyQuota,
        acknowledgeUnmetQuota,
        excuseUnmetQuota,
        simulatedDayOverride,
        setSimulatedDayOverride,
        effectiveDate,
        searchQuery,
        setSearchQuery,
        debouncedSearchQuery,
        isSearchBuffering,
        flushSearch,
        selectedCategory,
        setSelectedCategory,
        selectedRarities,
        toggleRarityFilter,
        clearRarityFilters,
        demandFilter,
        setDemandFilter,
        selectedTrend,
        setSelectedTrend,
        sortBy,
        setSortBy,
        theme,
        setTheme,
        toggleTheme,
        language,
        setLanguage,
        isSettingsOpen,
        setIsSettingsOpen,
        isInfoSectionMinimized,
        setIsInfoSectionMinimized,
        toggleInfoSectionMinimized,
        t,
        translateCategory,
        translateRarity,
        translateTrend,
        translateDemand,
        isSearchMenuCollapsed,
        setIsSearchMenuCollapsed,
        toggleSearchMenuCollapsed,
        globalCardLayoutMode,
        setGlobalCardLayoutMode,
        toggleGlobalCardLayoutMode: toggleGlobalCardViewMode,
        toggleGlobalCardViewMode,
        expandedCardIds,
        isCardExpanded,
        toggleCardExpanded,
        setCardExpanded,
        activeItemDetailPage,
        setActiveItemDetailPage,
        navigateToItem,
        navigateToCatalog,
        isTOSOpen,
        setIsTOSOpen,
        navigateToTOS,
        itemStarTiers,
        setItemStarTier,
        getItemSelectedTier,
        activeReportModalItem,
        setActiveReportModalItem,
        activeChartModalItem,
        setActiveChartModalItem,
        activeEditModalItem,
        setActiveEditModalItem,
        isStaffPanelOpen,
        setIsStaffPanelOpen,
        isTradeCalcOpen,
        setIsTradeCalcOpen,
        tradeState,
        setTradeState,
        addTradeItem,
        removeTradeItem,
        moveTradeItem,
        swapTradeSides,
        updateTradeItemTier,
        updateTradeItemQuantity,
        updateTradeGems,
        clearTrade,
        openTradeCalculatorWithItem,
        universalStarConfig,
        updateUniversalStarConfig,
        universalSoldierDroneStarConfig,
        updateUniversalSoldierDroneStarConfig,
        getItemStarValue,
        siteInfo,
        updateSiteInfo,
        resetSiteInfoToDefault,
        submitReport,
        acceptReport,
        editAndAcceptReport,
        declineReport,
        updateItem,
        batchUpdateThumbnails,
        batchAutomateItemDemands,
        resetSoldiersAndDronesToUniversal,
        addItem,
        deleteItem,
        addPriceHistoryPoint,
        resetToDefaults,
        resetAllGraphs,
        resetRecentlyUpdated,
        adjustItemRecentlyUpdated,
        batchAdjustRecentlyUpdated,
        addToRecentlyUpdated,
        removeFromRecentlyUpdated,
        bulkClearRecentlyUpdated,
        removePriceHistoryPoint,
        resetItemGraph,
        autoSortTagsCategory,
        siteBackups,
        isBackingUp,
        lastBackupDate,
        createBackup,
        restoreBackup,
        deleteBackup,
        exportBackupJSON,
        importBackupJSON
      }}
    >
      {children}
    </ValueListContext.Provider>
  );
};

export const useValueList = () => {
  const context = useContext(ValueListContext);
  if (!context) {
    throw new Error('useValueList must be used within a ValueListProvider');
  }
  return context;
};
