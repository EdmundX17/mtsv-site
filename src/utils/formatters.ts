import {
  ItemCategory,
  ItemRarity,
  PriceTrend,
  StarTier,
  VehicleStarTier,
  SoldierDroneStarTier,
  UniversalStarConfig,
  UniversalSoldierDroneStarConfig,
  MilitaryItem
} from '../types';

export const STAR_TIERS: { id: StarTier; label: string; shortLabel: string; starsCount: number }[] = [
  { id: 'fresh', label: 'Fresh (0★ In-Game)', shortLabel: 'Fresh', starsCount: 0 },
  { id: '0', label: '0★ (Default)', shortLabel: '0★', starsCount: 0 },
  { id: '1', label: '1★ (Tier 1)', shortLabel: '1★', starsCount: 1 },
  { id: '2', label: '2★ (Tier 2)', shortLabel: '2★', starsCount: 2 },
  { id: '3', label: '3★ (Tier 3)', shortLabel: '3★', starsCount: 3 },
  { id: '4', label: '4★ (Tier 4)', shortLabel: '4★', starsCount: 4 },
  { id: '5', label: '5★ (Tier 5)', shortLabel: '5★', starsCount: 5 },
];

export const SOLDIER_DRONE_STAR_TIERS: { id: SoldierDroneStarTier; label: string; shortLabel: string; starsCount: number }[] = [
  { id: '0', label: '0★ (Default)', shortLabel: '0★', starsCount: 0 },
  { id: '1', label: '1★ (Tier 1)', shortLabel: '1★', starsCount: 1 },
  { id: '2', label: '2★ (Tier 2)', shortLabel: '2★', starsCount: 2 },
  { id: '3', label: '3★ (Tier 3)', shortLabel: '3★', starsCount: 3 },
];

export const DEFAULT_VEHICLE_STAR_CONFIG: UniversalStarConfig = {
  fresh: 0,
  '0': 0,
  '1': 10000,
  '2': 25000,
  '3': 50000,
  '4': 100000,
  '5': 60000
};

export const DEFAULT_SOLDIER_DRONE_STAR_CONFIG: UniversalSoldierDroneStarConfig = {
  '0': 1,
  '1': 5,
  '2': 20,
  '3': 50
};

export const isVehicleCategory = (category?: ItemCategory | string, item?: MilitaryItem): boolean => {
  const norm = (category === 'Sea' ? 'Naval' : category || '').trim().toLowerCase();
  if (norm === 'air' || norm === 'naval' || norm === 'land' || norm === 'sea') return true;
  if (item) {
    const itemCat = (item.category === 'Sea' ? 'Naval' : item.category || '').trim().toLowerCase();
    if (itemCat === 'air' || itemCat === 'naval' || itemCat === 'land' || itemCat === 'sea') return true;
    if (item.tags && item.tags.some(t => ['air', 'naval', 'land', 'sea', 'vehicle', 'ship', 'tank', 'plane', 'jet', 'helicopter'].includes(t.toLowerCase()))) {
      return true;
    }
  }
  return false;
};

export const isSoldierOrDroneCategory = (category?: ItemCategory | string, item?: MilitaryItem): boolean => {
  const norm = (category || '').trim().toLowerCase();
  if (norm === 'soldier' || norm === 'drone') return true;
  if (item) {
    const itemCat = (item.category || '').trim().toLowerCase();
    if (itemCat === 'soldier' || itemCat === 'drone') return true;
    if (item.tags && item.tags.some(t => ['soldier', 'drone'].includes(t.toLowerCase()))) {
      return true;
    }
  }
  return false;
};

export const isTagsCategory = (category: ItemCategory | string): boolean => {
  return category === 'Tags' || category?.toLowerCase?.() === 'tags';
};

/**
 * Automatically sorts taglines, taunts, emblems, banners, emotes, or any other
 * cosmetic items that aren't armor or weapons into the "Tags" category.
 */
