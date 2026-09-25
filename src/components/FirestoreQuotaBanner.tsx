import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, ExternalLink, X, Database } from 'lucide-react';
import { useValueList } from '../context/ValueListContext';

export const FirestoreQuotaBanner: React.FC = () => {
  const { isQuotaExceeded, isQuotaBannerDismissed, dismissQuotaBanner, t } = useValueList();

  if (!isQuotaExceeded || isQuotaBannerDismissed) {
    return null;
  }

  const upgradeUrl =
    'https://console.firebase.google.com/project/gen-lang-client-0834691577/firestore/databases/ai-studio-militarytycoonva-d16f20ea-1387-4fd1-8489-0514fef25c1d/data?openUpgradeDialog=true';

  return (
    <AnimatePresence>
      <motion.div
        id="firestore-quota-banner"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className="relative z-30 bg-amber-500/10 dark:bg-amber-950/40 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-4 py-2.5 text-xs sm:text-sm"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-4">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <div className="p-1 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="leading-relaxed">
              <span className="font-semibold text-amber-950 dark:text-amber-100 mr-1.5">
                {t('firestoreQuotaTitle')}
              </span>
              <span>
                {t('firestoreQuotaDesc')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <a
              id="quota-upgrade-btn"
              href={upgradeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors whitespace-nowrap cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>{t('enableBillingUpgrade')}</span>
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
            </a>

            <button
              id="quota-dismiss-btn"
              onClick={dismissQuotaBanner}
              className="p-1 rounded-md text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer"
              title={t('dismissBanner')}
              aria-label={t('dismissBanner')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
