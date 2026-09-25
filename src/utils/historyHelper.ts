import { MilitaryItem, PriceHistoryPoint, PriceTrend } from '../types';

export function hasItemPriceChanges(itemOrHistory?: MilitaryItem | PriceHistoryPoint[]): boolean {
  if (!itemOrHistory) return false;
  if (Array.isArray(itemOrHistory)) {
    return itemOrHistory.length > 1;
  }
  const history = itemOrHistory.history;
  if (!history || history.length <= 1) return false;
  const firstVal = history[0].value;
  return history.some(p => p.value !== firstVal);
}

export function generateMonthOfHistory(baseValue: number, trend: PriceTrend = 'Stable'): PriceHistoryPoint[] {
  const points: PriceHistoryPoint[] = [];
  const now = new Date();
  const days = 30;

  let trendMultiplier = 1;
  if (trend === 'Rising' || trend === 'rising') trendMultiplier = 1.05;
  else if (trend === 'Dropping' || trend === 'dropping') trendMultiplier = 0.95;

  for (let i = days; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    const progress = (days - i) / days;
    const factor = 1 + (trendMultiplier - 1) * progress;
    const val = Math.round(baseValue * factor);

    points.push({
      timestamp: d.toISOString(),
      date: dateStr,
      value: val
    });
  }

  return points;
}

export function getStandardizedItemHistory(item: MilitaryItem, tierId?: string): PriceHistoryPoint[] {
  if (item.history && item.history.length > 0) {
    if (tierId && tierId !== 'fresh' && tierId !== '0') {
      const hasTierSnapshots = item.history.some(p => p.tierValues && p.tierValues[tierId]);
      if (hasTierSnapshots) {
        return item.history.map(p => ({
          ...p,
          value: p.tierValues?.[tierId] ?? p.value
        }));
      }
    }
    return item.history;
  }
  return generateMonthOfHistory(item.value, item.trend);
}

export function getProcessedHistoryForTimeframe(
  history: PriceHistoryPoint[],
  timeframe: string = '1M',
  fallbackValue?: number
): PriceHistoryPoint[] {
  if (!history || history.length === 0) return [];
  const now = Date.now();
  let days = 30;
  if (timeframe === '7D' || timeframe === '7d') days = 7;
  else if (timeframe === '1M' || timeframe === '1m') days = 30;
  else if (timeframe === '3M' || timeframe === '3m') days = 90;
  else if (timeframe === 'ALL' || timeframe === 'all') return history;

  const cutoff = now - days * 24 * 60 * 60 * 1000;
  const filtered = history.filter(p => new Date(p.timestamp || p.date).getTime() >= cutoff);
  if (filtered.length === 0) {
    return history.slice(-Math.min(history.length, days));
  }
  return filtered;
}