export function shouldSortToTagsCategory(item: {
  name?: string;
  category?: string;
  tags?: string[];
  notes?: string;
}): boolean {
  const normCat = (item.category === 'Sea' ? 'Naval' : item.category || '').trim().toLowerCase();
  // Never move vehicles, soldiers, or drones into Tags
  if (['air', 'naval', 'land', 'sea', 'soldier', 'drone'].includes(normCat)) {
    return false;
  }

  const name = (item.name || '').toLowerCase();
  const tags = (item.tags || []).map(t => t.toLowerCase());
  const notes = (item.notes || '').toLowerCase();

  // If already Tags
  if (item.category === 'Tags') return true;

  // Specific cosmetic types: Emblems, Banners, Emotes/Taunts, Taglines, Kill Tags
  const hasEmblem = name.includes('(emblem)') || tags.includes('emblem') || notes.includes('emblem');
  const hasBanner = name.includes('(banner)') || tags.includes('banner') || notes.includes('banner');
  const hasEmote = name.includes('(emote)') || tags.includes('emote') || notes.includes('emote') || name.includes('taunt') || tags.includes('taunt') || notes.includes('taunt');
  const hasTag = name.includes('tagline') || name.includes('taunt') || name.includes('(tag)') || 
    tags.includes('tag') || tags.includes('tags') || tags.includes('tagline') || tags.includes('taunt') || 
    notes.includes('kill tag') || notes.includes('killtag');

  if (hasEmblem || hasBanner || hasEmote || hasTag) return true;

  // If item is categorized as "Other", check if it is armor or weapon
  if (item.category === 'Other') {
    const isArmor = tags.includes('armor') || name.includes('armor') || name.includes('helmet') || name.includes('vest');
    const isWeaponOrTool = tags.includes('weapon') || tags.includes('tool') || 
      name.includes('rpg') || name.includes('shotgun') || name.includes('sniper') || 
      name.includes('rifle') || name.includes('minigun') || name.includes('grenade') || 
      name.includes('scythe') || name.includes('railgun') || name.includes('turret') || 
      name.includes('hammerhead') || name.includes('seacraft') || name.includes('launcher');

    // If it's not armor and not weapon/tool, sort to Tags
    if (!isArmor && !isWeaponOrTool) {
      return true;
    }
  }

  return false;
}

export function normalizeCategory(category: string): ItemCategory {
  if (category === 'Sea') return 'Naval';
  if (category?.toLowerCase?.() === 'tags') return 'Tags';
  return category as ItemCategory;
}

