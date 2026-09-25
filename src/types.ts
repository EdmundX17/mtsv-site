export type ItemCategory = 'Air' | 'Land' | 'Naval' | 'Sea' | 'Soldier' | 'Drone' | 'Tags' | 'Other';

export type VehicleStarTier = '0' | '1' | '2' | '3' | '4' | '5' | 'fresh';
export type SoldierDroneStarTier = '0' | '1' | '2' | '3';
export type StarTier = VehicleStarTier;

export interface UniversalStarConfig {
  fresh: number;
  '0': number;
  '1': number;
  '2': number;
  '3': number;
  '4': number;
  '5': number;
}

export interface UniversalSoldierDroneStarConfig {
  '0': number; // multiplier for 0★ (default: 1x)
  '1': number; // multiplier for 1★ (default: 5x)
  '2': number; // multiplier for 2★ (default: 20x)
  '3': number; // multiplier for 3★ (default: 50x)
}

export type ItemRarity = 
  | 'Limited Edition' 
  | 'Exotic' 
  | 'Legendary' 
  | 'Epic' 
  | 'Rare' 
  | 'Uncommon'
  | 'Common'
  | 'Event';

export type CanonicalPriceTrend = 
  | 'Glazed' 
  | 'Rising' 
  | 'Stable' 
  | 'Dropping' 
  | 'Unstable';

export type PriceTrend = 
  | CanonicalPriceTrend
  | 'rising'
  | 'hyped'
  | 'stable'
  | 'dropping'
  | 'fluctuating'
  | 'overpriced';

export interface PriceHistoryPoint {
  timestamp: string;
  date: string;
  value: number; // In numeric cash value, e.g., 3800000000 ($3.8B)
  note?: string;
  updatedBy?: string;
  tier?: string; // Optional specific star tier identifier (e.g. '0', '1', '5', 'fresh')
  tierValues?: Record<string, number>; // Snapshot of values per star tier at this point in time
}

export interface StarTierOverrideData {
  value?: number;
  demand?: number; // 1 - 10
  trend?: PriceTrend;
  hasManualGemRange?: boolean;
  gemOverrideMin?: number;
  gemOverrideMax?: number;
  notes?: string;
}

export interface MilitaryItem {
  id: string;
  name: string;
  acronym?: string; // Optional acronym e.g. AC-130, F-22, M1A2
  category: ItemCategory;
  rarity: ItemRarity;
  value: number; // base numeric value in $
  demand: number; // 1 - 10
  trend: PriceTrend;
  thumbnail: string;
  notes: string;
  history: PriceHistoryPoint[];
  lastUpdated: string;
  inGameCost?: string;
  speed?: string;
  damage?: string;
  health?: string;
  obtainableFrom?: string;
  tags?: string[];
  tradeable?: boolean; // Item tradeability status (default: true)
  tradeability?: string;
  initialHistoryNote?: string;
  // Gem range manual overrides for staff
  hasManualGemRange?: boolean;
  gemOverrideMin?: number;
  gemOverrideMax?: number;
  // Star tier overrides (Air, Sea, Land vehicles)
  hasCustomStarOverrides?: boolean;
  starOverrides?: Partial<Record<StarTier, number>>;
  // Rich individual star tier overrides (value, demand, trend, gem range, notes)
  starTierOverrides?: Partial<Record<string, StarTierOverrideData>>;
  // Star multiplier overrides (Soldier, Drone)
  hasCustomMultiplierOverrides?: boolean;
  multiplierOverrides?: Partial<Record<SoldierDroneStarTier, number>>;
  // Staff recently updated flags
  inRecentlyUpdated?: boolean;
  excludeFromRecentlyUpdated?: boolean;
}

export interface BatchDemandAutomationParams {
  itemIds: string[];
  starTiers: string[]; // e.g. ['1', '2', '3', '4'] or ['fresh', '0', '1', '2', '3', '4', '5']
  newDemand: number; // 1 - 10
  updateBaseDemand?: boolean;
  excludeSoldiersAndDrones?: boolean;
  newTrend?: PriceTrend;
  valueAdjustmentPercent?: number; // Optional percentage change e.g. 5 for +5%
  newTradeable?: boolean;
  auditReason?: string;
}

