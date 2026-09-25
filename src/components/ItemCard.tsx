import React, { useState } from 'react';
import { MilitaryItem, StarTier } from '../types';
import { useValueList } from '../context/ValueListContext';
import {
  formatMilitaryValue,
  formatSigFigsNumber,
  getRarityConfig,
  getTrendList,
  getDemandDescription,
  isVehicleCategory,
  isSoldierOrDroneCategory,
  STAR_TIERS,
  SOLDIER_DRONE_STAR_TIERS,
  calculateGemRange,
  getItemStarTierData
} from '../utils/formatters';
import { StarTierSlider } from './StarTierSlider';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Flag,
  Edit3,
  Sparkles,
  FileText,
  ChevronDown,
  ChevronUp,
  Star,
  ExternalLink,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VehicleImage } from './VehicleImage';
import { MilitaryGemIcon } from './MilitaryGemIcon';
import { useAutoTranslate } from '../hooks/useAutoTranslate';

interface ItemCardNotesContentProps {
  notes: string;
}

const ItemCardNotesContent: React.FC<ItemCardNotesContentProps> = ({ notes }) => {
  const { language, t } = useValueList();
  const { displayText, isTranslated, showOriginal, toggleOriginal } = useAutoTranslate(notes, language);

  return (
    <div className="p-4 rounded-xl bg-neutral-50 dark:bg-[#0d1117] border border-neutral-200 dark:border-[#30363d] text-sm sm:text-base text-neutral-800 dark:text-neutral-100 leading-relaxed font-sans shadow-inner space-y-2">
      <p>{displayText}</p>
      {isTranslated && (
        <div className="flex items-center gap-2 pt-1 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-lg border border-orange-500/20">
            <Sparkles className="w-3 h-3 text-orange-500" />
            {t('autoTranslated')}
          </span>
          <button
            type="button"
            onClick={toggleOriginal}
            className="text-[10px] font-mono font-semibold text-neutral-500 hover:text-orange-500 underline cursor-pointer"
          >
            {showOriginal ? t('viewTranslation') : t('viewOriginal')}
          </button>
        </div>
      )}
    </div>
  );
};

interface ItemCardProps {
  item: MilitaryItem;
  rowItemIds?: string[];
}

