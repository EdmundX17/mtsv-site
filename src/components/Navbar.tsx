import React from 'react';
import { useValueList } from '../context/ValueListContext';
import { MTSLogo } from './MTSLogo';
import { DiscordLogo } from './DiscordLogo';
import { StaffAuthMenu } from './StaffAuthMenu';
import { Search, ShieldCheck, LogOut, Scale, Loader2, Settings } from 'lucide-react';
import { motion, useScroll, useSpring } from 'motion/react';

export const Navbar: React.FC = () => {
  const {
    isStaffMode,
    reports,
    setIsStaffPanelOpen,
    logoutStaff,
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    isSearchBuffering,
    flushSearch,
    navigateToCatalog,
    dbSyncStatus,
    setIsTradeCalcOpen,
    tradeState,
    setIsSettingsOpen,
    language,
    t
  } = useValueList();

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const pendingReportsCount = reports.filter(r => r.status === 'pending').length;
  const totalTradeUnits = tradeState.youItems.length + tradeState.themItems.length + (tradeState.youGems > 0 ? 1 : 0) + (tradeState.themGems > 0 ? 1 : 0);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-orange-200/60 dark:border-orange-500/20 bg-white/90 dark:bg-[#0c0d12]/95 backdrop-blur-xl shadow-[0_4px_24px_rgba(249,115,22,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)] transition-colors duration-200">
      {/* Scroll Progress Bar at Top */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 origin-left z-50"
        style={{ scaleX }}
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* MTS Brand Logo & Title */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none shrink min-w-0"
          onClick={navigateToCatalog}
        >
          <MTSLogo className="w-8 h-8 sm:w-10 sm:h-10 shrink-0" />
          <div className="flex items-baseline gap-1 sm:gap-1.5 font-['Chakra_Petch'] text-base sm:text-xl font-bold tracking-tight truncate">
            <span className="text-neutral-900 dark:text-white">MILITARY</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 font-extrabold">
              TYCOON
            </span>
            <span className="hidden lg:inline text-neutral-700 dark:text-neutral-300 font-semibold tracking-wide ml-0.5">
              SERVICES
            </span>
          </div>
        </motion.div>

        {/* Search in Navbar */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <div className="relative w-full">
            {isSearchBuffering ? (
              <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500 animate-spin" />
            ) : (
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500/80 dark:text-orange-400" />
            )}
            <input
              type="text"
              id="nav-search-input"
              name="search"
              placeholder={t('navSearchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  flushSearch();
                }
              }}
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-neutral-100/80 dark:bg-neutral-900/90 border border-neutral-200 dark:border-neutral-800 focus:border-orange-500 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-orange-500/20 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 transition-all font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-white px-1 cursor-pointer"
                title={t('clearSearch')}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Trade Calculator Button (High Accessibility) */}
          <motion.button
            id="nav-trade-calc-btn"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setIsTradeCalcOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-500/20 hover:shadow-orange-500/30 transition-all cursor-pointer select-none"
            title={t('openTradeCalc')}
            aria-label={t('openTradeCalc')}
          >
            <Scale className="w-4 h-4 text-white shrink-0" />
            <span className="hidden sm:inline">{t('tradeCalc')}</span>
            <span className="sm:hidden font-sans text-xs">{t('tradeCalcShort')}</span>
            {totalTradeUnits > 0 && (
              <span className="inline-flex items-center justify-center min-w-[17px] h-[17px] px-1 rounded-full text-[9px] font-mono font-black bg-black/40 text-white">
                {totalTradeUnits}
              </span>
            )}
          </motion.button>

          {/* Settings Button */}
          <motion.button
            id="nav-settings-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center justify-center p-2 sm:p-2.5 rounded-xl bg-white dark:bg-neutral-900/90 hover:bg-orange-50 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 hover:border-orange-300 dark:hover:border-orange-500/40 text-neutral-700 dark:text-neutral-300 hover:text-orange-600 dark:hover:text-orange-400 transition-all shadow-sm cursor-pointer"
            title={t('settings')}
            aria-label={t('settings')}
          >
            <Settings className="w-4 h-4 text-orange-500/90 dark:text-orange-400" />
          </motion.button>

          {/* Discord Server Link */}
          <motion.a
            id="nav-discord-btn"
            href="https://discord.gg/yenZH7FaXU"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center p-2 sm:p-2.5 rounded-xl bg-[#5865F2]/10 hover:bg-[#5865F2] border border-[#5865F2]/30 text-[#5865F2] hover:text-white transition-all shadow-sm cursor-pointer"
            title={t('officialDiscord')}
            aria-label={t('officialDiscord')}
          >
            <DiscordLogo className="w-4 h-4" />
          </motion.a>

          {/* Custom Staff Login & Staff Profile Menu */}
          <StaffAuthMenu />

          {/* If staff is logged in, show quick dashboard access (Shield Icon only) */}
          {isStaffMode && (
            <div className="flex items-center gap-1.5 pl-1.5 border-l border-neutral-200 dark:border-neutral-800">
              <motion.button
                id="open-staff-panel-btn"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsStaffPanelOpen(true)}
                className="flex items-center justify-center p-2 sm:p-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white transition-all shadow-sm shadow-orange-500/20 cursor-pointer relative"
                title={t('staffPortal')}
                aria-label={t('staffPortal')}
              >
                <ShieldCheck className="w-4 h-4 text-white" />
                {pendingReportsCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1 py-0.2 text-[9px] font-black rounded-full bg-red-500 text-white shadow-xs">
                    {pendingReportsCount}
                  </span>
                )}
              </motion.button>

              <button
                id="staff-logout-btn"
                onClick={logoutStaff}
                title={t('staffLogout')}
                className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-neutral-900 hover:bg-rose-50 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-rose-500 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
