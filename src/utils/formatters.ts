import {
  MilitaryItem,
  ItemCategory,
  ItemRarity,
  PriceTrend,
  CanonicalPriceTrend,
  StarTier,
  SoldierDroneStarTier,
  UniversalStarConfig,
  UniversalSoldierDroneStarConfig
} from '../types';

export const STAR_TIERS: Array<{ id: StarTier; label: string; shortLabel: string; multiplier?: number }> = [
  { id: 'fresh', label: 'Fresh (0★)', shortLabel: 'Fresh', multiplier: 1 },
  { id: '0', label: '0★ Base', shortLabel: '0★', multiplier: 1 },
  { id: '1', label: '1★ Star', shortLabel: '1★', multiplier: 1.15 },
  { id: '2', label: '2★ Star', shortLabel: '2★', multiplier: 1.35 },
  { id: '3', label: '3★ Star', shortLabel: '3★', multiplier: 1.65 },
  { id: '4', label: '4★ Star', shortLabel: '4★', multiplier: 2.05 },
  { id: '5', label: '5★ Star', shortLabel: '5★', multiplier: 2.6 },
];

export const SOLDIER_DRONE_STAR_TIERS: Array<{ id: SoldierDroneStarTier; label: string; shortLabel: string; multiplier: number }> = [
  { id: '0', label: '0★ Standard', shortLabel: '0★', multiplier: 1 },
  { id: '1', label: '1★ Veteran', shortLabel: '1★', multiplier: 5 },
  { id: '2', label: '2★ Elite', shortLabel: '2★', multiplier: 20 },
  { id: '3', label: '3★ Master', shortLabel: '3★', multiplier: 50 },
];

export const DEFAULT_SOLDIER_DRONE_STAR_CONFIG: UniversalSoldierDroneStarConfig = {
  '0': 1,
  '1': 5,
  '2': 20,
  '3': 50
};

export const DEFAULT_VEHICLE_STAR_CONFIG: UniversalStarConfig = {
  fresh: 1,
  '0': 1,
  '1': 1.15,
  '2': 1.35,
  '3': 1.65,
  '4': 2.05,
  '5': 2.6
};

export function isVehicleCategory(cat?: string, item?: any): boolean {
  if (!cat) return false;
  return ['Air', 'Land', 'Naval', 'Sea'].includes(cat);
}

export function isSoldierOrDroneCategory(cat?: string, item?: any): boolean {
  if (!cat) return false;
  return ['Soldier', 'Drone'].includes(cat);
}

export function shouldSortToTagsCategory(itemOrObj?: { name?: string; category?: string } | string): boolean {
  if (!itemOrObj) return false;
  const name = (typeof itemOrObj === 'string' ? itemOrObj : itemOrObj.name || '').toLowerCase();
  const cat = typeof itemOrObj === 'string' ? '' : itemOrObj.category || '';
  if (cat === 'Tags') return false;
  return (
    name.includes('tagline') ||
    name.includes('taunt') ||
    name.includes('emblem') ||
    name.includes('banner') ||
    name.includes('title')
  );
}

export function getItemSlug(itemOrName: MilitaryItem | string): string {
  if (!itemOrName) return '';
  const name = typeof itemOrName === 'string' ? itemOrName : itemOrName.name || '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function formatPlainMilitaryValue(value: number | string): string {
  if (value === undefined || value === null || value === '') return '0';
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return '0';
  return num.toLocaleString();
}

export function formatMilitaryValue(value: number | string): string {
  if (value === undefined || value === null || value === '') return '0';
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return '0';
  const abs = Math.abs(num);

  if (abs >= 1_000_000_000) {
    const formatted = (num / 1_000_000_000).toFixed(2).replace(/\.00$/, '');
    return `${formatted}B`;
  }
  if (abs >= 1_000_000) {
    const formatted = (num / 1_000_000).toFixed(2).replace(/\.00$/, '');
    return `${formatted}M`;
  }
  if (abs >= 1_000) {
    const formatted = (num / 1_000).toFixed(1).replace(/\.0$/, '');
    return `${formatted}K`;
  }
  return num.toLocaleString();
}

export function formatSigFigsNumber(num: number, sigFigs = 3): string {
  if (num === 0) return '0';
  if (isNaN(num)) return '0';
  return Number(num.toPrecision(sigFigs)).toLocaleString();
}

export function parseMilitaryValueInput(input: string | number): number {
  if (typeof input === 'number') return input;
  if (!input) return 0;
  const clean = input.trim().toUpperCase().replace(/,/g, '').replace(/[$💎]/g, '');
  if (clean.endsWith('B')) {
    return Math.round(parseFloat(clean.slice(0, -1)) * 1_000_000_000) || 0;
  }
  if (clean.endsWith('M')) {
    return Math.round(parseFloat(clean.slice(0, -1)) * 1_000_000) || 0;
  }
  if (clean.endsWith('K')) {
    return Math.round(parseFloat(clean.slice(0, -1)) * 1_000) || 0;
  }
  return Math.round(parseFloat(clean)) || 0;
}

