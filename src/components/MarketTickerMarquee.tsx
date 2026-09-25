import React, { useMemo, useState } from 'react';
import { useValueList } from '../context/ValueListContext';
import { formatMilitaryValue, getRarityConfig } from '../utils/formatters';
import { ArrowUpRight, ArrowDownRight, Minus, Sparkles, Plus, X, Search, List, ExternalLink, Trash2, Loader2 } from 'lucide-react';
import { MilitaryItem } from '../types';
import { VehicleImage } from './VehicleImage';
import { hasItemPriceChanges } from '../utils/historyHelper';

interface TickerItemData {
  id: string;
  itemId: string;
  name: string;
  acronym?: string;
  thumbnail: string;
  rarity: MilitaryItem['rarity'];
  category: MilitaryItem['category'];
  oldValue: number;
  newValue: number;
  demand: number;
  trend: string;
  relativeTime: string;
  originalItem?: MilitaryItem;
  isManuallyPinned?: boolean;
}

export const MarketTickerMarquee: React.FC = () => {
  const {
    items,
    auditLogs,
    navigateToItem,
    isStaffMode,
    addToRecentlyUpdated,
    removeFromRecentlyUpdated,
    bulkClearRecentlyUpdated,
    t,
    translateRarity
  } = useValueList();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showActiveListModal, setShowActiveListModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [listFilterQuery, setListFilterQuery] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [isClearingBulk, setIsClearingBulk] = useState(false);

  // Compute recent update items from flags, auditLogs, price changes, and recent updates
  const tickerItems = useMemo<TickerItemData[]>(() => {
    const cards: TickerItemData[] = [];
    const seenItemIds = new Set<string>();

    // 0. Explicit manual inclusions (pinned by staff)
    const pinnedItems = items.filter(
      (i) => i.inRecentlyUpdated === true && !i.excludeFromRecentlyUpdated
    );
    for (const item of pinnedItems) {
      seenItemIds.add(item.id);
      const h = item.history || [];
      const prevVal = h.length >= 2 ? h[h.length - 2].value : Math.round(item.value * 0.9);
      cards.push({
        id: `pinned-${item.id}`,
        itemId: item.id,
        name: item.name,
        acronym: item.acronym,
        thumbnail: item.thumbnail,
        rarity: item.rarity,
        category: item.category,
        oldValue: prevVal,
        newValue: item.value,
        demand: item.demand,
        trend: item.trend,
        relativeTime: formatRelativeTime(item.lastUpdated, t),
        originalItem: item,
        isManuallyPinned: true
      });
    }

    // 1. Audit logs with genuine price updates, accepted reports, or manual updates
    const relevantLogs = auditLogs.filter(
      (log) =>
        (log.action === 'PRICE_UPDATE' ||
          log.action === 'REPORT_ACCEPTED' ||
          log.action === 'MANUAL_EDIT' ||
          log.action === 'ITEM_ADDED') &&
        Boolean(log.itemId)
    );

    for (const log of relevantLogs) {
      if (!log.itemId || seenItemIds.has(log.itemId)) continue;
      const matchedItem = items.find((i) => i.id === log.itemId);
      if (matchedItem && !matchedItem.excludeFromRecentlyUpdated) {
        seenItemIds.add(log.itemId);
        const oldVal =
          log.oldValue !== undefined && log.oldValue > 0
            ? log.oldValue
            : Math.round(matchedItem.value * 0.9);
        const newVal =
          log.newValue !== undefined && log.newValue > 0 ? log.newValue : matchedItem.value;
        cards.push({
          id: `log-${log.id}`,
          itemId: matchedItem.id,
          name: matchedItem.name,
          acronym: matchedItem.acronym,
          thumbnail: matchedItem.thumbnail,
          rarity: matchedItem.rarity,
          category: matchedItem.category,
          oldValue: oldVal,
          newValue: newVal,
          demand: log.newDemand || matchedItem.demand,
          trend: matchedItem.trend,
          relativeTime: formatRelativeTime(log.timestamp, t),
          originalItem: matchedItem
        });
      }
    }

    // 2. Items with price history points where actual changes occurred
    const itemsWithHistory = items
      .filter(
        (i) =>
          !i.excludeFromRecentlyUpdated &&
          i.history &&
          i.history.length >= 2 &&
          !seenItemIds.has(i.id) &&
          hasItemPriceChanges(i)
      )
      .slice(0, 16);

    for (const item of itemsWithHistory) {
      seenItemIds.add(item.id);
      const h = item.history!;
      const lastPoint = h[h.length - 1];
      const prevPoint = h[h.length - 2];
      cards.push({
        id: `history-${item.id}`,
        itemId: item.id,
        name: item.name,
        acronym: item.acronym,
        thumbnail: item.thumbnail,
        rarity: item.rarity,
        category: item.category,
        oldValue: prevPoint?.value || Math.round(item.value * 0.9),
        newValue: lastPoint?.value || item.value,
        demand: item.demand,
        trend: item.trend,
        relativeTime: lastPoint ? formatRelativeTime(lastPoint.timestamp, t) : t('today'),
        originalItem: item
      });
    }

    // 3. Items with recent lastUpdated (within the last 14 days)
    const nowMs = Date.now();
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
    const recentItems = items
      .filter((i) => {
        if (i.excludeFromRecentlyUpdated || seenItemIds.has(i.id) || !i.lastUpdated) return false;
        const itemTime = new Date(i.lastUpdated).getTime();
        return !isNaN(itemTime) && nowMs - itemTime <= fourteenDaysMs;
      })
      .slice(0, 10);

    for (const item of recentItems) {
      seenItemIds.add(item.id);
      const h = item.history || [];
      const prevVal = h.length >= 2 ? h[h.length - 2].value : Math.round(item.value * 0.9);
      cards.push({
        id: `recent-${item.id}`,
        itemId: item.id,
        name: item.name,
        acronym: item.acronym,
        thumbnail: item.thumbnail,
        rarity: item.rarity,
        category: item.category,
        oldValue: prevVal,
        newValue: item.value,
        demand: item.demand,
        trend: item.trend,
        relativeTime: formatRelativeTime(item.lastUpdated, t),
        originalItem: item
      });
    }

    return cards;
  }, [items, auditLogs, t]);

  // Filter items for staff "Add to Recently Updated" search modal
  const searchableItems = useMemo(() => {
    if (!showAddModal) return [];
    const q = searchQuery.toLowerCase().trim();
    return items
      .filter((i) => {
        if (!q) return true;
        return (
          i.name.toLowerCase().includes(q) ||
          (i.acronym && i.acronym.toLowerCase().includes(q)) ||
          i.category.toLowerCase().includes(q)
        );
      })
      .slice(0, 25);
  }, [items, showAddModal, searchQuery]);

  const handleStaffAdd = async (item: MilitaryItem) => {
    setAddingId(item.id);
    try {
      await addToRecentlyUpdated(item.id, 'Added via Marquee Staff Control');
    } finally {
      setAddingId(null);
      setShowAddModal(false);
    }
  };

  const handleStaffRemove = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    await removeFromRecentlyUpdated(itemId, 'Removed via Marquee Staff Control');
  };

  const handleBulkClear = async () => {
    if (tickerItems.length === 0) return;
    const confirmed = window.confirm(`Bulk clear all ${tickerItems.length} items from Recently Updated?`);
    if (!confirmed) return;

    setIsClearingBulk(true);
    try {
      await bulkClearRecentlyUpdated(tickerItems.map(t => t.itemId));
      setShowActiveListModal(false);
    } catch (err) {
      console.error('Failed to bulk clear recently updated:', err);
    } finally {
      setIsClearingBulk(false);
    }
  };

  const filteredActiveItems = useMemo(() => {
    if (!listFilterQuery) return tickerItems;
    const q = listFilterQuery.toLowerCase().trim();
    return tickerItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.acronym && item.acronym.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
    );
  }, [tickerItems, listFilterQuery]);

  if (tickerItems.length === 0 && !isStaffMode) return null;

  // Duplicate items for seamless continuous looping in CSS
  const loopedItems = tickerItems.length > 0 ? [...tickerItems, ...tickerItems] : [];
  // Slower, comfortable scroll duration scaling gracefully with item volume
  const scrollDurationSeconds = Math.max(140, tickerItems.length * 10);

  return (
    <div className="flex flex-col justify-center flex-1 min-w-0 max-w-full relative">
      {/* Recently Updated Header */}
      <div className="flex items-center justify-between gap-1.5 mb-1 px-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-orange-500 shrink-0" />
            <span className="text-[10px] font-['Chakra_Petch'] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              {t('recentlyUpdated')}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          </div>

          {/* Show List of Currently Active Items in Reel - Staff Only */}
          {isStaffMode && tickerItems.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setListFilterQuery('');
                setShowActiveListModal(true);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800/80 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-[9.5px] font-mono font-bold border border-neutral-200/80 dark:border-neutral-700/80 cursor-pointer transition-colors shadow-2xs"
              title="Staff Only: View list of all items currently in Recently Updated"
            >
              <List className="w-3 h-3 text-orange-500" />
              <span>{t('viewReelList') || 'View List'} ({tickerItems.length})</span>
            </button>
          )}
        </div>

        {/* Staff Quick Add Button */}
        {isStaffMode && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-400/40 text-[9px] font-mono font-bold cursor-pointer transition-colors"
            title="Staff: Manually add item to Recently Updated reel"
          >
            <Plus className="w-2.5 h-2.5" />
            <span>+ Add to Reel</span>
          </button>
        )}
      </div>

      {tickerItems.length === 0 ? (
        <div className="py-2 px-3 rounded-xl bg-orange-50/50 dark:bg-neutral-900/50 border border-orange-200/50 dark:border-neutral-800 text-[11px] font-mono text-neutral-500 flex items-center justify-between">
          <span>No recently updated items to display yet.</span>
          {isStaffMode && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="text-orange-500 font-bold hover:underline cursor-pointer"
            >
              + Add first item (Staff)
            </button>
          )}
        </div>
      ) : (
        /* Marquee Track with Fade Masks */
        <div
          className="relative w-full overflow-hidden select-none group"
          style={{
            maskImage: 'linear-gradient(to right, transparent 0%, black 4%, black 96%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 4%, black 96%, transparent 100%)'
          }}
        >
          <div
            className="animate-marquee-scroll flex items-center gap-3 py-0.5"
            style={{ animationDuration: `${scrollDurationSeconds}s` }}
          >
            {loopedItems.map((item, idx) => {
              const isGain = item.newValue > item.oldValue;
              const isDrop = item.newValue < item.oldValue;
              const percentDelta =
                item.oldValue > 0 ? ((item.newValue - item.oldValue) / item.oldValue) * 100 : 0;
              const rarityConfig = getRarityConfig(item.rarity);

              return (
                <div
                  key={`${item.id}-${idx}`}
                  className="relative group/card shrink-0"
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (item.originalItem) {
                        navigateToItem(item.originalItem);
                      }
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-white/90 dark:bg-[#12151e]/95 hover:bg-orange-50 dark:hover:bg-[#1b202e] border border-orange-200/70 dark:border-neutral-800 hover:border-orange-400 dark:hover:border-orange-500/40 shadow-xs hover:shadow-md transition-all cursor-pointer text-left"
                  >
                    {/* Mini Thumbnail */}
                    <div className="relative w-8 h-8 rounded-xl bg-neutral-900 dark:bg-black p-0.5 border border-orange-200/50 dark:border-neutral-700/80 shrink-0 overflow-hidden flex items-center justify-center">
                      <VehicleImage
                        src={item.thumbnail}
                        alt={item.name}
                        itemId={item.id}
                        category={item.category}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Item Info */}
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-['Chakra_Petch'] font-bold text-xs text-neutral-900 dark:text-white truncate max-w-[130px] sm:max-w-[150px]">
                          {item.name}
                        </span>
                        <span
                          className={`text-[8px] font-mono font-bold px-1.5 py-0.2 rounded-md uppercase border ${rarityConfig.pillClass}`}
                        >
                          <span className={rarityConfig.textClass || rarityConfig.text}>
                            {translateRarity(item.rarity)}
                          </span>
                        </span>
                      </div>

                      {/* Valuation Shift: Old struck through -> New */}
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="text-neutral-400 line-through text-[10px]">
                          {formatMilitaryValue(item.oldValue)}
                        </span>
                        <span className="text-neutral-400 text-[10px]">→</span>
                        <span
                          className={`font-black ${
                            isGain
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isDrop
                              ? 'text-rose-500 dark:text-rose-400'
                              : 'text-orange-600 dark:text-orange-400'
                          }`}
                        >
                          {formatMilitaryValue(item.newValue)}
                        </span>
                      </div>
                    </div>

                    {/* Delta & Relative Time Pill */}
                    <div className="flex flex-col items-end shrink-0 pl-1">
                      <div
                        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[10px] font-mono font-bold ${
                          isGain
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : isDrop
                            ? 'bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-500/30'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                        }`}
                      >
                        {isGain ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : isDrop ? (
                          <ArrowDownRight className="w-3 h-3" />
                        ) : (
                          <Minus className="w-3 h-3" />
                        )}
                        <span>
                          {percentDelta >= 0
                            ? `+${percentDelta.toFixed(0)}%`
                            : `${percentDelta.toFixed(0)}%`}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-neutral-400 dark:text-neutral-500 mt-0.5">
                        {item.relativeTime}
                      </span>
                    </div>
                  </button>

                  {/* Staff Quick Remove Button */}
                  {isStaffMode && (
                    <button
                      type="button"
                      onClick={(e) => handleStaffRemove(e, item.itemId)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md cursor-pointer opacity-0 group-hover/card:opacity-100 transition-opacity z-10"
                      title={`Staff: Remove "${item.name}" from Recently Updated`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Staff Add to Recently Updated Modal */}
      {showAddModal && isStaffMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#121520] border border-orange-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-orange-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-500" />
                <h3 className="font-['Chakra_Petch'] font-bold text-sm text-neutral-900 dark:text-white">
                  Add Item to Recently Updated (Staff)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vehicle or unit name..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs font-mono"
                autoFocus
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {searchableItems.length === 0 ? (
                <div className="text-center py-6 text-xs text-neutral-400 font-mono">
                  No matching items found
                </div>
              ) : (
                searchableItems.map((item) => (
                  <div
                    key={item.id}
                    className="pt-1.5 first:pt-0 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-black/40 overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                        <VehicleImage
                          src={item.thumbnail}
                          alt={item.name}
                          itemId={item.id}
                          category={item.category}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold font-['Chakra_Petch'] text-neutral-900 dark:text-white truncate">
                          {item.name}
                        </div>
                        <div className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                          {formatMilitaryValue(item.value)} • {item.category}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={addingId === item.id}
                      onClick={() => handleStaffAdd(item)}
                      className="px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-[11px] font-mono font-bold cursor-pointer transition-colors shrink-0"
                    >
                      {addingId === item.id ? 'Adding...' : '+ Add'}
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-mono cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Items in Recently Updated Modal */}
      {showActiveListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-[#121520] border border-orange-200 dark:border-neutral-800 rounded-3xl shadow-2xl p-4 sm:p-5 space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-orange-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-500 shrink-0" />
                <div>
                  <h3 className="font-['Chakra_Petch'] font-bold text-base text-neutral-900 dark:text-white flex items-center gap-2">
                    <span>{t('activeReelItems') || 'Items in Recently Updated'}</span>
                    <span className="px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 text-xs font-mono font-bold">
                      {tickerItems.length}
                    </span>
                  </h3>
                  <p className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                    Live valuation shifts, accepted trade reports, and verified updates
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isStaffMode && tickerItems.length > 0 && (
                  <button
                    type="button"
                    disabled={isClearingBulk}
                    onClick={handleBulkClear}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500 text-rose-600 hover:text-white dark:text-rose-400 dark:hover:text-white border border-rose-500/30 text-xs font-mono font-bold cursor-pointer transition-colors shadow-2xs disabled:opacity-50"
                    title="Bulk clear all items currently in Recently Updated"
                  >
                    {isClearingBulk ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Bulk Clear All</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowActiveListModal(false)}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={listFilterQuery}
                onChange={(e) => setListFilterQuery(e.target.value)}
                placeholder="Filter vehicles or categories..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs font-mono text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-orange-500"
                autoFocus
              />
            </div>

            {/* List of items */}
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1 divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {filteredActiveItems.length === 0 ? (
                <div className="text-center py-8 text-xs text-neutral-400 font-mono">
                  No items match your filter.
                </div>
              ) : (
                filteredActiveItems.map((item) => {
                  const isGain = item.newValue > item.oldValue;
                  const isDrop = item.newValue < item.oldValue;
                  const percentDelta =
                    item.oldValue > 0 ? ((item.newValue - item.oldValue) / item.oldValue) * 100 : 0;
                  const rarityConfig = getRarityConfig(item.rarity);

                  return (
                    <div
                      key={item.id}
                      className="pt-2 first:pt-0 flex items-center justify-between gap-3 group"
                    >
                      <div
                        onClick={() => {
                          if (item.originalItem) {
                            navigateToItem(item.originalItem);
                            setShowActiveListModal(false);
                          }
                        }}
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        {/* Vehicle Thumbnail */}
                        <div className="relative w-10 h-10 rounded-xl bg-neutral-900 dark:bg-black p-0.5 border border-orange-200/50 dark:border-neutral-700/80 shrink-0 overflow-hidden flex items-center justify-center">
                          <VehicleImage
                            src={item.thumbnail}
                            alt={item.name}
                            itemId={item.id}
                            category={item.category}
                            className="w-full h-full object-contain"
                          />
                        </div>

                        {/* Name & Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-['Chakra_Petch'] font-bold text-xs sm:text-sm text-neutral-900 dark:text-white group-hover:text-orange-500 transition-colors truncate">
                              {item.name}
                            </span>
                            <span
                              className={`text-[8px] font-mono font-bold px-1.5 py-0.2 rounded-md uppercase border ${rarityConfig.pillClass}`}
                            >
                              <span className={rarityConfig.textClass || rarityConfig.text}>
                                {translateRarity(item.rarity)}
                              </span>
                            </span>
                            {item.isManuallyPinned && (
                              <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 uppercase">
                                Staff Pin
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 font-mono text-[11px] mt-0.5 flex-wrap">
                            <span className="text-neutral-400 line-through text-[10px]">
                              {formatMilitaryValue(item.oldValue)}
                            </span>
                            <span className="text-neutral-400 text-[10px]">→</span>
                            <span
                              className={`font-black ${
                                isGain
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : isDrop
                                  ? 'text-rose-500 dark:text-rose-400'
                                  : 'text-orange-600 dark:text-orange-400'
                              }`}
                            >
                              {formatMilitaryValue(item.newValue)}
                            </span>
                            <span className="text-neutral-400 text-[10px]">•</span>
                            <span className="text-neutral-500 text-[10px]">{item.category}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right side delta & actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex flex-col items-end">
                          <div
                            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[10px] font-mono font-bold ${
                              isGain
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                : isDrop
                                ? 'bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-500/30'
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                            }`}
                          >
                            {isGain ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : isDrop ? (
                              <ArrowDownRight className="w-3 h-3" />
                            ) : (
                              <Minus className="w-3 h-3" />
                            )}
                            <span>
                              {percentDelta >= 0
                                ? `+${percentDelta.toFixed(0)}%`
                                : `${percentDelta.toFixed(0)}%`}
                            </span>
                          </div>
                          <span className="text-[9px] font-mono text-neutral-400 dark:text-neutral-500 mt-0.5">
                            {item.relativeTime}
                          </span>
                        </div>

                        {/* Direct Inspect Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (item.originalItem) {
                              navigateToItem(item.originalItem);
                              setShowActiveListModal(false);
                            }
                          }}
                          className="p-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500 text-orange-600 hover:text-white transition-colors cursor-pointer"
                          title="Open item full details"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>

                        {/* Staff remove button */}
                        {isStaffMode && (
                          <button
                            type="button"
                            onClick={(e) => handleStaffRemove(e, item.itemId)}
                            className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-600 text-rose-600 hover:text-white transition-colors cursor-pointer"
                            title="Staff: Remove from Recently Updated"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              {isStaffMode ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowActiveListModal(false);
                      setShowAddModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-400/40 text-xs font-mono font-bold cursor-pointer transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add More (Staff)</span>
                  </button>
                  {tickerItems.length > 0 && (
                    <button
                      type="button"
                      disabled={isClearingBulk}
                      onClick={handleBulkClear}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-400/40 text-xs font-mono font-bold cursor-pointer transition-colors disabled:opacity-50"
                    >
                      {isClearingBulk ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                      <span>Clear All ({tickerItems.length})</span>
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-[10px] font-mono text-neutral-400">
                  Auto-updated on verified market events
                </span>
              )}

              <button
                type="button"
                onClick={() => setShowActiveListModal(false)}
                className="px-4 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-mono font-bold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function formatRelativeTime(isoString?: string, t?: (key: any) => string): string {
  if (!isoString) return t ? t('today') : 'Today';
  try {
    const time = new Date(isoString).getTime();
    if (isNaN(time)) return t ? t('today') : 'Today';
    const now = Date.now();
    const diffHours = Math.round((now - time) / (1000 * 60 * 60));
    if (diffHours <= 1) return t ? t('justNow') : 'Just now';
    if (diffHours < 24) return `${diffHours}h ${t ? t('ago') : 'ago'}`;
    const diffDays = Math.round(diffHours / 24);
    if (diffDays === 1) return t ? t('yesterday') : 'Yesterday';
    return `${diffDays}d ${t ? t('ago') : 'ago'}`;
  } catch (e) {
    return t ? t('today') : 'Today';
  }
}