export function parseMilitaryValueInput(input: string | number | undefined | null): number {
  if (input === undefined || input === null) return 0;
  if (typeof input === 'number') {
    return isNaN(input) ? 0 : input;
  }
  if (typeof input !== 'string') return 0;

  const clean = input
    .trim()
    .toLowerCase()
    .replace(/,/g, '')
    .replace(/\$/g, '')
    .replace(/💎/g, '')
    .replace(/gems?/gi, '')
    .replace(/pts?/gi, '')
    .trim();

  if (!clean) return 0;

  // Trillion / T
  if (/^([\d.]+)\s*(t|tril|trillion)s?$/i.test(clean)) {
    const match = clean.match(/^([\d.]+)\s*(t|tril|trillion)s?$/i);
    if (match) {
      const num = parseFloat(match[1]);
      return isNaN(num) ? 0 : Math.round(num * 1_000_000_000_000);
    }
  }

  // Bil / Billion / B
  if (/^([\d.]+)\s*(b|bil|billion)s?$/i.test(clean)) {
    const match = clean.match(/^([\d.]+)\s*(b|bil|billion)s?$/i);
    if (match) {
      const num = parseFloat(match[1]);
      return isNaN(num) ? 0 : Math.round(num * 1_000_000_000);
    }
  }

  // Mil / Million / M
  if (/^([\d.]+)\s*(m|mil|mill|million)s?$/i.test(clean)) {
    const match = clean.match(/^([\d.]+)\s*(m|mil|mill|million)s?$/i);
    if (match) {
      const num = parseFloat(match[1]);
      return isNaN(num) ? 0 : Math.round(num * 1_000_000);
    }
  }

  // Thousand / K
  if (/^([\d.]+)\s*(k|thousand)s?$/i.test(clean)) {
    const match = clean.match(/^([\d.]+)\s*(k|thousand)s?$/i);
    if (match) {
      const num = parseFloat(match[1]);
      return isNaN(num) ? 0 : Math.round(num * 1_000);
    }
  }

  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

export function formatValueOnBlurOrExpand(input: string | number | undefined | null): string {
  if (input === '' || input === null || input === undefined) return '';
  const parsed = parseMilitaryValueInput(input);
  if (parsed === 0 && String(input).trim() !== '0' && String(input).trim() !== '') {
    return String(input);
  }
  return parsed.toLocaleString('en-US');
}

export function calculateItemStarValue(
  item: MilitaryItem,
  tier: string = '0',
  universalConfig: UniversalStarConfig = DEFAULT_VEHICLE_STAR_CONFIG,
  soldierDroneUniversalConfig: UniversalSoldierDroneStarConfig = DEFAULT_SOLDIER_DRONE_STAR_CONFIG
): { totalValue: number; bonus: number; multiplier?: number; isOverride: boolean; isMultiplier?: boolean } {
  const baseValue = Number(item.value) || 0;
  const isVehicle = isVehicleCategory(item.category);
  const isSoldierDrone = isSoldierOrDroneCategory(item.category);

  // If vehicle has custom star overrides disabled, do not read starTierOverrides
  const canUseTierOverrides = isVehicle 
    ? Boolean(item.hasCustomStarOverrides)
    : (isSoldierDrone ? Boolean(item.hasCustomMultiplierOverrides) : true);

  // Check direct rich star tier override first if present and enabled
  if (canUseTierOverrides && item.starTierOverrides && item.starTierOverrides[tier] && item.starTierOverrides[tier]?.value !== undefined) {
    const overrideVal = Number(item.starTierOverrides[tier]?.value);
    if (!isNaN(overrideVal)) {
      return {
        totalValue: overrideVal,
        bonus: overrideVal - baseValue,
        isOverride: true
      };
    }
  }

  // Soldier and Drone multiplier calculations (0★, 1★, 2★, 3★ only)
  if (isSoldierOrDroneCategory(item.category)) {
    const validTier = (tier === '0' || tier === '1' || tier === '2' || tier === '3') ? (tier as SoldierDroneStarTier) : '0';
    
    // 1. Check rich starTierOverrides first
    if (item.starTierOverrides && item.starTierOverrides[validTier]?.value !== undefined) {
      const overrideVal = Number(item.starTierOverrides[validTier]!.value);
      if (!isNaN(overrideVal)) {
        return {
          totalValue: overrideVal,
          bonus: overrideVal - baseValue,
          isOverride: true,
          isMultiplier: false
        };
      }
    }

    if (item.hasCustomMultiplierOverrides && item.multiplierOverrides && item.multiplierOverrides[validTier] !== undefined) {
      const mult = Number(item.multiplierOverrides[validTier]);
      if (!isNaN(mult) && mult >= 0) {
        const totalValue = Math.round(baseValue * mult);
        return {
          totalValue,
          bonus: totalValue - baseValue,
          multiplier: mult,
          isOverride: true,
          isMultiplier: true
        };
      }
    }

    const mergedSoldierConfig = {
      ...DEFAULT_SOLDIER_DRONE_STAR_CONFIG,
      ...(soldierDroneUniversalConfig || {})
    };

    const mult = mergedSoldierConfig[validTier] !== undefined && !isNaN(Number(mergedSoldierConfig[validTier]))
      ? Number(mergedSoldierConfig[validTier])
      : (validTier === '0' ? 1 : validTier === '1' ? 5 : validTier === '2' ? 20 : 50);

    const totalValue = Math.round(baseValue * mult);
    return {
      totalValue,
      bonus: totalValue - baseValue,
      multiplier: mult,
      isOverride: false,
      isMultiplier: true
    };
  }

  if (!isVehicleCategory(item.category)) {
    return { totalValue: baseValue, bonus: 0, isOverride: false };
  }

  const isLimited = item.rarity === 'Limited Edition' || 
    (item.name || '').toLowerCase().startsWith('le ') || 
    (item.name || '').toLowerCase().includes('limited');

  const vehicleTier = (tier in DEFAULT_VEHICLE_STAR_CONFIG ? tier : '0') as StarTier;

  // 1. Check custom overrides only if enabled for vehicles
  if (item.hasCustomStarOverrides) {
    if (item.starTierOverrides && item.starTierOverrides[vehicleTier]?.value !== undefined) {
      const overrideVal = Number(item.starTierOverrides[vehicleTier]!.value);
      if (!isNaN(overrideVal)) {
        return {
          totalValue: overrideVal,
          bonus: overrideVal - baseValue,
          isOverride: true
        };
      }
    }

    if (item.starOverrides && item.starOverrides[vehicleTier] !== undefined) {
      const overrideVal = Number(item.starOverrides[vehicleTier]);
      if (!isNaN(overrideVal)) {
        return {
          totalValue: overrideVal,
          bonus: overrideVal - baseValue,
          isOverride: true
        };
      }
    }
  }

  const mergedConfig = {
    ...DEFAULT_VEHICLE_STAR_CONFIG,
    ...(universalConfig || {})
  };

  const bonus5 = mergedConfig['5'] !== undefined && !isNaN(Number(mergedConfig['5']))
    ? Number(mergedConfig['5'])
    : (DEFAULT_VEHICLE_STAR_CONFIG['5'] || 0);

  const tierBonus = mergedConfig[vehicleTier] !== undefined && !isNaN(Number(mergedConfig[vehicleTier]))
    ? Number(mergedConfig[vehicleTier])
    : (DEFAULT_VEHICLE_STAR_CONFIG[vehicleTier] || 0);

  // For Limited Editions without custom star overrides:
  // The catalog base value (item.value) represents the 5* tier value.
  // Lower tiers are derived by subtracting the difference from the 5* bonus:
  // Value(Tier) = 5* Base - (5* Bonus - Tier Bonus)
  // e.g. If base value of an LE is 500k, the 0* value will be 500k - (5* bonus - 0* bonus) = 500k - 5* bonus.
  if (isLimited && !item.hasCustomStarOverrides) {
    const derivedValue = Math.max(0, baseValue - (bonus5 - tierBonus));
    return {
      totalValue: derivedValue,
      bonus: tierBonus,
      isOverride: false
    };
  }

  return {
    totalValue: baseValue + tierBonus,
    bonus: tierBonus,
    isOverride: false
  };
}

/**
 * Round a value to the nearest 10 (instead of nearest 1000)
 */
export function roundToNearestTen(value: number): number {
  return Math.round(value / 10) * 10;
}

/**
 * Determines the rounding step for Gem Range calculations based on the item/tier value:
 * - for items under 1,000 (< 1000): round to nearest 100
 * - for items under 100k (< 100,000): round to nearest 10k (10,000)
 * - for items under 1mil (< 1,000,000): round to nearest 50k (50,000)
 * - for items above 1 mil (>= 1,000,000 and <= 10,000,000): round to nearest 100k (100,000)
 * - items above 10mil (> 10,000,000): round to nearest 500k (500,000)
 * (Gem range only)
 */
export function getGemRangeRoundingStep(itemOrTierValue: number): number {
  const val = Math.abs(itemOrTierValue);
  if (val < 1000) {
    return 100;
  }
  if (val < 100000) {
    return 10000;
  }
  if (val < 1000000) {
    return 50000;
  }
  if (val <= 10000000) {
    return 100000;
  }
  return 500000;
}

/**
 * Rounds a gem range bound according to the tiered rounding rules:
 * - for items under 1000: round to nearest 100
 * - for items under 100k: round to nearest 10k
 * - for items under 1mil: round to nearest 50k
 * - for items above 1 mil: round to nearest 100k
 * - items above 10mil: round to nearest 500k
 * (Gem range only)
 */
export function roundGemRangeValue(value: number, baseItemValue?: number): number {
  if (value <= 0) return 0;

  const referenceVal = baseItemValue !== undefined ? baseItemValue : value;
  const step = getGemRangeRoundingStep(referenceVal);

  const rounded = Math.round(value / step) * step;

  // Safeguard: positive items should not round down to 0 gems
  if (rounded === 0 && value > 0) {
    if (value < 1000) {
      return Math.max(100, Math.round(value / 100) * 100);
    }
    return Math.max(1000, Math.round(value / 1000) * 1000);
  }

  return rounded;
}

/**
 * Calculate Gem Range: automatically 5% on either side of the item/tier value with tiered rounding:
 * - under 1,000: nearest 100
 * - under 100k: nearest 10k
 * - under 1mil: nearest 50k
 * - above 1 mil: nearest 100k
 * - above 10mil: nearest 500k
 * Or manual override if configured by staff for this specific star tier.
 * Manual gem range overrides only affect the specific star tier where they are set.
 */
export function calculateGemRange(
  item: MilitaryItem, 
  currentTierValue?: number,
  tierOverride?: { hasManualGemRange?: boolean; gemOverrideMin?: number; gemOverrideMax?: number },
  tier: string = '0',
  universalConfig?: UniversalStarConfig,
  soldierDroneUniversalConfig?: UniversalSoldierDroneStarConfig
): {
  min: number;
  max: number;
  isManual: boolean;
  formatted: string;
} {
  // 1. Check specific tier manual gem range override from tierOverride param or item.starTierOverrides
  const specificTierOverride = tierOverride?.hasManualGemRange 
    ? tierOverride 
    : (item.starTierOverrides?.[tier]?.hasManualGemRange ? item.starTierOverrides[tier] : undefined);

  if (specificTierOverride?.hasManualGemRange && specificTierOverride.gemOverrideMin !== undefined && specificTierOverride.gemOverrideMax !== undefined) {
    const sMin = specificTierOverride.gemOverrideMin;
    const sMax = specificTierOverride.gemOverrideMax;
    return {
      min: sMin,
      max: sMax,
      isManual: true,
      formatted: sMin === sMax ? sMin.toLocaleString() : `${sMin.toLocaleString()} – ${sMax.toLocaleString()}`
    };
  }

  const isVehicle = isVehicleCategory(item.category, item);
  const isSoldierDrone = isSoldierOrDroneCategory(item.category, item);
  const hasStars = isVehicle || isSoldierDrone;

  // 2. Base item manual gem range override: ONLY applies if the item has NO stars, or specifically for tier '0'
  // (Manual override for 0* does NOT affect 1*, 2*, 3*, 4*, 5*, fresh)
  if (item.hasManualGemRange && item.gemOverrideMin !== undefined && item.gemOverrideMax !== undefined) {
    if (!hasStars || tier === '0') {
      const bMin = item.gemOverrideMin;
      const bMax = item.gemOverrideMax;
      return {
        min: bMin,
        max: bMax,
        isManual: true,
        formatted: bMin === bMax ? bMin.toLocaleString() : `${bMin.toLocaleString()} – ${bMax.toLocaleString()}`
      };
    }
  }

  // 3. Auto Range: 5% on either side of the specific tier's value (0.95x and 1.05x, rounded according to tiered gem range rules)
  const baseVal = currentTierValue !== undefined ? currentTierValue : item.value;
  const rawMin = Math.max(0, baseVal * 0.95);
  const rawMax = baseVal * 1.05;

  const min = roundGemRangeValue(rawMin, baseVal);
  const max = roundGemRangeValue(rawMax, baseVal);
  const safeMax = Math.max(min, max);

  return {
    min,
    max: safeMax,
    isManual: false,
    formatted: min === safeMax ? min.toLocaleString() : `${min.toLocaleString()} – ${safeMax.toLocaleString()}`
  };
}

export interface ItemTierResolvedData {
  tierId: string;
  label: string;
  tierLabel: string;
  shortLabel: string;
  starsCount: number;
  value: number;
  bonus: number;
  multiplier?: number;
  isOverride: boolean;
  demand: number;
  trend: PriceTrend;
  gemRange: {
    min: number;
    max: number;
    isManual: boolean;
    formatted: string;
  };
  notes: string;
}

export function getItemStarTierData(
  item: MilitaryItem,
  tier: string = '0',
  universalConfig: UniversalStarConfig = DEFAULT_VEHICLE_STAR_CONFIG,
  soldierDroneUniversalConfig: UniversalSoldierDroneStarConfig = DEFAULT_SOLDIER_DRONE_STAR_CONFIG
): ItemTierResolvedData {
  const isVehicle = isVehicleCategory(item.category);
  const isSoldierDrone = isSoldierOrDroneCategory(item.category);
  
  let tierLabel = 'Standard';
  let shortLabel = '0★';
  let starsCount = 0;

  if (isVehicle) {
    const tierObj = STAR_TIERS.find(t => t.id === tier) || STAR_TIERS[0];
    tierLabel = tierObj.label;
    shortLabel = tierObj.shortLabel;
    starsCount = tierObj.starsCount;
  } else if (isSoldierDrone) {
    const tierObj = SOLDIER_DRONE_STAR_TIERS.find(t => t.id === tier) || SOLDIER_DRONE_STAR_TIERS[0];
    tierLabel = tierObj.label;
    shortLabel = tierObj.shortLabel;
    starsCount = tierObj.starsCount;
  }

  const canUseTierOverrides = isVehicle 
    ? Boolean(item.hasCustomStarOverrides)
    : (isSoldierDrone ? Boolean(item.hasCustomMultiplierOverrides) : true);

  const starCalc = calculateItemStarValue(item, tier, universalConfig, soldierDroneUniversalConfig);
  const directTierOverride = item.starTierOverrides?.[tier];
  const tierOverride = canUseTierOverrides 
    ? directTierOverride 
    : (directTierOverride?.hasManualGemRange ? directTierOverride : undefined);

  const resolvedValue = tierOverride?.value !== undefined ? tierOverride.value : starCalc.totalValue;
  const resolvedDemand = tierOverride?.demand !== undefined ? tierOverride.demand : item.demand;
  const resolvedTrend = tierOverride?.trend !== undefined ? tierOverride.trend : item.trend;
  const resolvedNotes = tierOverride?.notes !== undefined && tierOverride.notes.trim() !== '' ? tierOverride.notes : item.notes;
  const resolvedGemRange = calculateGemRange(item, resolvedValue, tierOverride, tier, universalConfig, soldierDroneUniversalConfig);

  return {
    tierId: tier,
    label: tierLabel,
    tierLabel,
    shortLabel,
    starsCount,
    value: resolvedValue,
    bonus: starCalc.bonus,
    multiplier: starCalc.multiplier,
    isOverride: starCalc.isOverride || Boolean(tierOverride && (tierOverride.value !== undefined || tierOverride.demand !== undefined || tierOverride.trend !== undefined || tierOverride.hasManualGemRange)),
    demand: resolvedDemand,
    trend: resolvedTrend,
    gemRange: resolvedGemRange,
    notes: resolvedNotes
  };
}

export function getAllItemStarTiersData(
  item: MilitaryItem,
  universalConfig: UniversalStarConfig = DEFAULT_VEHICLE_STAR_CONFIG,
  soldierDroneUniversalConfig: UniversalSoldierDroneStarConfig = DEFAULT_SOLDIER_DRONE_STAR_CONFIG
): ItemTierResolvedData[] {
  if (isVehicleCategory(item.category)) {
    return STAR_TIERS.map(t => getItemStarTierData(item, t.id, universalConfig, soldierDroneUniversalConfig));
  }
  if (isSoldierOrDroneCategory(item.category)) {
    return SOLDIER_DRONE_STAR_TIERS.map(t => getItemStarTierData(item, t.id, universalConfig, soldierDroneUniversalConfig));
  }
  return [getItemStarTierData(item, '0', universalConfig, soldierDroneUniversalConfig)];
}

export function getItemLowestStarTierData(
  item: MilitaryItem,
  universalConfig: UniversalStarConfig = DEFAULT_VEHICLE_STAR_CONFIG,
  soldierDroneUniversalConfig: UniversalSoldierDroneStarConfig = DEFAULT_SOLDIER_DRONE_STAR_CONFIG
): ItemTierResolvedData {
  const allTiers = getAllItemStarTiersData(item, universalConfig, soldierDroneUniversalConfig);
  if (!allTiers || allTiers.length === 0) {
    return getItemStarTierData(item, '0', universalConfig, soldierDroneUniversalConfig);
  }

  const isLimited = item.rarity === 'Limited Edition' || 
    (item.name || '').toLowerCase().startsWith('le ') || 
    (item.name || '').toLowerCase().includes('limited');

  // For Limited Editions only, if 1*-5* value is the same, show 5* default
  if (isLimited && isVehicleCategory(item.category)) {
    const tier1to5 = allTiers.filter(t => ['1', '2', '3', '4', '5'].includes(t.tierId));
    if (tier1to5.length > 0) {
      const firstVal = tier1to5[0].value;
      const allSame = tier1to5.every(t => t.value === firstVal);
      if (allSame) {
        const tier5 = allTiers.find(t => t.tierId === '5');
        if (tier5) return tier5;
      }
    }
  }

  let lowest = allTiers[0];
  for (let i = 1; i < allTiers.length; i++) {
    if (allTiers[i].value < lowest.value) {
      lowest = allTiers[i];
    }
  }
  return lowest;
}

export function itemHasManualOverrides(item: MilitaryItem): boolean {
  if (isSoldierOrDroneCategory(item.category)) {
    // Soldiers and drones ONLY have manual overrides if explicit multiplier overrides or manual gem ranges exist
    if (item.hasCustomMultiplierOverrides) return true;
    if (item.hasManualGemRange) return true;
    if (item.starTierOverrides && Object.keys(item.starTierOverrides).length > 0) {
      return Object.values(item.starTierOverrides).some(o => 
        o && (o.value !== undefined || o.hasManualGemRange)
      );
    }
    return false;
  }
  if (isVehicleCategory(item.category)) {
    if (!item.hasCustomStarOverrides) return Boolean(item.hasManualGemRange);
    return true;
  }
  if (item.hasCustomStarOverrides || item.hasManualGemRange) return true;
  if (item.starTierOverrides && Object.keys(item.starTierOverrides).length > 0) {
    return Object.values(item.starTierOverrides).some(o => 
      o && (o.value !== undefined || o.demand !== undefined || o.trend !== undefined || o.hasManualGemRange || (o.notes && o.notes.trim().length > 0))
    );
  }
  return false;
}

export function formatSigFigsNumber(value?: number | null | string, sigFigs: number = 3): string {
  if (value === undefined || value === null) return '0';
  const num = typeof value === 'number' ? value : Number(value);
  if (isNaN(num) || num <= 0) return '0';
  if (num >= 999_500_000) {
    const b = num / 1_000_000_000;
    const str = parseFloat(b.toPrecision(sigFigs));
    return `${str}B`;
  }
  if (num >= 999_500) {
    const m = num / 1_000_000;
    const str = parseFloat(m.toPrecision(sigFigs));
    return `${str}M`;
  }
  if (num >= 1_000) {
    const k = num / 1_000;
    const str = parseFloat(k.toPrecision(sigFigs));
    return `${str}K`;
  }
  return Math.round(num).toLocaleString();
}

export function formatMilitaryValue(value?: number | null | string): string {
  if (value === undefined || value === null) return '💎 0';
  const num = typeof value === 'number' ? value : Number(value);
  if (isNaN(num) || num <= 0) return '💎 0';
  return `💎 ${formatSigFigsNumber(num, 3)}`;
}

export function formatPlainMilitaryValue(value?: number | null | string, suffix: string = ' Gems'): string {
  if (value === undefined || value === null) return `0${suffix}`;
  const num = typeof value === 'number' ? value : Number(value);
  if (isNaN(num) || num <= 0) return `0${suffix}`;
  return `${formatSigFigsNumber(num, 3)}${suffix}`;
}

export function formatRawNumber(value: number): string {
  return Math.round(value).toLocaleString();
}

export function getRarityConfig(rarity: ItemRarity) {
  switch (rarity) {
    case 'Limited Edition':
      return {
        label: 'Limited Edition',
        bg: 'bg-red-500/15 dark:bg-red-950/40',
        border: 'border-red-500/60 dark:border-red-500/70',
        text: 'rarity-limited-edition-text',
        glow: 'shadow-[0_0_20px_rgba(255,51,68,0.4)]',
        badgeBg: 'bg-black/90 text-white border border-red-500 shadow-md shadow-red-950/60',
        pillClass: 'bg-black/90 dark:bg-black/95 border-red-500 shadow-md shadow-red-950/70',
        textClass: 'rarity-limited-edition-text font-black tracking-wider uppercase'
      };
    case 'Exotic':
      return {
        label: 'Exotic',
        bg: 'bg-purple-500/15 dark:bg-purple-950/40',
        border: 'border-purple-400/60 dark:border-purple-400/70',
        text: 'rarity-exotic-text',
        glow: 'shadow-[0_0_20px_rgba(236,72,153,0.4)]',
        badgeBg: 'bg-black/90 text-white border border-pink-500 shadow-md shadow-purple-950/60',
        pillClass: 'bg-black/90 dark:bg-black/95 border-pink-500 shadow-md shadow-purple-950/70',
        textClass: 'rarity-exotic-text font-black tracking-wider uppercase'
      };
    case 'Legendary':
      return {
        label: 'Legendary',
        bg: 'bg-amber-500/15 dark:bg-amber-950/40',
        border: 'border-amber-400/60 dark:border-amber-500/70',
        text: 'rarity-legendary-text',
        glow: 'shadow-[0_0_18px_rgba(245,158,11,0.35)]',
        badgeBg: 'bg-black/90 text-white border border-amber-400 shadow-md shadow-amber-950/60',
        pillClass: 'bg-black/90 dark:bg-black/95 border-amber-400 shadow-md shadow-amber-950/70',
        textClass: 'rarity-legendary-text font-black tracking-wider uppercase'
      };
    case 'Epic':
      return {
        label: 'Epic',
        bg: 'bg-purple-500/10 dark:bg-purple-950/30',
        border: 'border-purple-400/40 dark:border-purple-500/50',
        text: 'text-purple-300 font-bold',
        glow: '',
        badgeBg: 'bg-black/90 text-purple-200 border border-purple-400 shadow-sm',
        pillClass: 'bg-black/90 dark:bg-black/95 border-purple-400 text-purple-200 shadow-sm',
        textClass: 'text-purple-300 font-black tracking-wider uppercase'
      };
    case 'Rare':
      return {
        label: 'Rare',
        bg: 'bg-sky-500/10 dark:bg-sky-950/30',
        border: 'border-sky-400/40 dark:border-sky-500/50',
        text: 'text-sky-300 font-bold',
        glow: '',
        badgeBg: 'bg-black/90 text-sky-200 border border-sky-400 shadow-sm',
        pillClass: 'bg-black/90 dark:bg-black/95 border-sky-400 text-sky-200 shadow-sm',
        textClass: 'text-sky-300 font-black tracking-wider uppercase'
      };
    case 'Uncommon':
      return {
        label: 'Uncommon',
        bg: 'bg-emerald-500/10 dark:bg-emerald-950/30',
        border: 'border-emerald-400/40 dark:border-emerald-500/50',
        text: 'text-emerald-300 font-bold',
        glow: '',
        badgeBg: 'bg-black/90 text-emerald-200 border border-emerald-400 shadow-sm',
        pillClass: 'bg-black/90 dark:bg-black/95 border-emerald-400 text-emerald-200 shadow-sm',
        textClass: 'text-emerald-300 font-black tracking-wider uppercase'
      };
    case 'Event':
      return {
        label: 'Event',
        bg: 'bg-indigo-500/10 dark:bg-indigo-950/30',
        border: 'border-indigo-400/40 dark:border-indigo-500/50',
        text: 'text-indigo-300 font-bold',
        glow: '',
        badgeBg: 'bg-black/90 text-indigo-200 border border-indigo-400 shadow-sm',
        pillClass: 'bg-black/90 dark:bg-black/95 border-indigo-400 text-indigo-200 shadow-sm',
        textClass: 'text-indigo-300 font-black tracking-wider uppercase'
      };
    case 'Common':
    default:
      return {
        label: 'Common',
        bg: 'bg-neutral-800/40',
        border: 'border-neutral-700',
        text: 'text-neutral-200 font-bold',
        glow: '',
        badgeBg: 'bg-black/90 text-neutral-200 border border-neutral-600 shadow-sm',
        pillClass: 'bg-black/90 dark:bg-black/95 border-neutral-600 text-neutral-200 shadow-sm',
        textClass: 'text-neutral-200 font-black tracking-wider uppercase'
      };
  }
}

export function normalizeTrend(trend?: string | null): PriceTrend {
  if (!trend) return 'Stable';
  const t = String(trend).toLowerCase().trim();
  if (t.includes('glazed') || t.includes('hyped')) return 'Glazed';
  if (t.includes('rising')) return 'Rising';
  if (t.includes('dropping')) return 'Dropping';
  if (t.includes('unstable') || t.includes('fluctuating') || t.includes('volatile') || t.includes('overpriced')) return 'Unstable';
  return 'Stable';
}

export interface TrendTagConfig {
  label: string;
  icon: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  badgeClass: string;
  dotColor: string;
  description: string;
}

export function getSingleTrendConfig(rawTrend: string): TrendTagConfig {
  const t = rawTrend.toLowerCase().trim();
  if (t === 'glazed' || t === 'hyped') {
    return {
      label: 'Glazed',
      icon: 'Sparkles',
      textColor: 'text-blue-400 font-bold',
      bgColor: 'bg-blue-500/15',
      borderColor: 'border-blue-500/50',
      badgeClass: 'bg-blue-500/20 text-blue-400 border border-blue-500/50 shadow-sm shadow-blue-500/20',
      dotColor: 'bg-blue-400',
      description: 'Ultra-hyped premium status and massive player interest'
    };
  }
  if (t === 'rising') {
    return {
      label: 'Rising',
      icon: 'TrendingUp',
      textColor: 'text-green-400 font-bold',
      bgColor: 'bg-green-500/15',
      borderColor: 'border-green-500/50',
      badgeClass: 'bg-green-500/20 text-green-400 border border-green-500/50 shadow-sm shadow-green-500/20',
      dotColor: 'bg-green-400',
      description: 'Valuation is climbing due to strong market demand'
    };
  }
  if (t === 'dropping') {
    return {
      label: 'Dropping',
      icon: 'TrendingDown',
      textColor: 'text-red-500 font-bold',
      bgColor: 'bg-red-500/15',
      borderColor: 'border-red-500/50',
      badgeClass: 'bg-red-500/20 text-red-500 border border-red-500/50 shadow-sm shadow-red-500/20',
      dotColor: 'bg-red-500',
      description: 'Supply outpaces demand; values trending lower'
    };
  }
  if (t === 'unstable' || t === 'fluctuating' || t === 'volatile' || t === 'overpriced') {
    return {
      label: 'Unstable',
      icon: 'Activity',
      textColor: 'text-red-800 dark:text-red-600 font-black',
      bgColor: 'bg-red-950/40',
      borderColor: 'border-red-800/60',
      badgeClass: 'bg-red-950/60 text-red-700 dark:text-red-600 border border-red-800/80 shadow-sm shadow-red-950/40',
      dotColor: 'bg-red-800',
      description: 'Volatile valuation varying significantly per transaction'
    };
  }
  return {
    label: 'Stable',
    icon: 'Minus',
    textColor: 'text-white dark:text-white font-bold',
    bgColor: 'bg-neutral-800/80',
    borderColor: 'border-neutral-600',
    badgeClass: 'bg-neutral-800 text-white border border-neutral-600 shadow-sm',
    dotColor: 'bg-white',
    description: 'Trading consistently around its verified benchmark value'
  };
}

/**
 * Returns an array of trend configurations to support multiple tags like "Glazed & Rising", "Glazed & Unstable"
 */
export function getTrendList(rawTrend?: PriceTrend | string | string[]): TrendTagConfig[] {
  if (!rawTrend) return [getSingleTrendConfig('Stable')];

  if (Array.isArray(rawTrend)) {
    const list = rawTrend.map(t => getSingleTrendConfig(t));
    return list.length > 0 ? list : [getSingleTrendConfig('Stable')];
  }

  const str = String(rawTrend).trim();
  // Split on delimiters like &, +, /, and, comma
  const parts = str.split(/(?:&|\+|\/|,|\band\b)/i).map(s => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    return parts.map(p => getSingleTrendConfig(p));
  }

  return [getSingleTrendConfig(str)];
}

export function getTrendConfig(rawTrend: PriceTrend | string) {
  const list = getTrendList(rawTrend);
  return list[0];
}

/**
 * Demand Scheme:
 * 1-2: Red
 * 3-4: Orange
 * 5-6: Yellow
 * 7-8: Green
 * 9-10: Teal (10 being Teal)
 */
export function getDemandDescription(score: number): { 
  label: string; 
  scoreLabel: string;
  color: string; 
  barColor: string;
  glowColor: string;
  badgeBg: string;
} {
  const num = Math.max(1, Math.min(10, Math.round(score || 1)));

  if (num >= 9) {
    return {
      label: num === 10 ? 'Max Demand' : 'Very High',
      scoreLabel: `${num}/10`,
      color: 'text-teal-400 font-black',
      barColor: 'bg-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.6)]',
      glowColor: 'shadow-teal-400/50',
      badgeBg: 'bg-teal-500/20 text-teal-400 border-teal-500/40'
    };
  }
  if (num >= 7) {
    return {
      label: 'High Demand',
      scoreLabel: `${num}/10`,
      color: 'text-green-400 font-black',
      barColor: 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.5)]',
      glowColor: 'shadow-green-500/40',
      badgeBg: 'bg-green-500/20 text-green-400 border-green-500/40'
    };
  }
  if (num >= 5) {
    return {
      label: 'Moderate',
      scoreLabel: `${num}/10`,
      color: 'text-yellow-400 font-black',
      barColor: 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]',
      glowColor: 'shadow-yellow-400/40',
      badgeBg: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
    };
  }
  if (num >= 3) {
    return {
      label: 'Low Demand',
      scoreLabel: `${num}/10`,
      color: 'text-orange-500 font-black',
      barColor: 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]',
      glowColor: 'shadow-orange-500/40',
      badgeBg: 'bg-orange-500/20 text-orange-400 border-orange-500/40'
    };
  }
  return {
    label: 'Very Low',
    scoreLabel: `${num}/10`,
    color: 'text-red-500 font-black',
    barColor: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]',
    glowColor: 'shadow-red-500/40',
    badgeBg: 'bg-red-500/20 text-red-400 border-red-500/40'
  };
}

export function getCategoryIconName(category: ItemCategory): string {
  switch (category) {
    case 'Air': return 'Plane';
    case 'Land': return 'Shield';
    case 'Naval':
    case 'Sea': return 'Anchor';
    case 'Soldier': return 'Crosshair';
    case 'Drone': return 'Radio';
    case 'Tags': return 'Tag';
    case 'Other':
    default: return 'Zap';
  }
}

/**
 * Generates a clean, SEO-friendly URL slug for an item based on its name.
 * E.g., "Gold Typhoon" -> "goldtyphoon"
 * Falls back to item.id if name is not available.
 */
export function getItemSlug(item?: { name?: string; id?: string } | null): string {
  if (!item) return '';
  if (item.name) {
    const slug = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (slug) return slug;
  }
  return item.id || '';
}
