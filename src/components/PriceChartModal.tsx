import React, { useState, useMemo, useEffect } from 'react';
import { useValueList } from '../context/ValueListContext';
import { MilitaryItem, StarTier, SoldierDroneStarTier } from '../types';
import {
  formatMilitaryValue,
  getRarityConfig,
  getTrendConfig,
  isVehicleCategory,
  isSoldierOrDroneCategory,
  STAR_TIERS,
  SOLDIER_DRONE_STAR_TIERS,
  getAllItemStarTiersData,
  itemHasManualOverrides
} from '../utils/formatters';
import {
  AreaChart,
  Area,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  LineChart,
  X,
  Plus,
  Layers,
  Sparkles,
  Sliders,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Zap,
  Calendar,
  Trash2,
  Edit3,
  RotateCcw
} from 'lucide-react';
import { getStandardizedItemHistory, getProcessedHistoryForTimeframe, hasItemPriceChanges } from '../utils/historyHelper';

const TIER_COLORS: Record<string, string> = {
  fresh: '#94a3b8',
  '0': '#64748b',
  '1': '#10b981',
  '2': '#0284c7',
  '3': '#8b5cf6',
  '4': '#f59e0b',
  '5': '#ea580c'
};

const PriceChartModalContent: React.FC<{
  item: MilitaryItem;
  onClose: () => void;
}> = ({ item, onClose }) => {
  const {
    isStaffMode,
    addPriceHistoryPoint,
    removePriceHistoryPoint,
    resetItemGraph,
    theme,
    universalStarConfig,
    universalSoldierDroneStarConfig,
    t,
    translateRarity,
    translateTrend,
    language
  } = useValueList();

  const rarityConfig = getRarityConfig(item.rarity);
  const trendConfig = getTrendConfig(item.trend);

  const isVehicle = isVehicleCategory(item.category, item);
  const isSoldierOrDrone = isSoldierOrDroneCategory(item.category, item);
  const hasStars = isVehicle || isSoldierOrDrone;
  const hasManualOverrides = itemHasManualOverrides(item);

  // Graph View Mode: 'all_tiers' or 'primary'
  const [chartViewMode, setChartViewMode] = useState<'primary' | 'all_tiers'>(() => {
    return (hasStars && hasManualOverrides) ? 'all_tiers' : 'primary';
  });

  // Staff add point state
  const [showAddPointForm, setShowAddPointForm] = useState(false);
  const [showManagePoints, setShowManagePoints] = useState(false);
  const [deletingPointIndex, setDeletingPointIndex] = useState<number | null>(null);
  const [isConfirmingResetGraph, setIsConfirmingResetGraph] = useState(false);
  const [newPointValue, setNewPointValue] = useState<number>(item.value);
  const [newPointDate, setNewPointDate] = useState<string>(language === 'es' ? 'Hoy' : 'Today');
  const [newPointNote, setNewPointNote] = useState<string>('');
  const [pointTargetTier, setPointTargetTier] = useState<string>('all');
  const [useCustomTierValues, setUseCustomTierValues] = useState<boolean>(false);
  const [customTierValuesMap, setCustomTierValuesMap] = useState<Record<string, number>>({});

  // Timeframe selector state (7D, 30D, All)
  const [chartTimeframe, setChartTimeframe] = useState<'7D' | '30D' | 'All'>('30D');

  const tiersData = useMemo(() => {
    return getAllItemStarTiersData(item, universalStarConfig, universalSoldierDroneStarConfig);
  }, [item, universalStarConfig, universalSoldierDroneStarConfig]);

  const [selectedTier, setSelectedTier] = useState<string>(() => {
    return tiersData[0]?.tierId || '0';
  });

  // Initialize custom tier map when tiersData changes
  useEffect(() => {
    const initialMap: Record<string, number> = {};
    tiersData.forEach(t => {
      initialMap[t.tierId] = t.value;
    });
    setCustomTierValuesMap(initialMap);
  }, [tiersData]);

  // Standardized history: only plots points where valuation changes occur (no points per day)
  const standardizedHistory = useMemo(() => {
    return getStandardizedItemHistory(item);
  }, [item]);

  const hasRecordedChanges = useMemo(() => {
    return hasItemPriceChanges(item);
  }, [item]);

  const filteredHistory = useMemo(() => {
    return getProcessedHistoryForTimeframe(standardizedHistory, chartTimeframe, item.value);
  }, [standardizedHistory, chartTimeframe, item.value]);

  // Build multi-tier chart data points showing all star values
  const multiTierHistoryData = useMemo(() => {
    const baseCurrentVal = item.value || 1;

    return filteredHistory.map((h, index) => {
      const isLatest = index === filteredHistory.length - 1;
      const dataPoint: Record<string, any> = {
        date: h.date,
        note: h.note,
        tier: h.tier
      };

      // If this point was recorded for a specific tier (e.g. h.tier === '3'),
      // compute the relative scale based on that tier's current value
      const targetTierObj = h.tier ? tiersData.find(t => t.tierId === h.tier) : null;
      const anchorVal = targetTierObj ? targetTierObj.value : baseCurrentVal;
      const pointRatio = anchorVal > 0 ? h.value / anchorVal : 1;

      tiersData.forEach(t => {
        if (h.tierValues && h.tierValues[t.tierId] !== undefined) {
          dataPoint[t.tierId] = h.tierValues[t.tierId];
        } else if (isLatest) {
          dataPoint[t.tierId] = t.value;
        } else if (h.tier === t.tierId) {
          dataPoint[t.tierId] = h.value;
        } else {
          // If historic point, scale by tier ratio to base
          const tierCurrentVal = t.value;
          dataPoint[t.tierId] = Math.max(0, Math.round(tierCurrentVal * pointRatio));
        }
      });

      // Plot the specific selected tier's historical value or base value
      dataPoint.value = (hasStars && dataPoint[selectedTier] !== undefined)
        ? dataPoint[selectedTier]
        : h.value;

      return dataPoint;
    });
  }, [filteredHistory, item.value, tiersData, hasStars, selectedTier]);

  const activeTierObj = tiersData.find(t => t.tierId === selectedTier) || tiersData[0];
  const activeTierValue = activeTierObj?.value || item.value;

  useEffect(() => {
    setNewPointValue(activeTierValue);
  }, [selectedTier, activeTierValue]);

  const values = multiTierHistoryData.map(h => h.value);
  const highValue = Math.max(...values, activeTierValue);
  const initialValue = values[0] || activeTierValue;
  const currentValue = activeTierValue;
  const totalChangePercent = initialValue > 0 ? ((currentValue - initialValue) / initialValue) * 100 : 0;

  const handleAddPointSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let computedTierValues: Record<string, number> = {};
    if (hasStars) {
      if (useCustomTierValues) {
        computedTierValues = { ...customTierValuesMap };
      } else if (pointTargetTier !== 'all') {
        const targetTierObj = tiersData.find(t => t.tierId === pointTargetTier);
        const anchorVal = targetTierObj ? targetTierObj.value : (item.value || 1);
        const ratio = anchorVal > 0 ? newPointValue / anchorVal : 1;
        tiersData.forEach(t => {
          if (t.tierId === pointTargetTier) {
            computedTierValues[t.tierId] = newPointValue;
          } else {
            computedTierValues[t.tierId] = Math.max(0, Math.round(t.value * ratio));
          }
        });
      } else {
        const baseCurrentVal = item.value || 1;
        const ratio = baseCurrentVal > 0 ? newPointValue / baseCurrentVal : 1;
        tiersData.forEach(t => {
          computedTierValues[t.tierId] = Math.max(0, Math.round(t.value * ratio));
        });
      }
    }

    addPriceHistoryPoint(item.id, {
      value: newPointValue,
      date: newPointDate.trim() || (language === 'es' ? 'Hoy' : 'Today'),
      note: newPointNote.trim() || (language === 'es' ? 'Punto de transacción verificado por personal' : 'Staff verified transaction point'),
      tier: hasStars && pointTargetTier !== 'all' ? pointTargetTier : undefined,
      tierValues: hasStars ? computedTierValues : undefined
    });
    setShowAddPointForm(false);
    setNewPointNote('');
    setUseCustomTierValues(false);
  };

  const handleRemovePoint = async (pointIndex: number) => {
    if (!isStaffMode) return;
    try {
      await removePriceHistoryPoint(item.id, pointIndex, 'Removed via Price Chart Modal Staff Controls');
      setDeletingPointIndex(null);
    } catch (err) {
      console.error('Failed to remove price history point:', err);
    }
  };

  const handleResetGraphBaseline = () => {
    if (!isStaffMode) return;
    resetItemGraph(item.id);
    setIsConfirmingResetGraph(false);
    setShowManagePoints(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white/95 dark:bg-[#121520]/95 backdrop-blur-2xl border border-orange-200/80 dark:border-neutral-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden max-h-[92vh] flex flex-col transition-colors">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-orange-500/10 dark:from-orange-500/15 via-amber-500/5 to-transparent border-b border-orange-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-orange-500 text-white shadow-md shadow-orange-500/25">
              <LineChart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-['Chakra_Petch'] text-xl font-bold text-neutral-900 dark:text-white uppercase tracking-tight">
                  {item.name}
                </h3>
                {item.acronym && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/70 border border-orange-200/80 dark:border-orange-500/30 text-orange-700 dark:text-orange-300 tracking-wider uppercase inline-flex items-center">
                    {item.acronym}
                  </span>
                )}
                <span className={`text-xs px-2.5 py-0.5 rounded-xl font-mono font-bold border ${rarityConfig.pillClass}`}>
                  {translateRarity(item.rarity)}
                </span>
                {hasManualOverrides && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-mono font-black uppercase flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5 text-amber-500" />
                    <span>{t('staffOverride')}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-sans">
                {t('priceTrackingSubtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-800 dark:hover:text-white hover:bg-orange-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title={t('close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900/80 border border-orange-100 dark:border-neutral-800 shadow-sm">
              <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 block uppercase">
                {hasStars ? (activeTierObj?.label || t('baseItemValue')) : t('baseItemValue')}
              </span>
              <span className="text-lg font-black font-mono text-orange-600 dark:text-orange-400">
                {formatMilitaryValue(activeTierValue)}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900/80 border border-orange-100 dark:border-neutral-800 shadow-sm">
              <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 block uppercase">{t('allTimePeak')}</span>
              <span className="text-lg font-black font-mono text-amber-600 dark:text-amber-400">
                {formatMilitaryValue(highValue)}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900/80 border border-orange-100 dark:border-neutral-800 shadow-sm">
              <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 block uppercase">{t('netGainLoss')}</span>
              <span className={`text-lg font-black font-mono ${totalChangePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {totalChangePercent >= 0 ? `+${totalChangePercent.toFixed(1)}%` : `${totalChangePercent.toFixed(1)}%`}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900/80 border border-orange-100 dark:border-neutral-800 shadow-sm">
              <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 block uppercase">{t('demandRating')}</span>
              <span className="text-lg font-black font-mono text-orange-600 dark:text-orange-400">
                {item.demand} / 10 ({translateTrend(item.trend)})
              </span>
            </div>
          </div>

          {/* Chart View with Multi-Tier Switcher */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-neutral-900/80 border border-orange-100 dark:border-neutral-800 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  {t('trajectoryGraph')}
                </h4>
                <p className="text-[11px] text-neutral-500 font-sans">
                  {chartViewMode === 'all_tiers'
                    ? t('displayingAllCurves')
                    : t('displayingBaselineCurve')}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Timeframe selector: 7D, 30D, All */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-mono font-bold">
                  {(['7D', '30D', 'All'] as const).map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setChartTimeframe(tf)}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        chartTimeframe === tf
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      {tf === '7D' ? t('timeframe7d') : tf === '30D' ? t('timeframe30d') : t('allTime')}
                    </button>
                  ))}
                </div>

                {hasStars && (
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-mono font-bold flex-wrap">
                    {tiersData.map(tier => (
                      <button
                        key={tier.tierId}
                        type="button"
                        onClick={() => {
                          setSelectedTier(tier.tierId);
                          setChartViewMode('primary');
                        }}
                        className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                          chartViewMode === 'primary' && selectedTier === tier.tierId
                            ? 'bg-orange-500 text-white shadow-xs'
                            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                        }`}
                      >
                        {tier.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setChartViewMode('all_tiers')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                        chartViewMode === 'all_tiers'
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{t('allStarValuesBtn')}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Chart Area */}
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {chartViewMode === 'all_tiers' ? (
                  <RechartsLineChart data={multiTierHistoryData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#262b3a' : '#fed7aa'} vertical={false} opacity={0.6} />
                    <XAxis
                      dataKey="date"
                      stroke={theme === 'dark' ? '#4b5563' : '#9ca3af'}
                      tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 11, fontFamily: 'monospace' }}
                      tickLine={false}
                    />
                    <YAxis
                      stroke={theme === 'dark' ? '#4b5563' : '#9ca3af'}
                      tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
                      tickFormatter={(val) => formatMilitaryValue(val)}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-orange-200 dark:border-neutral-700 shadow-xl text-xs space-y-2 min-w-[200px]">
                              <div className="font-mono text-neutral-500 dark:text-neutral-400 font-semibold border-b border-neutral-200 dark:border-neutral-800 pb-1">
                                {data.date}
                              </div>
                              <div className="space-y-1">
                                {tiersData.map(tier => {
                                  const val = data[tier.tierId] ?? tier.value;
                                  const color = TIER_COLORS[tier.tierId] || '#f97316';
                                  return (
                                    <div key={tier.tierId} className="flex items-center justify-between gap-3 text-[11px] font-mono">
                                      <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                        <span className="text-neutral-700 dark:text-neutral-300 font-bold">{tier.label}:</span>
                                      </div>
                                      <span className="font-bold" style={{ color }}>
                                        {formatMilitaryValue(val)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                              {data.note && (
                                <p className="text-[10px] text-neutral-400 font-sans border-t border-neutral-200 dark:border-neutral-800 pt-1">
                                  {data.note}
                                </p>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {tiersData.map(tier => {
                      const color = TIER_COLORS[tier.tierId] || '#f97316';
                      return (
                        <Line
                          key={tier.tierId}
                          type="monotone"
                          dataKey={tier.tierId}
                          name={tier.label}
                          stroke={color}
                          strokeWidth={2.5}
                          dot={{ r: 3.5, fill: color, stroke: '#ffffff', strokeWidth: 1.5 }}
                          activeDot={{ r: 6, fill: color, stroke: '#ffffff', strokeWidth: 2 }}
                        />
                      );
                    })}
                  </RechartsLineChart>
                ) : (
                  <AreaChart data={multiTierHistoryData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValOrangeModal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#262b3a' : '#fed7aa'} vertical={false} opacity={0.6} />
                    <XAxis
                      dataKey="date"
                      stroke={theme === 'dark' ? '#4b5563' : '#9ca3af'}
                      tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 11, fontFamily: 'monospace' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[(dataMin: number) => Math.max(0, Math.round(dataMin * 0.85)), (dataMax: number) => Math.round(dataMax * 1.15)]}
                      stroke={theme === 'dark' ? '#4b5563' : '#9ca3af'}
                      tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
                      tickFormatter={(val) => formatMilitaryValue(val)}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md p-3 rounded-2xl border border-orange-200 dark:border-neutral-700 shadow-lg text-xs space-y-1">
                              <div className="flex items-center justify-between gap-3 font-mono text-neutral-500 dark:text-neutral-400 font-semibold">
                                <span>{data.date}</span>
                                {hasStars && <span className="text-orange-500 font-bold">{activeTierObj?.label}</span>}
                              </div>
                              <p className="font-mono text-sm font-black text-orange-600 dark:text-orange-400">
                                {formatMilitaryValue(data.value)}
                              </p>
                              {data.note && <p className="text-[11px] text-neutral-600 dark:text-neutral-400 font-sans">{data.note}</p>}
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
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorValOrangeModal)"
                      dot={{ r: 4.5, fill: '#f97316', stroke: '#ffffff', strokeWidth: 1.5 }}
                      activeDot={{ r: 6.5, fill: '#ea580c', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Star Tiers Matrix Breakdown */}
            {hasStars && (
              <div className="pt-3 border-t border-orange-100 dark:border-neutral-800 space-y-2">
                <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
                  {t('starMatrixBreakdown')}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                  {tiersData.map(tier => {
                    const color = TIER_COLORS[tier.tierId] || '#f97316';
                    return (
                      <div
                        key={tier.tierId}
                        className="p-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-950/70 border border-neutral-200/80 dark:border-neutral-800 space-y-1 text-center"
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-xs font-['Chakra_Petch'] font-bold text-neutral-900 dark:text-white uppercase">
                            {tier.shortLabel}
                          </span>
                        </div>
                        <div className="text-xs font-mono font-black" style={{ color }}>
                          {formatMilitaryValue(tier.value)}
                        </div>
                        <div className="text-[10px] font-mono text-neutral-500">
                          {t('demand')}: {tier.demand}/10
                        </div>
                        <div className="text-[9px] font-mono text-neutral-400 whitespace-nowrap truncate">
                          {tier.gemRange.formatted}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Staff Price History Point Controls (Add Point & Manage / Remove Points) */}
          {isStaffMode && (
            <div className="pt-2 border-t border-orange-100 dark:border-neutral-800 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                {!showAddPointForm && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddPointForm(true);
                      setShowManagePoints(false);
                    }}
                    className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('addAuditPointStaff')}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowManagePoints((prev) => !prev);
                    setShowAddPointForm(false);
                  }}
                  className={`text-xs font-mono font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                    showManagePoints
                      ? 'bg-rose-500/10 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                      : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>
                    {showManagePoints ? 'Hide Graph Points Manager' : `Manage / Remove Graph Points (${item.history?.length || 0})`}
                  </span>
                </button>
              </div>

              {/* Manage / Remove Graph Points Panel */}
              {showManagePoints && (
                <div className="p-4 rounded-2xl bg-neutral-50/80 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-rose-500" />
                      <span className="text-xs font-bold font-mono text-neutral-800 dark:text-neutral-200">
                        Staff Graph Points Manager ({item.history?.length || 0} recorded points)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowManagePoints(false)}
                      className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-xs font-mono cursor-pointer"
                    >
                      Close
                    </button>
                  </div>

                  {!item.history || item.history.length === 0 ? (
                    <div className="py-4 text-center text-xs font-mono text-neutral-400">
                      No custom historical points recorded for this item yet. Graph is currently rendering standard baseline.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {item.history.map((pt, idx) => {
                        const targetTierObj = pt.tier ? tiersData.find(t => t.tierId === pt.tier) : null;
                        const anchorVal = targetTierObj ? targetTierObj.value : (item.value || 1);
                        const pointRatio = anchorVal > 0 ? pt.value / anchorVal : 1;

                        return (
                          <div
                            key={`${pt.timestamp || pt.date}-${idx}`}
                            className="p-3 rounded-xl bg-white dark:bg-[#121520] border border-neutral-200 dark:border-neutral-800 text-xs font-mono space-y-2"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-bold flex items-center justify-center text-[10px] shrink-0">
                                  #{idx + 1}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-black text-orange-600 dark:text-orange-400">
                                      {formatMilitaryValue(pt.value)}
                                    </span>
                                    <span className="text-neutral-400">•</span>
                                    <span className="text-neutral-700 dark:text-neutral-300 font-semibold">
                                      {pt.date}
                                    </span>
                                    {pt.tier && (
                                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                                        Tier: {pt.tier === 'fresh' ? 'Fresh' : `${pt.tier}★`}
                                      </span>
                                    )}
                                  </div>
                                  {pt.note && (
                                    <div className="text-[10px] text-neutral-500 truncate max-w-[280px] sm:max-w-md mt-0.5">
                                      {pt.note}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Action buttons */}
                              <div className="shrink-0 flex items-center gap-1.5">
                                {deletingPointIndex === idx ? (
                                  <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 p-1 rounded-lg border border-rose-200 dark:border-rose-900">
                                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">
                                      Confirm?
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemovePoint(idx)}
                                      className="px-2 py-0.5 rounded bg-rose-600 text-white font-bold text-[10px] hover:bg-rose-700 cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeletingPointIndex(null)}
                                      className="px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[10px] cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setDeletingPointIndex(idx)}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-[11px] font-bold cursor-pointer transition-colors"
                                    title="Delete this point from graph"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Remove</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Complete Star Values Breakdown for this historical point */}
                            {hasStars && (
                              <div className="pt-1.5 border-t border-neutral-100 dark:border-neutral-800/80">
                                <div className="text-[10px] font-mono text-neutral-400 mb-1 flex items-center gap-1">
                                  <span>Star Values at this point:</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {tiersData.map(tier => {
                                    let starVal = pt.tierValues?.[tier.tierId];
                                    if (starVal === undefined) {
                                      if (pt.tier === tier.tierId) {
                                        starVal = pt.value;
                                      } else {
                                        starVal = Math.max(0, Math.round(tier.value * pointRatio));
                                      }
                                    }
                                    const color = TIER_COLORS[tier.tierId] || '#f97316';
                                    return (
                                      <span
                                        key={tier.tierId}
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-neutral-100/90 dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700"
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                        <span className="text-neutral-500 font-semibold">{tier.shortLabel}:</span>
                                        <span className="font-bold text-neutral-800 dark:text-neutral-200">
                                          {formatMilitaryValue(starVal)}
                                        </span>
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Reset Graph to Baseline Option */}
                  {item.history && item.history.length > 0 && (
                    <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                      {isConfirmingResetGraph ? (
                        <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl border border-rose-200 dark:border-rose-900 w-full justify-between">
                          <span className="text-xs text-rose-600 dark:text-rose-400 font-bold">
                            Reset all points and restore baseline?
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleResetGraphBaseline}
                              className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 cursor-pointer"
                            >
                              Yes, Reset Graph
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsConfirmingResetGraph(false)}
                              className="px-2.5 py-1 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsConfirmingResetGraph(true)}
                          className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 hover:underline font-mono font-semibold cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Graph to Current Valuation Baseline</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Staff Add Price History Point Form */}
              {showAddPointForm && (
                <form onSubmit={handleAddPointSubmit} className="p-4 rounded-2xl bg-orange-50/60 dark:bg-neutral-900 border border-orange-200 dark:border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-neutral-800 dark:text-neutral-200 block">
                      {t('addPriceHistoryPointTitle')}
                    </span>
                    {hasStars && (
                      <button
                        type="button"
                        onClick={() => setUseCustomTierValues(!useCustomTierValues)}
                        className="text-[11px] font-mono text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
                      >
                        {useCustomTierValues ? '← Switch to Proportional Mode' : '⚙️ Custom Values Per Star Tier'}
                      </button>
                    )}
                  </div>

                  {!useCustomTierValues ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-mono text-neutral-500 block">
                            {hasStars ? 'Target Star Tier' : t('newValueLabel')}
                          </label>
                        </div>
                        {hasStars ? (
                          <div className="space-y-1.5">
                            <select
                              value={pointTargetTier}
                              onChange={(e) => {
                                const tierId = e.target.value;
                                setPointTargetTier(tierId);
                                if (tierId === 'all') {
                                  setNewPointValue(item.value);
                                } else {
                                  const tObj = tiersData.find(t => t.tierId === tierId);
                                  setNewPointValue(tObj?.value || item.value);
                                }
                              }}
                              className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs font-mono"
                            >
                              <option value="all">All Star Tiers (Proportional)</option>
                              {tiersData.map(tier => (
                                <option key={tier.tierId} value={tier.tierId}>
                                  {tier.label} ({formatMilitaryValue(tier.value)})
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              value={newPointValue}
                              onChange={(e) => setNewPointValue(Number(e.target.value))}
                              placeholder="Value in $"
                              className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs font-mono"
                              required
                            />
                          </div>
                        ) : (
                          <input
                            type="number"
                            value={newPointValue}
                            onChange={(e) => setNewPointValue(Number(e.target.value))}
                            className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs font-mono"
                            required
                          />
                        )}
                      </div>
                      <div>
                        <label className="text-[11px] font-mono text-neutral-500 block mb-1">{t('dateLabel')}</label>
                        <input
                          type="text"
                          value={newPointDate}
                          onChange={(e) => setNewPointDate(e.target.value)}
                          placeholder="e.g. Aug 30"
                          className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs font-mono"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-mono text-neutral-500 block mb-1">{t('transactionNoteLabel')}</label>
                        <input
                          type="text"
                          value={newPointNote}
                          onChange={(e) => setNewPointNote(e.target.value)}
                          placeholder="e.g. Verified marketplace trade"
                          className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs font-mono"
                        />
                      </div>
                    </div>
                  ) : (
                    /* Detailed Star Values Entry for each tier */
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {tiersData.map(tier => (
                          <div key={tier.tierId} className="p-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                            <label className="text-[10px] font-mono font-bold text-neutral-600 dark:text-neutral-400 block mb-1">
                              {tier.label}
                            </label>
                            <input
                              type="number"
                              value={customTierValuesMap[tier.tierId] ?? tier.value}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setCustomTierValuesMap(prev => ({ ...prev, [tier.tierId]: val }));
                              }}
                              className="w-full px-2 py-1 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs font-mono"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-mono text-neutral-500 block mb-1">{t('dateLabel')}</label>
                          <input
                            type="text"
                            value={newPointDate}
                            onChange={(e) => setNewPointDate(e.target.value)}
                            placeholder="e.g. Aug 30"
                            className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs font-mono"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-mono text-neutral-500 block mb-1">{t('transactionNoteLabel')}</label>
                          <input
                            type="text"
                            value={newPointNote}
                            onChange={(e) => setNewPointNote(e.target.value)}
                            placeholder="e.g. Multi-tier verified transaction"
                            className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs font-mono cursor-pointer shadow-sm"
                    >
                      {t('commitPoint')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddPointForm(false);
                        setUseCustomTierValues(false);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-mono cursor-pointer"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const PriceChartModal: React.FC = () => {
  const { activeChartModalItem, setActiveChartModalItem } = useValueList();

  if (!activeChartModalItem) return null;

  return (
    <PriceChartModalContent
      key={activeChartModalItem.id}
      item={activeChartModalItem}
      onClose={() => setActiveChartModalItem(null)}
    />
  );
};