export function itemHasManualOverrides(item: MilitaryItem): boolean {
  return Boolean(
    item.hasCustomStarOverrides ||
    item.hasCustomMultiplierOverrides ||
    (item.starTierOverrides && Object.keys(item.starTierOverrides).length > 0)
  );
}

export function calculateItemStarValue(
  item: MilitaryItem,
  tierId: string = '0',
  universalStarConfig: UniversalStarConfig = DEFAULT_VEHICLE_STAR_CONFIG,
  universalSoldierDroneStarConfig: UniversalSoldierDroneStarConfig = DEFAULT_SOLDIER_DRONE_STAR_CONFIG
): { totalValue: number; bonus: number; multiplier?: number; isOverride: boolean; isMultiplier?: boolean } {
  const baseValue = item.value || 0;
  const override = item.starTierOverrides?.[tierId];

  if (override && override.value !== undefined) {
    const customVal = Number(override.value);
    return {
      totalValue: customVal,
      bonus: customVal - baseValue,
      isOverride: true,
      isMultiplier: false
    };
  }

  // Check flat starOverrides for vehicles
  if (item.hasCustomStarOverrides && item.starOverrides && item.starOverrides[tierId as StarTier] !== undefined) {
    const customVal = Number(item.starOverrides[tierId as StarTier]);
    return {
      totalValue: customVal,
      bonus: customVal - baseValue,
      isOverride: true,
      isMultiplier: false
    };
  }

  // Check multiplier overrides for soldiers/drones
  if (item.hasCustomMultiplierOverrides && item.multiplierOverrides && item.multiplierOverrides[tierId as SoldierDroneStarTier] !== undefined) {
    const mult = Number(item.multiplierOverrides[tierId as SoldierDroneStarTier]);
    const totalVal = Math.round(baseValue * mult);
    return {
      totalValue: totalVal,
      bonus: totalVal - baseValue,
      multiplier: mult,
      isOverride: true,
      isMultiplier: true
    };
  }

  if (isSoldierOrDroneCategory(item.category)) {
    const mult = universalSoldierDroneStarConfig[tierId as keyof UniversalSoldierDroneStarConfig] ?? 1;
    const totalVal = Math.round(baseValue * mult);
    return {
      totalValue: totalVal,
      bonus: totalVal - baseValue,
      multiplier: mult,
      isOverride: false,
      isMultiplier: true
    };
  }

  if (isVehicleCategory(item.category)) {
    const mult = universalStarConfig[tierId as keyof UniversalStarConfig] ?? 1;
    const totalVal = Math.round(baseValue * mult);
    return {
      totalValue: totalVal,
      bonus: totalVal - baseValue,
      multiplier: mult,
      isOverride: false,
      isMultiplier: true
    };
  }

  return {
    totalValue: baseValue,
    bonus: 0,
    multiplier: 1,
    isOverride: false,
    isMultiplier: false
  };
}

export function getItemStarValue(
  item: MilitaryItem,
  tierId: string = '0',
  universalStarConfig: UniversalStarConfig = DEFAULT_VEHICLE_STAR_CONFIG,
  universalSoldierDroneStarConfig: UniversalSoldierDroneStarConfig = DEFAULT_SOLDIER_DRONE_STAR_CONFIG
): { totalValue: number; bonus: number; multiplier?: number; isOverride: boolean; isMultiplier?: boolean } {
  return calculateItemStarValue(item, tierId, universalStarConfig, universalSoldierDroneStarConfig);
}

