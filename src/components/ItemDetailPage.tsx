import React, { useState, useMemo, useEffect } from 'react';
import { MilitaryItem, StarTier, PriceTrend } from '../types';
import { useValueList } from '../context/ValueListContext';
import {
  formatMilitaryValue,
  getRarityConfig,
  getTrendList,
  getDemandDescription,
  isVehicleCategory,
  isSoldierOrDroneCategory,
  STAR_TIERS,
  SOLDIER_DRONE_STAR_TIERS,
  normalizeTrend,
  calculateGemRange,
  getAllItemStarTiersData,
  getItemStarTierData,
  itemHasManualOverrides,
  getItemSlug
} from '../utils/formatters';
import {
  ArrowLeft,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Sparkles,
  ShieldCheck,
  Edit3,
  Check,
  Share2,
  Send,
  Flag,
  Calendar,
  Layers,
  FileText,
  ExternalLink,
  History,
  CheckCircle2,
  AlertTriangle,
  Zap,
  LineChart as LineChartIcon,
  Scale,
  Save,
  X,
  Trash2,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getStandardizedItemHistory, getProcessedHistoryForTimeframe, hasItemPriceChanges } from '../utils/historyHelper';
import { getVehicleImageUrl } from '../data/vehicleImageMap';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import confetti from 'canvas-confetti';
import { VehicleImage } from './VehicleImage';
import { CloudflareTurnstile } from './CloudflareTurnstile';
import { MilitaryGemIcon } from './MilitaryGemIcon';
import { useAutoTranslate } from '../hooks/useAutoTranslate';

interface ItemDetailPageProps {
  item: MilitaryItem;
  onBack?: () => void;
}

const TREND_OPTIONS: { id: PriceTrend; label: string }[] = [
  { id: 'Glazed', label: 'Glazed' },
  { id: 'Rising', label: 'Rising ↗' },
  { id: 'Stable', label: 'Stable ═' },
  { id: 'Dropping', label: 'Dropping ↘' },
  { id: 'Unstable', label: 'Unstable' }
];

