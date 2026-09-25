import React from 'react';
import { useValueList } from '../context/ValueListContext';
import {
  Settings,
  X,
  Sun,
  Moon,
  Minimize2,
  Maximize2,
  Globe,
  Check,
  Sparkles,
  Sliders,
  ShieldAlert,
  Users,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    globalCardLayoutMode,
    setGlobalCardLayoutMode,
    theme,
    setTheme,
    language,
    setLanguage,
    isInfoSectionMinimized,
    setIsInfoSectionMinimized,
    t
  } = useValueList();

  if (!isSettingsOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="settings-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsSettingsOpen(false);
          }
        }}
      >
        <motion.div
          id="settings-modal-dialog"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-xl bg-white dark:bg-[#121620] border border-orange-200/80 dark:border-neutral-800 rounded-3xl shadow-2xl overflow-hidden my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-orange-100 dark:border-neutral-800/80 bg-neutral-50/70 dark:bg-[#161b26]/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/15 dark:bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shadow-xs">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-['Chakra_Petch'] font-bold text-neutral-900 dark:text-white">
                  {t('settingsTitle')}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {t('settingsSubtitle')}
                </p>
              </div>
            </div>

            <button
              id="close-settings-modal-btn"
              onClick={() => setIsSettingsOpen(false)}
              className="p-2 rounded-2xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title={t('close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Options */}
          <div className="p-6 space-y-6 max-h-[calc(85vh-140px)] overflow-y-auto">
            {/* Setting 1: Card Display Mode (Compact vs Extended) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-orange-500" />
                  <span>{t('displayMode')}</span>
                </label>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                  {globalCardLayoutMode === 'compact' ? t('compactModeShort') : t('extendedModeShort')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Compact Mode Card */}
                <button
                  id="settings-mode-compact-btn"
                  onClick={() => setGlobalCardLayoutMode('compact')}
                  className={`relative p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer select-none ${
                    globalCardLayoutMode === 'compact'
                      ? 'bg-orange-50/70 dark:bg-orange-950/25 border-orange-500 dark:border-orange-500/70 shadow-sm ring-2 ring-orange-500/20'
                      : 'bg-neutral-50/50 dark:bg-[#181d29]/60 hover:bg-neutral-100/60 dark:hover:bg-[#1f2535] border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl border ${
                        globalCardLayoutMode === 'compact'
                          ? 'bg-orange-500 text-white border-orange-400'
                          : 'bg-white dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700'
                      }`}>
                        <Minimize2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-neutral-900 dark:text-white">
                          {t('compactMode')}
                        </div>
                        <span className="text-[10px] font-mono text-neutral-400">
                          320px • Grid
                        </span>
                      </div>
                    </div>

                    {globalCardLayoutMode === 'compact' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white shadow-2xs">
                        <Check className="w-3 h-3" />
                        {t('active')}
                      </span>
                    )}
                  </div>
                </button>

                {/* Extended Mode Card */}
                <button
                  id="settings-mode-extended-btn"
                  onClick={() => setGlobalCardLayoutMode('expanded')}
                  className={`relative p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer select-none ${
                    globalCardLayoutMode === 'expanded'
                      ? 'bg-orange-50/70 dark:bg-orange-950/25 border-orange-500 dark:border-orange-500/70 shadow-sm ring-2 ring-orange-500/20'
                      : 'bg-neutral-50/50 dark:bg-[#181d29]/60 hover:bg-neutral-100/60 dark:hover:bg-[#1f2535] border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl border ${
                        globalCardLayoutMode === 'expanded'
                          ? 'bg-orange-500 text-white border-orange-400'
                          : 'bg-white dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700'
                      }`}>
                        <Maximize2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-neutral-900 dark:text-white">
                          {t('extendedMode')}
                        </div>
                        <span className="text-[10px] font-mono text-neutral-400">
                          {language === 'es' ? 'Estadísticas completas' : 'Full Stats • Hero'}
                        </span>
                      </div>
                    </div>

                    {globalCardLayoutMode === 'expanded' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white shadow-2xs">
                        <Check className="w-3 h-3" />
                        {t('active')}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Setting 2: Theme & Appearance (Light vs Dark Mode) */}
            <div className="space-y-3 pt-4 border-t border-neutral-100 dark:border-neutral-800/80">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                  {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-orange-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                  <span>{t('appearance')}</span>
                </label>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                  {theme === 'dark' ? t('darkMode') : t('lightMode')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Light Mode Button */}
                <button
                  id="settings-theme-light-btn"
                  onClick={() => setTheme('light')}
                  className={`relative p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer select-none ${
                    theme === 'light'
                      ? 'bg-orange-50/70 border-orange-500 shadow-sm ring-2 ring-orange-500/20'
                      : 'bg-neutral-50/50 dark:bg-[#181d29]/60 hover:bg-neutral-100/60 dark:hover:bg-[#1f2535] border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl border ${
                        theme === 'light'
                          ? 'bg-amber-500 text-white border-amber-400'
                          : 'bg-white dark:bg-neutral-800 text-amber-500 border-neutral-200 dark:border-neutral-700'
                      }`}>
                        <Sun className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-neutral-900 dark:text-white">
                          {t('lightMode')}
                        </div>
                        <span className="text-[10px] font-mono text-neutral-400">
                          {language === 'es' ? 'Tema claro' : 'Light Theme'}
                        </span>
                      </div>
                    </div>

                    {theme === 'light' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white shadow-2xs">
                        <Check className="w-3 h-3" />
                        {t('active')}
                      </span>
                    )}
                  </div>
                </button>

                {/* Dark Mode Button */}
                <button
                  id="settings-theme-dark-btn"
                  onClick={() => setTheme('dark')}
                  className={`relative p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer select-none ${
                    theme === 'dark'
                      ? 'bg-orange-950/25 border-orange-500/70 shadow-sm ring-2 ring-orange-500/20'
                      : 'bg-neutral-50/50 dark:bg-[#181d29]/60 hover:bg-neutral-100/60 dark:hover:bg-[#1f2535] border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl border ${
                        theme === 'dark'
                          ? 'bg-orange-500 text-white border-orange-400'
                          : 'bg-white dark:bg-neutral-800 text-neutral-400 border-neutral-200 dark:border-neutral-700'
                      }`}>
                        <Moon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-neutral-900 dark:text-white">
                          {t('darkMode')}
                        </div>
                        <span className="text-[10px] font-mono text-neutral-400">
                          {language === 'es' ? 'Tema oscuro' : 'Dark Theme'}
                        </span>
                      </div>
                    </div>

                    {theme === 'dark' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white shadow-2xs">
                        <Check className="w-3 h-3" />
                        {t('active')}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Setting 3: Language Selection */}
            <div className="space-y-3 pt-4 border-t border-neutral-100 dark:border-neutral-800/80">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-orange-500" />
                  <span>{t('language')}</span>
                </label>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-orange-100/80 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 font-bold border border-orange-200 dark:border-orange-500/30">
                  {language === 'es' ? 'Español (ES)' : 'English (EN)'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* English Option (Default) */}
                <button
                  id="settings-language-en-btn"
                  onClick={() => setLanguage('en')}
                  className={`relative p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer select-none ${
                    language === 'en'
                      ? 'bg-orange-50/70 dark:bg-orange-950/25 border-orange-500 dark:border-orange-500/70 shadow-sm ring-2 ring-orange-500/20'
                      : 'bg-neutral-50/50 dark:bg-[#181d29]/60 hover:bg-neutral-100/60 dark:hover:bg-[#1f2535] border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl select-none" role="img" aria-label="English">
                        🇺🇸
                      </span>
                      <div>
                        <div className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-1.5">
                          <span>{t('english')}</span>
                          <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                            {t('defaultBadge')}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-400">
                          {language === 'es' ? 'Predeterminado' : 'Default language'}
                        </span>
                      </div>
                    </div>

                    {language === 'en' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white shadow-2xs">
                        <Check className="w-3 h-3" />
                        {t('active')}
                      </span>
                    )}
                  </div>
                </button>

                {/* Spanish Option (Optional) */}
                <button
                  id="settings-language-es-btn"
                  onClick={() => setLanguage('es')}
                  className={`relative p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer select-none ${
                    language === 'es'
                      ? 'bg-orange-50/70 dark:bg-orange-950/25 border-orange-500 dark:border-orange-500/70 shadow-sm ring-2 ring-orange-500/20'
                      : 'bg-neutral-50/50 dark:bg-[#181d29]/60 hover:bg-neutral-100/60 dark:hover:bg-[#1f2535] border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl select-none" role="img" aria-label="Español">
                        🇪🇸
                      </span>
                      <div>
                        <div className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-1.5">
                          <span>{t('spanish')}</span>
                          <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
                            {t('optionalBadge')}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-400">
                          {language === 'es' ? 'Opcional' : 'Optional language'}
                        </span>
                      </div>
                    </div>

                    {language === 'es' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white shadow-2xs">
                        <Check className="w-3 h-3" />
                        {t('active')}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Setting 4: About & Our Team Section (Permanent Minimize Option) */}
            <div className="space-y-3 pt-4 border-t border-neutral-100 dark:border-neutral-800/80">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-orange-500" />
                  <span>{t('aboutTeamSectionSetting')}</span>
                </label>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                  {isInfoSectionMinimized ? t('permanentlyMinimized') : t('showExpanded')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Show Expanded Option */}
                <button
                  id="settings-info-expanded-btn"
                  onClick={() => setIsInfoSectionMinimized(false)}
                  className={`relative p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer select-none ${
                    !isInfoSectionMinimized
                      ? 'bg-orange-50/70 dark:bg-orange-950/25 border-orange-500 dark:border-orange-500/70 shadow-sm ring-2 ring-orange-500/20'
                      : 'bg-neutral-50/50 dark:bg-[#181d29]/60 hover:bg-neutral-100/60 dark:hover:bg-[#1f2535] border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl border ${
                        !isInfoSectionMinimized
                          ? 'bg-orange-500 text-white border-orange-400'
                          : 'bg-white dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700'
                      }`}>
                        <Eye className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-neutral-900 dark:text-white">
                          {t('showExpanded')}
                        </div>
                        <span className="text-[10px] font-mono text-neutral-400">
                          {t('showExpandedSub')}
                        </span>
                      </div>
                    </div>

                    {!isInfoSectionMinimized && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white shadow-2xs">
                        <Check className="w-3 h-3" />
                        {t('active')}
                      </span>
                    )}
                  </div>
                </button>

                {/* Permanently Minimized Option */}
                <button
                  id="settings-info-minimized-btn"
                  onClick={() => setIsInfoSectionMinimized(true)}
                  className={`relative p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer select-none ${
                    isInfoSectionMinimized
                      ? 'bg-orange-50/70 dark:bg-orange-950/25 border-orange-500 dark:border-orange-500/70 shadow-sm ring-2 ring-orange-500/20'
                      : 'bg-neutral-50/50 dark:bg-[#181d29]/60 hover:bg-neutral-100/60 dark:hover:bg-[#1f2535] border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl border ${
                        isInfoSectionMinimized
                          ? 'bg-orange-500 text-white border-orange-400'
                          : 'bg-white dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700'
                      }`}>
                        <EyeOff className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-neutral-900 dark:text-white">
                          {t('permanentlyMinimized')}
                        </div>
                        <span className="text-[10px] font-mono text-neutral-400">
                          {t('permanentlyMinimizedSub')}
                        </span>
                      </div>
                    </div>

                    {isInfoSectionMinimized && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white shadow-2xs">
                        <Check className="w-3 h-3" />
                        {t('active')}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/60 dark:bg-[#161b26]/60 flex items-center justify-end">
            <button
              id="settings-done-btn"
              onClick={() => setIsSettingsOpen(false)}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{t('done')}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
