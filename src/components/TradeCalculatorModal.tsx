import React, { useState, useMemo } from 'react';
import { useValueList } from '../context/ValueListContext';
import { MilitaryItem, StarTier, TradeSide } from '../types';
import { formatMilitaryValue, STAR_TIERS } from '../utils/formatters';
import { analyzeTrade } from '../utils/tradeCalculator';
import { X, Plus, Trash2, Scale, CheckCircle, AlertTriangle, XCircle, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VehicleImage } from './VehicleImage';

export const TradeCalculatorModal: React.FC = () => {
  const {
    isTradeCalcOpen,
    setIsTradeCalcOpen,
    tradeState,
    addTradeItem,
    removeTradeItem,
    updateTradeItemTier,
    clearTrade,
    items,
    universalStarConfig,
    universalSoldierDroneStarConfig
  } = useValueList();

  const [activeSide, setActiveSide] = useState<TradeSide>('you');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [itemSearch, setItemSearch] = useState('');

  const analysis = useMemo(() => {
    return analyzeTrade(
      tradeState.youItems,
      tradeState.youGems,
      tradeState.themItems,
      tradeState.themGems,
      items,
      universalStarConfig,
      universalSoldierDroneStarConfig,
      'en'
    );
  }, [tradeState, items, universalStarConfig, universalSoldierDroneStarConfig]);

  if (!isTradeCalcOpen) return null;

  const handleSelectItem = (item: MilitaryItem) => {
    addTradeItem(activeSide, item);
    setIsAddingItem(false);
    setItemSearch('');
  };

  const filteredCatalog = items.filter(i =>
    i.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
    (i.acronym && i.acronym.toLowerCase().includes(itemSearch.toLowerCase()))
  ).slice(0, 15);

  const verdictConfig = {
    BIG_WIN: { text: 'Huge Win!', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30', icon: CheckCircle },
    WIN: { text: 'Win', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30', icon: CheckCircle },
    SLIGHT_WIN: { text: 'Slight Win', color: 'text-teal-400 bg-teal-400/10 border-teal-400/30', icon: CheckCircle },
    FAIR: { text: 'Fair Trade', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30', icon: Scale },
    SLIGHT_LOSE: { text: 'Slight Loss', color: 'text-amber-400 bg-amber-400/10 border-amber-400/30', icon: AlertTriangle },
    LOSE: { text: 'Loss', color: 'text-rose-400 bg-rose-400/10 border-rose-400/30', icon: XCircle },
    BIG_LOSE: { text: 'Huge Loss!', color: 'text-rose-500 bg-rose-500/10 border-rose-500/30', icon: XCircle },
    NEUTRAL: { text: 'Add items to compare', color: 'text-neutral-400 bg-neutral-400/10 border-neutral-400/30', icon: Scale }
  }[analysis.verdictType] || { text: 'Fair Trade', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30', icon: Scale };

  const VerdictIcon = verdictConfig.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-4xl bg-white dark:bg-[#161b22] border border-neutral-200 dark:border-[#30363d] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-200 dark:border-[#30363d]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-neutral-900 dark:text-white">Trade Calculator</h3>
                <p className="text-xs text-neutral-500">Calculate fair trades with real-time star multipliers & gem taxes</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearTrade}
                className="px-3 py-1 text-xs text-neutral-500 hover:text-rose-500 rounded-lg"
              >
                Clear
              </button>
              <button
                onClick={() => setIsTradeCalcOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#21262d]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Verdict Banner */}
          <div className={`p-4 border-b border-neutral-200 dark:border-[#30363d] flex items-center justify-between gap-4 ${verdictConfig.color}`}>
            <div className="flex items-center gap-2.5">
              <VerdictIcon className="w-6 h-6 shrink-0" />
              <div>
                <span className="text-base font-extrabold">{verdictConfig.text}</span>
                <p className="text-xs opacity-90">{analysis.advice?.description || analysis.advice?.headline || 'Evaluate values and demand carefully before accepting.'}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs uppercase font-mono block opacity-75">Net Value Diff</span>
              <span className="font-mono text-base font-black">
                {analysis.netValueDiff >= 0 ? '+' : ''}{formatMilitaryValue(analysis.netValueDiff)}
              </span>
            </div>
          </div>

          {/* Sides Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 sm:p-6 overflow-y-auto grow">
            {/* Your Offer */}
            <div className="flex flex-col bg-neutral-50 dark:bg-[#0d1117] border border-neutral-200 dark:border-[#30363d] rounded-xl p-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-[#30363d] mb-3">
                <span className="font-bold text-sm text-neutral-900 dark:text-white">Your Offer</span>
                <span className="font-mono text-sm font-bold text-orange-500">
                  💎 {formatMilitaryValue(analysis.you.totalValue)}
                </span>
              </div>

              <div className="space-y-2 grow min-h-[160px]">
                {analysis.you.items.map(item => (
                  <div key={item.instanceId} className="flex items-center justify-between p-2.5 bg-white dark:bg-[#161b22] border border-neutral-200 dark:border-[#30363d] rounded-xl text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-neutral-100 dark:bg-[#0d1117] shrink-0">
                        <VehicleImage src={item.item.thumbnail} alt={item.item.name} />
                      </div>
                      <div className="truncate">
                        <span className="font-bold block truncate">{item.item.name}</span>
                        <span className="text-neutral-400 text-[10px]">💎 {formatMilitaryValue(item.totalValue)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <select
                        value={item.starTier}
                        onChange={(e) => updateTradeItemTier('you', item.instanceId, e.target.value as StarTier)}
                        className="text-[11px] bg-neutral-100 dark:bg-[#21262d] border border-neutral-300 dark:border-[#30363d] rounded-md px-1.5 py-0.5"
                      >
                        {STAR_TIERS.map(t => (
                          <option key={t.id} value={t.id}>{t.shortLabel}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeTradeItem('you', item.instanceId)}
                        className="p-1 text-neutral-400 hover:text-rose-500 rounded-md"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {analysis.you.items.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-neutral-400 text-xs text-center">
                    <span>No items added yet</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => { setActiveSide('you'); setIsAddingItem(true); }}
                className="mt-3 w-full py-2 bg-neutral-200 dark:bg-[#21262d] hover:bg-neutral-300 dark:hover:bg-[#30363d] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item to Your Side</span>
              </button>
            </div>

            {/* Their Offer */}
            <div className="flex flex-col bg-neutral-50 dark:bg-[#0d1117] border border-neutral-200 dark:border-[#30363d] rounded-xl p-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-[#30363d] mb-3">
                <span className="font-bold text-sm text-neutral-900 dark:text-white">Their Offer</span>
                <span className="font-mono text-sm font-bold text-emerald-500">
                  💎 {formatMilitaryValue(analysis.them.totalValue)}
                </span>
              </div>

              <div className="space-y-2 grow min-h-[160px]">
                {analysis.them.items.map(item => (
                  <div key={item.instanceId} className="flex items-center justify-between p-2.5 bg-white dark:bg-[#161b22] border border-neutral-200 dark:border-[#30363d] rounded-xl text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-neutral-100 dark:bg-[#0d1117] shrink-0">
                        <VehicleImage src={item.item.thumbnail} alt={item.item.name} />
                      </div>
                      <div className="truncate">
                        <span className="font-bold block truncate">{item.item.name}</span>
                        <span className="text-neutral-400 text-[10px]">💎 {formatMilitaryValue(item.totalValue)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <select
                        value={item.starTier}
                        onChange={(e) => updateTradeItemTier('them', item.instanceId, e.target.value as StarTier)}
                        className="text-[11px] bg-neutral-100 dark:bg-[#21262d] border border-neutral-300 dark:border-[#30363d] rounded-md px-1.5 py-0.5"
                      >
                        {STAR_TIERS.map(t => (
                          <option key={t.id} value={t.id}>{t.shortLabel}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeTradeItem('them', item.instanceId)}
                        className="p-1 text-neutral-400 hover:text-rose-500 rounded-md"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {analysis.them.items.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-neutral-400 text-xs text-center">
                    <span>No items added yet</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => { setActiveSide('them'); setIsAddingItem(true); }}
                className="mt-3 w-full py-2 bg-neutral-200 dark:bg-[#21262d] hover:bg-neutral-300 dark:hover:bg-[#30363d] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item to Their Side</span>
              </button>
            </div>
          </div>

          {/* Item Selector Submodal */}
          {isAddingItem && (
            <div className="absolute inset-0 bg-black/80 z-20 flex flex-col p-4 sm:p-6 overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-700">
                <span className="font-bold text-sm text-white">
                  Add Item to {activeSide === 'you' ? 'Your Offer' : "Their Offer"}
                </span>
                <button
                  onClick={() => setIsAddingItem(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative my-3">
                <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
                <input
                  type="text"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="Search vehicles, weapons, soldiers..."
                  autoFocus
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#21262d] border border-[#30363d] text-white text-sm focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="space-y-1.5 overflow-y-auto grow">
                {filteredCatalog.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    className="w-full flex items-center justify-between p-2.5 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] rounded-xl text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-[#0d1117] shrink-0">
                        <VehicleImage src={item.thumbnail} alt={item.name} />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-white block">{item.name}</span>
                        <span className="text-[10px] text-neutral-400">{item.category} • {item.rarity}</span>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-orange-400">
                      💎 {formatMilitaryValue(item.value)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