export const ItemDetailPage: React.FC<ItemDetailPageProps> = ({ item, onBack }) => {
  const {
    getItemStarValue,
    getItemSelectedTier,
    setItemStarTier,
    navigateToCatalog,
    setActiveEditModalItem,
    submitReport,
    auditLogs,
    addPriceHistoryPoint,
    removePriceHistoryPoint,
    addToRecentlyUpdated,
    removeFromRecentlyUpdated,
    updateItem,
    isStaffMode,
    theme,
    universalStarConfig,
    universalSoldierDroneStarConfig,
    openTradeCalculatorWithItem,
    t,
    translateCategory,
    translateRarity,
    translateTrend,
    language
  } = useValueList();

  const isUntradeable = item.tradeable === false;

  const handleToggleTradeable = () => {
    if (!isStaffMode) return;
    const newStatus = isUntradeable; // If currently false (untradeable), set to true
    updateItem(
      { ...item, tradeable: newStatus },
      `Staff changed tradeability to ${newStatus ? 'TRADEABLE' : 'UNTRADEABLE'}`
    );
  };

  const selectedTier = getItemSelectedTier(item.id, item);
  const isVehicle = isVehicleCategory(item.category, item);
  const isSoldierOrDrone = isSoldierOrDroneCategory(item.category, item);
  const hasStars = isVehicle || isSoldierOrDrone;
  const hasManualOverrides = itemHasManualOverrides(item);

  const tierData = getItemStarTierData(item, hasStars ? selectedTier : '0', universalStarConfig, universalSoldierDroneStarConfig);
  const starCalc = {
    totalValue: tierData.value,
    bonus: tierData.bonus,
    multiplier: tierData.multiplier,
    isOverride: tierData.isOverride,
    isMultiplier: Boolean(tierData.multiplier)
  };
  const activeVehicleTierObj = STAR_TIERS.find((t) => t.id === selectedTier) || STAR_TIERS[0];
  const activeSoldierDroneTierObj = SOLDIER_DRONE_STAR_TIERS.find((t) => t.id === selectedTier) || SOLDIER_DRONE_STAR_TIERS[0];
  const activeTierLabel = isSoldierOrDrone ? activeSoldierDroneTierObj.label : activeVehicleTierObj.label;

  const rarityConfig = getRarityConfig(item.rarity);
  const trendList = getTrendList(tierData.trend);
  const demandInfo = getDemandDescription(tierData.demand);
  const gemRange = tierData.gemRange;

  const notesTranslation = useAutoTranslate(item.notes, language);

  const allTiersData = useMemo(() => {
    return getAllItemStarTiersData(item, universalStarConfig, universalSoldierDroneStarConfig);
  }, [item, universalStarConfig, universalSoldierDroneStarConfig]);

  // Graph View Mode: 'all_tiers' or 'selected'
  const [chartViewMode, setChartViewMode] = useState<'selected' | 'all_tiers'>(() => {
    return (hasStars && hasManualOverrides) ? 'all_tiers' : 'selected';
  });

  // Timeframe filter for embedded chart (7D / 30D / 90D / All)
  const [chartTimeframe, setChartTimeframe] = useState<'7D' | '30D' | '90D' | 'All'>('All');

  // Embedded Value Suggestion Form state
  const [suggestedValue, setSuggestedValue] = useState<number>(starCalc.totalValue || item.value || 50000);
  const [suggestedDemand, setSuggestedDemand] = useState<number>(item.demand || 5);
  const [suggestedTrend, setSuggestedTrend] = useState<PriceTrend>(normalizeTrend(item.trend));
  const [suggestedStarTier, setSuggestedStarTier] = useState<StarTier>(selectedTier);
  const [playerUsername, setPlayerUsername] = useState('');
  const [discordTag, setDiscordTag] = useState('');
  const [proofLink, setProofLink] = useState('');
  const [reasonNotes, setReasonNotes] = useState('');
  const [suggestionCaptchaToken, setSuggestionCaptchaToken] = useState<string>('');
  const [suggestionCaptchaError, setSuggestionCaptchaError] = useState<string | null>(null);
  const [isReportSubmitted, setIsReportSubmitted] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyItemLink = () => {
    const hostOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://mtsvalues.com';
    const slug = getItemSlug(item);
    const url = `${hostOrigin}/item/${slug}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 2000);
        } catch {}
        document.body.removeChild(textarea);
      });
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } catch {}
      document.body.removeChild(textarea);
    }
  };

  // Staff add point state
  const [showAddPointForm, setShowAddPointForm] = useState(false);
  const [showManagePoints, setShowManagePoints] = useState(false);
  const [deletingPointIndex, setDeletingPointIndex] = useState<number | null>(null);
  const [isUpdatingRecentlyUpdated, setIsUpdatingRecentlyUpdated] = useState(false);
  const [newPointValue, setNewPointValue] = useState<number>(starCalc.totalValue || item.value);
  const [newPointDate, setNewPointDate] = useState<string>(language === 'es' ? 'Hoy' : 'Today');
  const [newPointNote, setNewPointNote] = useState<string>('');

  useEffect(() => {
    setNewPointValue(starCalc.totalValue || item.value);
  }, [selectedTier, starCalc.totalValue, item.value]);

  // Staff inline description / notes editor state
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [inlineNotesText, setInlineNotesText] = useState(item.notes || '');
  const [notesSaveSuccess, setNotesSaveSuccess] = useState(false);

  const hasRecordedChanges = useMemo(() => {
    return hasItemPriceChanges(item);
  }, [item]);

  // Process history points for chart ensuring at least 1 month history and NO duplicate days in 7D view
  const historyData = useMemo(() => {
    const fullHistory = getStandardizedItemHistory(item);
    const filtered = getProcessedHistoryForTimeframe(fullHistory, chartTimeframe, item.value);

    const baseCurrentVal = item.value || 1;
    return filtered.map((h, idx) => {
      const isLatest = idx === filtered.length - 1;
      const pointRatio = h.value / baseCurrentVal;
      const pointObj: Record<string, any> = {
        date: h.date,
        note: h.note,
        tier: h.tier
      };

      allTiersData.forEach(t => {
        if (h.tierValues && h.tierValues[t.tierId] !== undefined) {
          pointObj[t.tierId] = h.tierValues[t.tierId];
        } else if (isLatest) {
          pointObj[t.tierId] = t.value;
        } else {
          pointObj[t.tierId] = Math.round(t.value * pointRatio);
        }
      });

      // Crucial fix: Plot the specific selected star tier's historical value!
      pointObj.value = (hasStars && pointObj[selectedTier] !== undefined)
        ? pointObj[selectedTier]
        : h.value;

      return pointObj;
    });
  }, [item, chartTimeframe, allTiersData, hasStars, selectedTier]);

  const historyValues = useMemo(() => {
    return historyData.map(h => h.value);
  }, [historyData]);
  const allTimeHigh = Math.max(...historyValues, starCalc.totalValue);
  const allTimeLow = Math.min(...historyValues, starCalc.totalValue);
  const initialValue = historyValues[0] || starCalc.totalValue;
  const netChangePercent = initialValue > 0 ? ((starCalc.totalValue - initialValue) / initialValue) * 100 : 0;

  // Toggle internal staff audit trail vs public changelog
  const [showStaffAuditTrail, setShowStaffAuditTrail] = useState(false);

  // Filter raw audit logs for this specific item (used when staff audit view is enabled)
  const itemAuditLogs = useMemo(() => {
    return auditLogs.filter(
      (log) => log.itemId === item.id || log.itemName.toLowerCase() === item.name.toLowerCase()
    );
  }, [auditLogs, item.id, item.name]);

  // Strict filter for PUBLIC market changelog (Only values, star tier values, demand, and trends - NO private staff data)
  const publicItemChangelogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchesItem = log.itemId === item.id || log.itemName.toLowerCase() === item.name.toLowerCase();
      if (!matchesItem) return false;
      if (log.skipWebhook) return false;

      // Exclude administrative logs
      if (log.action === 'SYSTEM_RESET' || log.action === 'DATA_EXPORT') return false;
      const lowerDetails = (log.details || '').toLowerCase();
      if (lowerDetails.includes('backup') || lowerDetails.includes('recovery') || lowerDetails.includes('auth')) return false;

      // Check for public market shifts
      const hasBaseVal = log.oldValue !== undefined && log.newValue !== undefined && Number(log.oldValue) !== Number(log.newValue);
      const hasBaseDem = log.oldDemand !== undefined && log.newDemand !== undefined && Number(log.oldDemand) !== Number(log.newDemand);
      const hasBaseTrend = Boolean(log.oldTrend && log.newTrend && log.oldTrend !== log.newTrend);
      const hasStars = Boolean(log.starChanges && Array.isArray(log.starChanges) && log.starChanges.length > 0);
      const isPriceUpdate = log.action === 'PRICE_UPDATE' || log.action === 'REPORT_ACCEPTED' || log.action === 'ITEM_ADDED';

      return hasBaseVal || hasBaseDem || hasBaseTrend || hasStars || (isPriceUpdate && (log.newValue !== undefined || log.newDemand !== undefined));
    });
  }, [auditLogs, item.id, item.name]);

  // Synchronize document title and OpenGraph / Twitter meta tags with current vehicle
  useEffect(() => {
    const prevTitle = document.title;
    document.title = `${item.name} | Military Tycoon Services`;

    const setMeta = (attrName: string, attrVal: string, content: string) => {
      let el = document.querySelector(`meta[${attrName}="${attrVal}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrVal);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    setMeta('property', 'og:title', `${item.name} | Military Tycoon Services`);
    setMeta('name', 'twitter:title', `${item.name} | Military Tycoon Services`);
    
    const formattedVal = typeof item.value === 'number' ? `$${item.value.toLocaleString()}` : item.value;
    const itemDesc = `Roblox Military Tycoon ${item.name} (${item.rarity}) — Market Value: ${formattedVal} | Demand: ${item.demand}/10 | Trend: ${item.trend}. View full stats, tier values, and trade calculator on Military Tycoon Services.`;
    
    setMeta('property', 'og:description', itemDesc);
    setMeta('name', 'twitter:description', itemDesc);
    
    const hostOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://mtsvalues.com';
    const canonicalItemUrl = `${hostOrigin}/item/${getItemSlug(item)}`;
    setMeta('property', 'og:url', canonicalItemUrl);
    setMeta('name', 'twitter:card', 'summary_large_image');

    const cacheBuster = item.lastUpdated ? new Date(item.lastUpdated).getTime() : Date.now();
    const embedImage = `${hostOrigin}/api/item-image/${encodeURIComponent(item.id)}.png?v=${cacheBuster}`;

    setMeta('property', 'og:image', embedImage);
    setMeta('property', 'og:image:url', embedImage);
    setMeta('property', 'og:image:secure_url', embedImage);
    setMeta('name', 'twitter:image', embedImage);

    return () => {
      document.title = prevTitle;
      const defaultImg = typeof window !== 'undefined' ? `${window.location.origin}/mtsanimated.gif` : '/mtsanimated.gif';
      setMeta('property', 'og:title', 'MTS | Military Tycoon Services Value List');
      setMeta('name', 'twitter:title', 'MTS | Military Tycoon Services Value List');
      setMeta('property', 'og:image', defaultImg);
      setMeta('property', 'og:image:url', defaultImg);
      setMeta('property', 'og:image:secure_url', defaultImg);
      setMeta('name', 'twitter:image', defaultImg);
    };
  }, [item]);

  const handleTierSelect = (tierId: StarTier) => {
    setItemStarTier(item.id, tierId);
    setSuggestedStarTier(tierId);
    const newTierData = getItemStarTierData(item, tierId, universalStarConfig, universalSoldierDroneStarConfig);
    setSuggestedValue(newTierData.value);
    setSuggestedDemand(newTierData.demand);
  };

  const handleSuggestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofLink.trim()) {
      setSuggestionCaptchaError(language === 'es' ? 'Se requiere un enlace de evidencia.' : 'Evidence / Proof link is required.');
      return;
    }
    if (!reasonNotes.trim()) {
      setSuggestionCaptchaError(language === 'es' ? 'Se requiere el motivo de la sugerencia.' : 'Reason for suggestion is required.');
      return;
    }
    if (!suggestionCaptchaToken) {
      setSuggestionCaptchaError('Cloudflare human verification is required. Please check the box above to verify.');
      return;
    }
    setSuggestionCaptchaError(null);

    submitReport({
      itemId: item.id,
      itemName: item.name,
      itemCategory: item.category,
      itemThumbnail: item.thumbnail,
      currentValue: starCalc.totalValue,
      suggestedValue,
      currentDemand: tierData.demand,
      suggestedDemand,
      currentTrend: normalizeTrend(item.trend),
      suggestedTrend,
      playerUsername: playerUsername.trim() || 'Anonymous Trader',
      discordTag: discordTag.trim() || undefined,
      reason: reasonNotes.trim(),
      proofLink: proofLink.trim()
    });

    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f97316', '#fb923c', '#fdba74', '#ea580c']
      });
    } catch (err) {}

    setIsReportSubmitted(true);
    setSuggestionCaptchaToken('');
  };

  const handleAddPointSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addPriceHistoryPoint(item.id, {
      value: newPointValue,
      date: newPointDate.trim() || (language === 'es' ? 'Hoy' : 'Today'),
      note: newPointNote.trim() || (language === 'es' ? 'Transacción de intercambio de mercado verificada' : 'Verified market trade transaction'),
      tier: hasStars ? selectedTier : undefined
    });
    setShowAddPointForm(false);
    setNewPointNote('');
  };

  const isInRecentlyUpdated = useMemo(() => {
    if (item.excludeFromRecentlyUpdated) return false;
    if (item.inRecentlyUpdated) return true;
    if (hasItemPriceChanges(item)) return true;
    if (item.lastUpdated) {
      const ageMs = Date.now() - new Date(item.lastUpdated).getTime();
      if (!isNaN(ageMs) && ageMs < 14 * 24 * 60 * 60 * 1000) return true;
    }
    return false;
  }, [item]);

  const handleToggleRecentlyUpdated = async () => {
    if (!isStaffMode || isUpdatingRecentlyUpdated) return;
    setIsUpdatingRecentlyUpdated(true);
    try {
      if (isInRecentlyUpdated) {
        await removeFromRecentlyUpdated(item.id, 'Removed via Item Detail Page Staff Controls');
      } else {
        await addToRecentlyUpdated(item.id, 'Added via Item Detail Page Staff Controls');
      }
    } finally {
      setIsUpdatingRecentlyUpdated(false);
    }
  };

  const handleRemovePoint = async (pointIndex: number) => {
    if (!isStaffMode) return;
    try {
      await removePriceHistoryPoint(item.id, pointIndex, 'Removed via Item Detail Page Staff Controls');
      setDeletingPointIndex(null);
    } catch (err) {
      console.error('Failed to remove price history point:', err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Navigation & Breadcrumbs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-orange-200/60 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onBack || navigateToCatalog}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-neutral-900 hover:bg-orange-50 dark:hover:bg-neutral-800 border border-orange-200/80 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-orange-600 dark:hover:text-orange-400 font-mono text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-orange-500" />
            <span>{t('backToCatalog')}</span>
          </motion.button>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-400 dark:text-neutral-500 overflow-hidden">
            <span className="cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-300" onClick={navigateToCatalog}>{t('catalog')}</span>
            <span>/</span>
            <span className="uppercase text-neutral-600 dark:text-neutral-400 font-bold">{translateCategory(item.category)}</span>
            <span>/</span>
            <span className="text-orange-600 dark:text-orange-400 font-bold truncate max-w-[160px] sm:max-w-xs">{item.name}</span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Copy / Share Item Link */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleCopyItemLink}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-mono font-bold transition-all shadow-sm cursor-pointer ${
              copiedLink
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                : 'bg-neutral-100 hover:bg-neutral-200/80 dark:bg-neutral-800/80 dark:hover:bg-neutral-700/80 border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
            }`}
            title="Copy shareable item page link"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-orange-500" />
                <span>Share</span>
              </>
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => openTradeCalculatorWithItem('you', item, selectedTier)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-xs font-mono font-bold text-orange-600 dark:text-orange-400 transition-colors shadow-sm cursor-pointer"
            title={t('addToTradeCalc')}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>{t('tradeCalcBtn')}</span>
          </motion.button>

          {/* Staff Recently Updated Quick Toggle */}
          {isStaffMode && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              disabled={isUpdatingRecentlyUpdated}
              onClick={handleToggleRecentlyUpdated}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all shadow-sm cursor-pointer border ${
                isInRecentlyUpdated
                  ? 'bg-amber-500/15 hover:bg-rose-500/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                  : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
              }`}
              title={isInRecentlyUpdated ? t('removeFromRecentlyUpdated') : t('addToRecentlyUpdated')}
            >
              {isInRecentlyUpdated ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>{isUpdatingRecentlyUpdated ? 'Updating...' : t('removeFromRecentlyUpdated')}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{isUpdatingRecentlyUpdated ? 'Updating...' : t('addToRecentlyUpdated')}</span>
                </>
              )}
            </motion.button>
          )}

          {isStaffMode && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveEditModalItem(item)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-mono font-bold transition-all shadow-sm shadow-orange-500/20 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{t('staffEditBtn')}</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Main Header / Overview Row */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Big Thumbnail Card with Glow */}
        <div className="lg:col-span-5 rounded-3xl bg-white/80 dark:bg-[#121520]/90 backdrop-blur-2xl border border-orange-200/80 dark:border-neutral-800 p-6 shadow-xl relative overflow-hidden flex flex-col items-center justify-center group">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-amber-500/5 pointer-events-none" />

          {/* Badges Overlay */}
          <div className="w-full flex items-center justify-between gap-2 mb-4 z-10 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-3 py-1 rounded-xl bg-black/85 dark:bg-black/90 backdrop-blur-md border border-neutral-700 text-white text-xs font-mono font-bold uppercase tracking-wider shadow-sm">
                {translateCategory(item.category)}
              </span>
            </div>

            {/* Tradeability Tag & Staff Direct Switch */}
            <div className="flex items-center gap-1.5">
              {isUntradeable && (
                <span className="px-3 py-1 rounded-xl bg-orange-500 text-white border border-orange-400 text-xs font-mono font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-white" />
                  {t('untradeableBadge')}
                </span>
              )}

              {isStaffMode && (
                <button
                  type="button"
                  onClick={handleToggleTradeable}
                  className="px-2 py-1 rounded-lg bg-orange-100 hover:bg-orange-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-[10px] font-mono font-bold border border-orange-300 dark:border-neutral-700 cursor-pointer transition-colors"
                  title="Staff Toggle Tradeability Status"
                >
                  {isUntradeable ? t('setTradeable') : t('setUntradeable')}
                </button>
              )}
            </div>
          </div>

          {/* Big Thumbnail Container */}
          <div className="relative w-full aspect-video sm:aspect-square max-h-72 rounded-2xl bg-neutral-100/90 dark:bg-[#0a0d14] border border-orange-100 dark:border-neutral-800 flex items-center justify-center overflow-hidden shadow-inner">
            <VehicleImage
              src={item.thumbnail}
              alt={item.name}
              itemId={item.id}
              category={item.category}
              className="w-full h-full object-cover object-center scale-110 group-hover:scale-120 transition-transform duration-500 drop-shadow-xl"
            />
            {/* Rarity Tag: Top Right of Image */}
            <div className="absolute top-3 right-3 z-10 pointer-events-none">
              <span className={`px-3 py-1 rounded-xl text-xs font-mono uppercase tracking-wider font-black border backdrop-blur-md shadow-md ${rarityConfig.pillClass}`}>
                <span className={rarityConfig.textClass || rarityConfig.text}>
                  {translateRarity(item.rarity)}
                </span>
              </span>
            </div>
          </div>

          {/* Gem Valuation Pill */}
          <div className="w-full mt-4 flex items-center justify-between px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-[#161b22] border border-neutral-200 dark:border-[#30363d] font-mono text-xs sm:text-sm font-bold min-w-0">
            <div className="flex items-center gap-2 min-w-0 whitespace-nowrap">
              <MilitaryGemIcon className="w-4 h-4 shrink-0" />
              <span className="text-neutral-500 dark:text-neutral-400 font-bold uppercase text-[11px] sm:text-xs shrink-0 whitespace-nowrap">{t('gemRange')}</span>
              <span className="text-neutral-900 dark:text-white font-extrabold text-xs sm:text-sm whitespace-nowrap">{gemRange.formatted}</span>
            </div>
            {isStaffMode && gemRange.isManual && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-bold shrink-0 whitespace-nowrap ml-2">
                {t('override')}
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Title, Valuations, Star Switcher, and 4-Stat Metric Grid */}
        <div className="lg:col-span-7 space-y-5">
          {/* Title and Acronym */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-['Chakra_Petch'] font-black uppercase text-neutral-900 dark:text-white tracking-tight">
                {item.name}
              </h1>
              {item.acronym && (
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 tracking-wider uppercase inline-flex items-center">
                  {item.acronym}
                </span>
              )}
            </div>
          </div>

          {/* Valuation Box */}
          <div className="p-5 rounded-3xl bg-neutral-100/90 dark:bg-[#161b22] border border-orange-500/30 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono text-neutral-600 dark:text-neutral-300 font-bold uppercase tracking-wider block">
                {hasStars && selectedTier !== 'fresh' ? `${selectedTier}★ ${t('value')}` : t('value')}
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-mono font-black text-orange-600 dark:text-orange-400 tracking-tight">
                  {formatMilitaryValue(starCalc.totalValue)}
                </span>
              </div>
              {isStaffMode && starCalc.isOverride && (
                <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400 mt-1 block">
                  ({t('override')})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                {t('liveStatus')}
              </span>

              <button
                type="button"
                onClick={() => openTradeCalculatorWithItem('you', item, selectedTier)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/20 transition-colors cursor-pointer"
                title={t('addToTradeCalc')}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>{t('offerBtn')}</span>
              </button>

              <button
                type="button"
                onClick={() => openTradeCalculatorWithItem('them', item, selectedTier)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
                title={t('addToTradeCalc')}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>{t('receiveBtn')}</span>
              </button>
            </div>
          </div>

          {/* Vehicle Star Tier Horizontal Switcher */}
          {isVehicle && (
            <div className="p-4 rounded-2xl bg-white dark:bg-[#161b22] border border-neutral-200 dark:border-[#30363d] space-y-2 shadow-xs">
              <div className="flex items-center justify-between text-xs sm:text-sm font-mono">
                <span className="font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span>{t('selectUpgradeTier')}</span>
                </span>
                <span className={`font-black ${activeVehicleTierObj.id === 'fresh' ? 'text-yellow-400' : 'text-orange-600 dark:text-orange-400'}`}>
                  {t('activeLabel')}: {activeTierLabel}
                </span>
              </div>

              {/* Star buttons grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {STAR_TIERS.map((tier) => {
                  const isSelected = selectedTier === tier.id;
                  const tierCalc = getItemStarValue(item, tier.id);
                  const isFresh = tier.id === 'fresh';
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => handleTierSelect(tier.id)}
                      className={`relative py-2.5 px-1 text-center font-mono font-bold rounded-xl transition-all cursor-pointer select-none text-xs sm:text-sm flex items-center justify-center border ${
                        isSelected
                          ? 'bg-orange-500 text-white border-orange-400 shadow-md shadow-orange-500/20 scale-[1.02]'
                          : `bg-neutral-100 dark:bg-[#21262d] hover:bg-neutral-200 dark:hover:bg-[#30363d] border-neutral-200 dark:border-[#30363d] ${isFresh ? 'text-yellow-400 font-black' : 'text-neutral-700 dark:text-neutral-300'}`
                      }`}
                      title={tier.label}
                    >
                      <span className={`text-xs sm:text-sm font-black ${!isSelected && isFresh ? 'text-yellow-400 font-black' : ''}`}>{tier.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Soldier & Drone Star Tier Horizontal Switcher */}
          {isSoldierOrDrone && (
            <div className="p-4 rounded-2xl bg-white dark:bg-[#161b22] border border-neutral-200 dark:border-[#30363d] space-y-2 shadow-xs">
              <div className="flex items-center justify-between text-xs sm:text-sm font-mono">
                <span className="font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span>{t('selectRankMultiplier')}</span>
                </span>
                <span className="text-orange-600 dark:text-orange-400 font-black">
                  {t('activeLabel')}: {activeTierLabel} ({starCalc.multiplier || 1}x)
                </span>
              </div>

              {/* Star buttons grid */}
              <div className="grid grid-cols-4 gap-2">
                {SOLDIER_DRONE_STAR_TIERS.map((tier) => {
                  const isSelected = selectedTier === tier.id;
                  const tierCalc = getItemStarValue(item, tier.id);
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => handleTierSelect(tier.id)}
                      className={`relative py-2.5 px-2 text-center font-mono font-bold rounded-xl transition-all cursor-pointer select-none text-xs sm:text-sm flex items-center justify-center border ${
                        isSelected
                          ? 'bg-orange-500 text-white border-orange-400 shadow-md shadow-orange-500/20 scale-[1.02]'
                          : 'bg-neutral-100 dark:bg-[#21262d] hover:bg-neutral-200 dark:hover:bg-[#30363d] border-neutral-200 dark:border-[#30363d] text-neutral-700 dark:text-neutral-300'
                      }`}
                      title={tier.label}
                    >
                      <span className="text-xs sm:text-sm font-black">{tier.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3-Stat Metric Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Trend Tile */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#161b22] border border-neutral-200 dark:border-[#30363d] shadow-xs space-y-2">
              <span className="text-xs font-mono font-bold text-neutral-500 dark:text-neutral-400 uppercase">{t('trendAndMomentum')}</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {trendList.map((tr, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-black whitespace-nowrap ${tr.badgeClass}`}
                  >
                    <span className={`${tr.textColor} whitespace-nowrap`}>{translateTrend(tr.label)}</span>
                  </span>
                ))}
              </div>
              <span className={`text-xs font-mono font-semibold block ${netChangePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {netChangePercent >= 0 ? `+${netChangePercent.toFixed(1)}%` : `${netChangePercent.toFixed(1)}%`} {t('totalShift')}
              </span>
            </div>

            {/* All-Time High / Peak */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#161b22] border border-neutral-200 dark:border-[#30363d] shadow-xs space-y-1">
              <span className="text-xs font-mono font-bold text-neutral-500 dark:text-neutral-400 uppercase">{t('allTimePeak')}</span>
              <span className="text-lg font-mono font-black text-amber-600 dark:text-amber-400 block">
                {formatMilitaryValue(allTimeHigh)}
              </span>
              <span className="text-xs font-mono text-neutral-400 block">
                {language === 'es' ? 'Mínimo:' : 'Low:'} {formatMilitaryValue(allTimeLow)}
              </span>
            </div>

            {/* Demand Score */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#161b22] border border-neutral-200 dark:border-[#30363d] shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-neutral-500 dark:text-neutral-400 uppercase">{t('demandScore')}</span>
                <span className={`text-sm font-black font-mono ${demandInfo.color}`}>
                  {tierData.demand}/10
                </span>
              </div>
              <div className="w-full h-3 bg-neutral-100 dark:bg-[#0d1117] rounded-full overflow-hidden p-0.5 border border-neutral-200 dark:border-[#30363d]">
                <div
                  className={`h-full ${demandInfo.barColor} rounded-full transition-all duration-500`}
                  style={{ width: `${(Math.max(1, Math.min(10, tierData.demand)) / 10) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* In-depth Specifications & Notes */}
      {(Boolean(item.notes) || isStaffMode) && (
        <section className="p-5 rounded-3xl bg-white/80 dark:bg-neutral-900/80 border border-orange-200/70 dark:border-neutral-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-['Chakra_Petch'] font-bold text-neutral-900 dark:text-white uppercase">
              <FileText className="w-4 h-4 text-orange-500" />
              <span>{t('descriptionNotes')}</span>
            </div>
            {isStaffMode && !isEditingNotes && (
              <button
                type="button"
                onClick={() => {
                  setInlineNotesText(item.notes || '');
                  setIsEditingNotes(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-bold font-mono transition-colors cursor-pointer border border-orange-500/20"
                title="Edit item description"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{item.notes ? t('editDescription') : t('addDescription')}</span>
              </button>
            )}
          </div>

          {isEditingNotes ? (
            <div className="space-y-3 pt-1">
              <textarea
                rows={4}
                value={inlineNotesText}
                onChange={(e) => setInlineNotesText(e.target.value)}
                placeholder={t('enterCombatNotesPlaceholder')}
                className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-[#0f111a] border border-neutral-200 dark:border-neutral-700 rounded-2xl text-sm font-sans text-neutral-900 dark:text-white focus:outline-none focus:border-orange-500 transition-colors"
                autoFocus
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400 font-mono">
                  {inlineNotesText.length} {language === 'es' ? 'caracteres' : 'characters'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingNotes(false)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateItem(
                        { id: item.id, notes: inlineNotesText.trim() },
                        'Updated item description via detail page'
                      );
                      setIsEditingNotes(false);
                      setNotesSaveSuccess(true);
                      setTimeout(() => setNotesSaveSuccess(false), 2500);
                      try {
                        confetti({ particleCount: 30, spread: 45, origin: { y: 0.6 } });
                      } catch (e) {}
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold font-mono shadow-sm cursor-pointer transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{t('saveDescription')}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {item.notes ? (
                <div className="space-y-2">
                  <p className="text-sm sm:text-base text-neutral-800 dark:text-neutral-200 leading-relaxed font-sans">
                    {notesTranslation.displayText}
                  </p>
                  {notesTranslation.isTranslated && (
                    <div className="flex items-center gap-2 pt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-lg border border-orange-500/20">
                        <Sparkles className="w-3 h-3 text-orange-500" />
                        {t('autoTranslated')}
                      </span>
                      <button
                        type="button"
                        onClick={notesTranslation.toggleOriginal}
                        className="text-[11px] font-mono font-semibold text-neutral-500 hover:text-orange-500 underline cursor-pointer"
                      >
                        {notesTranslation.showOriginal ? t('viewTranslation') : t('viewOriginal')}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-neutral-400 italic">
                  {t('noDescriptionNotes')}
                </p>
              )}
              {notesSaveSuccess && (
                <p className="mt-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> {t('descriptionSavedSuccess')}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* Embedded Interactive Price Chart Component */}
      <section className="p-6 rounded-3xl bg-white/80 dark:bg-[#121520]/90 backdrop-blur-2xl border border-orange-200/80 dark:border-neutral-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-orange-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500 text-white shadow-sm shadow-orange-500/30">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-['Chakra_Petch'] text-lg font-bold text-neutral-900 dark:text-white uppercase tracking-tight">
                {t('historicalTrajectory')}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-sans">
                {chartViewMode === 'all_tiers'
                  ? t('comparativeMultiStarCurves')
                  : `${t('activeStarTracking')} (${activeTierLabel})`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode: Selected Tier vs All Star Tiers */}
            {hasStars && (
              <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-mono font-bold">
                <button
                  type="button"
                  onClick={() => setChartViewMode('selected')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    chartViewMode === 'selected'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {t('selectedTierBtn')}
                </button>
                <button
                  type="button"
                  onClick={() => setChartViewMode('all_tiers')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                    chartViewMode === 'all_tiers'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{t('allStarValuesBtn')}</span>
                </button>
              </div>
            )}

            {/* Timeframe selector */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-mono font-bold">
              {(['7D', '30D', '90D', 'All'] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setChartTimeframe(tf)}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    chartTimeframe === tf
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {tf === 'All' ? t('allTime') : tf}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recharts Chart Area */}
        <div className="h-64 sm:h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartViewMode === 'all_tiers' ? (
              <LineChart data={historyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#262626' : '#f0f0f0'} vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke={theme === 'dark' ? '#737373' : '#a3a3a3'}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke={theme === 'dark' ? '#737373' : '#a3a3a3'}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatMilitaryValue(v)}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const TIER_COLORS_MAP: Record<string, string> = {
                        fresh: '#94a3b8',
                        '0': '#64748b',
                        '1': '#10b981',
                        '2': '#0284c7',
                        '3': '#8b5cf6',
                        '4': '#f59e0b',
                        '5': '#ea580c'
                      };
                      return (
                        <div className="p-3.5 rounded-2xl bg-neutral-900/95 backdrop-blur-md text-white border border-neutral-700 shadow-xl space-y-2 font-mono text-xs min-w-[200px]">
                          <p className="text-[11px] text-neutral-400 border-b border-neutral-800 pb-1">{data.date}</p>
                          <div className="space-y-1">
                            {allTiersData.map(tier => {
                              const val = data[tier.tierId] ?? tier.value;
                              const col = TIER_COLORS_MAP[tier.tierId] || '#f97316';
                              return (
                                <div key={tier.tierId} className="flex items-center justify-between gap-3 text-[11px]">
                                  <span className="font-bold text-neutral-300">{tier.label}:</span>
                                  <span className="font-black" style={{ color: col }}>
                                    {formatMilitaryValue(val)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {allTiersData.map(tier => {
                  const TIER_COLORS_MAP: Record<string, string> = {
                    fresh: '#94a3b8',
                    '0': '#64748b',
                    '1': '#10b981',
                    '2': '#0284c7',
                    '3': '#8b5cf6',
                    '4': '#f59e0b',
                    '5': '#ea580c'
                  };
                  const col = TIER_COLORS_MAP[tier.tierId] || '#f97316';
                  return (
                    <Line
                      key={tier.tierId}
                      type="monotone"
                      dataKey={tier.tierId}
                      name={tier.label}
                      stroke={col}
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: col, stroke: '#ffffff', strokeWidth: 1.5 }}
                      activeDot={{ r: 6, fill: col, stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  );
                })}
              </LineChart>
            ) : (
              <AreaChart data={historyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="detailValueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#262626' : '#f0f0f0'} vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke={theme === 'dark' ? '#737373' : '#a3a3a3'}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke={theme === 'dark' ? '#737373' : '#a3a3a3'}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatMilitaryValue(v)}
                  domain={[
                    (dataMin: number) => (isFinite(dataMin) && !isNaN(dataMin) ? Math.max(0, Math.floor(dataMin * 0.85)) : 0),
                    (dataMax: number) => (isFinite(dataMax) && !isNaN(dataMax) && dataMax > 0 ? Math.ceil(dataMax * 1.15) : 1000)
                  ]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-3 rounded-2xl bg-neutral-900/95 backdrop-blur-md text-white border border-neutral-700 shadow-xl space-y-1 font-mono text-xs">
                          <p className="text-[11px] text-neutral-400 flex items-center justify-between gap-2">
                            <span>{data.date}</span>
                            {hasStars && <span className="text-orange-400 font-bold">{activeTierLabel}</span>}
                          </p>
                          <p className="text-base font-bold text-orange-400">{formatMilitaryValue(data.value)}</p>
                          {data.note && <p className="text-[11px] text-neutral-300 font-sans">{data.note}</p>}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#f97316"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#detailValueGradient)"
                  dot={{ r: 4.5, fill: '#f97316', stroke: '#ffffff', strokeWidth: 1.5 }}
                  activeDot={{ r: 6.5, fill: '#ea580c', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Star Tiers Matrix Breakdown */}
        {hasStars && (
          <div className="pt-3 border-t border-orange-100 dark:border-neutral-800 space-y-2">
            <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block font-['Chakra_Petch']">
              {t('starValuationBreakdown')}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {allTiersData.map(tier => {
                const isCurrentActive = selectedTier === tier.tierId;
                return (
                  <button
                    key={tier.tierId}
                    type="button"
                    onClick={() => handleTierSelect(tier.tierId as StarTier)}
                    className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer space-y-1 ${
                      isCurrentActive
                        ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-500 shadow-xs ring-1 ring-orange-500'
                        : 'bg-neutral-50/80 dark:bg-neutral-900/60 border-neutral-200/80 dark:border-neutral-800 hover:border-orange-300'
                    }`}
                  >
                    <div className="text-xs font-['Chakra_Petch'] font-bold text-neutral-900 dark:text-white uppercase truncate">
                      {tier.shortLabel}
                    </div>
                    <div className="text-xs font-mono font-black text-orange-600 dark:text-orange-400">
                      {formatMilitaryValue(tier.value)}
                    </div>
                    <div className="text-[10px] font-mono text-neutral-500">
                      {t('demand')}: {tier.demand}/10
                    </div>
                    <div className="text-[9px] font-mono text-neutral-400 whitespace-nowrap truncate">
                      {tier.gemRange.formatted}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Staff Price History Point Controls (Add Point & Manage / Remove Points) */}
        {isStaffMode && (
          <div className="pt-2 border-t border-orange-100 dark:border-neutral-800 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              {!showAddPointForm && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAddPointForm(true);
                    setShowManagePoints(false);
                  }}
                  className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{t('addAuditPointStaff')}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowManagePoints((prev) => !prev);
                  setShowAddPointForm(false);
                }}
                className={`text-xs font-mono font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                  showManagePoints
                    ? 'bg-rose-500/10 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                    : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>
                  {showManagePoints ? 'Hide Graph Points Manager' : `Manage / Remove Graph Points (${item.history?.length || 0})`}
                </span>
              </button>
            </div>

            {/* Manage / Remove Graph Points Panel */}
            {showManagePoints && (
              <div className="p-4 rounded-2xl bg-neutral-50/80 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-rose-500" />
                    <span className="text-xs font-bold font-mono text-neutral-800 dark:text-neutral-200">
                      Staff Graph Points Manager ({item.history?.length || 0} recorded points)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowManagePoints(false)}
                    className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-xs font-mono cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                {!item.history || item.history.length === 0 ? (
                  <div className="py-4 text-center text-xs font-mono text-neutral-400">
                    No custom historical points recorded for this item yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {item.history.map((pt, idx) => (
                      <div
                        key={`${pt.timestamp || pt.date}-${idx}`}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white dark:bg-[#121520] border border-neutral-200 dark:border-neutral-800 text-xs font-mono"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-bold flex items-center justify-center text-[10px] shrink-0">
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-orange-600 dark:text-orange-400">
                                {formatMilitaryValue(pt.value)}
                              </span>
                              <span className="text-neutral-400">•</span>
                              <span className="text-neutral-700 dark:text-neutral-300 font-semibold">
                                {pt.date}
                              </span>
                            </div>
                            {pt.note && (
                              <div className="text-[10px] text-neutral-500 truncate max-w-[280px] sm:max-w-md">
                                {pt.note}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="shrink-0 flex items-center gap-1.5">
                          {deletingPointIndex === idx ? (
                            <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 p-1 rounded-lg border border-rose-200 dark:border-rose-900">
                              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">
                                Confirm?
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemovePoint(idx)}
                                className="px-2 py-0.5 rounded bg-rose-600 text-white font-bold text-[10px] hover:bg-rose-700 cursor-pointer"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingPointIndex(null)}
                                className="px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[10px] cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeletingPointIndex(idx)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-[11px] font-bold cursor-pointer transition-colors"
                              title="Delete this point from graph"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Staff Add Price History Point Form */}
            {showAddPointForm && (
              <form onSubmit={handleAddPointSubmit} className="p-4 rounded-2xl bg-orange-50/60 dark:bg-neutral-900 border border-orange-200 dark:border-neutral-800 space-y-3">
                <span className="text-xs font-bold font-mono text-neutral-800 dark:text-neutral-200 block">
                  {t('addPriceHistoryPointTitle')}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-neutral-500 block mb-1">{t('newValueLabel')} ($)</label>
                    <input
                      type="number"
                      value={newPointValue}
                      onChange={(e) => setNewPointValue(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-neutral-500 block mb-1">{t('dateLabel')}</label>
                    <input
                      type="text"
                      value={newPointDate}
                      onChange={(e) => setNewPointDate(e.target.value)}
                      placeholder={language === 'es' ? 'ej. 30 Ago' : 'e.g. Aug 30'}
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-neutral-500 block mb-1">{t('transactionNoteLabel')}</label>
                    <input
                      type="text"
                      value={newPointNote}
                      onChange={(e) => setNewPointNote(e.target.value)}
                      placeholder={language === 'es' ? 'ej. Registro de prueba de intercambio' : 'e.g. Trade evidence log'}
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs font-mono"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs font-mono cursor-pointer"
                  >
                    {t('commitPoint')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddPointForm(false)}
                    className="px-3 py-1.5 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-mono cursor-pointer"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </section>

      {/* Direct Embedded Value Suggestion & Report Form */}
      <section className="p-6 rounded-3xl bg-white/80 dark:bg-[#121520]/90 backdrop-blur-2xl border border-orange-200/80 dark:border-neutral-800 shadow-xl space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-orange-100 dark:border-neutral-800">
          <div className="p-2 rounded-xl bg-orange-500 text-white shadow-sm shadow-orange-500/30">
            <Flag className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-['Chakra_Petch'] text-lg font-bold text-neutral-900 dark:text-white uppercase tracking-tight">
              {t('communitySuggestionTitle')}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-sans">
              {t('communitySuggestionSubtitle')}
            </p>
          </div>
        </div>

        {isReportSubmitted ? (
          <div className="py-8 text-center space-y-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
            <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-['Chakra_Petch'] text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {t('suggestionSubmittedAudit')}
            </h4>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
              {t('suggestionAuditThanks')}
            </p>
            <button
              type="button"
              onClick={() => setIsReportSubmitted(false)}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-mono font-bold cursor-pointer"
            >
              {t('submitAnotherSuggestion')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSuggestionSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Target Star Tier (for vehicles) */}
              {isVehicle && (
                <div>
                  <label className="text-xs font-mono font-bold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                    {t('targetStarTier')}
                  </label>
                  <select
                    value={suggestedStarTier}
                    onChange={(e) => {
                      const tier = e.target.value as StarTier;
                      setSuggestedStarTier(tier);
                      const calc = getItemStarValue(item, tier);
                      setSuggestedValue(calc.totalValue);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100/90 dark:bg-neutral-800/90 border border-orange-200/70 dark:border-neutral-700 text-xs font-mono text-neutral-900 dark:text-white"
                  >
                    {STAR_TIERS.map((tTier) => (
                      <option key={tTier.id} value={tTier.id}>
                        {tTier.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Suggested Value */}
              <div className={isVehicle ? '' : 'sm:col-span-2'}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-mono font-bold text-neutral-700 dark:text-neutral-300 block">
                    {t('suggestedValueLabel')} ($)
                  </label>
                  <span className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400">
                    {formatMilitaryValue(suggestedValue)}
                  </span>
                </div>
                <input
                  type="number"
                  value={suggestedValue}
                  onChange={(e) => setSuggestedValue(Number(e.target.value))}
                  step={10000}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100/90 dark:bg-neutral-800/90 border border-orange-200/70 dark:border-neutral-700 text-xs font-mono text-neutral-900 dark:text-white"
                  required
                />
              </div>

              {/* Suggested Demand Dropdown */}
              <div>
                <label className="text-xs font-mono font-bold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                  {t('suggestedDemandLabel')}
                </label>
                <select
                  value={suggestedDemand}
                  onChange={(e) => setSuggestedDemand(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100/90 dark:bg-neutral-800/90 border border-orange-200/70 dark:border-neutral-700 text-xs font-mono text-neutral-900 dark:text-white"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <option key={num} value={num}>
                      {num}/10 — {num === 10 ? (language === 'es' ? 'Demanda Máxima' : 'Max Demand') : num >= 9 ? (language === 'es' ? 'Muy Alta' : 'Very High') : num >= 7 ? (language === 'es' ? 'Alta' : 'High') : num >= 5 ? (language === 'es' ? 'Moderada' : 'Moderate') : num >= 3 ? (language === 'es' ? 'Baja' : 'Low') : (language === 'es' ? 'Muy Baja' : 'Very Low')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Suggested Trend */}
              <div>
                <label className="text-xs font-mono font-bold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                  {t('suggestedTrend')}
                </label>
                <select
                  value={suggestedTrend}
                  onChange={(e) => setSuggestedTrend(e.target.value as PriceTrend)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100/90 dark:bg-neutral-800/90 border border-orange-200/70 dark:border-neutral-700 text-xs font-mono text-neutral-900 dark:text-white"
                >
                  {TREND_OPTIONS.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {translateTrend(tr.id)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono font-bold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                  {t('yourRobloxUsername')}
                </label>
                <input
                  type="text"
                  placeholder={language === 'es' ? 'ej. Comandante_Apex' : 'e.g. Commander_Apex'}
                  value={playerUsername}
                  onChange={(e) => setPlayerUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100/90 dark:bg-neutral-800/90 border border-orange-200/70 dark:border-neutral-700 text-xs font-mono text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-mono font-bold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                  {t('discordTagOptional')}
                </label>
                <input
                  type="text"
                  placeholder={language === 'es' ? 'ej. trader_pro#1234' : 'e.g. trader_pro#1234'}
                  value={discordTag}
                  onChange={(e) => setDiscordTag(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100/90 dark:bg-neutral-800/90 border border-orange-200/70 dark:border-neutral-700 text-xs font-mono text-neutral-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono font-bold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                {t('evidenceProofUrl')} <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="url"
                required
                placeholder={language === 'es' ? 'https://imgur.com/... o enlace de prueba' : 'https://imgur.com/... or Discord trade link'}
                value={proofLink}
                onChange={(e) => setProofLink(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100/90 dark:bg-neutral-800/90 border border-orange-200/70 dark:border-neutral-700 text-xs font-mono text-neutral-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-mono font-bold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                {t('reasonMarketJustification')} <span className="text-rose-500 font-bold">*</span>
              </label>
              <textarea
                required
                rows={2}
                placeholder={t('reasonMarketPlaceholder')}
                value={reasonNotes}
                onChange={(e) => setReasonNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100/90 dark:bg-neutral-800/90 border border-orange-200/70 dark:border-neutral-700 text-xs font-sans text-neutral-900 dark:text-white resize-none"
              />
            </div>

            {/* Cloudflare CAPTCHA Verification */}
            <div className="pt-1">
              <CloudflareTurnstile
                onVerify={(token) => {
                  setSuggestionCaptchaToken(token);
                  setSuggestionCaptchaError(null);
                }}
                onExpire={() => setSuggestionCaptchaToken('')}
                theme={theme === 'dark' ? 'dark' : 'light'}
                isInvalid={Boolean(suggestionCaptchaError && !suggestionCaptchaToken)}
              />
              {suggestionCaptchaError && !suggestionCaptchaToken && (
                <p className="mt-2 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5 animate-in fade-in">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{suggestionCaptchaError}</span>
                </p>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <motion.button
                whileHover={suggestionCaptchaToken ? { scale: 1.02 } : {}}
                whileTap={suggestionCaptchaToken ? { scale: 0.98 } : {}}
                type="submit"
                disabled={!suggestionCaptchaToken}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs font-mono transition-all ${
                  suggestionCaptchaToken
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/25 cursor-pointer active:scale-[0.98]'
                    : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed shadow-none border border-neutral-300 dark:border-neutral-700'
                }`}
                title={!suggestionCaptchaToken ? (language === 'es' ? 'Se requiere verificación Cloudflare antes de enviar' : 'Cloudflare verification required before submitting') : t('submitSuggestion')}
              >
                <Send className="w-4 h-4" />
                <span>{suggestionCaptchaToken ? t('submitSuggestion') : t('verifyToSubmit')}</span>
              </motion.button>
            </div>
          </form>
        )}
      </section>

      {/* Public Market Changelog Section (Values, Star Tiers, Demand & Trends ONLY) */}
      <section className="p-6 rounded-3xl bg-white/80 dark:bg-[#121520]/90 backdrop-blur-2xl border border-orange-200/80 dark:border-neutral-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-orange-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500 text-white shadow-sm shadow-orange-500/30">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-['Chakra_Petch'] text-lg font-bold text-neutral-900 dark:text-white uppercase tracking-tight">
                  {showStaffAuditTrail ? 'Staff Internal Audit Trail' : 'Public Market Changelog'}
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  {showStaffAuditTrail ? 'Staff Mode' : 'Live Verified Feed'}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-sans">
                {showStaffAuditTrail
                  ? 'Internal staff moderation logs and raw transaction auditing.'
                  : 'Chronological record of verified value adjustments, star tier valuations, demand shifts, and market trends.'}
              </p>
            </div>
          </div>

          {isStaffMode && (
            <button
              onClick={() => setShowStaffAuditTrail(prev => !prev)}
              className="self-start sm:self-auto px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-200 hover:border-orange-500 hover:text-orange-500 text-xs font-mono font-bold transition-all flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-orange-500" />
              {showStaffAuditTrail ? 'Switch to Public Changelog' : 'Staff Audit Trail'}
            </button>
          )}
        </div>

        {showStaffAuditTrail && isStaffMode ? (
          /* Internal Staff Audit View (Only when staff explicitly toggles it) */
          itemAuditLogs.length === 0 ? (
            <div className="py-6 text-center text-xs font-mono text-neutral-400 dark:text-neutral-500">
              No staff audit logs recorded for this item.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">{t('tableTimestamp')}</th>
                    <th className="py-2.5 px-3">{t('tableAction')}</th>
                    <th className="py-2.5 px-3">{t('tableValuationShift')}</th>
                    <th className="py-2.5 px-3">{t('tableDetailsReason')}</th>
                    <th className="py-2.5 px-3">{t('tableAuditor')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                  {itemAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-orange-50/50 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="py-2.5 px-3 text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/70 text-orange-700 dark:text-orange-300 font-bold text-[10px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-bold">
                        {log.oldValue && log.newValue ? (
                          <span className="text-neutral-900 dark:text-white">
                            {formatMilitaryValue(log.oldValue)} → <span className="text-orange-500">{formatMilitaryValue(log.newValue)}</span>
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-700 dark:text-neutral-300 font-sans max-w-xs truncate">
                        {log.details}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-500 dark:text-neutral-400 whitespace-nowrap font-mono text-[11px]">
                        {log.moderator}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Public Market Changelog View (Clean, No Private Auditor Data, Exact Star Tier & Base Value Shifts) */
          publicItemChangelogs.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-neutral-400 dark:text-neutral-500 space-y-1">
              <p className="font-semibold text-neutral-600 dark:text-neutral-300">No public valuation or demand changes recorded yet.</p>
              <p className="text-[11px]">All values, star tiers, and trends are actively tracked and updated in real time.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 uppercase text-[10px] font-mono">
                    <th className="py-2.5 px-3">{t('tableTimestamp')}</th>
                    <th className="py-2.5 px-3">Adjustment Type</th>
                    <th className="py-2.5 px-3">Valuation Shift</th>
                    <th className="py-2.5 px-3">Demand & Trend Shift</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono">
                  {publicItemChangelogs.map((log) => {
                    const hasBaseVal = log.oldValue !== undefined && log.newValue !== undefined && Number(log.oldValue) !== Number(log.newValue);
                    const hasBaseDem = log.oldDemand !== undefined && log.newDemand !== undefined && Number(log.oldDemand) !== Number(log.newDemand);
                    const hasBaseTrend = Boolean(log.oldTrend && log.newTrend && log.oldTrend !== log.newTrend);
                    const starValChanges = (log.starChanges || []).filter(sc => sc.oldValue !== undefined && sc.newValue !== undefined && Number(sc.oldValue) !== Number(sc.newValue));
                    const starDemChanges = (log.starChanges || []).filter(sc => sc.oldDemand !== undefined && sc.newDemand !== undefined && Number(sc.oldDemand) !== Number(sc.newDemand));
                    const starTrendChanges = (log.starChanges || []).filter(sc => sc.oldTrend && sc.newTrend && sc.oldTrend !== sc.newTrend);

                    // Badge label
                    let badgeLabel = 'Market Update';
                    let badgeColor = 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300';
                    if (starValChanges.length > 0 && !hasBaseVal) {
                      badgeLabel = starValChanges.length === 1 ? `⭐ ${starValChanges[0].tierLabel} Value` : '⭐ Star Tier Values';
                      badgeColor = 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300/40';
                    } else if (hasBaseVal) {
                      badgeLabel = '💎 Base Valuation';
                      badgeColor = 'bg-orange-100 dark:bg-orange-950/70 text-orange-700 dark:text-orange-300 border border-orange-300/40';
                    } else if (hasBaseDem || starDemChanges.length > 0) {
                      badgeLabel = '🔥 Demand Rating';
                      badgeColor = 'bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 border border-red-300/40';
                    } else if (hasBaseTrend || starTrendChanges.length > 0) {
                      badgeLabel = '📈 Trend Shift';
                      badgeColor = 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-300/40';
                    }

                    return (
                      <tr key={log.id} className="hover:bg-orange-50/40 dark:hover:bg-neutral-800/30 transition-colors">
                        {/* Timestamp */}
                        <td className="py-3 px-3 text-neutral-500 dark:text-neutral-400 whitespace-nowrap text-[11px]">
                          <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                          <div className="text-[10px] text-neutral-400">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>

                        {/* Adjustment Type */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${badgeColor}`}>
                            {badgeLabel}
                          </span>
                        </td>

                        {/* Valuation Shift (Base & Star Tiers) */}
                        <td className="py-3 px-3">
                          <div className="space-y-1">
                            {hasBaseVal && (
                              <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                                <span className="text-neutral-400 text-[10px]">Base:</span>
                                <span>{formatMilitaryValue(log.oldValue!)}</span>
                                <span className="text-orange-500">➔</span>
                                <span className="text-orange-500">{formatMilitaryValue(log.newValue!)}</span>
                              </div>
                            )}

                            {starValChanges.map((sc, scIdx) => (
                              <div key={scIdx} className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 flex-wrap text-[11px]">
                                <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/40 text-[9px] font-extrabold">{sc.tierLabel}</span>
                                <span>{formatMilitaryValue(sc.oldValue!)}</span>
                                <span className="text-orange-500">➔</span>
                                <span className="text-emerald-500 font-extrabold">{formatMilitaryValue(sc.newValue!)}</span>
                              </div>
                            ))}

                            {!hasBaseVal && starValChanges.length === 0 && (
                              <span className="text-neutral-400">—</span>
                            )}
                          </div>
                        </td>

                        {/* Demand & Trend Shift */}
                        <td className="py-3 px-3 text-[11px]">
                          <div className="space-y-1">
                            {hasBaseDem && (
                              <div className="text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                                <span className="text-neutral-400 text-[10px]">Demand:</span>
                                <span>{log.oldDemand}/10</span>
                                <span className="text-orange-500">➔</span>
                                <span className="font-bold text-orange-600 dark:text-orange-400">{log.newDemand}/10</span>
                              </div>
                            )}

                            {starDemChanges.map((sc, scIdx) => (
                              <div key={scIdx} className="text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                                <span className="text-neutral-400 text-[10px]">{sc.tierLabel} Dem:</span>
                                <span>{sc.oldDemand}/10</span>
                                <span className="text-orange-500">➔</span>
                                <span className="font-bold text-orange-600 dark:text-orange-400">{sc.newDemand}/10</span>
                              </div>
                            ))}

                            {hasBaseTrend && (
                              <div className="text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                                <span className="text-neutral-400 text-[10px]">Trend:</span>
                                <span>{log.oldTrend}</span>
                                <span className="text-orange-500">➔</span>
                                <span className="font-bold text-emerald-500">{log.newTrend}</span>
                              </div>
                            )}

                            {starTrendChanges.map((sc, scIdx) => (
                              <div key={scIdx} className="text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                                <span className="text-neutral-400 text-[10px]">{sc.tierLabel} Trend:</span>
                                <span>{sc.oldTrend}</span>
                                <span className="text-orange-500">➔</span>
                                <span className="font-bold text-emerald-500">{sc.newTrend}</span>
                              </div>
                            ))}

                            {!hasBaseDem && !hasBaseTrend && starDemChanges.length === 0 && starTrendChanges.length === 0 && (
                              <span className="text-neutral-400">—</span>
                            )}
                          </div>
                        </td>

                        {/* Status / Verification */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Verified
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </section>
    </div>
  );
};
