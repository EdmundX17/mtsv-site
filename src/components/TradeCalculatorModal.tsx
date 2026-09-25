import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useValueList } from '../context/ValueListContext';
import {
  MilitaryItem,
  StarTier,
  TradeSide,
  ItemCategory,
  TradeCalculatorState
} from '../types';
import {
  formatMilitaryValue,
  getRarityConfig,
  getTrendList,
  getDemandDescription,
  isVehicleCategory,
  isSoldierOrDroneCategory,
  STAR_TIERS,
  SOLDIER_DRONE_STAR_TIERS,
  getItemStarTierData,
  getItemLowestStarTierData
} from '../utils/formatters';
import {
  analyzeTrade,
  calculateRequiredGemsToBalance,
  generateTradeShareText,
  GEM_TAX_RATE,
  EvaluatedTradeSide,
  EvaluatedTradeItem
} from '../utils/tradeCalculator';
import { VehicleImage } from './VehicleImage';
import { MilitaryGemIcon } from './MilitaryGemIcon';
import { safeLocalStorageGet, safeLocalStorageSet } from '../utils/storageHelper';
import {
  Scale,
  X,
  RotateCcw,
  Plus,
  Minus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Activity,
  Star,
  Coins,
  Search,
  Check,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ArrowUpDown,
  Copy,
  CheckCheck,
  Bookmark,
  History,
  Zap,
  Info,
  SlidersHorizontal,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const QUICK_GEM_PRESETS = [
  { label: '+50k', value: 50_000 },
  { label: '+250k', value: 250_000 },
  { label: '+1M', value: 1_000_000 },
  { label: '+5M', value: 5_000_000 },
  { label: '+10M', value: 10_000_000 },
  { label: '+25M', value: 25_000_000 }
];

const CATEGORIES: (ItemCategory | 'All')[] = ['All', 'Air', 'Land', 'Naval', 'Soldier', 'Drone', 'Tags', 'Other'];
const RARITY_FILTERS = ['All', 'Limited Edition', 'Exotic', 'Legendary', 'Epic', 'Rare', 'Common'] as const;

type PickerSortOption = 'value_desc' | 'value_asc' | 'demand_desc' | 'name_asc';

interface SavedTradeRecord {
  id: string;
  name: string;
  timestamp: string;
  youSummary: string;
  themSummary: string;
  verdict: string;
  state: TradeCalculatorState;
}

const SAVED_TRADES_STORAGE_KEY = 'mts_saved_trades_v1';
const MAX_TRADE_GEMS_CAP = 1_000_000_000;

function parseGemInput(input: string): number {
  const cleaned = input.trim().toLowerCase().replace(/,/g, '');
  if (!cleaned) return 0;
  if (cleaned.endsWith('m') || cleaned.endsWith('mil')) {
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.min(MAX_TRADE_GEMS_CAP, Math.max(0, Math.round(num * 1_000_000)));
  }
  if (cleaned.endsWith('k')) {
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.min(MAX_TRADE_GEMS_CAP, Math.max(0, Math.round(num * 1_000)));
  }
  if (cleaned.endsWith('b') || cleaned.endsWith('bil')) {
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.min(MAX_TRADE_GEMS_CAP, Math.max(0, Math.round(num * 1_000_000_000)));
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.min(MAX_TRADE_GEMS_CAP, Math.max(0, Math.round(num)));
}

export const TradeCalculatorModal: React.FC = () => {
  const {
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
    items,
    universalStarConfig,
    universalSoldierDroneStarConfig,
    siteInfo,
    t,
    translateCategory,
    translateRarity,
    translateTrend,
    translateDemand,
    language
  } = useValueList();

  // Active side for item picker modal
  const [pickerSide, setPickerSide] = useState<TradeSide | null>(null);
  const [pickerSearchInput, setPickerSearchInput] = useState<string>('');
  const [pickerSearch, setPickerSearch] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [pickerCategory, setPickerCategory] = useState<ItemCategory | 'All'>('All');
  const [pickerRarity, setPickerRarity] = useState<string>('All');
  const [pickerSort, setPickerSort] = useState<PickerSortOption>('value_desc');
  const [pickerVisibleCount, setPickerVisibleCount] = useState<number>(10);
  const [keepPickerOpen, setKeepPickerOpen] = useState<boolean>(false);
  const pickerSentinelRef = useRef<HTMLDivElement | null>(null);

  // Submodals & Overlays
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [showSavedTrades, setShowSavedTrades] = useState<boolean>(false);
  const [savedTrades, setSavedTrades] = useState<SavedTradeRecord[]>(() => {
    try {
      const saved = safeLocalStorageGet(SAVED_TRADES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Gem text inputs for live abbreviation parsing (e.g. 5m, 500k)
  const [youGemsInput, setYouGemsInput] = useState<string>(() => tradeState.youGems ? tradeState.youGems.toString() : '');
  const [themGemsInput, setThemGemsInput] = useState<string>(() => tradeState.themGems ? tradeState.themGems.toString() : '');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Search buffer debounce effect (250ms buffer) to reduce lag on slower devices
  useEffect(() => {
    if (pickerSearchInput === pickerSearch) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      setPickerSearch(pickerSearchInput);
      setIsSearching(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [pickerSearchInput, pickerSearch]);

  // Reset picker filters & search buffer when picker modal closes
  useEffect(() => {
    if (!pickerSide) {
      setPickerSearchInput('');
      setPickerSearch('');
      setIsSearching(false);
      setPickerVisibleCount(10);
    }
  }, [pickerSide]);

  // Sync gem text inputs when state changes externally (e.g., clear trade, presets, swap)
  useEffect(() => {
    setYouGemsInput(tradeState.youGems ? tradeState.youGems.toString() : '');
  }, [tradeState.youGems]);

  useEffect(() => {
    setThemGemsInput(tradeState.themGems ? tradeState.themGems.toString() : '');
  }, [tradeState.themGems]);

  // Persist saved trades
  useEffect(() => {
    try {
      safeLocalStorageSet(SAVED_TRADES_STORAGE_KEY, JSON.stringify(savedTrades));
    } catch (e) {
      console.error('Failed to save trades', e);
    }
  }, [savedTrades]);

  // Item occurrences count in the active picker side
  const currentSideItemCounts = useMemo(() => {
    if (!pickerSide) return new Map<string, number>();
    const list = pickerSide === 'you' ? tradeState.youItems : tradeState.themItems;
    const counts = new Map<string, number>();
    list.forEach(slot => {
      counts.set(slot.itemId, (counts.get(slot.itemId) || 0) + (slot.quantity || 1));
    });
    return counts;
  }, [pickerSide, tradeState.youItems, tradeState.themItems]);

  // Filtered & Sorted items for item picker modal
  const filteredPickerItems = useMemo(() => {
    if (!pickerSide) return [];
    return items.filter(item => {
      // Category filter
      if (pickerCategory !== 'All') {
        const itemCat = item.category === 'Sea' ? 'Naval' : item.category;
        const targetCat = pickerCategory === 'Sea' ? 'Naval' : pickerCategory;
        if (itemCat !== targetCat) return false;
      }
      // Rarity filter
      if (pickerRarity !== 'All') {
        if (item.rarity !== pickerRarity) return false;
      }
      // Search query (fuzzy: matches name, acronym, category, rarity, ignoring hyphens/spaces)
      if (pickerSearch.trim() !== '') {
        const qRaw = pickerSearch.toLowerCase().trim();
        const qClean = qRaw.replace(/[^a-z0-9]/g, '');

        const nameRaw = item.name.toLowerCase();
        const nameClean = nameRaw.replace(/[^a-z0-9]/g, '');

        const acronymRaw = (item.acronym || '').toLowerCase();
        const acronymClean = acronymRaw.replace(/[^a-z0-9]/g, '');

        const catRaw = item.category.toLowerCase();
        const rarityRaw = item.rarity.toLowerCase();

        const matchName = nameRaw.includes(qRaw) || (qClean.length >= 2 && nameClean.includes(qClean));
        const matchAcronym = acronymRaw.includes(qRaw) || (qClean.length >= 2 && acronymClean.includes(qClean));
        const matchCat = catRaw.includes(qRaw);
        const matchRarity = rarityRaw.includes(qRaw);

        if (!matchName && !matchAcronym && !matchCat && !matchRarity) return false;
      }
      return true;
    }).sort((a, b) => {
      if (pickerSort === 'value_desc') return b.value - a.value;
      if (pickerSort === 'value_asc') return a.value - b.value;
      if (pickerSort === 'demand_desc') return b.demand - a.demand;
      if (pickerSort === 'name_asc') return a.name.localeCompare(b.name);
      return b.value - a.value;
    });
  }, [items, pickerSide, pickerCategory, pickerRarity, pickerSearch, pickerSort]);

  // Reset lazy loading count to 60 whenever category, search buffer, rarity, sort, or side changes
  useEffect(() => {
    setPickerVisibleCount(60);
  }, [pickerCategory, pickerRarity, pickerSearch, pickerSort, pickerSide]);

  // Lazy loading observer to only load 60 items/images at a time to reduce lag on slower devices
  useEffect(() => {
    if (!pickerSide) return;
    const sentinel = pickerSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPickerVisibleCount((prev) => Math.min(prev + 60, filteredPickerItems.length));
        }
      },
      { root: null, rootMargin: '200px', threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.unobserve(sentinel);
  }, [pickerSide, filteredPickerItems.length]);

  // Close with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pickerSide) {
          setPickerSide(null);
        } else if (showSavedTrades) {
          setShowSavedTrades(false);
        } else if (showClearConfirm) {
          setShowClearConfirm(false);
        } else if (isTradeCalcOpen) {
          setIsTradeCalcOpen(false);
        }
      }
    };
    if (isTradeCalcOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTradeCalcOpen, pickerSide, showSavedTrades, showClearConfirm, setIsTradeCalcOpen]);

  // Prevent background body scrolling when modal is open
  useEffect(() => {
    if (isTradeCalcOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isTradeCalcOpen]);

  // Real-time evaluation of the trade
  const tradeAnalysis = useMemo(() => {
    return analyzeTrade(
      tradeState.youItems,
      tradeState.youGems,
      tradeState.themItems,
      tradeState.themGems,
      items,
      universalStarConfig,
      universalSoldierDroneStarConfig,
      language
    );
  }, [tradeState, items, universalStarConfig, universalSoldierDroneStarConfig, language]);

  // Auto-balance calculation factoring in 8% gem tax
  const balanceInfo = useMemo(() => {
    if (!tradeAnalysis.hasItems || Math.abs(tradeAnalysis.netValueDiff) < 10) return null;
    return calculateRequiredGemsToBalance(tradeAnalysis.netValueDiff);
  }, [tradeAnalysis.hasItems, tradeAnalysis.netValueDiff]);

  // Lazy loaded vehicles/items: load 24 at a time
  const visiblePickerItems = useMemo(() => {
    return filteredPickerItems.slice(0, pickerVisibleCount);
  }, [filteredPickerItems, pickerVisibleCount]);

  if (!isTradeCalcOpen) return null;

  const handleClearTrade = () => {
    clearTrade();
    setShowClearConfirm(false);
    showToast(language === 'es' ? 'Calculadora de intercambios restablecida' : 'Trade calculator cleared');
  };

  const handleSwapSides = () => {
    swapTradeSides();
    showToast(language === 'es' ? 'Ofertas intercambiadas entre ambos lados' : 'Offers swapped between sides');
  };

  const handleApplyAutoBalance = () => {
    if (!balanceInfo) return;
    if (balanceInfo.sideToGive === 'them') {
      const newTotal = Math.min(MAX_TRADE_GEMS_CAP, (tradeState.themGems || 0) + balanceInfo.rawGemsNeeded);
      updateTradeGems('them', newTotal);
      showToast(language === 'es'
        ? `Se agregaron ${balanceInfo.rawGemsNeeded.toLocaleString()} gemas a Ellos (+${balanceInfo.netGemsEffect.toLocaleString()} netas tras 8% impuesto) para equilibrar`
        : `Added ${balanceInfo.rawGemsNeeded.toLocaleString()} gems to Them (+${balanceInfo.netGemsEffect.toLocaleString()} net after 8% tax) to balance`);
    } else {
      const newTotal = Math.min(MAX_TRADE_GEMS_CAP, (tradeState.youGems || 0) + balanceInfo.rawGemsNeeded);
      updateTradeGems('you', newTotal);
      showToast(language === 'es'
        ? `Se agregaron ${balanceInfo.rawGemsNeeded.toLocaleString()} gemas a Tu lado para equilibrar el intercambio`
        : `Added ${balanceInfo.rawGemsNeeded.toLocaleString()} gems to You to balance trade`);
    }
  };

  const handleCopyTradeSummary = () => {
    const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const text = generateTradeShareText(tradeAnalysis, 'Military Tycoon Services', language, currentUrl);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(language === 'es'
          ? '¡Resumen de intercambio copiado al portapapeles! Listo para pegar en Discord o Roblox.'
          : 'Trade summary copied to clipboard! Ready to paste in Discord or Roblox.');
      }).catch(() => {
        fallbackCopyText(text);
      });
    } else {
      fallbackCopyText(text);
    }
  };

  const fallbackCopyText = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showToast(language === 'es' ? '¡Resumen de intercambio copiado al portapapeles!' : 'Trade summary copied to clipboard!');
    } catch {
      showToast(language === 'es' ? 'No se pudo copiar automáticamente. Por favor copia manualmente.' : 'Could not auto-copy. Please copy manually.');
    }
    document.body.removeChild(textArea);
  };

  const handleSaveCurrentTrade = () => {
    if (!tradeAnalysis.hasItems) {
      showToast(language === 'es' ? 'Agrega artículos antes de guardar este intercambio' : 'Add items before saving this trade');
      return;
    }
    const youItemStr = tradeAnalysis.you.items.slice(0, 2).map(i => i.item.name).join(', ') + (tradeAnalysis.you.items.length > 2 ? '...' : '');
    const themItemStr = tradeAnalysis.them.items.slice(0, 2).map(i => i.item.name).join(', ') + (tradeAnalysis.them.items.length > 2 ? '...' : '');
    const newRecord: SavedTradeRecord = {
      id: `saved-${Date.now()}`,
      name: `Trade (${tradeAnalysis.verdictType}) - ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      timestamp: new Date().toISOString(),
      youSummary: youItemStr || `${tradeState.youGems.toLocaleString()} Gems`,
      themSummary: themItemStr || `${tradeState.themGems.toLocaleString()} Gems`,
      verdict: tradeAnalysis.verdictType,
      state: JSON.parse(JSON.stringify(tradeState))
    };
    setSavedTrades(prev => [newRecord, ...prev.slice(0, 14)]);
    showToast(language === 'es' ? '¡Intercambio guardado en el historial!' : 'Trade saved to presets!');
  };

  const handleLoadSavedTrade = (record: SavedTradeRecord) => {
    setTradeState(record.state);
    setShowSavedTrades(false);
    showToast(language === 'es' ? `Cargado "${record.name}"` : `Loaded "${record.name}"`);
  };

  const handleDeleteSavedTrade = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedTrades(prev => prev.filter(t => t.id !== id));
    showToast('Removed saved trade');
  };

  const getVerdictStyle = () => {
    switch (tradeAnalysis.verdictType) {
      case 'BIG_WIN':
        return {
          badgeText: t('bigWin').toUpperCase(),
          bg: 'bg-emerald-500/15 dark:bg-emerald-950/40',
          border: 'border-emerald-500/60 dark:border-emerald-500/70',
          textColor: 'text-emerald-600 dark:text-emerald-400',
          badgeBg: 'bg-emerald-500 text-white',
          barColor: 'bg-emerald-500',
          icon: Sparkles
        };
      case 'WIN':
        return {
          badgeText: t('win').toUpperCase(),
          bg: 'bg-emerald-500/10 dark:bg-emerald-950/30',
          border: 'border-emerald-400/50 dark:border-emerald-500/50',
          textColor: 'text-emerald-600 dark:text-emerald-400',
          badgeBg: 'bg-emerald-600 text-white',
          barColor: 'bg-emerald-500',
          icon: TrendingUp
        };
      case 'FAIR':
        return {
          badgeText: t('fairTrade').toUpperCase(),
          bg: 'bg-amber-500/10 dark:bg-amber-950/30',
          border: 'border-amber-400/50 dark:border-amber-500/50',
          textColor: 'text-amber-600 dark:text-amber-400',
          badgeBg: 'bg-amber-500 text-white',
          barColor: 'bg-amber-500',
          icon: Scale
        };
      case 'LOSE':
        return {
          badgeText: t('lose').toUpperCase(),
          bg: 'bg-rose-500/10 dark:bg-rose-950/30',
          border: 'border-rose-400/50 dark:border-rose-500/50',
          textColor: 'text-rose-600 dark:text-rose-400',
          badgeBg: 'bg-rose-600 text-white',
          barColor: 'bg-rose-500',
          icon: TrendingDown
        };
      case 'BIG_LOSE':
        return {
          badgeText: t('bigLose').toUpperCase(),
          bg: 'bg-rose-500/20 dark:bg-rose-950/50',
          border: 'border-rose-600/70 dark:border-rose-600/80',
          textColor: 'text-rose-700 dark:text-rose-400 font-black',
          badgeBg: 'bg-rose-700 text-white',
          barColor: 'bg-rose-600',
          icon: AlertTriangle
        };
      case 'EMPTY':
      default:
        return {
          badgeText: t('addItems').toUpperCase(),
          bg: 'bg-neutral-100 dark:bg-neutral-900/60',
          border: 'border-neutral-200 dark:border-neutral-800',
          textColor: 'text-neutral-500 dark:text-neutral-400',
          badgeBg: 'bg-neutral-500 text-white',
          barColor: 'bg-neutral-400',
          icon: Scale
        };
    }
  };

  const verdictStyle = getVerdictStyle();
  const VerdictIcon = verdictStyle.icon;

  // Percentage shares for visual value ratio bar
  const totalCombinedValue = tradeAnalysis.you.totalValue + tradeAnalysis.them.totalValue;
  const youValueShare = totalCombinedValue > 0
    ? Math.round((tradeAnalysis.you.totalValue / totalCombinedValue) * 100)
    : 50;
  const themValueShare = 100 - youValueShare;

  const renderSideItems = (side: TradeSide, evaluatedSide: EvaluatedTradeSide) => {
    return (
      <div className="space-y-3">
        {evaluatedSide.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 text-center bg-neutral-50/50 dark:bg-neutral-900/20">
            <Scale className="w-10 h-10 text-neutral-300 dark:text-neutral-700 mb-2" />
            <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              {t('noItemsOffered')}
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
              {t('noItemsOfferedDesc')}
            </p>
            <button
              id={`add-first-item-btn-${side}`}
              onClick={() => setPickerSide(side)}
              className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-600 dark:text-orange-400 font-semibold text-xs transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{t('addFirstItem')}</span>
            </button>
          </div>
        ) : (
          evaluatedSide.items.map((slot) => {
            const isVeh = isVehicleCategory(slot.item.category, slot.item);
            const isSoldierDrone = isSoldierOrDroneCategory(slot.item.category, slot.item);
            const rarityConf = getRarityConfig(slot.item.rarity);
            const demandConf = getDemandDescription(slot.demand);
            const trendList = getTrendList(slot.trend);

            // Available star tier options for this item
            const availableTiers = isVeh
              ? STAR_TIERS
              : isSoldierDrone
                ? SOLDIER_DRONE_STAR_TIERS
                : [{ id: '0' as StarTier, label: 'Standard', shortLabel: '0★', starsCount: 0 }];

            return (
              <motion.div
                key={slot.instanceId}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-sm hover:border-orange-300 dark:hover:border-neutral-700 transition-all flex flex-col gap-2.5"
              >
                {/* Top Row: Thumbnail, Name, Acronym, Rarity & Quick Actions */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 shrink-0 border border-neutral-200 dark:border-neutral-700/80 flex items-center justify-center">
                    <VehicleImage
                      src={slot.item.thumbnail}
                      alt={slot.item.name}
                      category={slot.item.category}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate">
                        {slot.item.name}
                      </h4>
                      {slot.item.acronym && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                          [{slot.item.acronym}]
                        </span>
                      )}
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${rarityConf.badgeBg}`}>
                        {translateRarity(slot.item.rarity)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px]">
                      {/* Demand Pill */}
                      <span className={`font-mono font-bold ${demandConf.color}`}>
                        {t('demand')}: {slot.demand}/10
                      </span>
                      <span className="text-neutral-300 dark:text-neutral-700">•</span>
                      {/* Trend Pill */}
                      <span className={`font-semibold ${trendList[0]?.textColor || 'text-neutral-400'}`}>
                        {translateTrend(trendList[0]?.label || 'Stable')}
                      </span>
                    </div>
                  </div>

                  {/* Slot Action Buttons: Move to Other Side & Remove */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        moveTradeItem(side, slot.instanceId);
                        showToast(language === 'es'
                          ? `Se movió ${slot.item.name} a la oferta de ${side === 'you' ? 'Ellos' : 'Tu lado'}`
                          : `Moved ${slot.item.name} to ${side === 'you' ? 'their' : 'your'} offer`);
                      }}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                      title={side === 'you' ? t('moveToTheirOffer') : t('moveToYourOffer')}
                    >
                      {side === 'you' ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => removeTradeItem(side, slot.instanceId)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                      title={t('remove')}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Bottom Row: Star Tier Selector, Quantity Controls & Total Value */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex-wrap">
                  {/* Star Tier Selector */}
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                    <select
                      value={slot.starTier}
                      onChange={(e) => updateTradeItemTier(side, slot.instanceId, e.target.value as StarTier)}
                      className="text-xs font-mono font-bold py-1 px-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:ring-1 focus:ring-orange-500 cursor-pointer"
                    >
                      {availableTiers.map((tier) => {
                        const tierValue = getItemStarTierData(
                          slot.item,
                          tier.id,
                          universalStarConfig,
                          universalSoldierDroneStarConfig
                        ).value;
                        return (
                          <option key={tier.id} value={tier.id}>
                            {tier.label} ({formatMilitaryValue(tierValue)})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Quantity & Slot Total */}
                  <div className="flex items-center gap-3">
                    {/* Quantity Controls */}
                    <div className="flex items-center border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden bg-neutral-50 dark:bg-neutral-800/60">
                      <button
                        onClick={() => updateTradeItemQuantity(side, slot.instanceId, slot.quantity - 1)}
                        disabled={slot.quantity <= 1}
                        className="px-2 py-0.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-30 cursor-pointer text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 py-0.5 text-xs font-mono font-bold text-neutral-800 dark:text-neutral-200">
                        {slot.quantity}
                      </span>
                      <button
                        onClick={() => updateTradeItemQuantity(side, slot.instanceId, slot.quantity + 1)}
                        className="px-2 py-0.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Calculated Total for this slot */}
                    <div className="text-right">
                      <div className="font-mono text-xs sm:text-sm font-black text-orange-600 dark:text-orange-400">
                        {formatMilitaryValue(slot.totalValue)}
                      </div>
                      {slot.unitStars > 0 && (
                        <div className="text-[10px] font-mono font-semibold text-amber-500">
                          {slot.totalStars}★ Total
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div
      id="trade-calculator-overlay"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 lg:p-6 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setIsTradeCalcOpen(false);
        }
      }}
    >
      {/* Dynamic Toast Feedback */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            className="fixed top-6 z-70 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-neutral-900/95 dark:bg-neutral-100 text-white dark:text-neutral-900 border border-neutral-700/60 dark:border-neutral-300 shadow-2xl font-mono text-xs font-bold"
          >
            <CheckCheck className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-6xl bg-white dark:bg-[#0d0e14] border border-orange-200/80 dark:border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]"
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3.5 bg-white/95 dark:bg-[#0d0e14]/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20 shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold font-['Chakra_Petch'] text-neutral-900 dark:text-white tracking-wide truncate">
                  {t('tradeCalculatorTitle').toUpperCase()}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                  {t('gemTaxNotice')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Swap Sides (Flip) */}
            <button
              id="swap-trade-sides-btn"
              onClick={handleSwapSides}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-orange-50 dark:bg-neutral-800/80 dark:hover:bg-neutral-700/80 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:text-orange-600 dark:hover:text-orange-400 text-xs font-semibold transition-all cursor-pointer shadow-xs"
              title="Flip / Swap your offer and their offer"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('flipSides')}</span>
            </button>

            {/* Copy / Share Trade Summary */}
            <button
              id="copy-trade-summary-btn"
              onClick={handleCopyTradeSummary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-emerald-50 dark:bg-neutral-800/80 dark:hover:bg-emerald-950/40 border border-neutral-200 dark:border-neutral-700 hover:border-emerald-300 dark:hover:border-emerald-800 text-neutral-700 dark:text-neutral-300 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-semibold transition-all cursor-pointer shadow-xs"
              title="Copy formatted trade card to clipboard for Discord or Roblox"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('copyPost')}</span>
            </button>

            {/* Saved Trades Dropdown Trigger */}
            <button
              id="saved-trades-btn"
              onClick={() => setShowSavedTrades(!showSavedTrades)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800/80 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold transition-all cursor-pointer shadow-xs"
              title={t('savedTrades')}
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t('history')}</span>
              {savedTrades.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-neutral-200 dark:bg-neutral-700">
                  {savedTrades.length}
                </span>
              )}
            </button>

            {/* Clear Trade Button */}
            <button
              id="clear-trade-btn"
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-red-50 dark:bg-neutral-800/80 dark:hover:bg-red-950/40 border border-neutral-200 dark:border-neutral-700 hover:border-red-300 dark:hover:border-red-800 text-neutral-700 dark:text-neutral-300 hover:text-red-600 dark:hover:text-red-400 text-xs font-semibold transition-all cursor-pointer shadow-xs"
              title={t('clearTradeTitle')}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{t('clear')}</span>
            </button>

            {/* Close Button */}
            <button
              id="close-trade-calc-btn"
              onClick={() => setIsTradeCalcOpen(false)}
              className="p-1.5 sm:p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer ml-1"
              title={t('close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Saved Trades Drawer / Overlay */}
        <AnimatePresence>
          {showSavedTrades && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/90 dark:bg-neutral-900/90 backdrop-blur-md px-4 sm:px-6 py-3 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                    {t('savedTrades')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveCurrentTrade}
                    disabled={!tradeAnalysis.hasItems}
                    className="px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-[11px] font-semibold cursor-pointer transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <Bookmark className="w-3 h-3" />
                    <span>{t('saveCurrent')}</span>
                  </button>
                  <button
                    onClick={() => setShowSavedTrades(false)}
                    className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                  >
                    {t('close')}
                  </button>
                </div>
              </div>

              {savedTrades.length === 0 ? (
                <p className="text-xs text-neutral-400 py-3 text-center">
                  {t('noSavedTrades')}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto py-1">
                  {savedTrades.map((rec) => (
                    <div
                      key={rec.id}
                      onClick={() => handleLoadSavedTrade(rec)}
                      className="p-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-orange-400 dark:hover:border-orange-500 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                            {rec.verdict}
                          </span>
                          <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                            {rec.name}
                          </p>
                        </div>
                        <p className="text-[10px] text-neutral-500 truncate mt-0.5">
                          You: {rec.youSummary} ⇄ Them: {rec.themSummary}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSavedTrade(rec.id, e)}
                        className="p-1 text-neutral-400 hover:text-red-500 rounded transition-colors shrink-0"
                        title="Delete saved trade"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Main Verdict & Analytics Dashboard */}
          <div className={`p-4 sm:p-5 rounded-3xl border ${verdictStyle.border} ${verdictStyle.bg} transition-all space-y-4`}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Left: Big Verdict Pill & Headline */}
              <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto">
                <div className={`p-3.5 rounded-2xl ${verdictStyle.badgeBg} shadow-lg shadow-black/10 shrink-0`}>
                  <VerdictIcon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black tracking-wider uppercase ${verdictStyle.badgeBg}`}>
                      {verdictStyle.badgeText}
                    </span>
                    {tradeAnalysis.hasItems && (
                      <span className={`text-sm sm:text-base font-mono font-black ${verdictStyle.textColor}`}>
                        {tradeAnalysis.percentDiff >= 0 ? '+' : ''}{tradeAnalysis.percentDiff.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white mt-1">
                    {tradeAnalysis.advice.headline}
                  </h3>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 max-w-xl">
                    {tradeAnalysis.advice.description}
                  </p>
                </div>
              </div>

              {/* Right: Key Differences (Value, Stars, Demand) */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full md:w-auto shrink-0">
                {/* Value Difference */}
                <div className="p-2.5 sm:p-3 rounded-2xl bg-white/80 dark:bg-black/40 border border-neutral-200/80 dark:border-neutral-800 text-center">
                  <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
                    {t('netValue')}
                  </span>
                  <span className={`text-xs sm:text-sm font-mono font-black ${
                    tradeAnalysis.netValueDiff > 0
                      ? 'text-emerald-500 dark:text-emerald-400'
                      : tradeAnalysis.netValueDiff < 0
                        ? 'text-rose-500 dark:text-rose-400'
                        : 'text-neutral-700 dark:text-neutral-300'
                  }`}>
                    {tradeAnalysis.netValueDiff >= 0 ? '+' : ''}{formatMilitaryValue(tradeAnalysis.netValueDiff)}
                  </span>
                </div>

                {/* Stars Difference */}
                <div className="p-2.5 sm:p-3 rounded-2xl bg-white/80 dark:bg-black/40 border border-neutral-200/80 dark:border-neutral-800 text-center">
                  <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
                    {t('starsDelta')}
                  </span>
                  <span className={`text-xs sm:text-sm font-mono font-black ${
                    tradeAnalysis.starsDiff > 0
                      ? 'text-amber-500'
                      : tradeAnalysis.starsDiff < 0
                        ? 'text-neutral-400'
                        : 'text-neutral-600 dark:text-neutral-300'
                  }`}>
                    {tradeAnalysis.starsDiff >= 0 ? '+' : ''}{tradeAnalysis.starsDiff}★
                  </span>
                </div>

                {/* Demand Difference */}
                <div className="p-2.5 sm:p-3 rounded-2xl bg-white/80 dark:bg-black/40 border border-neutral-200/80 dark:border-neutral-800 text-center">
                  <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
                    {t('demandDelta')}
                  </span>
                  <span className={`text-xs sm:text-sm font-mono font-black ${
                    tradeAnalysis.hasDemandComparison && tradeAnalysis.demandDiff !== null
                      ? tradeAnalysis.demandDiff > 0
                        ? 'text-teal-500 dark:text-teal-400'
                        : tradeAnalysis.demandDiff < 0
                          ? 'text-orange-500'
                          : 'text-neutral-600 dark:text-neutral-300'
                      : 'text-neutral-400 dark:text-neutral-500'
                  }`}>
                    {tradeAnalysis.hasDemandComparison && tradeAnalysis.demandDiff !== null
                      ? `${tradeAnalysis.demandDiff >= 0 ? '+' : ''}${tradeAnalysis.demandDiff} pts`
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Value Ratio Bar & Fair Market Zone */}
            {tradeAnalysis.hasItems && (
              <div className="space-y-1.5 pt-2 border-t border-black/10 dark:border-white/10">
                <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-neutral-600 dark:text-neutral-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    {t('you')}: {formatMilitaryValue(tradeAnalysis.you.totalValue)} ({youValueShare}%)
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {Math.abs(tradeAnalysis.percentDiff) <= 5 ? `🎯 ${t('withinFairValue')}` : `${Math.abs(tradeAnalysis.percentDiff).toFixed(1)}% ${t('imbalance')}`}
                  </span>
                  <span className="flex items-center gap-1">
                    {t('them')}: {formatMilitaryValue(tradeAnalysis.them.totalValue)} ({themValueShare}%)
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </span>
                </div>

                {/* Dual-tone Progress Bar */}
                <div className="relative h-2.5 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 flex">
                  <div
                    style={{ width: `${youValueShare}%` }}
                    className="h-full bg-blue-500 transition-all duration-300"
                  />
                  <div
                    style={{ width: `${themValueShare}%` }}
                    className="h-full bg-emerald-500 transition-all duration-300"
                  />
                  {/* Center Line marker at 50% */}
                  <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-black/40 dark:bg-white/40 -translate-x-1/2 z-10" />
                </div>
              </div>
            )}

            {/* Auto-Balance Trade Tool (Smart 1-Click Balance) */}
            {balanceInfo && (
              <div className="p-3 rounded-2xl bg-white/90 dark:bg-neutral-900/90 border border-orange-300/80 dark:border-orange-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                      {t('autoBalanceTrade')}
                    </h4>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                      {balanceInfo.sideToGive === 'them'
                        ? (language === 'es'
                            ? `Pídele a Ellos que agreguen ${balanceInfo.rawGemsNeeded.toLocaleString()} gemas (${balanceInfo.netGemsEffect.toLocaleString()} netas tras el 8% de impuesto) para equilibrar.`
                            : `Ask Them to add ${balanceInfo.rawGemsNeeded.toLocaleString()} gems (delivers ${balanceInfo.netGemsEffect.toLocaleString()} net after 8% tax) to balance.`)
                        : (language === 'es'
                            ? `Agrega ${balanceInfo.rawGemsNeeded.toLocaleString()} gemas a Tu lado para igualar el intercambio por completo.`
                            : `Add ${balanceInfo.rawGemsNeeded.toLocaleString()} gems to Your side to make the trade completely even.`)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleApplyAutoBalance}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold text-xs transition-all cursor-pointer shrink-0 shadow-sm shadow-orange-500/20 flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{t('balanceWithGems')} ({balanceInfo.sideToGive === 'them' ? t('them') : t('you')})</span>
                </button>
              </div>
            )}
          </div>

          {/* Trade Sides: Left (You) vs Right (Them) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ================= YOUR SIDE ================= */}
            <div className="flex flex-col p-4 sm:p-5 rounded-3xl bg-neutral-50 dark:bg-[#12131b] border border-neutral-200/80 dark:border-neutral-800 space-y-4">
              {/* Header: You Give */}
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                    <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white font-['Chakra_Petch'] tracking-wide">
                      {t('yourOfferYouGive')}
                    </h3>
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {tradeAnalysis.you.itemCount} {t('items')} • {tradeAnalysis.you.totalStars}★ {t('stars')} • {tradeAnalysis.you.hasItemDemand ? `${t('averageDemand')}: ${tradeAnalysis.you.averageDemand}/10` : t('gems')}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">
                    {t('yourTotalGiven')}
                  </span>
                  <span className="font-mono text-base sm:text-lg font-black text-neutral-900 dark:text-white">
                    {formatMilitaryValue(tradeAnalysis.you.totalValue)}
                  </span>
                </div>
              </div>

              {/* Add Item Trigger Button */}
              <button
                id="add-item-you-btn"
                onClick={() => setPickerSide('you')}
                className="w-full py-2.5 px-4 rounded-2xl bg-white dark:bg-neutral-800/80 hover:bg-orange-50 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-orange-400 dark:hover:border-orange-500 text-neutral-800 dark:text-neutral-200 hover:text-orange-600 dark:hover:text-orange-400 font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-orange-500" />
                <span>{t('addItemToYourSide')}</span>
              </button>

              {/* Items List */}
              {renderSideItems('you', tradeAnalysis.you)}

              {/* Gems Section for You */}
              <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    <MilitaryGemIcon className="w-4 h-4" />
                    <span>{t('yourGemsOffered')}</span>
                  </label>
                  {tradeState.youGems > 0 && (
                    <button
                      onClick={() => {
                        updateTradeGems('you', 0);
                        setYouGemsInput('');
                      }}
                      className="text-[11px] text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      {t('clearGems')}
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder={language === 'es' ? 'Ingresa gemas (Máx. 1B)...' : 'Enter gems (Max 1B)...'}
                    value={youGemsInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setYouGemsInput(val);
                      const parsed = parseGemInput(val);
                      updateTradeGems('you', parsed);
                    }}
                    className="w-full pl-8 pr-4 py-2 text-xs sm:text-sm font-mono font-bold bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  />
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <MilitaryGemIcon className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Quick Gem Increment Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {QUICK_GEM_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => {
                        const newGems = Math.min(MAX_TRADE_GEMS_CAP, (tradeState.youGems || 0) + preset.value);
                        updateTradeGems('you', newGems);
                        setYouGemsInput(newGems.toString());
                      }}
                      className="px-2 py-1 rounded-lg bg-neutral-200/70 hover:bg-orange-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:text-orange-600 dark:hover:text-orange-400 text-[11px] font-mono font-semibold transition-colors cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* 8% Gem Tax Breakdown for You */}
                {tradeState.youGems > 0 && (
                  <div className="p-2.5 rounded-xl bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/20 text-[11px] space-y-1 font-mono">
                    <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                      <span>{t('gemsSentByYou')}</span>
                      <span className="font-bold text-neutral-900 dark:text-white">{tradeState.youGems.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-rose-500">
                      <span>{t('taxDeducted')}</span>
                      <span>-{tradeAnalysis.you.gemTaxAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400 pt-1 border-t border-orange-500/20">
                      <span>{t('recipientReceivesNet')}</span>
                      <span>{tradeAnalysis.you.netGems.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ================= THEIR SIDE ================= */}
            <div className="flex flex-col p-4 sm:p-5 rounded-3xl bg-neutral-50 dark:bg-[#12131b] border border-neutral-200/80 dark:border-neutral-800 space-y-4">
              {/* Header: They Give */}
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white font-['Chakra_Petch'] tracking-wide">
                      {t('theirOfferTheyGive')}
                    </h3>
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {tradeAnalysis.them.itemCount} {t('items')} • {tradeAnalysis.them.totalStars}★ {t('stars')} • {tradeAnalysis.them.hasItemDemand ? `${t('averageDemand')}: ${tradeAnalysis.them.averageDemand}/10` : t('gems')}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">
                    {t('theirTotalReceived')}
                  </span>
                  <span className="font-mono text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                    {formatMilitaryValue(tradeAnalysis.them.totalValue)}
                  </span>
                </div>
              </div>

              {/* Add Item Trigger Button */}
              <button
                id="add-item-them-btn"
                onClick={() => setPickerSide('them')}
                className="w-full py-2.5 px-4 rounded-2xl bg-white dark:bg-neutral-800/80 hover:bg-orange-50 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-orange-400 dark:hover:border-orange-500 text-neutral-800 dark:text-neutral-200 hover:text-orange-600 dark:hover:text-orange-400 font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-orange-500" />
                <span>{t('addItemToTheirSide')}</span>
              </button>

              {/* Items List */}
              {renderSideItems('them', tradeAnalysis.them)}

              {/* Gems Section for Them */}
              <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    <MilitaryGemIcon className="w-4 h-4" />
                    <span>{t('theirGemsOffered')}</span>
                  </label>
                  {tradeState.themGems > 0 && (
                    <button
                      onClick={() => {
                        updateTradeGems('them', 0);
                        setThemGemsInput('');
                      }}
                      className="text-[11px] text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      {t('clearGems')}
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder={language === 'es' ? 'Ingresa gemas (Máx. 1B)...' : 'Enter gems (Max 1B)...'}
                    value={themGemsInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setThemGemsInput(val);
                      const parsed = parseGemInput(val);
                      updateTradeGems('them', parsed);
                    }}
                    className="w-full pl-8 pr-4 py-2 text-xs sm:text-sm font-mono font-bold bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  />
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <MilitaryGemIcon className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Quick Gem Increment Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {QUICK_GEM_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => {
                        const newGems = Math.min(MAX_TRADE_GEMS_CAP, (tradeState.themGems || 0) + preset.value);
                        updateTradeGems('them', newGems);
                        setThemGemsInput(newGems.toString());
                      }}
                      className="px-2 py-1 rounded-lg bg-neutral-200/70 hover:bg-orange-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:text-orange-600 dark:hover:text-orange-400 text-[11px] font-mono font-semibold transition-colors cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* 8% Gem Tax Breakdown for Them */}
                {tradeState.themGems > 0 && (
                  <div className="p-2.5 rounded-xl bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/20 text-[11px] space-y-1 font-mono">
                    <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                      <span>{t('gemsSentByThem')}</span>
                      <span className="font-bold text-neutral-900 dark:text-white">{tradeState.themGems.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-rose-500">
                      <span>{t('taxDeducted')}</span>
                      <span>-{tradeAnalysis.them.gemTaxAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400 pt-1 border-t border-orange-500/20">
                      <span>{t('youReceiveNet')}</span>
                      <span>{tradeAnalysis.them.netGems.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="sticky bottom-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3 bg-white/95 dark:bg-[#0d0e14]/95 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span>{t('totalUnitsTraded')}: {tradeAnalysis.you.itemCount + tradeAnalysis.them.itemCount}</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">{t('gemTaxRate')}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTradeCalcOpen(false)}
              className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs transition-colors cursor-pointer shadow-sm shadow-orange-500/20"
            >
              {t('done')}
            </button>
          </div>
        </div>

        {/* ================= SUPERCHARGED ITEM PICKER SUBMODAL ================= */}
        <AnimatePresence>
          {pickerSide && (
            <div
              className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) setPickerSide(null);
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-3xl bg-white dark:bg-[#12141c] border border-orange-200 dark:border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
              >
                {/* Picker Header */}
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white">
                        {t('addItemTo')} {pickerSide === 'you' ? t('yourSide') : t('theirSide')}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800/60">
                        {visiblePickerItems.length} {t('of')} {filteredPickerItems.length} {t('items')}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {t('pickerDesc')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Multi-Add Toggle */}
                    <button
                      type="button"
                      onClick={() => setKeepPickerOpen(!keepPickerOpen)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        keepPickerOpen
                          ? 'bg-orange-500 text-white border-orange-600 shadow-xs'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                      title="Keep picker open to rapidly add multiple items"
                    >
                      <Check className={`w-3.5 h-3.5 ${keepPickerOpen ? 'opacity-100' : 'opacity-30'}`} />
                      <span className="hidden sm:inline">{t('multiAddMode')}</span>
                    </button>

                    <button
                      onClick={() => setPickerSide(null)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Picker Search, Filters & Sorter */}
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 space-y-3 bg-neutral-50/80 dark:bg-neutral-900/40">
                  {/* Search Bar with 250ms Buffer */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder={t('searchVehiclePlaceholder')}
                      value={pickerSearchInput}
                      onChange={(e) => setPickerSearchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setPickerSearch(pickerSearchInput);
                          setIsSearching(false);
                        }
                      }}
                      className="w-full pl-9 pr-14 py-2 text-xs sm:text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                      autoFocus
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      {isSearching && (
                        <Loader2 className="w-3.5 h-3.5 text-orange-500 animate-spin" />
                      )}
                      {pickerSearchInput && (
                        <button
                          type="button"
                          onClick={() => {
                            setPickerSearchInput('');
                            setPickerSearch('');
                            setIsSearching(false);
                          }}
                          className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white text-xs px-1 py-0.5 rounded cursor-pointer"
                          title="Clear search"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filter Pills & Sort Select */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                    {/* Category Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setPickerCategory(cat)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                            pickerCategory === cat
                              ? 'bg-orange-500 text-white shadow-xs'
                              : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-orange-50 dark:hover:bg-neutral-700 border border-neutral-200/80 dark:border-neutral-700'
                          }`}
                        >
                          {translateCategory(cat)}
                        </button>
                      ))}
                    </div>

                    {/* Sorter Dropdown */}
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-400" />
                      <select
                        value={pickerSort}
                        onChange={(e) => setPickerSort(e.target.value as PickerSortOption)}
                        className="text-xs font-medium py-1 px-2 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 cursor-pointer"
                      >
                        <option value="value_desc">{t('sortValueHigh')}</option>
                        <option value="value_asc">{t('sortValueLow')}</option>
                        <option value="demand_desc">{t('sortHighestDemand')}</option>
                        <option value="name_asc">{t('sortNameAZ')}</option>
                      </select>
                    </div>
                  </div>

                  {/* Rarity Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
                    <span className="text-[11px] font-bold text-neutral-400 shrink-0">{t('rarity')}:</span>
                    {RARITY_FILTERS.map((rarity) => (
                      <button
                        key={rarity}
                        onClick={() => setPickerRarity(rarity)}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold shrink-0 transition-colors cursor-pointer ${
                          pickerRarity === rarity
                            ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xs'
                            : 'bg-white dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200/80 dark:border-neutral-700'
                        }`}
                      >
                        {translateRarity(rarity)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Picker Items Grid (Lazy loaded 24 at a time with instant star tier buttons) */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {filteredPickerItems.length === 0 ? (
                    <div className="p-8 text-center text-neutral-500 text-xs">
                      {t('noMatchingVehicles')}
                    </div>
                  ) : (
                    <>
                      {visiblePickerItems.map((item) => {
                        const isVeh = isVehicleCategory(item.category, item);
                        const isSoldierDrone = isSoldierOrDroneCategory(item.category, item);
                        const rarityConf = getRarityConfig(item.rarity);
                        const demandConf = getDemandDescription(item.demand);
                        const lowestTierData = getItemLowestStarTierData(
                          item,
                          universalStarConfig,
                          universalSoldierDroneStarConfig
                        );
                        const existingCount = currentSideItemCounts.get(item.id) || 0;

                        const availableTiers = isVeh
                          ? STAR_TIERS
                          : isSoldierDrone
                            ? SOLDIER_DRONE_STAR_TIERS
                            : [{ id: '0' as StarTier, label: '0★', shortLabel: '0★', starsCount: 0 }];

                        return (
                          <div
                            key={item.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-neutral-900 hover:bg-orange-50/40 dark:hover:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 hover:border-orange-300 dark:hover:border-neutral-700 transition-all gap-3 group"
                          >
                            {/* Left: Thumbnail & Info */}
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 shrink-0 border border-neutral-200 dark:border-neutral-700">
                                <VehicleImage
                                  src={item.thumbnail}
                                  alt={item.name}
                                  category={item.category}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors truncate">
                                    {item.name}
                                  </h4>
                                  {item.acronym && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                                      [{item.acronym}]
                                    </span>
                                  )}
                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${rarityConf.badgeBg}`}>
                                    {translateRarity(item.rarity)}
                                  </span>
                                  {existingCount > 0 && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                      x{existingCount} {t('inTrade')}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-0.5">
                                  <span>{translateCategory(item.category)}</span>
                                  <span>•</span>
                                  <span className={`font-bold ${demandConf.color}`}>
                                    {t('demand')}: {item.demand}/10
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Right: Quick Star Tier Buttons & Lowest Add */}
                            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-neutral-800">
                              {/* Quick Direct Star Tier Buttons (0★ - 5★) */}
                              <div className="flex items-center gap-1">
                                {availableTiers.map((tier) => (
                                  <button
                                    key={tier.id}
                                    onClick={() => {
                                      addTradeItem(pickerSide, item, tier.id);
                                      showToast(language === 'es' ? `Agregado ${item.name} (${tier.shortLabel})` : `Added ${item.name} (${tier.shortLabel})`);
                                      if (!keepPickerOpen) setPickerSide(null);
                                    }}
                                    className="px-1.5 py-1 rounded-lg bg-neutral-100 hover:bg-orange-500 hover:text-white dark:bg-neutral-800 dark:hover:bg-orange-500 text-[10px] font-mono font-bold text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                                    title={`Add ${tier.shortLabel}`}
                                  >
                                    {tier.shortLabel}
                                  </button>
                                ))}
                              </div>

                              {/* Primary Add Button (Lowest Tier) */}
                              <button
                                onClick={() => {
                                  addTradeItem(pickerSide, item, lowestTierData.tierId as StarTier);
                                  showToast(language === 'es' ? `Agregado ${item.name} (${lowestTierData.shortLabel})` : `Added ${item.name} (${lowestTierData.shortLabel})`);
                                  if (!keepPickerOpen) setPickerSide(null);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-mono text-xs font-bold transition-all cursor-pointer shadow-xs"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>{formatMilitaryValue(lowestTierData.value)}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Lazy Loading Sentinel & Load More buttons */}
                      {pickerVisibleCount < filteredPickerItems.length && (
                        <div ref={pickerSentinelRef} className="pt-2 pb-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPickerVisibleCount((prev) => Math.min(prev + 60, filteredPickerItems.length))}
                            className="flex-1 py-3 px-4 rounded-2xl border border-dashed border-orange-300 dark:border-neutral-700 hover:border-orange-500 bg-orange-50/60 dark:bg-neutral-850 hover:bg-orange-100/60 dark:hover:bg-neutral-800 text-orange-600 dark:text-orange-400 text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                          >
                            <Plus className="w-4 h-4" />
                            <span>{t('loadMoreVehicles')} ({t('showing')} {visiblePickerItems.length} {t('of')} {filteredPickerItems.length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPickerVisibleCount(filteredPickerItems.length)}
                            className="py-3 px-4 rounded-2xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-700 dark:text-orange-300 text-xs font-mono font-bold transition-all cursor-pointer"
                          >
                            {language === 'es' ? 'Mostrar todos' : 'Show All'}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ================= CLEAR CONFIRMATION MODAL ================= */}
        <AnimatePresence>
          {showClearConfirm && (
            <div
              className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
              onClick={() => setShowClearConfirm(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm p-5 rounded-3xl bg-white dark:bg-[#151722] border border-neutral-200 dark:border-neutral-800 shadow-2xl text-center space-y-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    {t('clearTradePrompt')}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    {t('clearTradeWarning')}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 font-semibold text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleClearTrade}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-sm shadow-red-600/20"
                  >
                    {t('clearAll')}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
