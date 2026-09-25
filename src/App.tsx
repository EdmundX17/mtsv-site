import React, { useMemo, useState, useEffect, useRef } from 'react';
import { ValueListProvider, useValueList } from './context/ValueListContext';
import { Navbar } from './components/Navbar';
import { FirestoreQuotaBanner } from './components/FirestoreQuotaBanner';
import { CategoryNav } from './components/CategoryNav';
import { FilterControls } from './components/FilterControls';
import { ItemCard } from './components/ItemCard';
import { ItemDetailPage } from './components/ItemDetailPage';
import { ReportModal } from './components/ReportModal';
import { PriceChartModal } from './components/PriceChartModal';
import { StaffPanel } from './components/StaffPanel';
import { ItemEditModal } from './components/ItemEditModal';
import { TradeCalculatorModal } from './components/TradeCalculatorModal';
import { SettingsModal } from './components/SettingsModal';
import { TOSPage } from './components/TOSPage';
import { InfoAndTeamSection } from './components/InfoAndTeamSection';
import { MTSLogo } from './components/MTSLogo';
import { DiscordLogo } from './components/DiscordLogo';
import { formatMilitaryValue, calculateItemStarValue, getItemLowestStarTierData } from './utils/formatters';
import { Plus, ShieldCheck, Lock, Loader2, ChevronDown, ArrowUp, Sparkles, TrendingUp, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { ErrorBoundary } from './components/ErrorBoundary';

const INITIAL_ROW_ITEMS = 60; // Generous initial page showing 60 items
const ROW_LOAD_INCREMENT = 48; // Loads 48 items at a time on scroll or button click

const ValueListMain: React.FC = () => {
  const {
    items,
    auditLogs,
    searchQuery,
    debouncedSearchQuery,
    isSearchBuffering,
    selectedCategory,
    selectedRarities,
    demandFilter,
    selectedTrend,
    sortBy,
    universalStarConfig,
    universalSoldierDroneStarConfig,
    isStaffMode,
    setIsStaffPanelOpen,
    activeItemDetailPage,
    navigateToCatalog,
    isTOSOpen,
    navigateToTOS,
    language,
    t,
    translateCategory
  } = useValueList();

  // Lazy loading row pagination state (loads 6 items / 2 rows at a time)
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_ROW_ITEMS);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  const [cols, setCols] = useState<number>(3);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  // Responsive column tracker for row item calculations
  useEffect(() => {
    const updateCols = () => {
      setCols(window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1);
    };
    updateCols();
    window.addEventListener('resize', updateCols, { passive: true });
    return () => window.removeEventListener('resize', updateCols);
  }, []);

  // Track scroll position for interactive Scroll-To-Top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 320) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Optimized Filter & Sort Logic (buffered with debouncedSearchQuery to eliminate keystroke lag)
  const filteredAndSortedItems = useMemo(() => {
    const activeSearch = debouncedSearchQuery.trim().toLowerCase();
    const qNormalized = activeSearch.replace(/[^a-z0-9]/g, '');
    const hasSearch = activeSearch.length > 0;

    const filtered = items.filter((item) => {
      // Category filter
      if (selectedCategory !== 'All') {
        const itemCat = item.category === 'Sea' ? 'Naval' : item.category;
        const targetCat = selectedCategory === 'Sea' ? 'Naval' : selectedCategory;
        if (itemCat !== targetCat) {
          return false;
        }
      }

      // Rarity filter
      if (selectedRarities.length > 0 && !selectedRarities.includes(item.rarity)) {
        return false;
      }

      // Demand filter (1-10 scale)
      if (demandFilter > 0 && item.demand < demandFilter) {
        return false;
      }

      // Trend filter
      if (selectedTrend !== 'All' && item.trend !== selectedTrend) {
        return false;
      }

      // Search Query (using buffered query to avoid image thrashing on every keystroke)
      if (hasSearch) {
        const matchName = item.name.toLowerCase().includes(activeSearch) || 
          (qNormalized.length > 0 && item.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(qNormalized));
        const matchAcronym = Boolean(
          item.acronym && (
            item.acronym.toLowerCase().includes(activeSearch) ||
            (qNormalized.length > 0 && item.acronym.toLowerCase().replace(/[^a-z0-9]/g, '').includes(qNormalized))
          )
        );
        const matchNotes = item.notes.toLowerCase().includes(activeSearch);
        const matchCat = item.category.toLowerCase().includes(activeSearch);
        const matchRarity = item.rarity.toLowerCase().includes(activeSearch);
        const matchTags = item.tags?.some(t => 
          t.toLowerCase().includes(activeSearch) || 
          (qNormalized.length > 0 && t.toLowerCase().replace(/[^a-z0-9]/g, '').includes(qNormalized))
        ) ?? false;

        if (!matchName && !matchAcronym && !matchNotes && !matchCat && !matchRarity && !matchTags) {
          return false;
        }
      }

      return true;
    });

    // High performance sorting: pre-compute lowest star tier values once to avoid O(N log N) re-calculations
    if (sortBy === 'highest_value' || sortBy === 'lowest_value' || !sortBy) {
      const lowestValueMap = new Map<string, number>();
      for (const item of filtered) {
        lowestValueMap.set(
          item.id,
          getItemLowestStarTierData(item, universalStarConfig, universalSoldierDroneStarConfig).value
        );
      }
      return filtered.sort((a, b) => {
        const aVal = lowestValueMap.get(a.id) ?? a.value;
        const bVal = lowestValueMap.get(b.id) ?? b.value;
        const diff = sortBy === 'lowest_value' ? aVal - bVal : bVal - aVal;
        if (diff !== 0) return diff;
        return (b.demand || 0) - (a.demand || 0);
      });
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'highest_demand': {
          const diff = (b.demand || 0) - (a.demand || 0);
          if (diff !== 0) return diff;
          return (b.value || 0) - (a.value || 0);
        }
        case 'lowest_demand': {
          const diff = (a.demand || 0) - (b.demand || 0);
          if (diff !== 0) return diff;
          return (a.value || 0) - (b.value || 0);
        }
        case 'name_asc':
          return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        case 'recently_updated': {
          const timeB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
          const timeA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
          const diff = (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
          if (diff !== 0) return diff;
          return (b.value || 0) - (a.value || 0);
        }
        default:
          return b.value - a.value;
      }
    });
  }, [items, selectedCategory, selectedRarities, demandFilter, selectedTrend, debouncedSearchQuery, sortBy, universalStarConfig, universalSoldierDroneStarConfig]);

  // Reset visible count to initial rows when filters or debounced search change
  useEffect(() => {
    setVisibleCount(INITIAL_ROW_ITEMS);
  }, [selectedCategory, selectedRarities, demandFilter, selectedTrend, debouncedSearchQuery, sortBy]);

  const totalMarketValuation = useMemo(() => {
    return items.reduce((sum, item) => sum + item.value, 0);
  }, [items]);

  const lastUpdatedText = useMemo(() => {
    if (auditLogs && auditLogs.length > 0) {
      const priceUpdateLog = auditLogs.find(
        l => (l.action === 'PRICE_UPDATE' || l.action === 'REPORT_ACCEPTED') && l.itemId
      );
      if (priceUpdateLog) {
        try {
          const d = new Date(priceUpdateLog.timestamp);
          if (!isNaN(d.getTime())) {
            return d.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          }
        } catch (e) {
          // fallback
        }
      }
    }
    return t('awaitingUpdates');
  }, [auditLogs, language, t]);

  // Current items rendered on screen
  const visibleItems = useMemo(() => {
    return filteredAndSortedItems.slice(0, visibleCount);
  }, [filteredAndSortedItems, visibleCount]);

  const hasMoreItems = visibleCount < filteredAndSortedItems.length;

  // Interactive Infinite Scroll Observer loading 6 at a time
  useEffect(() => {
    if (!hasMoreItems) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && !isLoadingMore) {
          setIsLoadingMore(true);
          setTimeout(() => {
            setVisibleCount((prev) => Math.min(prev + ROW_LOAD_INCREMENT, filteredAndSortedItems.length));
            setIsLoadingMore(false);
          }, 250);
        }
      },
      {
        root: null,
        rootMargin: '250px',
        threshold: 0.1
      }
    );

    const currentSentinel = loadMoreSentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [hasMoreItems, isLoadingMore, filteredAndSortedItems.length]);

  return (
    <div className="min-h-screen bg-[#faf8f5] dark:bg-[#0c0e14] text-neutral-900 dark:text-neutral-100 flex flex-col selection:bg-orange-500 selection:text-white transition-colors duration-200">
      {/* Top Navigation with Theme Toggle and Single Clean MTS Logo */}
      <Navbar />

      {/* Firestore Quota Exceeded Alert Banner */}
      <FirestoreQuotaBanner />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {isTOSOpen ? (
          <TOSPage onBack={navigateToCatalog} />
        ) : activeItemDetailPage ? (
          <ItemDetailPage item={activeItemDetailPage} onBack={navigateToCatalog} />
        ) : (
          <>
            {/* Header Row with Title and Live Status */}
            <motion.section
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-orange-200/60 dark:border-neutral-800"
            >
              {/* Left Header Title & Status */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {t('lastUpdated')}: {lastUpdatedText}
                  </span>
                </div>
                <h1 className="mt-1 text-xl sm:text-2xl font-['Chakra_Petch'] font-extrabold tracking-tight text-neutral-900 dark:text-white">
                  Military Tycoon Services {t('valueList')}
                </h1>
              </div>
            </motion.section>

            {/* Information & Our Team Section (Admin Editable) */}
            <InfoAndTeamSection />

            {/* Categories Bar */}
            <section>
              <CategoryNav />
            </section>

            {/* Filter & Search Controls (Static at top) */}
            <section className="pt-1 pb-2 transition-all">
              <FilterControls />
            </section>

            {/* Items Counter & Staff indicator */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  {selectedCategory === 'All' ? t('allItems') : `${translateCategory(selectedCategory)} ${t('items')}`}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-orange-100/80 dark:bg-orange-500/20 text-orange-800 dark:text-orange-300 border border-orange-200/60 dark:border-orange-500/30 flex items-center gap-1.5">
                  {isSearchBuffering && <Loader2 className="w-3 h-3 animate-spin text-orange-500" />}
                  <span>{filteredAndSortedItems.length}</span>
                </span>
                {isSearchBuffering && (
                  <span className="text-[11px] font-mono text-orange-600 dark:text-orange-400 animate-pulse font-bold">
                    {t('bufferingSearch')}
                  </span>
                )}
              </div>

              {isStaffMode && (
                <div className="flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-500/30">
                  <ShieldCheck className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                  <span>{t('staffModeActive')}</span>
                </div>
              )}
            </div>

            {/* Items Grid with Progressive Scroll Animations */}
            <section>
              {filteredAndSortedItems.length === 0 ? (
                <div className="py-20 px-6 text-center rounded-3xl bg-white/70 dark:bg-[#141722]/80 backdrop-blur-xl border border-orange-200/70 dark:border-neutral-800 shadow-sm space-y-4 max-w-xl mx-auto">
                  <div className="w-16 h-16 rounded-3xl bg-orange-100/80 dark:bg-orange-500/20 border border-orange-200 dark:border-orange-500/30 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto shadow-sm">
                    <MTSLogo className="w-9 h-9" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-['Chakra_Petch'] text-xl font-bold text-neutral-900 dark:text-white uppercase">
                      {items.length === 0 ? t('catalogReady') : t('noMatchingItems')}
                    </h4>
                    <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
                      {items.length === 0
                        ? t('catalogReadyDesc')
                        : t('noMatchingDesc')}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-center gap-3">
                    <button
                      onClick={() => setIsStaffPanelOpen(true)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t('addItemViaStaff')}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {visibleItems.map((item, idx) => {
                      // Calculate row items for synchronized row expansion on tablet/desktop using responsive cols
                      const rowStart = Math.floor(idx / cols) * cols;
                      const rowEnd = Math.min(rowStart + cols, visibleItems.length);
                      const rowItemIds = visibleItems.slice(rowStart, rowEnd).map(i => i.id);

                      return (
                        <ItemCard
                          key={item.id}
                          item={item}
                          rowItemIds={rowItemIds}
                        />
                      );
                    })}
                  </div>

                  {/* Scroll Sentinel & Interactive Loader */}
                  {hasMoreItems && (
                    <div
                      ref={loadMoreSentinelRef}
                      className="py-8 flex flex-col items-center justify-center gap-2 text-center"
                    >
                      {isLoadingMore ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border border-orange-200 dark:border-neutral-800 text-orange-600 dark:text-orange-400 font-mono text-xs shadow-sm"
                        >
                          <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                          <span>{t('loadingNextItems')}</span>
                        </motion.div>
                      ) : (
                        <div className="flex items-center gap-3 flex-wrap justify-center">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setIsLoadingMore(true);
                              setTimeout(() => {
                                setVisibleCount((prev) => Math.min(prev + ROW_LOAD_INCREMENT, filteredAndSortedItems.length));
                                setIsLoadingMore(false);
                              }, 200);
                            }}
                            className="group flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-white/80 dark:bg-neutral-900/80 hover:bg-white dark:hover:bg-neutral-800 border border-orange-200/80 dark:border-neutral-800 hover:border-orange-400 dark:hover:border-orange-500/50 text-neutral-700 dark:text-neutral-300 hover:text-orange-600 dark:hover:text-orange-400 font-mono text-xs font-semibold shadow-sm transition-all cursor-pointer"
                          >
                            <span>{t('loadMore')} ({filteredAndSortedItems.length - visibleCount} {t('remaining')})</span>
                            <ChevronDown className="w-4 h-4 text-orange-500 group-hover:translate-y-0.5 transition-transform" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setVisibleCount(filteredAndSortedItems.length);
                            }}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-700 dark:text-orange-300 font-mono text-xs font-bold transition-all cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                            <span>{language === 'es' ? `Mostrar todos (${filteredAndSortedItems.length})` : `Show All (${filteredAndSortedItems.length})`}</span>
                          </motion.button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Floating Interactive Scroll-To-Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            id="scroll-to-top-btn"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-40 p-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/30 border border-white/20 cursor-pointer flex items-center justify-center"
            title={t('scrollToTop')}
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Clean Footer with single MTS Logo & Staff Access */}
      <footer className="w-full border-t border-orange-200/60 dark:border-neutral-800/80 bg-white/80 dark:bg-[#0f1117]/90 backdrop-blur-md py-6 px-4 sm:px-6 lg:px-8 mt-12 text-xs text-neutral-500 dark:text-neutral-400 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <MTSLogo className="w-5 h-5" />
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">Military Tycoon Services</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <a
              href="https://discord.gg/yenZH7FaXU"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#5865F2] hover:text-[#4752c4] transition-colors flex items-center gap-1.5 font-semibold text-xs cursor-pointer"
            >
              <DiscordLogo className="w-4 h-4" />
              <span>Discord</span>
            </a>

            <button
              onClick={() => setIsStaffPanelOpen(true)}
              className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
              title={t('staffAuth')}
            >
              <Lock className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
              <span>{t('staffAccess')}</span>
            </button>

            <button
              id="footer-tos-button"
              onClick={navigateToTOS}
              className={`hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors flex items-center gap-1 text-[11px] cursor-pointer ${
                isTOSOpen 
                  ? 'text-orange-600 dark:text-orange-400 font-semibold' 
                  : 'text-neutral-400 dark:text-neutral-500'
              }`}
              title={t('tos')}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{t('tos')}</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Interactive Modals */}
      <ReportModal />
      <PriceChartModal />
      <StaffPanel />
      <ItemEditModal />
      <TradeCalculatorModal />
      <SettingsModal />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="Military Tycoon Values" fallbackDescription="An unexpected error occurred. Please refresh or try again.">
      <ValueListProvider>
        <ValueListMain />
      </ValueListProvider>
    </ErrorBoundary>
  );
}
