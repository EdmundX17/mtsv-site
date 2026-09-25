import React, { useState, useEffect } from 'react';
import { useValueList } from '../context/ValueListContext';
import { PriceTrend } from '../types';
import { formatMilitaryValue, parseMilitaryValueInput } from '../utils/formatters';
import { X, Save, Sparkles, TrendingUp, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const TRENDS: PriceTrend[] = ['Rising', 'Stable', 'Dropping', 'Glazed', 'Unstable'];

export const ItemEditModal: React.FC = () => {
  const { activeEditModalItem, setActiveEditModalItem, updateItem, isStaffMode } = useValueList();

  const [valueStr, setValueStr] = useState('');
  const [demand, setDemand] = useState(5);
  const [trend, setTrend] = useState<PriceTrend>('Stable');
  const [notes, setNotes] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeEditModalItem) {
      setValueStr(String(activeEditModalItem.value || ''));
      setDemand(activeEditModalItem.demand ?? 5);
      setTrend(activeEditModalItem.trend || 'Stable');
      setNotes(activeEditModalItem.notes || '');
      setThumbnail(activeEditModalItem.thumbnail || '');
      setError(null);
    }
  }, [activeEditModalItem]);

  if (!activeEditModalItem || !isStaffMode) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedValue = parseMilitaryValueInput(valueStr);
    if (isNaN(parsedValue) || parsedValue < 0) {
      setError('Please enter a valid positive numeric value.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await updateItem({
        id: activeEditModalItem.id,
        value: parsedValue,
        demand: Number(demand),
        trend,
        notes,
        thumbnail
      }, 'Item Edit Modal update');
      setActiveEditModalItem(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to update item.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg bg-white dark:bg-[#161b22] border border-neutral-200 dark:border-[#30363d] rounded-2xl shadow-2xl overflow-hidden p-6"
        >
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-[#30363d]">
            <div>
              <h3 className="font-bold text-lg text-neutral-900 dark:text-white">
                Edit Item: {activeEditModalItem.name}
              </h3>
              <p className="text-xs text-neutral-500">Update catalog valuation and metrics</p>
            </div>
            <button
              onClick={() => setActiveEditModalItem(null)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#21262d]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4 mt-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Value input */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Base Value (Gems)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={valueStr}
                  onChange={(e) => setValueStr(e.target.value)}
                  placeholder="e.g. 1500000 or 1.5M"
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-[#0d1117] border border-neutral-300 dark:border-[#30363d] text-neutral-900 dark:text-white text-sm focus:outline-hidden focus:border-orange-500"
                />
                <span className="absolute right-3 top-2.5 text-xs text-neutral-400 font-mono">
                  {valueStr ? `≈ ${formatMilitaryValue(parseMilitaryValueInput(valueStr))}` : ''}
                </span>
              </div>
            </div>

            {/* Demand Slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Demand Rating (1 - 10)
                </label>
                <span className="text-xs font-bold text-orange-500">{demand}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={demand}
                onChange={(e) => setDemand(Number(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer"
              />
            </div>

            {/* Trend Selector */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Market Trend
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {TRENDS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTrend(t)}
                    className={`py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      trend === t
                        ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                        : 'bg-neutral-50 dark:bg-[#0d1117] text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-[#30363d]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Thumbnail URL */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Thumbnail Image URL
              </label>
              <input
                type="text"
                value={thumbnail}
                onChange={(e) => setThumbnail(e.target.value)}
                placeholder="https://... or /images/..."
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-[#0d1117] border border-neutral-300 dark:border-[#30363d] text-neutral-900 dark:text-white text-sm focus:outline-hidden focus:border-orange-500 font-mono text-xs"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Analyst Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add market context, obtainability details, etc."
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-[#0d1117] border border-neutral-300 dark:border-[#30363d] text-neutral-900 dark:text-white text-sm focus:outline-hidden focus:border-orange-500"
              />
            </div>

            {/* Submit buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveEditModalItem(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