export function getItemStarTierData(
  item: MilitaryItem,
  tierId: string,
  universalStarConfig: UniversalStarConfig = DEFAULT_VEHICLE_STAR_CONFIG,
  universalSoldierDroneStarConfig: UniversalSoldierDroneStarConfig = DEFAULT_SOLDIER_DRONE_STAR_CONFIG
) {
  const isVeh = isVehicleCategory(item.category);
  const isSoldierDrone = isSoldierOrDroneCategory(item.category);

  let label = `${tierId}★`;
  let shortLabel = `${tierId}★`;
  let multiplier = 1;
  let starsCount = 0;

  if (tierId === 'fresh') {
    starsCount = 0;
  } else {
    const parsed = parseInt(tierId, 10);
    starsCount = isNaN(parsed) ? 0 : parsed;
  }

  if (isVeh) {
    const found = STAR_TIERS.find(t => t.id === tierId);
    if (found) {
      label = found.label;
      shortLabel = found.shortLabel;
      multiplier = universalStarConfig[tierId as keyof UniversalStarConfig] ?? 1;
    }
  } else if (isSoldierDrone) {
    const found = SOLDIER_DRONE_STAR_TIERS.find(t => t.id === tierId);
    if (found) {
      label = found.label;
      shortLabel = found.shortLabel;
      multiplier = universalSoldierDroneStarConfig[tierId as keyof UniversalSoldierDroneStarConfig] ?? 1;
    }
  }

  const override = item.starTierOverrides?.[tierId];
  const isCustomOverride = Boolean(override && (override.value !== undefined || override.demand !== undefined || override.trend !== undefined));

  const valCalc = calculateItemStarValue(item, tierId, universalStarConfig, universalSoldierDroneStarConfig);
  const value = valCalc.totalValue;

  const demand = override?.demand !== undefined ? override.demand : item.demand;
  const trend = override?.trend || item.trend;
  const gemRange = calculateGemRange(value, item, tierId);

  return {
    tierId,
    label,
    shortLabel,
    tierLabel: label,
    starsCount,
    value,
    demand,
    trend,
    multiplier,
    bonus: valCalc.bonus,
    isOverride: valCalc.isOverride,
    isCustomOverride,
    gemRange,
    minGem: override?.gemOverrideMin ?? gemRange.min,
    maxGem: override?.gemOverrideMax ?? gemRange.max
  };
}

export function getAllItemStarTiersData(
  item: MilitaryItem,
  universalStarConfig?: UniversalStarConfig,
  universalSoldierDroneStarConfig?: UniversalSoldierDroneStarConfig
) {
  if (isSoldierOrDroneCategory(item.category)) {
    return SOLDIER_DRONE_STAR_TIERS.map(t =>
      getItemStarTierData(item, t.id, universalStarConfig, universalSoldierDroneStarConfig)
    );
  }
  if (isVehicleCategory(item.category)) {
    return STAR_TIERS.map(t =>
      getItemStarTierData(item, t.id, universalStarConfig, universalSoldierDroneStarConfig)
    );
  }
  return [getItemStarTierData(item, '0', universalStarConfig, universalSoldierDroneStarConfig)];
}

export function getItemLowestStarTierData(
  item: MilitaryItem,
  universalStarConfig?: UniversalStarConfig,
  universalSoldierDroneStarConfig?: UniversalSoldierDroneStarConfig
) {
  if (isVehicleCategory(item.category)) {
    return getItemStarTierData(item, 'fresh', universalStarConfig, universalSoldierDroneStarConfig);
  }
  return getItemStarTierData(item, '0', universalStarConfig, universalSoldierDroneStarConfig);
}

export function calculateGemRange(value: number, item?: MilitaryItem, tier?: string): { min: number; max: number; label: string; formatted: string; isManual: boolean } {
  if (item && tier && item.starTierOverrides?.[tier]?.hasManualGemRange) {
    const o = item.starTierOverrides[tier];
    if (o.gemOverrideMin !== undefined && o.gemOverrideMax !== undefined) {
      const lbl = `${formatMilitaryValue(o.gemOverrideMin)} - ${formatMilitaryValue(o.gemOverrideMax)}`;
      return {
        min: o.gemOverrideMin,
        max: o.gemOverrideMax,
        label: lbl,
        formatted: lbl,
        isManual: true
      };
    }
  }
  const min = Math.round(value * 0.9);
  const max = Math.round(value * 1.1);
  const lbl = `${formatMilitaryValue(min)} - ${formatMilitaryValue(max)}`;
  return {
    min,
    max,
    label: lbl,
    formatted: lbl,
    isManual: false
  };
}

export function getRarityConfig(rarity: ItemRarity) {
  const base = (() => {
    switch (rarity) {
      case 'Limited Edition':
        return {
          label: 'Limited Edition',
          bg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-500/40',
          text: 'text-amber-600 dark:text-amber-400',
          border: 'border-amber-400 dark:border-amber-500/50'
        };
      case 'Exotic':
        return {
          label: 'Exotic',
          bg: 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-500/40',
          text: 'text-rose-600 dark:text-rose-400',
          border: 'border-rose-400 dark:border-rose-500/50'
        };
      case 'Legendary':
        return {
          label: 'Legendary',
          bg: 'bg-yellow-500/10 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500/40',
          text: 'text-yellow-600 dark:text-yellow-400',
          border: 'border-yellow-400 dark:border-yellow-500/50'
        };
      case 'Epic':
        return {
          label: 'Epic',
          bg: 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-500/40',
          text: 'text-purple-600 dark:text-purple-400',
          border: 'border-purple-400 dark:border-purple-500/50'
        };
      case 'Rare':
        return {
          label: 'Rare',
          bg: 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-500/40',
          text: 'text-blue-600 dark:text-blue-400',
          border: 'border-blue-400 dark:border-blue-500/50'
        };
      case 'Uncommon':
        return {
          label: 'Uncommon',
          bg: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/40',
          text: 'text-emerald-600 dark:text-emerald-400',
          border: 'border-emerald-400 dark:border-emerald-500/50'
        };
      case 'Event':
        return {
          label: 'Event',
          bg: 'bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-300 dark:border-cyan-500/40',
          text: 'text-cyan-600 dark:text-cyan-400',
          border: 'border-cyan-400 dark:border-cyan-500/50'
        };
      default:
        return {
          label: 'Common',
          bg: 'bg-neutral-500/10 dark:bg-neutral-500/20 text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-neutral-500/40',
          text: 'text-neutral-600 dark:text-neutral-400',
          border: 'border-neutral-400 dark:border-neutral-500/50'
        };
    }
  })();

  return {
    ...base,
    textClass: base.text,
    borderClass: base.border,
    pillClass: base.bg,
    badgeBg: base.bg,
    badgeClass: base.bg
  };
}

