import React from 'react';
import { useValueList } from '../context/ValueListContext';
import { ItemRarity, PriceTrend } from '../types';
import { getRarityConfig } from '../utils/formatters';
import { Search, ArrowUpDown, X, TrendingUp, Flame, SlidersHorizontal, ChevronUp, ChevronDown, Filter, LayoutGrid, Rows, Maximize2, Minimize2, Loader2 } from 'lucide-react';

const RARITIES: ItemRarity[] = [
  'Limited Edition',
  'Exotic',
  'Legendary',
  'Epic',
  'Rare',
  'Uncommon',
  'Common',
  'Event'
];

const RARITY_DOT_COLORS: Record<ItemRarity, string> = {
  'Limited Edition': 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]',
  'Exotic': 'bg-pink-500 shadow-[0_0_6px_rgba(236,72,153,0.6)]',
  'Legendary': 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]',
  'Epic': 'bg-purple-400',
  'Rare': 'bg-sky-400',
  'Uncommon': 'bg-emerald-400',
  'Common': 'bg-neutral-400',
  'Event': 'bg-indigo-400'
};

const TRENDS: { id: PriceTrend | 'All'; label: string; icon?: React.ComponentType<{ className?: string }> }[] = [
  { id: 'All', label: 'All Trends' },
  { id: 'Glazed', label: 'Glazed' },
  { id: 'Rising', label: 'Rising ↗', icon: TrendingUp },
  { id: 'Stable', label: 'Stable ═' },
  { id: 'Dropping', label: 'Dropping ↘' },
  { id: 'Unstable', label: 'Unstable' }
];

