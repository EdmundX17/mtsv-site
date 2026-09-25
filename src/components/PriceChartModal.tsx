import React, { useState, useMemo } from 'react';
import { useValueList } from '../context/ValueListContext';
import { formatMilitaryValue } from '../utils/formatters';
import { getStandardizedItemHistory, getProcessedHistoryForTimeframe } from '../utils/historyHelper';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { X, Calendar, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VehicleImage } from './VehicleImage';

export const PriceChartModal: React.FC = () => {
  const { activeChartModalItem, setActiveChartModalItem } = useValueList();
  const [timeframe, setTimeframe] = useState<'7D' | '1M' | '3M' | 'ALL'>('1M');

  const history = useMemo(() => {
    if (!activeChartModalItem) return [];
    const raw = getStandardizedItemHistory(activeChartModalItem);
    return getProcessedHistoryForTimeframe(raw, timeframe);
  }, [activeChartModalItem, timeframe]);

  if (!activeChartModalItem) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-2xl bg-white dark:bg-[#161b22] border border-neutral-200 dark:border-[#30363d] rounded-2xl shadow-2xl overflow-hidden p-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-[#30363d]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 dark:bg-[#0d1117] border border-neutral-200 dark:border-[#30363d] shrink-0">
                <VehicleImage src={activeChartModalItem.thumbnail} alt={activeChartModalItem.name} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-neutral-900 dark:text-white">
                  {activeChartModalItem.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                  <span>Current: 💎 {formatMilitaryValue(activeChartModalItem.value)}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-emerald-500 font-medium">
                    <TrendingUp className="w-3.5 h-3.5" />
                    {activeChartModalItem.trend}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveChartModalItem(null)}
              className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#21262d] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Timeframe selector */}
          <div className="flex items-center justify-between pt-4 pb-2">
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
              <Calendar className="w-4 h-4" />
              <span>Timeframe:</span>
            </div>
            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-[#0d1117] p-1 rounded-lg border border-neutral-200 dark:border-[#30363d]">
              {(['7D', '1M', '3M', 'ALL'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                    timeframe === tf
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="w-full h-64 mt-2">
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    stroke="#9ca3af"
                    fontSize={11}
                    tickFormatter={(d) => {
                      try {
                        const parts = d.split('-');
                        return `${parts[1]}/${parts[2]}`;
                      } catch {
                        return d;
                      }
                    }}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={11}
                    tickFormatter={(v) => formatMilitaryValue(v)}
                    width={50}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-neutral-900 text-white p-2.5 rounded-lg text-xs shadow-xl border border-neutral-700">
                            <p className="text-neutral-400">{data.date}</p>
                            <p className="font-bold text-orange-400 mt-1">
                              💎 {formatMilitaryValue(data.value)} Gems
                            </p>
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
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#chartGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-400 text-sm">
                No valuation history recorded yet.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