export const ItemCard = React.memo<ItemCardProps>(({ item, rowItemIds }) => {
  const {
    setActiveReportModalItem,
    setActiveEditModalItem,
    getItemStarValue,
    getItemSelectedTier,
    setItemStarTier,
    navigateToItem,
    isStaffMode,
    isCardExpanded,
    toggleCardExpanded,
    universalStarConfig,
    universalSoldierDroneStarConfig,
    setIsStaffPanelOpen,
    t,
    translateCategory,
    translateRarity,
    translateTrend
  } = useValueList();

  // Dual-State Expansion managed via context & row matching
  const isExpanded = isCardExpanded(item.id);

  // Notes accordion inside expanded view
  const [showNotes, setShowNotes] = useState<boolean>(false);

  // Auto-select lowest star tier for this vehicle by passing item
  const selectedTier = getItemSelectedTier(item.id, item);

  const isVehicle = isVehicleCategory(item.category, item);
  const isSoldierOrDrone = isSoldierOrDroneCategory(item.category, item);
  const hasStars = isVehicle || isSoldierOrDrone;

  const currentTier = hasStars ? selectedTier : '0';
  const tierData = getItemStarTierData(item, currentTier, universalStarConfig, universalSoldierDroneStarConfig);
  const starCalc = {
    totalValue: tierData.value,
    bonus: tierData.bonus,
    multiplier: tierData.multiplier,
    isOverride: tierData.isOverride,
    isMultiplier: Boolean(tierData.multiplier)
  };
  const gemRange = tierData.gemRange;

  const rarityConfig = getRarityConfig(item.rarity);
  const trendList = getTrendList(tierData.trend);
  const demandInfo = getDemandDescription(tierData.demand);
  
  const activeVehicleTierObj = STAR_TIERS.find((t) => t.id === selectedTier) || STAR_TIERS[0];
  const activeSoldierDroneTierObj = SOLDIER_DRONE_STAR_TIERS.find((t) => t.id === selectedTier) || SOLDIER_DRONE_STAR_TIERS[0];
  const activeTierLabel = isSoldierOrDrone ? activeSoldierDroneTierObj.label : activeVehicleTierObj.label;

  const vehicleTierIndex = Math.max(0, STAR_TIERS.findIndex((t) => t.id === (selectedTier || 'fresh')));
  const soldierTierIndex = Math.max(0, SOLDIER_DRONE_STAR_TIERS.findIndex((t) => t.id === (selectedTier || '0')));

  const isUntradeable = item.tradeable === false;

  const renderTrendIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sparkles': return <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />;
      case 'TrendingUp': return <TrendingUp className="w-4 h-4 text-green-400 shrink-0" />;
      case 'TrendingDown': return <TrendingDown className="w-4 h-4 text-red-500 shrink-0" />;
      case 'Activity': return <Activity className="w-4 h-4 text-red-700 dark:text-red-500 shrink-0" />;
      case 'Minus':
      default: return <Minus className="w-4 h-4 text-white shrink-0" />;
    }
  };

  const handleCardClick = () => {
    if (!isExpanded) {
      toggleCardExpanded(item.id, rowItemIds);
    }
  };

  const handleDoubleClick = () => {
    navigateToItem(item);
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleCardExpanded(item.id, rowItemIds);
  };

  /* =========================================================================
     COMPONENT 1: COMPACT MODE (Default Minimized Catalog Card)
     - Header: Item title & acronym on left, category & untradeable tags on right
     - Gems price range beneath title
     - Middle row: Compact Value & Demand highlights to the left of horizontal picture
     - Bottom section: Full-width star slider all the way down
     - Space-saving icon-only action buttons: Downward carrot, Full details, and Quick edit
     ========================================================================= */
  if (!isExpanded) {
    return (
      <motion.div
        id={`item-card-compact-${item.id}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        whileHover={{ y: -2, transition: { duration: 0.12 } }}
        onClick={handleCardClick}
        onDoubleClick={handleDoubleClick}
        className="group relative flex flex-col justify-between gap-2.5 p-3 rounded-2xl bg-white dark:bg-[#161b22] border-2 shadow-xs transition-all duration-150 cursor-pointer select-none border-neutral-200/90 dark:border-[#30363d] hover:border-amber-500/80 dark:hover:border-amber-400/80 hover:shadow-[0_0_24px_rgba(245,158,11,0.22)]"
      >
        {/* TOP SECTION: Header with Name on Left, Category/Status Tags on Right, and Gems Range */}
        <div className="w-full space-y-1">
          {/* Header Row: Title & Acronym on left, Category & Status Tag on right */}
          <div className="flex items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <h3 className="font-['Chakra_Petch'] text-sm sm:text-base font-bold text-neutral-900 dark:text-[#f0f6fc] tracking-tight group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors leading-snug truncate">
                {item.name}
              </h3>
              {item.acronym && (
                <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 tracking-wider uppercase inline-flex items-center shrink-0">
                  {item.acronym}
                </span>
              )}
            </div>

            {/* Category & Untradeable Tags aligned to the right */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-[#21262d] text-neutral-700 dark:text-neutral-300 text-[10px] font-mono font-black uppercase tracking-wider border border-neutral-200/60 dark:border-[#30363d]">
                {translateCategory(item.category)}
              </span>

              {isUntradeable && (
                <span className="px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 text-[9px] font-mono font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  {t('untradeable')}
                </span>
              )}
            </div>
          </div>

          {/* Gems Price Range: Spans All the Way Across */}
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-neutral-600 dark:text-neutral-300 w-full">
            <MilitaryGemIcon className="w-3.5 h-3.5 shrink-0 text-amber-500" />
            <span className="tracking-tight whitespace-nowrap truncate">
              {gemRange.formatted}
            </span>
          </div>
        </div>

        {/* MIDDLE SECTION: Value, Demand & Actions to the left of the picture, Picture on the right */}
        <div className="flex items-center justify-between gap-2.5 w-full">
          {/* Left Column: Value, Demand, and Action Buttons directly below demand */}
          <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0">
            {/* Value Display: High Contrast Highlight Badge without second diamond emoji */}
            <div className="inline-flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30">
              <div className="flex items-center gap-1 shrink-0">
                <MilitaryGemIcon className="w-3 h-3 text-amber-500" />
                <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider font-mono">
                  {t('value')}:
                </span>
              </div>
              <span className="text-xs sm:text-sm font-black font-mono text-amber-600 dark:text-amber-400 tracking-tight whitespace-nowrap">
                {formatSigFigsNumber(starCalc.totalValue, 3)}
              </span>
            </div>

            {/* Demand Indicator Pill */}
            <div
              className="inline-flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg bg-neutral-100 dark:bg-[#21262d] border border-neutral-200 dark:border-[#30363d]"
              title={`${t('demand')}: ${tierData.demand}/10`}
            >
              <span className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-mono shrink-0">
                {t('demand')}:
              </span>
              <span className={`text-xs sm:text-sm font-black font-mono ${demandInfo.color} whitespace-nowrap`}>
                {tierData.demand}/10
              </span>
            </div>

            {/* ACTION BUTTONS: Directly below demand */}
            <div className="flex items-center gap-1.5 pt-0.5 w-full" onClick={(e) => e.stopPropagation()}>
              {/* Downward Carrot icon-only button */}
              <button
                type="button"
                onClick={handleToggleExpand}
                className="flex-1 py-1 px-2 rounded-md bg-neutral-100 hover:bg-neutral-200 dark:bg-[#21262d] dark:hover:bg-[#30363d] text-neutral-700 hover:text-amber-500 dark:text-neutral-200 dark:hover:text-amber-400 transition-colors flex items-center justify-center cursor-pointer border border-neutral-200/60 dark:border-[#30363d]"
                title={t('expand')}
                aria-label={t('expand')}
              >
                <ChevronDown className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-300 group-hover:text-amber-500" />
              </button>

              {/* Inspect details icon-only button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigateToItem(item);
                }}
                className="flex-1 py-1 px-2 rounded-md bg-neutral-100 hover:bg-neutral-200 dark:bg-[#21262d] dark:hover:bg-[#30363d] text-neutral-700 hover:text-amber-500 dark:text-neutral-200 dark:hover:text-amber-400 transition-colors flex items-center justify-center cursor-pointer border border-neutral-200/60 dark:border-[#30363d]"
                title={t('inspectDetails')}
                aria-label={t('inspectDetails')}
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-500" />
              </button>

              {/* Quick Edit icon-only button (if staff mode) */}
              {isStaffMode && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveEditModalItem(item);
                  }}
                  className="py-1 px-2 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-colors flex items-center justify-center cursor-pointer"
                  title={t('quickEdit')}
                  aria-label={t('quickEdit')}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Picture on the right (horizontal fit with rarity badge overlay - fully zoomed in) */}
          <div className="shrink-0 relative w-36 sm:w-44 md:w-48 aspect-[16/10] rounded-xl bg-neutral-100 dark:bg-[#0d1117] border border-neutral-200/80 dark:border-[#30363d] overflow-hidden shadow-xs group-hover:border-amber-500/40 dark:group-hover:border-amber-500/50 transition-colors flex items-center justify-center">
            <VehicleImage
              src={item.thumbnail}
              alt={item.name}
              itemId={item.id}
              category={item.category}
              className="w-full h-full object-cover object-center scale-110 group-hover:scale-120 transition-transform duration-300"
            />

            {/* Rarity Tag: Overlay inside Top-Right corner of image */}
            <div className="absolute top-1.5 right-1.5 z-10 pointer-events-none">
              <span className={`px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-mono uppercase tracking-wider font-bold border shadow-md backdrop-blur-md ${rarityConfig.pillClass}`}>
                <span className={rarityConfig.textClass || rarityConfig.text}>
                  {translateRarity(item.rarity)}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Star-Tier Selector Slider All the Way Down (Spanning Full Width) */}
        {isVehicle && (
          <div className="w-full pt-0.5" onClick={(e) => e.stopPropagation()}>
            <StarTierSlider
              tiers={STAR_TIERS}
              currentTierId={selectedTier || 'fresh'}
              onSelectTier={(tierId) => setItemStarTier(item.id, tierId as StarTier)}
              titleLabel={t('starTier')}
              size="sm"
              getTierHeaderLabel={(tier) => (tier.id === 'fresh' ? t('fresh') : tier.label)}
            />
          </div>
        )}

        {/* Star-Tier Selector Slider for Soldiers & Drones (0★ - 3★ Multiplier) */}
        {isSoldierOrDrone && (
          <div className="w-full pt-0.5" onClick={(e) => e.stopPropagation()}>
            <StarTierSlider
              tiers={SOLDIER_DRONE_STAR_TIERS}
              currentTierId={selectedTier || '0'}
              onSelectTier={(tierId) => setItemStarTier(item.id, tierId as StarTier)}
              titleLabel={t('rankStar')}
              size="sm"
              getTierHeaderLabel={(tier) => {
                const tierCalc = getItemStarValue(item, tier.id);
                return `${tier.label} (${tierCalc.multiplier || 1}x)`;
              }}
            />
          </div>
        )}
      </motion.div>
    );
  }

  /* =========================================================================
     COMPONENT 2: EXPANDED MODE (Full Prominent Showcase Card)
     - Bigger dimensions, larger typography, prominent demand bar, full multi-tags
     - Edge-to-edge full coverage picture with no awkward gaps
     ========================================================================= */
  return (
    <motion.div
      id={`item-card-expanded-${item.id}`}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`group relative flex flex-col bg-white dark:bg-[#161b22] rounded-3xl overflow-hidden transition-all duration-150 z-20 border-2 shadow-md border-neutral-200/90 dark:border-[#30363d] hover:border-orange-500 dark:hover:border-orange-400 hover:shadow-[0_0_26px_rgba(249,115,22,0.38)]`}
    >
      {/* Top Header Hero Image Area - Edge-to-Edge Full Space Coverage with Zero Awkward Gaps */}
      <div className="relative h-56 sm:h-64 w-full bg-neutral-100 dark:bg-[#0d1117] overflow-hidden border-b border-neutral-200 dark:border-[#30363d] group-hover:border-orange-500/30 transition-colors">
        <VehicleImage
          src={item.thumbnail}
          alt={item.name}
          itemId={item.id}
          category={item.category}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

        {/* Top Badges Overlay (Category on Left, Rarity at Top Right of Image) */}
        <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between z-20 pointer-events-none">
          <div className="flex items-center gap-2 flex-wrap pointer-events-auto">
            <span className="px-3 py-1 rounded-xl bg-black/85 text-white text-xs font-mono font-black uppercase tracking-wider shadow-md backdrop-blur-xs">
              {translateCategory(item.category)}
            </span>

            {/* Tradeability Badge: Only show when Untradeable */}
            {isUntradeable && (
              <span className="px-3 py-1 rounded-xl bg-orange-500 text-white text-xs font-mono font-black uppercase tracking-wider shadow-md flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-white" />
                {t('untradeable')}
              </span>
            )}
          </div>

          {/* Rarity Tag: Top Right of Hero Image */}
          <div className="shrink-0 pointer-events-auto">
            <span className={`px-3 py-1 rounded-xl text-xs font-mono uppercase tracking-wider font-black border shadow-md backdrop-blur-xs ${rarityConfig.pillClass}`}>
              <span className={rarityConfig.textClass || rarityConfig.text}>
                {translateRarity(item.rarity)}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Card Details Body with Expanded Typography and Spacing */}
      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
        {/* Title Row with Abbreviation and High-Visibility Range */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-['Chakra_Petch'] text-xl sm:text-2xl font-black text-neutral-900 dark:text-[#f0f6fc] tracking-tight leading-tight group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                {item.name}
              </h3>
              {item.acronym && (
                <span className="text-xs font-mono font-black px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 tracking-wider uppercase inline-flex items-center shrink-0">
                  {item.acronym}
                </span>
              )}
            </div>

            {/* Range Value Section: Clean 1-Line Compact Font */}
            <div className="flex items-center justify-between gap-1.5 mt-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-100 dark:bg-[#0d1117] border border-neutral-200 dark:border-[#30363d] min-w-0">
              <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                <MilitaryGemIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="text-neutral-500 dark:text-neutral-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
                  {t('gemRange')}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-auto whitespace-nowrap">
                <span className="text-neutral-900 dark:text-white font-black text-xs sm:text-sm font-mono tracking-tight whitespace-nowrap">
                  {gemRange.formatted}
                </span>
                {isStaffMode && gemRange.isManual && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-mono font-bold whitespace-nowrap">
                    {t('override')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Vehicle Star Selector Slider (Fresh, 0★ - 5★) */}
          {isVehicle && (
            <div className="pt-1" onClick={(e) => e.stopPropagation()}>
              <StarTierSlider
                tiers={STAR_TIERS}
                currentTierId={selectedTier || 'fresh'}
                onSelectTier={(tierId) => setItemStarTier(item.id, tierId as StarTier)}
                titleLabel={t('starTier')}
                size="md"
                getTierHeaderLabel={(tier) => (tier.id === 'fresh' ? t('fresh') : tier.label)}
                formatValueTooltip={(tierId) => {
                  const tierCalc = getItemStarValue(item, tierId);
                  const tObj = STAR_TIERS.find((t) => t.id === tierId);
                  return `${tObj?.label || tierId}: ${formatMilitaryValue(tierCalc.totalValue)}`;
                }}
              />
            </div>
          )}

          {/* Soldier & Drone Star Selector Slider (0★ - 3★ Multiplier) */}
          {isSoldierOrDrone && (
            <div className="pt-1" onClick={(e) => e.stopPropagation()}>
              <StarTierSlider
                tiers={SOLDIER_DRONE_STAR_TIERS}
                currentTierId={selectedTier || '0'}
                onSelectTier={(tierId) => setItemStarTier(item.id, tierId as StarTier)}
                titleLabel={t('rankStar')}
                size="md"
                getTierHeaderLabel={(tier) => {
                  const tierCalc = getItemStarValue(item, tier.id);
                  return `${tier.label} (${tierCalc.multiplier || 1}x)`;
                }}
                formatValueTooltip={(tierId) => {
                  const tierCalc = getItemStarValue(item, tierId);
                  const tObj = SOLDIER_DRONE_STAR_TIERS.find((t) => t.id === tierId);
                  return `${tObj?.label || tierId} (${tierCalc.multiplier}x): ${formatMilitaryValue(tierCalc.totalValue)}`;
                }}
              />
            </div>
          )}

          {/* High-Contrast Prominent VALUE Anchor with MT Gem */}
          <div className="mt-2.5 flex items-baseline justify-between py-3 px-4 rounded-2xl bg-neutral-100 dark:bg-[#21262d] border border-neutral-200 dark:border-[#30363d] shadow-inner">
            <div className="flex flex-col">
              <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400 uppercase font-black tracking-wider flex items-center gap-1.5">
                <MilitaryGemIcon className="w-4 h-4" />
                <span>{hasStars && selectedTier !== 'fresh' ? `${selectedTier}★ ${t('value')}:` : `${t('value')}:`}</span>
              </span>
            </div>
            <span className="font-mono text-2xl sm:text-3xl font-black text-orange-600 dark:text-orange-400 tracking-tight">
              {formatMilitaryValue(starCalc.totalValue)}
            </span>
          </div>
        </div>

        {/* Market Metrics Grid: Trend (with Multiple Tags support & matching colors) & Bigger Demand Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Trend Tile - Supports Multiple Tags & Dynamic Colors */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#21262d] border border-neutral-200 dark:border-[#30363d] space-y-2">
            <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400 block uppercase font-bold tracking-wider">
              {t('marketTrend')}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {trendList.map((trItem, idx) => (
                <div
                  key={idx}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-black font-mono shadow-xs whitespace-nowrap ${trItem.badgeClass}`}
                >
                  {renderTrendIcon(trItem.icon)}
                  <span className={`${trItem.textColor} whitespace-nowrap`}>{translateTrend(trItem.label as any)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Demand Tile with Bigger Bar and Red->Orange->Yellow->Green->Teal Color Scheme */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#21262d] border border-neutral-200 dark:border-[#30363d] space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm font-mono">
              <span className="text-neutral-500 dark:text-neutral-400 uppercase font-bold tracking-wider">{t('demand')}</span>
              <span className={`text-sm sm:text-base font-black font-mono ${demandInfo.color}`}>
                {tierData.demand}/10
              </span>
            </div>
            <div className="w-full h-3 bg-neutral-100 dark:bg-[#0d1117] rounded-full overflow-hidden p-0.5 border border-neutral-200 dark:border-[#30363d]">
              <div
                className={`h-full ${demandInfo.barColor} rounded-full transition-all duration-300`}
                style={{ width: `${(Math.max(1, Math.min(10, tierData.demand)) / 10) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Collapsible Notes Accordion with Bigger Text */}
        {item.notes && (
          <div className="space-y-2 pt-1">
            <button
              type="button"
              id={`toggle-notes-${item.id}`}
              onClick={() => setShowNotes(!showNotes)}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-[#21262d] hover:bg-neutral-200/80 dark:hover:bg-[#30363d] border border-neutral-200 dark:border-[#30363d] text-xs sm:text-sm font-mono font-bold text-neutral-700 dark:text-neutral-200 hover:text-orange-500 dark:hover:text-orange-400 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-500" />
                <span>{showNotes ? t('hideNotes') : t('viewNotes')}</span>
              </div>
              {showNotes ? (
                <ChevronUp className="w-4 h-4 text-neutral-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-neutral-400" />
              )}
            </button>

            <AnimatePresence>
              {showNotes && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.14 }}
                  className="overflow-hidden"
                >
                  <ItemCardNotesContent notes={item.notes} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Action Footer: Full Page, Quick Edit, Suggest, Collapse */}
        <div className="pt-3 border-t border-neutral-200 dark:border-[#30363d] w-full min-w-0 flex items-center gap-1.5 sm:gap-2">
          <button
            id={`inspect-full-btn-${item.id}`}
            onClick={() => navigateToItem(item)}
            className="flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl bg-neutral-900 hover:bg-black dark:bg-[#21262d] dark:hover:bg-[#30363d] text-white text-xs sm:text-sm font-bold font-mono transition-colors shadow-xs cursor-pointer"
            title={t('fullPage')}
          >
            <ExternalLink className="w-4 h-4 text-orange-400 shrink-0" />
            <span className="truncate">{t('fullPage')}</span>
          </button>

          {isStaffMode && (
            <button
              id={`quick-edit-btn-${item.id}`}
              onClick={(e) => {
                e.stopPropagation();
                setActiveEditModalItem(item);
              }}
              className="flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-xs sm:text-sm font-bold font-mono transition-colors cursor-pointer"
              title={t('quickEdit')}
            >
              <Edit3 className="w-4 h-4 shrink-0" />
              <span className="truncate">{t('quickEdit')}</span>
            </button>
          )}

          <button
            id={`report-btn-${item.id}`}
            onClick={() => setActiveReportModalItem(item)}
            className="flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-bold font-mono transition-colors shadow-xs shadow-orange-500/20 cursor-pointer"
            title={t('suggest')}
          >
            <Flag className="w-4 h-4 text-white shrink-0" />
            <span className="truncate">{t('suggest')}</span>
          </button>

          <button
            id={`collapse-btn-${item.id}`}
            onClick={handleToggleExpand}
            className="shrink-0 p-2 sm:p-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-[#21262d] dark:hover:bg-[#30363d] text-neutral-700 dark:text-neutral-200 transition-colors cursor-pointer"
            title={t('collapse')}
          >
            <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
});