export const FilterControls: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    isSearchBuffering,
    flushSearch,
    selectedCategory,
    selectedRarities,
    toggleRarityFilter,
    clearRarityFilters,
    demandFilter,
    setDemandFilter,
    selectedTrend,
    setSelectedTrend,
    sortBy,
    setSortBy,
    items,
    isSearchMenuCollapsed,
    toggleSearchMenuCollapsed,
    globalCardLayoutMode,
    toggleGlobalCardViewMode,
    t,
    translateRarity,
    translateTrend
  } = useValueList();

  // Dynamic count reflecting selectedCategory
  const getRarityCount = (rarity: ItemRarity) => {
    return items.filter((item) => {
      if (selectedCategory !== 'All') {
        const itemCat = item.category === 'Sea' ? 'Naval' : item.category;
        const targetCat = selectedCategory === 'Sea' ? 'Naval' : selectedCategory;
        if (itemCat !== targetCat) return false;
      }
      return item.rarity === rarity;
    }).length;
  };

  const activeFiltersCount = (searchQuery ? 1 : 0) + selectedRarities.length + (demandFilter > 0 ? 1 : 0) + (selectedTrend !== 'All' ? 1 : 0);
  const hasActiveFilters = activeFiltersCount > 0;

  const resetAllFilters = () => {
    setSearchQuery('');
    clearRarityFilters();
    setDemandFilter(0);
    setSelectedTrend('All');
  };

  return (
    <div className="w-full bg-white dark:bg-[#161b22] border border-neutral-200 dark:border-[#30363d] rounded-3xl p-3.5 sm:p-4.5 space-y-3.5 shadow-xs transition-all">
      {/* Top Bar: Search Bar + Sort Dropdown + Collapse Menu Toggle */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5 w-full">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-0">
          {isSearchBuffering ? (
            <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500 animate-spin pointer-events-none" />
          ) : (
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500/80 dark:text-orange-400 pointer-events-none" />
          )}
          <input
            type="text"
            id="main-search-bar"
            name="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                flushSearch();
              }
            }}
            placeholder={t('searchPlaceholder')}
            className="w-full pl-10 pr-9 py-2.5 bg-neutral-50 dark:bg-[#0d1117] border border-neutral-200 dark:border-[#30363d] focus:border-orange-500 dark:focus:border-orange-400 focus:bg-white dark:focus:bg-[#0d1117] focus:ring-2 focus:ring-orange-500/20 rounded-2xl text-neutral-900 dark:text-[#f0f6fc] placeholder-neutral-400 dark:placeholder-neutral-500 text-xs sm:text-sm transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-0.5"
              title={t('clearSearch')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Controls Row: Sort Selector + Global View Toggle + Collapse Menu Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 w-full lg:w-auto justify-between lg:justify-end">
          {/* Sort Selector */}
          <div className="relative flex-1 min-w-0 sm:w-48 lg:w-44">
            <div className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400 shrink-0" />
            </div>
            <select
              id="sort-select-dropdown"
              name="sortBy"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full pl-7 sm:pl-8 pr-7 sm:pr-8 py-2 sm:py-2.5 bg-neutral-50 dark:bg-[#0d1117] border border-neutral-200 dark:border-[#30363d] focus:border-orange-500 dark:focus:border-orange-400 focus:bg-white dark:focus:bg-[#0d1117] rounded-2xl text-[11px] sm:text-xs text-neutral-800 dark:text-neutral-200 font-medium cursor-pointer shadow-2xs truncate"
              title={t('sortBy')}
            >
              <option value="highest_value">{t('sortHighestValue')}</option>
              <option value="lowest_value">{t('sortLowestValue')}</option>
              <option value="highest_demand">{t('sortHighestDemand')}</option>
              <option value="lowest_demand">{t('sortLowestDemand')}</option>
              <option value="name_asc">{t('sortAlphabetical')}</option>
              <option value="recently_updated">{t('sortRecentlyUpdated')}</option>
            </select>
          </div>

          {/* Action Buttons Group (View Toggle & Menu Collapse) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Global View Toggle Button (Compact / Expanded All) */}
            <button
              id="global-view-toggle-btn"
              type="button"
              onClick={toggleGlobalCardViewMode}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-2xl border text-[11px] sm:text-xs font-semibold transition-all shrink-0 select-none shadow-2xs cursor-pointer ${
                globalCardLayoutMode === 'expanded'
                  ? 'bg-orange-500/15 border-orange-400/40 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20'
                  : 'bg-neutral-50 dark:bg-[#21262d] border-neutral-200 dark:border-[#30363d] text-neutral-700 dark:text-neutral-300 hover:text-orange-500 dark:hover:text-orange-400'
              }`}
              title={globalCardLayoutMode === 'expanded' ? t('switchToCompact') : t('switchToExpanded')}
            >
              {globalCardLayoutMode === 'expanded' ? (
                <Minimize2 className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400 shrink-0" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400 shrink-0" />
              )}
              <span className="hidden sm:inline">
                {globalCardLayoutMode === 'expanded' ? t('compact') : t('expand')}
              </span>
            </button>

            {/* Toggle Collapse Search Menu Button */}
            <button
              id="collapse-search-menu-btn"
              type="button"
              onClick={toggleSearchMenuCollapsed}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-2xl border text-[11px] sm:text-xs font-semibold transition-all shrink-0 select-none shadow-2xs cursor-pointer ${
                isSearchMenuCollapsed
                  ? 'bg-orange-500/15 border-orange-400/40 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20'
                  : 'bg-neutral-50 dark:bg-[#21262d] border-neutral-200 dark:border-[#30363d] text-neutral-700 dark:text-neutral-300 hover:text-orange-500 dark:hover:text-orange-400'
              }`}
              title={isSearchMenuCollapsed ? t('expandFilters') : t('collapseFilters')}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400 shrink-0" />
              <span className="hidden sm:inline">
                {t('filters')}
              </span>
              {hasActiveFilters && (
                <span className="px-1.5 py-0.2 rounded-full bg-orange-500 text-white text-[10px] font-bold font-mono">
                  {activeFiltersCount}
                </span>
              )}
              {isSearchMenuCollapsed ? (
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Menu Section */}
      {!isSearchMenuCollapsed && (
        <div className="space-y-3.5 pt-1 border-t border-neutral-100 dark:border-[#30363d] animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Rarity Chips */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mr-0.5 sm:mr-1 uppercase tracking-wider shrink-0 select-none">
              {t('rarity')}:
            </span>
            {RARITIES.map((rarity) => {
              const isSelected = selectedRarities.includes(rarity);
              const count = getRarityCount(rarity);
              const isEmpty = count === 0;

              return (
                <button
                  key={rarity}
                  id={`rarity-chip-${rarity.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => toggleRarityFilter(rarity)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border shadow-2xs cursor-pointer select-none ${
                    isSelected
                      ? 'bg-orange-500 text-white border-orange-500 shadow-xs shadow-orange-500/25 ring-2 ring-orange-400/30'
                      : isEmpty
                        ? 'bg-neutral-50/70 dark:bg-[#21262d]/50 hover:bg-neutral-100 dark:hover:bg-[#30363d]/70 border-neutral-200/60 dark:border-[#30363d]/60 text-neutral-400 dark:text-neutral-500 opacity-60 hover:opacity-90'
                        : 'bg-white dark:bg-[#21262d] hover:bg-neutral-50 dark:hover:bg-[#30363d] border-neutral-200 dark:border-[#30363d] text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isSelected ? 'bg-white' : (RARITY_DOT_COLORS[rarity] || 'bg-neutral-400')
                  }`} />
                  <span className="truncate">{translateRarity(rarity)}</span>
                  <span
                    className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold leading-none transition-colors ${
                      isSelected
                        ? 'bg-white/25 text-white shadow-2xs'
                        : isEmpty
                          ? 'bg-neutral-100 dark:bg-[#0d1117] text-neutral-400 dark:text-neutral-500'
                          : 'bg-neutral-100 dark:bg-[#0d1117] text-neutral-600 dark:text-neutral-300 border border-neutral-200/70 dark:border-[#30363d]'
                    }`}
                  >
                    {count.toLocaleString()}
                  </span>
                </button>
              );
            })}
            {selectedRarities.length > 0 && (
              <button
                onClick={clearRarityFilters}
                className="text-xs text-orange-600 dark:text-orange-400 hover:underline ml-1 font-semibold cursor-pointer"
              >
                {t('clear')} ({selectedRarities.length})
              </button>
            )}
          </div>

          {/* Bottom Bar: Demand & Trend Filters */}
          <div className="pt-3 border-t border-neutral-100 dark:border-[#30363d] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                {t('demand')}:
              </span>
              <div className="flex items-center gap-1 bg-neutral-100 dark:bg-[#0d1117] p-0.5 rounded-xl border border-neutral-200 dark:border-[#30363d]">
                <button
                  onClick={() => setDemandFilter(0)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                    demandFilter === 0
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {t('all')}
                </button>
                {[5, 7, 8, 9, 10].map((rating) => (
                  <button
                    key={rating}
                    id={`demand-filter-${rating}`}
                    onClick={() => setDemandFilter(demandFilter === rating ? 0 : rating)}
                    className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                      demandFilter === rating
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400'
                    }`}
                  >
                    {rating}+
                  </button>
                ))}
              </div>
            </div>

            {/* Trend Filter & Reset */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden sm:inline">
                {t('trend')}:
              </span>
              <select
                id="trend-filter-select"
                name="trend"
                value={selectedTrend}
                onChange={(e) => setSelectedTrend(e.target.value as any)}
                className="px-3 py-1.5 bg-neutral-50 dark:bg-[#0d1117] border border-neutral-200 dark:border-[#30363d] rounded-xl text-xs text-neutral-700 dark:text-neutral-300 font-medium cursor-pointer"
              >
                {TRENDS.map((trendItem) => (
                  <option key={trendItem.id} value={trendItem.id}>
                    {trendItem.id === 'All' ? t('allTrends') : translateTrend(trendItem.id as PriceTrend)}
                  </option>
                ))}
              </select>

              {hasActiveFilters && (
                <button
                  onClick={resetAllFilters}
                  className="px-2.5 py-1.5 rounded-xl bg-orange-100 dark:bg-orange-500/20 hover:bg-orange-200 dark:hover:bg-orange-500/30 text-orange-700 dark:text-orange-300 text-xs font-bold transition-colors"
                >
                  {t('resetAll')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
