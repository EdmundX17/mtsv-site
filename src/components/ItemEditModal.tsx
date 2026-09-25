import React, { useState, useRef, useMemo } from 'react';
import { useValueList } from '../context/ValueListContext';
import {
  MilitaryItem,
  ItemCategory,
  ItemRarity,
  PriceTrend,
  StarTier,
  SoldierDroneStarTier,
  StarTierOverrideData
} from '../types';
import {
  formatMilitaryValue,
  isVehicleCategory,
  isSoldierOrDroneCategory,
  STAR_TIERS,
  SOLDIER_DRONE_STAR_TIERS,
  normalizeTrend,
  parseMilitaryValueInput,
  calculateItemStarValue,
  calculateGemRange,
  roundGemRangeValue,
  getTrendConfig
} from '../utils/formatters';
import {
  Edit3,
  X,
  Save,
  Trash2,
  Clipboard,
  Image as ImageIcon,
  Upload,
  AlertTriangle,
  Sparkles,
  Sliders,
  Copy,
  RotateCcw,
  LayoutGrid,
  Layers,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Check,
  Calendar,
  Clock,
  Send,
  MessageSquare
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { VehicleImage } from './VehicleImage';

const CATEGORIES: ItemCategory[] = ['Air', 'Land', 'Naval', 'Soldier', 'Drone', 'Tags', 'Other'];
const RARITIES: ItemRarity[] = ['Limited Edition', 'Exotic', 'Legendary', 'Epic', 'Rare', 'Common'];
const TRENDS: { id: PriceTrend; label: string; icon: string }[] = [
  { id: 'Glazed', label: 'Glazed', icon: 'Sparkles' },
  { id: 'Rising', label: 'Rising ↗', icon: '↗' },
  { id: 'Stable', label: 'Stable ═', icon: '═' },
  { id: 'Dropping', label: 'Dropping ↘', icon: '↘' },
  { id: 'Unstable', label: 'Unstable', icon: 'Activity' }
];

const ItemEditModalContent: React.FC<{
  item: MilitaryItem;
  onClose: () => void;
}> = ({ item, onClose }) => {
  const {
    updateItem,
    deleteItem,
    resetItemGraph,
    universalStarConfig,
    universalSoldierDroneStarConfig,
    isAdmin,
    isConsultant,
    activeStaff,
    submitConsultantProposal
  } = useValueList();

  const [name, setName] = useState(item.name);
  const [acronym, setAcronym] = useState(item.acronym || '');
  const [thumbnail, setThumbnail] = useState(item.thumbnail);
  const [valueInput, setValueInput] = useState<string | number>(item.value);
  const [demand, setDemand] = useState(item.demand);
  const [trend, setTrend] = useState<PriceTrend>(normalizeTrend(item.trend));
  const [rarity, setRarity] = useState<ItemRarity>(item.rarity);
  const [category, setCategory] = useState<ItemCategory>(item.category === 'Sea' ? 'Naval' : item.category);
  const [tradeable, setTradeable] = useState<boolean>(item.tradeable !== false);
  const [notes, setNotes] = useState(item.notes || '');
  const [auditReason, setAuditReason] = useState('Staff moderation update');
  const [consultantCommentary, setConsultantCommentary] = useState('');
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  const [proposalSubmittedSuccess, setProposalSubmittedSuccess] = useState(false);
  const [clipboardStatus, setClipboardStatus] = useState<string>('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [customLastUpdated, setCustomLastUpdated] = useState<string>(item.lastUpdated || new Date().toISOString());
  const [graphResetDone, setGraphResetDone] = useState<boolean>(false);
  const [inRecentlyUpdated, setInRecentlyUpdated] = useState<boolean>(item.inRecentlyUpdated ?? false);
  const [excludeFromRecentlyUpdated, setExcludeFromRecentlyUpdated] = useState<boolean>(item.excludeFromRecentlyUpdated ?? false);

  const numericValue = parseMilitaryValueInput(valueInput);
  const isVehicle = isVehicleCategory(category);
  const isSoldierOrDrone = isSoldierOrDroneCategory(category);
  const hasStars = isVehicle || isSoldierOrDrone;

  // Manual Override toggle for Star Tiers
  const [hasManualStarOverrides, setHasManualStarOverrides] = useState<boolean>(() => {
    if (isSoldierOrDrone) {
      if (item.hasCustomMultiplierOverrides !== undefined) {
        return Boolean(item.hasCustomMultiplierOverrides);
      }
      return Boolean(
        (item.multiplierOverrides && Object.keys(item.multiplierOverrides).length > 0) ||
        (item.starTierOverrides && Object.keys(item.starTierOverrides).length > 0)
      );
    }
    if (isVehicle) {
      if (item.hasCustomStarOverrides !== undefined) {
        return Boolean(item.hasCustomStarOverrides);
      }
      return Boolean(
        (item.starOverrides && Object.keys(item.starOverrides).length > 0) ||
        (item.starTierOverrides && Object.keys(item.starTierOverrides).length > 0)
      );
    }
    return false;
  });

  // Base Gem Range manual overrides
  const [hasManualGemRange, setHasManualGemRange] = useState(Boolean(item.hasManualGemRange));
  const [gemOverrideMinInput, setGemOverrideMinInput] = useState<string | number>(
    item.gemOverrideMin !== undefined ? item.gemOverrideMin : roundGemRangeValue(Math.max(0, item.value * 0.95), item.value)
  );
  const [gemOverrideMaxInput, setGemOverrideMaxInput] = useState<string | number>(
    item.gemOverrideMax !== undefined ? item.gemOverrideMax : roundGemRangeValue(item.value * 1.05, item.value)
  );

  // Active Star Tier Tab & View Mode
  const activeTiersList = useMemo(() => {
    if (isVehicle) return STAR_TIERS;
    if (isSoldierOrDrone) return SOLDIER_DRONE_STAR_TIERS;
    return [{ id: '0', label: 'Base Item', shortLabel: 'Base', starsCount: 0 }];
  }, [isVehicle, isSoldierOrDrone]);

  const [activeTierTab, setActiveTierTab] = useState<string>(() => {
    return isVehicle ? '0' : (isSoldierOrDrone ? '0' : '0');
  });
  const [overrideLayoutMode, setOverrideLayoutMode] = useState<'cards' | 'tabbed'>('cards');

  // Rich Per-Star Tier Overrides State (Value, Demand, Trend, Gem Range, Notes)
  const [tierOverrides, setTierOverrides] = useState<Record<string, StarTierOverrideData>>(() => {
    const map: Record<string, StarTierOverrideData> = {};
    const tiersToInit = isVehicle
      ? STAR_TIERS.map(t => t.id)
      : (isSoldierOrDrone ? SOLDIER_DRONE_STAR_TIERS.map(t => t.id) : ['0']);

    tiersToInit.forEach(tId => {
      const existingTier = item.starTierOverrides?.[tId];
      const existingLegacy = isVehicle ? item.starOverrides?.[tId as StarTier] : undefined;
      const legacyMult = isSoldierOrDrone ? item.multiplierOverrides?.[tId as SoldierDroneStarTier] : undefined;
      
      let initVal: number;
      if (existingTier?.value !== undefined) {
        initVal = existingTier.value;
      } else if (existingLegacy !== undefined) {
        initVal = existingLegacy;
      } else if (legacyMult !== undefined) {
        initVal = Math.round(item.value * legacyMult);
      } else {
        initVal = calculateItemStarValue(item, tId, universalStarConfig, universalSoldierDroneStarConfig).totalValue;
      }

      map[tId] = {
        value: initVal,
        demand: existingTier?.demand !== undefined ? existingTier.demand : item.demand,
        trend: existingTier?.trend !== undefined ? normalizeTrend(existingTier.trend) : normalizeTrend(item.trend),
        hasManualGemRange: existingTier?.hasManualGemRange ?? false,
        gemOverrideMin: existingTier?.gemOverrideMin !== undefined ? existingTier.gemOverrideMin : roundGemRangeValue(Math.max(0, initVal * 0.95), initVal),
        gemOverrideMax: existingTier?.gemOverrideMax !== undefined ? existingTier.gemOverrideMax : roundGemRangeValue(initVal * 1.05, initVal),
        notes: existingTier?.notes || ''
      };
    });

    return map;
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Update a specific field for a given star tier
  const handleUpdateTierField = (
    tierId: string,
    field: keyof StarTierOverrideData,
    value: any
  ) => {
    setTierOverrides(prev => {
      const current = prev[tierId] || {
        value: numericValue,
        demand: demand,
        trend: trend,
        hasManualGemRange: false,
        gemOverrideMin: roundGemRangeValue(Math.max(0, numericValue * 0.95), numericValue),
        gemOverrideMax: roundGemRangeValue(numericValue * 1.05, numericValue),
        notes: ''
      };

      const updated = {
        ...current,
        [field]: value
      };

      // If value changed and tier doesn't have manual gem range, keep default gem min/max synced
      if (field === 'value' && !updated.hasManualGemRange) {
        const numVal = parseMilitaryValueInput(value);
        updated.gemOverrideMin = roundGemRangeValue(Math.max(0, numVal * 0.95), numVal);
        updated.gemOverrideMax = roundGemRangeValue(numVal * 1.05, numVal);
      }

      return {
        ...prev,
        [tierId]: updated
      };
    });
  };

  // Helper to fill all tiers with universal math calculated from current base numeric value
  const handleFillAllFromUniversal = () => {
    const updated: Record<string, StarTierOverrideData> = {};
    activeTiersList.forEach(t => {
      const calc = calculateItemStarValue(
        { ...item, value: numericValue, category, rarity, name },
        t.id,
        universalStarConfig,
        universalSoldierDroneStarConfig
      );
      const prev = tierOverrides[t.id];
      updated[t.id] = {
        value: calc.totalValue,
        demand: prev?.demand ?? demand,
        trend: prev?.trend ?? trend,
        hasManualGemRange: prev?.hasManualGemRange ?? false,
        gemOverrideMin: roundGemRangeValue(Math.max(0, calc.totalValue * 0.95), calc.totalValue),
        gemOverrideMax: roundGemRangeValue(calc.totalValue * 1.05, calc.totalValue),
        notes: prev?.notes || ''
      };
    });
    setTierOverrides(updated);
  };

  // Helper to copy current active tier's demand, trend, and notes to all other tiers
  const handleCopyCurrentTierSettingsToAll = (sourceTierId: string) => {
    const source = tierOverrides[sourceTierId];
    if (!source) return;

    setTierOverrides(prev => {
      const next = { ...prev };
      activeTiersList.forEach(t => {
        if (next[t.id]) {
          next[t.id] = {
            ...next[t.id],
            demand: source.demand ?? demand,
            trend: source.trend ?? trend,
            notes: source.notes || ''
          };
        }
      });
      return next;
    });
  };

  const handleDefaultValueChange = (newValStr: string | number) => {
    setValueInput(newValStr);
  };

  const handleQuickAddValue = (delta: number) => {
    const next = Math.max(0, numericValue + delta);
    handleDefaultValueChange(next);
  };

  const handlePasteClipboard = async () => {
    try {
      setClipboardStatus('Reading clipboard...');
      const clipboardItems = await navigator.clipboard.read();
      for (const clipboardItem of clipboardItems) {
        const imageType = clipboardItem.types.find(type => type.startsWith('image/'));
        if (imageType) {
          const blob = await clipboardItem.getType(imageType);
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              setThumbnail(event.target.result as string);
              setClipboardStatus('Image pasted from clipboard!');
              setTimeout(() => setClipboardStatus(''), 2500);
            }
          };
          reader.readAsDataURL(blob);
          return;
        }
      }

      const text = await navigator.clipboard.readText();
      if (text && (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('data:image/'))) {
        setThumbnail(text.trim());
        setClipboardStatus('Image URL pasted!');
        setTimeout(() => setClipboardStatus(''), 2500);
        return;
      }

      setClipboardStatus('No image found in clipboard.');
      setTimeout(() => setClipboardStatus(''), 3000);
    } catch (err) {
      setClipboardStatus('Clipboard access denied. Paste image URL directly.');
      setTimeout(() => setClipboardStatus(''), 3500);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setThumbnail(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const minParsed = parseMilitaryValueInput(gemOverrideMinInput);
    const maxParsed = parseMilitaryValueInput(gemOverrideMaxInput);

    // Build clean legacy starOverrides and multiplierOverrides maps for compatibility
    const legacyStarOverrides: Partial<Record<StarTier, number>> = {};
    const legacyMultiplierOverrides: Partial<Record<SoldierDroneStarTier, number>> = {};

    if (hasManualStarOverrides) {
      if (isVehicle) {
        STAR_TIERS.forEach(t => {
          if (tierOverrides[t.id]?.value !== undefined) {
            legacyStarOverrides[t.id] = tierOverrides[t.id].value;
          }
        });
      } else if (isSoldierOrDrone) {
        SOLDIER_DRONE_STAR_TIERS.forEach(t => {
          if (tierOverrides[t.id]?.value !== undefined && numericValue > 0) {
            legacyMultiplierOverrides[t.id] = Number((tierOverrides[t.id].value! / numericValue).toFixed(2));
          }
        });
      }
    }

    const isManualStarMode = hasStars && hasManualStarOverrides;
    const tier0Data = isManualStarMode ? tierOverrides['0'] : undefined;
    const finalItemValue = tier0Data?.value !== undefined ? tier0Data.value : numericValue;
    const finalDemand = tier0Data?.demand !== undefined ? tier0Data.demand : (Number(demand) || 1);
    const finalTrend = tier0Data?.trend !== undefined ? tier0Data.trend : trend;
    const finalHasManualGemRange = isManualStarMode ? false : hasManualGemRange;

    // CONSULTANT PROPOSAL SUBMISSION FLOW (Commentator Mode)
    if (isConsultant) {
      setIsSubmittingProposal(true);
      const proposedChanges: Partial<MilitaryItem> = {
        name: name.trim() || item.name,
        acronym: acronym.trim() ? acronym.trim() : undefined,
        thumbnail: thumbnail.trim() || item.thumbnail,
        value: finalItemValue,
        demand: finalDemand,
        trend: finalTrend,
        rarity,
        category,
        tradeable,
        notes,
        hasManualGemRange: finalHasManualGemRange,
        gemOverrideMin: finalHasManualGemRange ? minParsed : undefined,
        gemOverrideMax: finalHasManualGemRange ? maxParsed : undefined,
        hasCustomStarOverrides: isVehicle && hasManualStarOverrides,
        starOverrides: isVehicle && hasManualStarOverrides ? legacyStarOverrides : undefined,
        starTierOverrides: hasStars && hasManualStarOverrides ? tierOverrides : undefined,
        hasCustomMultiplierOverrides: isSoldierOrDrone && hasManualStarOverrides,
        multiplierOverrides: isSoldierOrDrone && hasManualStarOverrides ? legacyMultiplierOverrides : undefined,
      };

      const diffs: { field: string; label: string; oldValue: any; newValue: any }[] = [];
      if (item.value !== finalItemValue) {
        diffs.push({ field: 'value', label: 'Base Value', oldValue: item.value, newValue: finalItemValue });
      }
      if (item.demand !== finalDemand) {
        diffs.push({ field: 'demand', label: 'Demand', oldValue: item.demand, newValue: finalDemand });
      }
      if (item.trend !== finalTrend) {
        diffs.push({ field: 'trend', label: 'Price Trend', oldValue: item.trend, newValue: finalTrend });
      }
      if (item.name !== (name.trim() || item.name)) {
        diffs.push({ field: 'name', label: 'Item Name', oldValue: item.name, newValue: name.trim() || item.name });
      }
      if (item.category !== category) {
        diffs.push({ field: 'category', label: 'Category', oldValue: item.category, newValue: category });
      }
      if (item.rarity !== rarity) {
        diffs.push({ field: 'rarity', label: 'Rarity', oldValue: item.rarity, newValue: rarity });
      }
      if (item.tradeable !== tradeable) {
        diffs.push({ field: 'tradeable', label: 'Tradeable', oldValue: item.tradeable ?? true, newValue: tradeable });
      }
      if ((item.notes || '') !== notes) {
        diffs.push({ field: 'notes', label: 'Notes / Insights', oldValue: item.notes || '(Empty)', newValue: notes || '(Empty)' });
      }
      if (hasManualStarOverrides) {
        diffs.push({ field: 'starOverrides', label: 'Star Tier Overrides', oldValue: 'Standard Multipliers', newValue: 'Custom Star Overrides' });
      }

      submitConsultantProposal({
        itemId: item.id,
        itemName: name.trim() || item.name,
        itemThumbnail: thumbnail.trim() || item.thumbnail,
        itemCategory: category,
        itemRarity: rarity,
        consultantId: activeStaff?.id || 'consultant',
        consultantUsername: activeStaff?.username || 'consultant',
        consultantDisplayName: activeStaff?.displayName || 'Consultant',
        type: 'ITEM_UPDATE',
        commentary: consultantCommentary.trim() || 'Proposed market valuation adjustment based on trade observations.',
        proposedChanges,
        originalSnapshot: {
          value: item.value,
          demand: item.demand,
          trend: item.trend,
          notes: item.notes,
          tradeable: item.tradeable
        },
        diffs: diffs.length > 0 ? diffs : [{ field: 'review', label: 'Market Verification', oldValue: 'Current Catalog', newValue: 'Verified & Suggested' }]
      }).then(() => {
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#10b981', '#34d399', '#6ee7b7', '#059669']
          });
        } catch (e) {}

        setProposalSubmittedSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1200);
      }).catch(err => {
        console.error('Failed to submit consultant proposal', err);
      }).finally(() => {
        setIsSubmittingProposal(false);
      });

      return;
    }

    updateItem({
      id: item.id,
      name: name.trim() || item.name,
      acronym: acronym.trim() ? acronym.trim() : undefined,
      thumbnail: thumbnail.trim() || item.thumbnail,
      value: finalItemValue,
      demand: finalDemand,
      trend: finalTrend,
      rarity,
      category,
      tradeable,
      notes,
      hasManualGemRange: finalHasManualGemRange,
      gemOverrideMin: finalHasManualGemRange ? minParsed : undefined,
      gemOverrideMax: finalHasManualGemRange ? maxParsed : undefined,
      hasCustomStarOverrides: isVehicle && hasManualStarOverrides,
      starOverrides: isVehicle && hasManualStarOverrides ? legacyStarOverrides : undefined,
      starTierOverrides: hasStars && hasManualStarOverrides ? tierOverrides : undefined,
      hasCustomMultiplierOverrides: isSoldierOrDrone && hasManualStarOverrides,
      multiplierOverrides: isSoldierOrDrone && hasManualStarOverrides ? legacyMultiplierOverrides : undefined,
      lastUpdated: customLastUpdated,
      inRecentlyUpdated,
      excludeFromRecentlyUpdated,
    }, auditReason);

    // Pre-prime translation into persistent cache so Spanish readers experience zero delay
    if (notes && notes.trim()) {
      fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: notes.trim(), targetLang: 'es' })
      }).catch(() => {});
    }

    try {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#f97316', '#fb923c', '#fdba74', '#ea580c']
      });
    } catch (e) {}

    onClose();
  };

  const handleConfirmDelete = () => {
    deleteItem(item.id);
    onClose();
  };

  // Render an individual star tier card
  const renderTierCard = (tierObj: { id: string; label: string; shortLabel: string; starsCount: number }) => {
    const tierId = tierObj.id;
    const tierData = tierOverrides[tierId] || {
      value: numericValue,
      demand: demand,
      trend: trend,
      hasManualGemRange: false,
      gemOverrideMin: roundGemRangeValue(Math.max(0, numericValue * 0.95), numericValue),
      gemOverrideMax: roundGemRangeValue(numericValue * 1.05, numericValue),
      notes: ''
    };

    const isLimitedItem = rarity === 'Limited Edition' ||
      (name || '').toLowerCase().startsWith('le ') ||
      (name || '').toLowerCase().includes('limited');

    const defaultStarCalculation = calculateItemStarValue(
      { ...item, value: numericValue, category, rarity, hasCustomStarOverrides: false, starTierOverrides: undefined, starOverrides: undefined },
      tierId,
      universalStarConfig,
      universalSoldierDroneStarConfig
    );

    const defaultTierValue = isLimitedItem ? numericValue : defaultStarCalculation.totalValue;

    const tierVal = tierData.value ?? numericValue;
    const tierDemand = tierData.demand ?? demand;
    const tierTrend = tierData.trend ?? trend;
    const tierMin = tierData.gemOverrideMin ?? roundGemRangeValue(Math.max(0, tierVal * 0.95), tierVal);
    const tierMax = tierData.gemOverrideMax ?? roundGemRangeValue(tierVal * 1.05, tierVal);

    const minParsedBase = parseMilitaryValueInput(gemOverrideMinInput);
    const maxParsedBase = parseMilitaryValueInput(gemOverrideMaxInput);

    const inheritedTierGemRange = calculateGemRange(
      {
        ...item,
        rarity,
        name,
        category,
        value: numericValue,
        hasManualGemRange,
        gemOverrideMin: minParsedBase,
        gemOverrideMax: maxParsedBase
      },
      tierVal,
      tierData.hasManualGemRange ? tierData : undefined,
      tierId,
      universalStarConfig,
      universalSoldierDroneStarConfig
    );

    return (
      <div
        key={tierId}
        className="p-4 rounded-2xl bg-white dark:bg-[#0f111a] border-2 border-orange-200/90 dark:border-neutral-800 shadow-sm space-y-3.5 transition-all hover:border-orange-400 dark:hover:border-neutral-700"
      >
        {/* Tier Card Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-xl bg-orange-500 text-white font-black text-xs font-['Chakra_Petch'] tracking-wide uppercase shadow-xs">
              {tierObj.label}
            </span>
            {tierObj.starsCount > 0 && (
              <span className="text-[11px] text-amber-500 font-bold">
                {'★'.repeat(tierObj.starsCount)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <span className="text-xs font-black font-mono text-orange-600 dark:text-orange-400 mr-1">
              {formatMilitaryValue(tierVal)}
            </span>
            <button
              type="button"
              onClick={() => handleUpdateTierField(tierId, 'value', defaultTierValue)}
              title={`Reset to default value (${formatMilitaryValue(defaultTierValue)})`}
              className="text-[10px] px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/70 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-bold transition-all flex items-center gap-1 cursor-pointer border border-emerald-300/80 dark:border-emerald-700"
            >
              <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>Default ({formatMilitaryValue(defaultTierValue)})</span>
            </button>
            <button
              type="button"
              onClick={() => handleCopyCurrentTierSettingsToAll(tierId)}
              title="Copy demand, trend, and notes to all other tiers"
              className="text-[10px] px-2 py-1 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900 font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              <span>Copy to All</span>
            </button>
          </div>
        </div>

        {/* Value Input and Quick Adders */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase">
              {tierObj.shortLabel} Value ($ / 💎):
            </label>
            <button
              type="button"
              onClick={() => handleUpdateTierField(tierId, 'value', defaultTierValue)}
              className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold hover:underline cursor-pointer flex items-center gap-1"
              title="Click to apply auto star calculation"
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>Auto: {formatMilitaryValue(defaultTierValue)}</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={tierVal}
              onChange={(e) => {
                const parsed = parseMilitaryValueInput(e.target.value);
                handleUpdateTierField(tierId, 'value', parsed);
              }}
              placeholder="e.g. 500k, 1.2m, 3b"
              className="flex-1 px-3 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white font-mono text-xs font-bold focus:border-orange-500 focus:outline-none"
            />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleUpdateTierField(tierId, 'value', defaultTierValue)}
                className="px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700 text-[10px] font-mono font-bold cursor-pointer transition-colors flex items-center gap-1"
                title={`Set to default value (${formatMilitaryValue(defaultTierValue)})`}
              >
                <span>Default</span>
              </button>
              {[10000, 100000, 1000000].map(delta => (
                <button
                  key={delta}
                  type="button"
                  onClick={() => handleUpdateTierField(tierId, 'value', Math.max(0, tierVal + delta))}
                  className="px-1.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-orange-100 dark:hover:bg-orange-950/60 text-neutral-600 dark:text-neutral-300 hover:text-orange-600 text-[10px] font-mono font-bold cursor-pointer transition-colors"
                >
                  +{delta >= 1000000 ? `${delta / 1000000}M` : `${delta / 1000}K`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Demand & Trend Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Demand */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300 uppercase">
                Demand:
              </label>
              <span className="text-[11px] font-mono font-black text-orange-600 dark:text-orange-400">
                {tierDemand} / 10
              </span>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleUpdateTierField(tierId, 'demand', d)}
                  className={`flex-1 py-1 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    tierDemand === d
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-orange-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Trend */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300 uppercase block">
              Market Trend:
            </label>
            <div className="flex items-center gap-1 flex-wrap">
              {TRENDS.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleUpdateTierField(tierId, 'trend', t.id)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    tierTrend === t.id
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-orange-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Gem Range Override for this Tier */}
        <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/90 border border-neutral-200/80 dark:border-neutral-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-[10px] font-bold text-neutral-800 dark:text-neutral-200 uppercase">
              <input
                type="checkbox"
                checked={tierData.hasManualGemRange || false}
                onChange={(e) => handleUpdateTierField(tierId, 'hasManualGemRange', e.target.checked)}
                className="w-3.5 h-3.5 rounded text-orange-500 focus:ring-orange-400 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
              />
              <span>Manual Gem Range Override</span>
            </label>

            {tierData.hasManualGemRange && (
              <button
                type="button"
                onClick={() => {
                  handleUpdateTierField(tierId, 'gemOverrideMin', roundGemRangeValue(Math.max(0, tierVal * 0.95), tierVal));
                  handleUpdateTierField(tierId, 'gemOverrideMax', roundGemRangeValue(tierVal * 1.05, tierVal));
                }}
                className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 font-bold hover:underline cursor-pointer"
              >
                Reset ±5%
              </button>
            )}
          </div>

          {tierData.hasManualGemRange ? (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="block text-[9px] font-mono text-neutral-500 uppercase mb-0.5">Min Gems:</label>
                <input
                  type="text"
                  value={tierMin}
                  onChange={(e) => handleUpdateTierField(tierId, 'gemOverrideMin', parseMilitaryValueInput(e.target.value))}
                  placeholder="Min"
                  className="w-full px-2 py-1 bg-white dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-mono text-neutral-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[9px] font-mono text-neutral-500 uppercase mb-0.5">Max Gems:</label>
                <input
                  type="text"
                  value={tierMax}
                  onChange={(e) => handleUpdateTierField(tierId, 'gemOverrideMax', parseMilitaryValueInput(e.target.value))}
                  placeholder="Max"
                  className="w-full px-2 py-1 bg-white dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-mono text-neutral-900 dark:text-white"
                />
              </div>
            </div>
          ) : (
            <div className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 flex items-center justify-between">
              <span>{inheritedTierGemRange.isManual ? 'Manual Gem Range:' : 'Auto Range (±5%):'}</span>
              <span className="font-bold text-neutral-800 dark:text-neutral-200">
                {inheritedTierGemRange.formatted} 💎
              </span>
            </div>
          )}
        </div>

        {/* Tier Notes / Description */}
        <div>
          <label className="block text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase mb-1">
            {tierObj.shortLabel} Notes / Comments (Optional):
          </label>
          <input
            type="text"
            value={tierData.notes || ''}
            onChange={(e) => handleUpdateTierField(tierId, 'notes', e.target.value)}
            placeholder={`e.g. Specific notes for ${tierObj.label}`}
            className="w-full px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-sans text-neutral-900 dark:text-white focus:outline-none"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
      <div className={`w-full ${hasStars && hasManualStarOverrides ? 'max-w-4xl' : 'max-w-xl'} bg-white dark:bg-[#141722] backdrop-blur-2xl border border-orange-200 dark:border-neutral-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden max-h-[92vh] flex flex-col transition-all duration-200`}>
        {/* Modal Header */}
        <div className={`p-5 ${
          isConsultant 
            ? 'bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border-b border-emerald-200/80 dark:border-emerald-800/80' 
            : 'bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border-b border-orange-100 dark:border-neutral-800'
        } flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 rounded-2xl ${
              isConsultant ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
            }`}>
              {isConsultant ? <MessageSquare className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-['Chakra_Petch'] text-lg font-bold text-neutral-900 dark:text-white uppercase">
                  {isConsultant ? `Suggest Changes: ${name || item.name}` : `Edit: ${name || item.name}`}
                </h3>
                {isConsultant && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/60">
                    Google Docs Suggesting Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-sans">
                {isConsultant
                  ? 'All changes are queued for 1-click Administrator review with your commentary.'
                  : hasStars && hasManualStarOverrides ? 'Multi-Tier Valuation & Individual Star Cards' : 'Quick Item & Valuation Editor'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-800 dark:hover:text-white hover:bg-orange-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Google Docs Suggesting Mode Banner for Consultant */}
        {isConsultant && (
          <div className="px-5 py-3 bg-emerald-50/80 dark:bg-[#11241f] border-b border-emerald-200/60 dark:border-emerald-800/60 flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="text-xs text-neutral-700 dark:text-neutral-300">
              <strong className="text-emerald-700 dark:text-emerald-300 font-bold block mb-0.5">
                Google Docs "Commentator" Suggestion Workflow
              </strong>
              Adjust any values, demand, trends, or star tier prices. Your changes won't overwrite live data directly. When you submit, they will be packaged into a detailed before/after diff report with your rationale, and sent to the Admin Review Panel for 1-click approval.
            </div>
          </div>
        )}

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs font-mono overflow-y-auto flex-1">
          {/* Top Row: Name, Acronym */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-neutral-700 dark:text-neutral-300 font-bold uppercase mb-1">Item Name:</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. AC-130 Gunship"
                className="w-full px-3.5 py-2 bg-white dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white font-bold text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-neutral-700 dark:text-neutral-300 font-bold uppercase mb-1 flex items-center justify-between">
                <span>Acronym (Opt):</span>
                <span className="text-[9px] text-neutral-500 font-normal">Search Key</span>
              </label>
              <input
                type="text"
                value={acronym}
                onChange={(e) => setAcronym(e.target.value.toUpperCase())}
                placeholder="e.g. AC130"
                className="w-full px-3.5 py-2 bg-white dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-orange-600 dark:text-orange-400 font-mono font-bold text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Picture / Image Upload & Clipboard */}
          <div className="p-3.5 rounded-2xl bg-orange-50/60 dark:bg-neutral-800/60 border border-orange-100 dark:border-neutral-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-neutral-800 dark:text-neutral-200 font-bold uppercase text-[11px]">
                Item Picture / Thumbnail:
              </label>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold shadow-sm transition-all cursor-pointer"
                title="Paste image directly from clipboard"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Paste Image</span>
              </button>
            </div>

            {clipboardStatus && (
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs font-sans">
                {clipboardStatus}
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="relative shrink-0 w-16 h-16 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 overflow-hidden flex items-center justify-center">
                <VehicleImage src={thumbnail} alt={name} category={category} className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 space-y-1.5">
                <input
                  type="text"
                  value={thumbnail}
                  onChange={(e) => setThumbnail(e.target.value)}
                  placeholder="https://... or upload local image"
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 text-[10px] font-bold cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload Local File</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Row: Category, Rarity, Tradeable */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-neutral-700 dark:text-neutral-300 font-bold uppercase mb-1">Category:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ItemCategory)}
                className="w-full px-3 py-2 bg-white dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-neutral-700 dark:text-neutral-300 font-bold uppercase mb-1">Rarity:</label>
              <select
                value={rarity}
                onChange={(e) => setRarity(e.target.value as ItemRarity)}
                className="w-full px-3 py-2 bg-white dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
              >
                {RARITIES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-neutral-700 dark:text-neutral-300 font-bold uppercase mb-1">Trade Status:</label>
              <button
                type="button"
                onClick={() => setTradeable(!tradeable)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  tradeable
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                    : 'bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300'
                }`}
              >
                {tradeable ? 'Tradeable (Standard)' : 'Untradeable 🔒'}
              </button>
            </div>
          </div>

          {/* Default Value, Default Demand, Default Trend (Hidden when Star Tier Manual Override is ON) */}
          {(!hasStars || !hasManualStarOverrides) && (
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-neutral-800 dark:text-neutral-200 uppercase text-[11px]">
                  Default Item Valuation:
                </span>
                <span className="text-xs font-black font-mono text-orange-600 dark:text-orange-400">
                  {formatMilitaryValue(numericValue)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 font-bold uppercase mb-1">
                    Default Value ($ / 💎):
                  </label>
                  <input
                    type="text"
                    required
                    value={valueInput}
                    onChange={(e) => handleDefaultValueChange(e.target.value)}
                    placeholder="e.g. 50k, 1.5m, 2b"
                    className="w-full px-3 py-2 bg-white dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
                  />
                  <div className="flex items-center gap-1 mt-1.5">
                    {[10000, 50000, 250000, 1000000].map(delta => (
                      <button
                        key={delta}
                        type="button"
                        onClick={() => handleQuickAddValue(delta)}
                        className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 hover:bg-orange-100 text-neutral-600 dark:text-neutral-300 text-[10px] font-bold cursor-pointer"
                      >
                        +{delta >= 1000000 ? `${delta / 1000000}M` : `${delta / 1000}K`}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 font-bold uppercase mb-1">
                    Default Demand (1–10):
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    required
                    value={demand}
                    onChange={(e) => setDemand(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-neutral-700 dark:text-neutral-300 font-bold uppercase mb-1">
                    Default Trend:
                  </label>
                  <select
                    value={trend}
                    onChange={(e) => setTrend(e.target.value as PriceTrend)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white font-mono text-xs focus:border-orange-500 focus:outline-none"
                  >
                    {TRENDS.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Base Gem Range Valuation Section (Hidden when Star Tier Manual Override is ON) */}
          {(!hasStars || !hasManualStarOverrides) && (
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span className="font-bold text-neutral-800 dark:text-neutral-200 uppercase text-[11px]">
                    Base Gem Range
                  </span>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasManualGemRange}
                    onChange={(e) => setHasManualGemRange(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-500 focus:ring-orange-400 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                  />
                  <span className="text-[11px] font-bold text-orange-700 dark:text-orange-300">
                    Manual Range Override
                  </span>
                </label>
              </div>

              {hasManualGemRange ? (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                      Min Gems:
                    </label>
                    <input
                      type="text"
                      value={gemOverrideMinInput}
                      onChange={(e) => setGemOverrideMinInput(e.target.value)}
                      placeholder="Min"
                      className="w-full px-3 py-1.5 bg-white dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-mono text-neutral-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                      Max Gems:
                    </label>
                    <input
                      type="text"
                      value={gemOverrideMaxInput}
                      onChange={(e) => setGemOverrideMaxInput(e.target.value)}
                      placeholder="Max"
                      className="w-full px-3 py-1.5 bg-white dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-mono text-neutral-900 dark:text-white"
                    />
                  </div>
                </div>
              ) : (
                (() => {
                  const autoMin = roundGemRangeValue(Math.max(0, numericValue * 0.95), numericValue);
                  const autoMax = roundGemRangeValue(numericValue * 1.05, numericValue);
                  const autoFormatted = autoMin === autoMax ? autoMin.toLocaleString() : `${autoMin.toLocaleString()} – ${autoMax.toLocaleString()}`;
                  return (
                    <div className="text-[11px] font-mono text-neutral-500 flex items-center justify-between">
                      <span>Auto Gem Range (±5%):</span>
                      <span className="font-bold text-neutral-800 dark:text-neutral-200">
                        {autoFormatted} 💎
                      </span>
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* STAR TIERS SECTION & INDIVIDUAL CARDS */}
          {hasStars && (
            <div className="p-4 rounded-3xl bg-orange-50/70 dark:bg-neutral-900/90 border border-orange-200/80 dark:border-neutral-800 space-y-4">
              {/* Star Tiers Top Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <div>
                    <span className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-xs block">
                      {isVehicle ? 'Vehicle Star Tiers (Fresh, 0★ - 5★)' : 'Soldier / Drone Star Tiers (0★ - 3★)'}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-sans">
                      {hasManualStarOverrides
                        ? (isSoldierOrDrone ? 'Custom soldier/drone multiplier overrides active' : 'Individual cards for each star tier active')
                        : (isSoldierOrDrone ? 'Using Universal Multipliers (0★: 1x, 1★: 5x, 2★: 20x, 3★: 50x)' : 'Using universal formula (Check "Manual Override" to edit individual star cards)')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                  {isVehicle && hasManualStarOverrides && (
                    <button
                      type="button"
                      onClick={() => {
                        setHasManualStarOverrides(false);
                        handleFillAllFromUniversal();
                      }}
                      className="text-[10px] px-2.5 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold transition-all flex items-center gap-1 cursor-pointer border border-emerald-300 dark:border-emerald-800 shadow-2xs"
                      title="Clear custom star overrides and revert to universal star pricing (+10k, +25k, +50k, +100k, +60k)"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Revert to Universal Rates</span>
                    </button>
                  )}
                  {isSoldierOrDrone && hasManualStarOverrides && (
                    <button
                      type="button"
                      onClick={() => setHasManualStarOverrides(false)}
                      className="text-[10px] px-2.5 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold transition-all flex items-center gap-1 cursor-pointer border border-emerald-300 dark:border-emerald-800 shadow-2xs"
                      title="Clear custom overrides and revert to universal multipliers (0★: 1x, 1★: 5x, 2★: 20x, 3★: 50x)"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Revert to Universal Multipliers</span>
                    </button>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer select-none bg-white dark:bg-neutral-800 px-3 py-1.5 rounded-xl border border-orange-200 dark:border-neutral-700 shadow-xs">
                    <input
                      type="checkbox"
                      checked={hasManualStarOverrides}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setHasManualStarOverrides(isChecked);
                        if (isChecked) {
                          setHasManualGemRange(false);
                        }
                      }}
                      className="w-4 h-4 rounded text-orange-500 focus:ring-orange-400 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                    />
                    <span className="text-[11px] font-black text-orange-700 dark:text-orange-300">
                      ⚡ Manual Override
                    </span>
                  </label>
                </div>
              </div>

              {/* VIEW 1: NOT CHECKED (Single Page / Auto Universal Preview) */}
              {!hasManualStarOverrides ? (
                <div className="p-3 rounded-2xl bg-white/80 dark:bg-neutral-800/60 border border-orange-100 dark:border-neutral-700/60 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-neutral-600 dark:text-neutral-400">
                    <span>Universal Formula Preview:</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Auto-calculated</span>
                  </div>
                  <div className={`grid grid-cols-2 sm:grid-cols-4 ${isVehicle ? 'lg:grid-cols-7' : ''} gap-1.5 text-center`}>
                    {activeTiersList.map(tier => {
                      const calc = calculateItemStarValue(
                        { ...item, value: numericValue, category, rarity, name },
                        tier.id,
                        universalStarConfig,
                        universalSoldierDroneStarConfig
                      );
                      return (
                        <div key={tier.id} className="p-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800">
                          <div className="text-[10px] text-neutral-500 font-bold">{tier.shortLabel}</div>
                          <div className="text-xs font-bold text-orange-600 dark:text-orange-400">{formatMilitaryValue(calc.totalValue)}</div>
                          <div className="text-[9px] text-neutral-400">
                            {calc.multiplier ? `${calc.multiplier}x Base` : `+${formatMilitaryValue(calc.bonus)}`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* VIEW 2: CHECKED (Individual Cards for Each Star Value) */
                <div className="space-y-3.5 pt-1 animate-in fade-in">
                  {/* Toolbar: View Mode & Fill Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-amber-500/10 dark:bg-neutral-800/90 border border-amber-300/60 dark:border-neutral-700">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase text-amber-800 dark:text-amber-300 mr-1">
                        Layout:
                      </span>
                      <button
                        type="button"
                        onClick={() => setOverrideLayoutMode('cards')}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                          overrideLayoutMode === 'cards'
                            ? 'bg-orange-500 text-white shadow-xs'
                            : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        <LayoutGrid className="w-3 h-3" />
                        <span>All Cards Grid</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setOverrideLayoutMode('tabbed')}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                          overrideLayoutMode === 'tabbed'
                            ? 'bg-orange-500 text-white shadow-xs'
                            : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        <Layers className="w-3 h-3" />
                        <span>Single Tier Focus</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleFillAllFromUniversal}
                      className="text-[10px] px-2.5 py-1 rounded-xl bg-amber-200/80 dark:bg-amber-900/60 hover:bg-amber-300 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-200 font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Re-fill All from Universal</span>
                    </button>
                  </div>

                  {/* Tab Navigation if in Tabbed Mode or as quick jumper */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {activeTiersList.map(tier => {
                      const tVal = tierOverrides[tier.id]?.value ?? numericValue;
                      const isSelected = activeTierTab === tier.id;
                      return (
                        <button
                          key={tier.id}
                          type="button"
                          onClick={() => setActiveTierTab(tier.id)}
                          className={`px-3 py-1.5 rounded-xl font-['Chakra_Petch'] text-xs font-bold uppercase transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-orange-500 text-white shadow-sm'
                              : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-orange-300'
                          }`}
                        >
                          <span>{tier.shortLabel}</span>
                          <span className={`text-[10px] font-mono ${isSelected ? 'text-white/90' : 'text-orange-600 dark:text-orange-400'}`}>
                            {formatMilitaryValue(tVal)}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Render Cards */}
                  {overrideLayoutMode === 'cards' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {activeTiersList.map(tier => renderTierCard(tier))}
                    </div>
                  ) : (
                    <div>
                      {(() => {
                        const currentTierObj = activeTiersList.find(t => t.id === activeTierTab) || activeTiersList[0];
                        return renderTierCard(currentTierObj);
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notes / Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-neutral-700 dark:text-neutral-300 font-bold uppercase text-xs">
                General Notes / Description:
              </label>
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">
                {(notes || '').length} chars
              </span>
            </div>
            <textarea
              rows={3}
              value={notes || ''}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Item description, trading insights, combat notes..."
              className="w-full px-3 py-2 bg-white dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white font-sans text-xs focus:outline-none focus:border-orange-500 transition-colors"
            />
            <div className="flex items-center gap-1.5 text-[11px] text-orange-600 dark:text-orange-400 font-mono mt-1.5">
              <Sparkles className="w-3 h-3 text-orange-500 shrink-0" />
              <span>Automatically translated when viewed in Spanish</span>
            </div>
          </div>

          {/* Admin Controls: Recently Updated & Valuation Graph */}
          {isAdmin && (
            <div className="p-4 rounded-2xl bg-orange-500/5 dark:bg-orange-950/20 border border-orange-500/20 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-['Chakra_Petch'] font-bold text-xs uppercase tracking-wider text-orange-700 dark:text-orange-300">
                    Admin Controls: Recently Updated & Graph
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-semibold">
                  Administrator
                </span>
              </div>

              {/* Adjust Recently Updated Timestamp */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-neutral-700 dark:text-neutral-300 font-bold uppercase text-[11px] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-orange-500" />
                    <span>Recently Updated Timestamp</span>
                  </label>
                  <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                    Current: {new Date(customLastUpdated).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setCustomLastUpdated(new Date().toISOString())}
                    className="px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    Bump to Top (Now)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomLastUpdated(new Date(Date.now() - 3600 * 1000).toISOString())}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-orange-400 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    1 Hour Ago
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomLastUpdated(new Date(Date.now() - 24 * 3600 * 1000).toISOString())}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-orange-400 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    1 Day Ago
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomLastUpdated(new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-orange-400 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    1 Week Ago
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomLastUpdated(new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString())}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-orange-400 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    1 Month Ago
                  </button>
                </div>

                <div className="pt-1 flex items-center gap-2">
                  <span className="text-[11px] text-neutral-500 shrink-0">Custom Date & Time:</span>
                  <input
                    type="datetime-local"
                    value={customLastUpdated ? new Date(new Date(customLastUpdated).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        setCustomLastUpdated(new Date(e.target.value).toISOString());
                      }
                    }}
                    className="px-2.5 py-1 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-800 dark:text-neutral-200 font-mono focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Recently Updated Reel Controls */}
              <div className="pt-2.5 border-t border-orange-500/20 space-y-2">
                <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  Recently Updated Reel Visibility
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inRecentlyUpdated}
                      onChange={(e) => {
                        setInRecentlyUpdated(e.target.checked);
                        if (e.target.checked) setExcludeFromRecentlyUpdated(false);
                      }}
                      className="w-4 h-4 rounded text-orange-500 focus:ring-orange-400"
                    />
                    <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
                      Force Pin in Recently Updated Reel
                    </span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={excludeFromRecentlyUpdated}
                      onChange={(e) => {
                        setExcludeFromRecentlyUpdated(e.target.checked);
                        if (e.target.checked) setInRecentlyUpdated(false);
                      }}
                      className="w-4 h-4 rounded text-rose-500 focus:ring-rose-400"
                    />
                    <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300">
                      Exclude / Hide from Reel
                    </span>
                  </label>
                </div>
              </div>

              {/* Reset Graph Button */}
              <div className="pt-2.5 border-t border-orange-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    Valuation Graph
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {item.history ? `${item.history.length} change points recorded (plotted only on changes).` : 'Standard history.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    resetItemGraph(item.id);
                    setGraphResetDone(true);
                    setTimeout(() => setGraphResetDone(false), 3500);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    graphResetDone
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:border-orange-400 text-neutral-800 dark:text-neutral-200'
                  }`}
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${graphResetDone ? 'animate-spin' : ''}`} />
                  <span>{graphResetDone ? 'Graph Reset!' : 'Reset Graph to Clean Baseline'}</span>
                </button>
              </div>
            </div>
          )}

          {/* GOOGLE DOCS COMMENTATOR RATIONALE INPUT (Consultant Only) */}
          {isConsultant && (
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-[#11241f] border border-emerald-300/80 dark:border-emerald-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    {(activeStaff?.displayName || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-100 uppercase">
                      Commentator Rationale & Market Evidence
                    </label>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-sans">
                      This explanation will be presented in the Admin Review Panel alongside your proposed values.
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800">
                  Google Docs Commentary
                </span>
              </div>

              <textarea
                rows={3}
                required
                value={consultantCommentary}
                onChange={(e) => setConsultantCommentary(e.target.value)}
                placeholder="Explain the trades, recent discord logs, supply shifts, or in-game evidence justifying this valuation adjustment..."
                className="w-full px-3.5 py-2.5 bg-white dark:bg-[#0d1c18] border border-emerald-300 dark:border-emerald-700/80 rounded-xl text-neutral-900 dark:text-white text-xs font-sans focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
              />
            </div>
          )}

          {/* Proposal submission success banner */}
          {proposalSubmittedSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-400 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2 font-sans font-bold animate-in fade-in">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Suggestion submitted! Administrators will review and approve in one click.</span>
            </div>
          )}

          {/* Delete confirmation or Submit Actions */}
          {isConfirmingDelete ? (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-in fade-in shrink-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
                  Delete "{item.name}"? This cannot be undone.
                </span>
              </div>
              <div className="flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-3 py-1.5 text-xs rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-3.5 py-1.5 text-xs rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm cursor-pointer"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-2 flex items-center justify-between gap-3 shrink-0">
              {isConsultant ? (
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-sans">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Consultant Suggestion Mode</span>
                </div>
              ) : isVehicle && !isAdmin ? (
                <button
                  type="button"
                  disabled
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-neutral-400 dark:text-neutral-600 bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 font-semibold cursor-not-allowed text-xs"
                  title="Vehicles can only be deleted by Admin"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete (Admin Only)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-800 font-semibold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                {isConsultant ? (
                  <button
                    type="submit"
                    disabled={isSubmittingProposal || proposalSubmittedSuccess}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-600/25 cursor-pointer disabled:opacity-50 transition-all"
                  >
                    {isSubmittingProposal ? (
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{isSubmittingProposal ? 'Submitting...' : 'Submit for Admin Review'}</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-md shadow-orange-500/20 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save All Changes</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export const ItemEditModal: React.FC = () => {
  const { activeEditModalItem, setActiveEditModalItem, isStaffMode } = useValueList();

  if (!activeEditModalItem || !isStaffMode) return null;

  return (
    <ItemEditModalContent
      key={activeEditModalItem.id}
      item={activeEditModalItem}
      onClose={() => setActiveEditModalItem(null)}
    />
  );
};
