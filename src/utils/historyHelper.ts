import { MilitaryItem, PriceHistoryPoint } from '../types';

/**
 * Format a Date or timestamp to a clean calendar day string e.g. "Sep 3"
 */
export function formatDayLabel(timestampOrDate: string | Date): string {
  try {
    const d = typeof timestampOrDate === 'string' ? new Date(timestampOrDate) : timestampOrDate;
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  } catch {}
  return String(timestampOrDate);
}

/**
 * Format a Date to standard YYYY-MM-DD for keying unique days
 */
export function formatDayKey(timestampOrDate: string | Date): string {
  try {
    const d = typeof timestampOrDate === 'string' ? new Date(timestampOrDate) : timestampOrDate;
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch {}
  return String(timestampOrDate);
}

/**
 * Parse an arbitrary timestamp or date string into epoch milliseconds safely
 */
function safeParseTime(pt: PriceHistoryPoint, indexFallback: number, total: number): number {
  if (pt.timestamp) {
    const t = new Date(pt.timestamp).getTime();
    if (!isNaN(t)) return t;
  }
  if (pt.date && pt.date !== 'Today' && pt.date !== 'Hoy' && pt.date !== 'Baseline') {
    // If date string does not have a 4-digit year, append the current year (e.g. "Sep 08" -> "Sep 08 2026")
    // otherwise new Date("Sep 08") yields year 2001 in JavaScript engines!
    const dateStr = /\b\d{4}\b/.test(pt.date) ? pt.date : `${pt.date} ${new Date().getFullYear()}`;
    const t = new Date(dateStr).getTime();
    if (!isNaN(t)) return t;
  }
  // Fallback relative spacing across the last 30 days
  const now = Date.now();
  const step = (30 * 24 * 60 * 60 * 1000) / Math.max(1, total);
  return now - (total - 1 - indexFallback) * step;
}

/**
 * Extracts and sanitizes history points so that points are properly plotted.
 */
export function extractChangePoints(
  history: PriceHistoryPoint[] | undefined,
  currentValue?: number,
  lastUpdated?: string
): PriceHistoryPoint[] {
  const now = new Date();
  if (!history || history.length === 0) {
    if (currentValue !== undefined && currentValue > 0) {
      return [
        {
          timestamp: lastUpdated || now.toISOString(),
          date: 'Baseline',
          value: currentValue,
          note: 'Initial Market Valuation'
        }
      ];
    }
    return [];
  }

  // Sort chronologically
  const total = history.length;
  const sorted = [...history].sort((a, b) => {
    const tA = safeParseTime(a, 0, total);
    const tB = safeParseTime(b, 1, total);
    return tA - tB;
  });

  const changePoints: PriceHistoryPoint[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const pt = sorted[i];
    const ptTime = safeParseTime(pt, i, sorted.length);
    const ptDateObj = new Date(ptTime);
    const ptLabel = pt.date || formatDayLabel(ptDateObj);

    const cleanPt: PriceHistoryPoint = {
      timestamp: pt.timestamp || ptDateObj.toISOString(),
      date: ptLabel,
      value: typeof pt.value === 'number' && !isNaN(pt.value) ? pt.value : 0,
      note: pt.note,
      updatedBy: pt.updatedBy,
      tier: pt.tier,
      tierValues: pt.tierValues ? { ...pt.tierValues } : undefined
    };

    changePoints.push(cleanPt);
  }

  // If item's current active value differs from the last recorded point, append current verified value
  if (
    currentValue !== undefined &&
    currentValue > 0 &&
    changePoints.length > 0 &&
    changePoints[changePoints.length - 1].value !== currentValue
  ) {
    const date = lastUpdated ? new Date(lastUpdated) : now;
    changePoints.push({
      timestamp: date.toISOString(),
      date: 'Today',
      value: currentValue,
      note: 'Current Verified Valuation'
    });
  }

  return changePoints;
}

/**
 * Checks whether an item has recorded valuation points or history.
 */
export function hasItemPriceChanges(item: MilitaryItem): boolean {
  if (!item.history || item.history.length === 0) return false;
  return item.history.length >= 1;
}

/**
 * Generates a clean baseline history with only actual valuation change points.
 */
export function generateMonthOfHistory(item: MilitaryItem): PriceHistoryPoint[] {
  return extractChangePoints(item.history, item.value, item.lastUpdated);
}

/**
 * Returns clean item valuation history.
 */
export function getStandardizedItemHistory(item: MilitaryItem): PriceHistoryPoint[] {
  return extractChangePoints(item.history, item.value, item.lastUpdated);
}

/**
 * Processes history points for chart display based on selected timeframe.
 * Always produces a complete, continuous curve spanning from the timeframe start to Today.
 */
export function getProcessedHistoryForTimeframe(
  history: PriceHistoryPoint[],
  timeframe: '7D' | '30D' | '90D' | 'All',
  currentValue?: number
): PriceHistoryPoint[] {
  const fallbackVal = currentValue ?? 0;
  const days = timeframe === '7D' ? 7 : timeframe === '30D' ? 30 : timeframe === '90D' ? 90 : 30;
  const now = new Date();
  const nowMs = now.getTime();
  const cutoffTime = nowMs - days * 24 * 60 * 60 * 1000;
  const startDate = new Date(cutoffTime);
  const startLabel = formatDayLabel(startDate);
  const endLabel = 'Today';

  // Helper to create a steady flat line across the window
  const createFlatBaseline = (val: number, sLabel = startLabel): PriceHistoryPoint[] => [
    {
      timestamp: startDate.toISOString(),
      date: sLabel,
      value: val,
      note: 'Market Valuation Baseline'
    },
    {
      timestamp: now.toISOString(),
      date: endLabel,
      value: val,
      note: 'Current Verified Valuation'
    }
  ];

  if (!history || history.length === 0) {
    return createFlatBaseline(fallbackVal);
  }

  // Parse and normalize history points
  const total = history.length;
  const normalized: { time: number; pt: PriceHistoryPoint }[] = history.map((pt, idx) => {
    const time = safeParseTime(pt, idx, total);
    return { time, pt };
  }).sort((a, b) => a.time - b.time);

  if (timeframe === 'All') {
    if (normalized.length === 1) {
      const single = normalized[0].pt;
      const sLabel = single.date && single.date !== 'Today' ? single.date : formatDayLabel(new Date(normalized[0].time));
      return [
        {
          timestamp: single.timestamp || startDate.toISOString(),
          date: sLabel,
          value: single.value,
          tier: single.tier,
          tierValues: single.tierValues,
          note: single.note || 'Historical Starting Valuation'
        },
        {
          timestamp: now.toISOString(),
          date: endLabel,
          value: fallbackVal || single.value,
          tier: single.tier,
          tierValues: single.tierValues,
          note: 'Current Verified Valuation'
        }
      ];
    }

    const result: PriceHistoryPoint[] = normalized.map(n => ({
      ...n.pt,
      value: typeof n.pt.value === 'number' && !isNaN(n.pt.value) ? n.pt.value : fallbackVal
    }));

    // Ensure the line extends to Today
    const last = result[result.length - 1];
    if (last.date !== 'Today' && last.date !== 'Hoy') {
      result.push({
        timestamp: now.toISOString(),
        date: endLabel,
        value: fallbackVal || last.value,
        tier: last.tier,
        tierValues: last.tierValues,
        note: 'Current Verified Valuation'
      });
    }

    return makeUniqueDateLabels(result);
  }

  // Timeframe filtered (7D, 30D, 90D)
  const pointsInWindow: PriceHistoryPoint[] = [];
  let latestBeforeWindow: PriceHistoryPoint | null = null;

  for (const item of normalized) {
    if (item.time >= cutoffTime) {
      pointsInWindow.push(item.pt);
    } else {
      latestBeforeWindow = item.pt;
    }
  }

  const baselineVal = latestBeforeWindow
    ? latestBeforeWindow.value
    : pointsInWindow[0]?.value ?? fallbackVal;

  const result: PriceHistoryPoint[] = [];

  // Anchor the beginning of the timeframe so line starts cleanly at left edge
  result.push({
    timestamp: startDate.toISOString(),
    date: startLabel,
    value: baselineVal,
    tier: latestBeforeWindow?.tier ?? pointsInWindow[0]?.tier,
    tierValues: latestBeforeWindow?.tierValues ?? pointsInWindow[0]?.tierValues,
    note: latestBeforeWindow ? 'Valuation entering timeframe' : 'Timeframe Baseline'
  });

  // Add intermediate points within the window
  for (const pt of pointsInWindow) {
    result.push(pt);
  }

  // Ensure the line reaches Today at current valuation
  const last = result[result.length - 1];
  if (last.date !== 'Today' && last.date !== 'Hoy') {
    result.push({
      timestamp: now.toISOString(),
      date: endLabel,
      value: fallbackVal || last.value,
      tier: last.tier,
      tierValues: last.tierValues,
      note: 'Current Verified Valuation'
    });
  }

  return makeUniqueDateLabels(result);
}

/**
 * Recharts requires unique X-axis keys to prevent SVG collision or path bugs.
 * If multiple points fall on the exact same date label (e.g. "Sep 8"), disambiguate them.
 */
function makeUniqueDateLabels(points: PriceHistoryPoint[]): PriceHistoryPoint[] {
  const seenDates = new Map<string, number>();

  return points.map(pt => {
    const rawLabel = pt.date || 'Point';
    const count = (seenDates.get(rawLabel) || 0) + 1;
    seenDates.set(rawLabel, count);

    let uniqueLabel = rawLabel;
    if (count > 1) {
      if (pt.timestamp) {
        try {
          const t = new Date(pt.timestamp);
          if (!isNaN(t.getTime())) {
            const timeStr = t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
            uniqueLabel = `${rawLabel} • ${timeStr}`;
          } else {
            uniqueLabel = `${rawLabel} (${count})`;
          }
        } catch {
          uniqueLabel = `${rawLabel} (${count})`;
        }
      } else {
        uniqueLabel = `${rawLabel} (${count})`;
      }
    }

    return {
      ...pt,
      date: uniqueLabel
    };
  });
}