export function getTrendConfig(trend: PriceTrend) {
  const norm = normalizeTrend(trend);
  const base = (() => {
    switch (norm) {
      case 'Rising':
        return {
          label: 'Rising',
          color: 'text-emerald-500',
          bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
          border: 'border-emerald-500'
        };
      case 'Dropping':
        return {
          label: 'Dropping',
          color: 'text-rose-500',
          bg: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
          border: 'border-rose-500'
        };
      case 'Glazed':
        return {
          label: 'Glazed / Hyped',
          color: 'text-purple-500',
          bg: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
          border: 'border-purple-500'
        };
      case 'Unstable':
        return {
          label: 'Unstable',
          color: 'text-amber-500',
          bg: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
          border: 'border-amber-500'
        };
      default:
        return {
          label: 'Stable',
          color: 'text-blue-500',
          bg: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
          border: 'border-blue-500'
        };
    }
  })();

  return {
    ...base,
    textColor: base.color,
    colorClass: base.color
  };
}

export function getTrendList(currentTrend?: PriceTrend): Array<{
  label: string;
  textColor: string;
  color: string;
  badgeClass: string;
  icon: string;
}> {
  const norm = normalizeTrend(currentTrend || 'Stable');
  const cfg = getTrendConfig(norm);
  let icon = 'minus';
  if (norm === 'Rising') icon = 'trending-up';
  else if (norm === 'Dropping') icon = 'trending-down';
  else if (norm === 'Glazed') icon = 'sparkles';
  else if (norm === 'Unstable') icon = 'alert-triangle';

  return [
    {
      label: cfg.label,
      textColor: cfg.color,
      color: cfg.color,
      badgeClass: cfg.bg,
      icon
    }
  ];
}

export function normalizeTrend(trend: string = 'Stable'): CanonicalPriceTrend {
  const t = (trend || '').toLowerCase();
  if (t === 'rising') return 'Rising';
  if (t === 'dropping') return 'Dropping';
  if (t === 'glazed' || t === 'hyped' || t === 'overpriced') return 'Glazed';
  if (t === 'unstable' || t === 'fluctuating') return 'Unstable';
  return 'Stable';
}

export function getDemandDescription(demand: number) {
  let text = 'Medium Demand';
  let color = 'text-amber-500';
  let barColor = 'bg-amber-500';
  let badgeBg = 'bg-amber-500/10 text-amber-500 border-amber-500/30';

  if (demand >= 9) {
    text = 'Extreme Demand';
    color = 'text-purple-500';
    barColor = 'bg-purple-500';
    badgeBg = 'bg-purple-500/10 text-purple-500 border-purple-500/30';
  } else if (demand >= 7) {
    text = 'High Demand';
    color = 'text-emerald-500';
    barColor = 'bg-emerald-500';
    badgeBg = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
  } else if (demand >= 5) {
    text = 'Medium Demand';
    color = 'text-amber-500';
    barColor = 'bg-amber-500';
    badgeBg = 'bg-amber-500/10 text-amber-500 border-amber-500/30';
  } else if (demand >= 3) {
    text = 'Low Demand';
    color = 'text-orange-500';
    barColor = 'bg-orange-500';
    badgeBg = 'bg-orange-500/10 text-orange-500 border-orange-500/30';
  } else {
    text = 'Very Low Demand';
    color = 'text-rose-500';
    barColor = 'bg-rose-500';
    badgeBg = 'bg-rose-500/10 text-rose-500 border-rose-500/30';
  }

  return {
    text,
    label: text,
    scoreLabel: `${demand}/10 - ${text}`,
    color,
    textColor: color,
    barColor,
    badgeBg,
    badgeClass: badgeBg,
    toString: () => text
  };
}