export interface ReportedValue {
  id: string;
  itemId: string;
  itemName: string;
  itemCategory: ItemCategory;
  itemThumbnail: string;
  starTier?: string;
  starLabel?: string;
  currentValue: number;
  suggestedValue: number;
  currentDemand: number;
  suggestedDemand: number;
  currentTrend: PriceTrend;
  suggestedTrend: PriceTrend;
  playerUsername: string;
  discordTag?: string;
  reason: string;
  proofLink?: string;
  status: 'pending' | 'accepted' | 'edited_accepted' | 'declined';
  staffComment?: string;
  moderator?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface AuditLogChange {
  field: string;
  from?: string | number | boolean;
  to?: string | number | boolean;
}

export interface StarTierChange {
  tierId: string;
  tierLabel: string;
  oldValue?: number;
  newValue?: number;
  oldDemand?: number;
  newDemand?: number;
  oldTrend?: PriceTrend | string;
  newTrend?: PriceTrend | string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: 'PRICE_UPDATE' | 'TREND_UPDATE' | 'REPORT_ACCEPTED' | 'REPORT_DECLINED' | 'ITEM_ADDED' | 'ITEM_DELETED' | 'MANUAL_EDIT' | 'SYSTEM_RESET' | 'BATCH_AUTOMATION' | 'DATA_EXPORT' | 'CONSULTANT_PROPOSAL_APPROVED' | 'CONSULTANT_PROPOSAL_DENIED';
  itemId?: string;
  itemName: string;
  details: string;
  moderator: string;
  oldValue?: number;
  newValue?: number;
  oldDemand?: number;
  newDemand?: number;
  oldTrend?: PriceTrend;
  newTrend?: PriceTrend;
  oldName?: string;
  newName?: string;
  oldNotes?: string;
  newNotes?: string;
  thumbnail?: string;
  oldThumbnail?: string;
  category?: string;
  rarity?: ItemRarity;
  changes?: AuditLogChange[];
  starChanges?: StarTierChange[];
  skipWebhook?: boolean;
}

export type StaffRole = 'Admin' | 'Analyst' | 'Staff' | 'Moderator' | 'Consultant';

export interface ConsultantProposedChanges {
  name?: string;
  acronym?: string;
  thumbnail?: string;
  value?: number;
  demand?: number;
  trend?: PriceTrend;
  rarity?: ItemRarity;
  category?: ItemCategory;
  tradeable?: boolean;
  notes?: string;
  inGameCost?: string;
  hasManualGemRange?: boolean;
  gemOverrideMin?: number;
  gemOverrideMax?: number;
  hasCustomStarOverrides?: boolean;
  starOverrides?: Partial<Record<StarTier, number>>;
  starTierOverrides?: Partial<Record<string, StarTierOverrideData>>;
  hasCustomMultiplierOverrides?: boolean;
  multiplierOverrides?: Partial<Record<SoldierDroneStarTier, number>>;
  lastUpdated?: string;
  inRecentlyUpdated?: boolean;
  excludeFromRecentlyUpdated?: boolean;
}

export interface ConsultantFieldDiff {
  field: string;
  label: string;
  oldValue: any;
  newValue: any;
  displayOld?: string;
  displayNew?: string;
  type?: 'value' | 'demand' | 'trend' | 'text' | 'boolean' | 'star_override' | 'image' | 'category' | 'rarity' | 'other';
}

export interface ConsultantProposal {
  id: string;
  type: 'ITEM_EDIT' | 'QUICK_EDIT' | 'NEW_ITEM' | 'TRADEABILITY_TOGGLE' | 'ITEM_UPDATE';
  itemId?: string;
  itemName: string;
  itemThumbnail?: string;
  itemCategory?: ItemCategory;
  itemRarity?: ItemRarity;
  consultantId: string;
  consultantUsername: string;
  consultantDisplayName?: string;
  commentary: string; // The Google Docs comment / rationale provided by the consultant
  createdAt: string; // ISO string
  resolvedAt?: string;
  resolvedBy?: string;
  status: 'pending' | 'approved' | 'denied';
  adminFeedback?: string;
  originalSnapshot?: Partial<MilitaryItem>;
  proposedChanges: ConsultantProposedChanges;
  diffs: ConsultantFieldDiff[];
}

export interface StaffMember {
  id: string;
  username: string;
  password?: string;
  displayName?: string;
  role: StaffRole;
  addedBy?: string;
  addedAt: string;
  lastLogin?: string;
}

export interface ActiveStaffSession {
  id: string;
  username: string;
  displayName?: string;
  role: StaffRole;
  loginTime?: string;
}

export interface TeamMemberEntry {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
  discord?: string;
  robloxUsername?: string;
  bio?: string;
  badgeColor?: 'orange' | 'emerald' | 'blue' | 'purple' | 'amber' | 'rose' | 'cyan';
}

export interface SiteInfoConfig {
  title: string;
  description: string;
  announcement?: string;
  bulletPoints: string[];
  discordUrl?: string;
  robloxGroupUrl?: string;
  teamMembers: TeamMemberEntry[];
}

export type TradeSide = 'you' | 'them';

export interface TradeSideItem {
  instanceId: string;
  itemId: string;
  starTier: StarTier;
  quantity: number;
}

export interface TradeCalculatorState {
  youItems: TradeSideItem[];
  youGems: number;
  themItems: TradeSideItem[];
  themGems: number;
}

export type TradeVerdictType = 'BIG_WIN' | 'WIN' | 'FAIR' | 'LOSE' | 'BIG_LOSE' | 'EMPTY';

export interface TradeAdvice {
  isGoodIdea: boolean;
  verdictType: TradeVerdictType;
  headline: string;
  recommendation: 'DO_TRADE' | 'CONSIDER' | 'DECLINE' | 'EQUAL';
  description: string;
  points: string[];
  riskLevel: 'safe' | 'caution' | 'warning' | 'neutral';
}

export type BackupType = 'daily_auto' | 'manual' | 'pre_import';

export interface SiteBackup {
  id: string;
  name: string;
  type: BackupType;
  createdAt: string; // ISO date string
  dateKey: string; // YYYY-MM-DD
  itemCount: number;
  items: MilitaryItem[];
  siteInfo?: SiteInfoConfig;
  starConfig?: Record<StarTier, number>;
  soldierDroneStarConfig?: Record<SoldierDroneStarTier, number>;
  createdBy?: string;
  notes?: string;
}

