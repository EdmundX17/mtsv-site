import {
  MilitaryItem,
  StarTier,
  UniversalStarConfig,
  UniversalSoldierDroneStarConfig,
  TradeSideItem,
  TradeVerdictType,
  TradeAdvice,
  PriceTrend
} from '../types';
import {
  getItemStarTierData,
  normalizeTrend,
  formatMilitaryValue,
  formatPlainMilitaryValue
} from './formatters';

export const GEM_TAX_RATE = 0.08; // 8% in-game trade tax on gems

export interface EvaluatedTradeItem {
  instanceId: string;
  item: MilitaryItem;
  starTier: StarTier;
  quantity: number;
  unitValue: number;
  totalValue: number;
  unitStars: number;
  totalStars: number;
  demand: number;
  trend: PriceTrend;
  tierLabel: string;
}

export interface EvaluatedTradeSide {
  items: EvaluatedTradeItem[];
  itemCount: number;
  totalItemValue: number;
  totalStars: number;
  rawGems: number;
  gemTaxAmount: number;
  netGems: number;
  totalValue: number; // For your side: itemValue + rawGems. For their side (received by you): itemValue + netGems.
  averageDemand: number;
  hasItemDemand: boolean;
  trendSummary: Record<string, number>;
  hasRisingOrGlazed: boolean;
  hasDroppingOrUnstable: boolean;
}

export interface TradeAnalysisResult {
  you: EvaluatedTradeSide;
  them: EvaluatedTradeSide;
  netValueDiff: number; // them.totalValue - you.totalValue
  percentDiff: number; // % gain or loss
  starsDiff: number; // them.totalStars - you.totalStars
  demandDiff: number | null; // them.averageDemand - you.averageDemand, or null if either side has no items
  hasDemandComparison: boolean;
  verdictType: TradeVerdictType;
  advice: TradeAdvice;
  hasItems: boolean;
}

export function evaluateTradeSide(
  tradeItems: TradeSideItem[],
  rawGems: number,
  allItems: MilitaryItem[],
  universalStarConfig: UniversalStarConfig,
  universalSoldierDroneStarConfig: UniversalSoldierDroneStarConfig,
  isTheirSide: boolean
): EvaluatedTradeSide {
  const itemMap = new Map(allItems.map(i => [i.id, i]));
  const evaluatedItems: EvaluatedTradeItem[] = [];

  let totalItemValue = 0;
  let totalStars = 0;
  let totalQuantity = 0;
  let weightedDemandSum = 0;
  const trendSummary: Record<string, number> = {
    Glazed: 0,
    Rising: 0,
    Stable: 0,
    Dropping: 0,
    Unstable: 0
  };

  tradeItems.forEach(entry => {
    const item = itemMap.get(entry.itemId);
    if (!item) return;

    const qty = Math.max(1, entry.quantity || 1);
    const tierData = getItemStarTierData(
      item,
      entry.starTier,
      universalStarConfig,
      universalSoldierDroneStarConfig
    );

    const unitVal = tierData.value;
    const itemVal = unitVal * qty;
    const unitStars = tierData.starsCount;
    const stars = unitStars * qty;

    totalItemValue += itemVal;
    totalStars += stars;
    totalQuantity += qty;
    weightedDemandSum += tierData.demand * itemVal;

    const normTrend = normalizeTrend(tierData.trend);
    trendSummary[normTrend] = (trendSummary[normTrend] || 0) + qty;

    evaluatedItems.push({
      instanceId: entry.instanceId,
      item,
      starTier: entry.starTier,
      quantity: qty,
      unitValue: unitVal,
      totalValue: itemVal,
      unitStars,
      totalStars: stars,
      demand: tierData.demand,
      trend: tierData.trend,
      tierLabel: tierData.shortLabel
    });
  });

  const validGems = Math.max(0, rawGems || 0);
  const gemTaxAmount = Math.round(validGems * GEM_TAX_RATE);
  const netGems = Math.max(0, validGems - gemTaxAmount);

  // If this is their side, you receive netGems (after 8% tax).
  // If this is your side, you are giving validGems.
  const totalValue = totalItemValue + (isTheirSide ? netGems : validGems);

  const hasItemDemand = evaluatedItems.length > 0;
  const averageDemand = hasItemDemand
    ? (totalItemValue > 0
        ? Number((weightedDemandSum / totalItemValue).toFixed(1))
        : Number((evaluatedItems.reduce((acc, cur) => acc + cur.demand, 0) / evaluatedItems.length).toFixed(1)))
    : 0;

  const hasRisingOrGlazed = (trendSummary['Rising'] || 0) > 0 || (trendSummary['Glazed'] || 0) > 0;
  const hasDroppingOrUnstable = (trendSummary['Dropping'] || 0) > 0 || (trendSummary['Unstable'] || 0) > 0;

  return {
    items: evaluatedItems,
    itemCount: totalQuantity,
    totalItemValue,
    totalStars,
    rawGems: validGems,
    gemTaxAmount,
    netGems,
    totalValue,
    averageDemand,
    hasItemDemand,
    trendSummary,
    hasRisingOrGlazed,
    hasDroppingOrUnstable
  };
}

export function analyzeTrade(
  youItems: TradeSideItem[],
  youGems: number,
  themItems: TradeSideItem[],
  themGems: number,
  allItems: MilitaryItem[],
  universalStarConfig: UniversalStarConfig,
  universalSoldierDroneStarConfig: UniversalSoldierDroneStarConfig,
  lang: 'es' | 'en' = 'en'
): TradeAnalysisResult {
  const you = evaluateTradeSide(youItems, youGems, allItems, universalStarConfig, universalSoldierDroneStarConfig, false);
  const them = evaluateTradeSide(themItems, themGems, allItems, universalStarConfig, universalSoldierDroneStarConfig, true);

  const hasItems = you.itemCount > 0 || you.rawGems > 0 || them.itemCount > 0 || them.rawGems > 0;

  if (!hasItems) {
    return {
      you,
      them,
      netValueDiff: 0,
      percentDiff: 0,
      starsDiff: 0,
      demandDiff: null,
      hasDemandComparison: false,
      verdictType: 'EMPTY',
      advice: {
        isGoodIdea: false,
        verdictType: 'EMPTY',
        headline: lang === 'es' ? 'Intercambio vacío' : 'Empty Trade',
        recommendation: 'EQUAL',
        description: lang === 'es'
          ? 'Agrega objetos o gemas a ambos lados para evaluar si el intercambio es favorable o desfavorable.'
          : 'Add items or gems to both sides to evaluate whether the trade is a win or lose.',
        points: [
          lang === 'es'
            ? 'Elige objetos del catálogo o añade gemas con deducción de impuestos del 8%.'
            : 'Choose items from the catalog or add gems with 8% tax calculation.'
        ],
        riskLevel: 'neutral'
      },
      hasItems: false
    };
  }

  const netValueDiff = them.totalValue - you.totalValue;
  const percentDiff = you.totalValue > 0
    ? (netValueDiff / you.totalValue) * 100
    : (them.totalValue > 0 ? 100 : 0);

  const starsDiff = them.totalStars - you.totalStars;
  const hasDemandComparison = you.hasItemDemand && them.hasItemDemand;
  const demandDiff = hasDemandComparison
    ? Number((them.averageDemand - you.averageDemand).toFixed(1))
    : null;

  // Determine basic verdict type
  let verdictType: TradeVerdictType = 'FAIR';
  if (percentDiff >= 15) {
    verdictType = 'BIG_WIN';
  } else if (percentDiff >= 5) {
    verdictType = 'WIN';
  } else if (percentDiff <= -15) {
    verdictType = 'BIG_LOSE';
  } else if (percentDiff <= -5) {
    verdictType = 'LOSE';
  } else {
    verdictType = 'FAIR';
  }

  // Generate smart Trade Advice: Is it a good idea to do the trade?
  const points: string[] = [];
  let isGoodIdea = false;
  let recommendation: 'DO_TRADE' | 'CONSIDER' | 'DECLINE' | 'EQUAL' = 'CONSIDER';
  let headline = '';
  let description = '';
  let riskLevel: 'safe' | 'caution' | 'warning' | 'neutral' = 'neutral';

  const diffFormatted = `${netValueDiff >= 0 ? '+' : '-'}${formatMilitaryValue(Math.abs(netValueDiff))}`;
  const pctFormatted = `${percentDiff >= 0 ? '+' : ''}${percentDiff.toFixed(1)}%`;

  // 1. Value point
  if (Math.abs(percentDiff) < 1) {
    points.push(
      lang === 'es'
        ? `Paridad de valor: exactamente balanceado dentro del 1% (${diffFormatted})`
        : `Value parity: Exactly balanced within 1% (${diffFormatted})`
    );
  } else if (percentDiff > 0) {
    points.push(
      lang === 'es'
        ? `Ganancia de valor: obtienes ${diffFormatted} (${pctFormatted})`
        : `Value profit: You gain ${diffFormatted} (${pctFormatted})`
    );
  } else {
    points.push(
      lang === 'es'
        ? `Déficit de valor: entregas ${diffFormatted} (${pctFormatted})`
        : `Value deficit: You give up ${diffFormatted} (${pctFormatted})`
    );
  }

  // 2. Stars point
  if (starsDiff > 0) {
    points.push(
      lang === 'es'
        ? `Mejora de estrellas: obtienes +${starsDiff}★ en las unidades intercambiadas`
        : `Stars upgrade: You gain +${starsDiff}★ across traded units`
    );
  } else if (starsDiff < 0) {
    points.push(
      lang === 'es'
        ? `Déficit de estrellas: pierdes ${Math.abs(starsDiff)}★ en niveles de vehículos`
        : `Stars deficit: You lose ${Math.abs(starsDiff)}★ in vehicle tiers`
    );
  } else if (you.totalStars > 0 || them.totalStars > 0) {
    points.push(
      lang === 'es'
        ? `Igualdad de estrellas: ambos lados ofrecen ${you.totalStars}★ en total`
        : `Star equality: Both sides offer ${you.totalStars}★ in total`
    );
  }

  // 3. Demand & Trend point - ONLY compare when both sides actually offer items with market demand
  if (hasDemandComparison && demandDiff !== null) {
    if (demandDiff >= 1.5) {
      points.push(
        lang === 'es'
          ? `Mejora de demanda: sus objetos promedian mayor demanda (${them.averageDemand}/10 vs ${you.averageDemand}/10)`
          : `Demand upgrade: Their items average higher demand (${them.averageDemand}/10 vs ${you.averageDemand}/10)`
      );
    } else if (demandDiff <= -1.5) {
      points.push(
        lang === 'es'
          ? `Advertencia de demanda: sus objetos tienen menor demanda de mercado (${them.averageDemand}/10 vs ${you.averageDemand}/10)`
          : `Demand warning: Their items have lower market demand (${them.averageDemand}/10 vs ${you.averageDemand}/10)`
      );
    }
  }

  if (them.hasDroppingOrUnstable && !you.hasDroppingOrUnstable) {
    points.push(
      lang === 'es'
        ? `Advertencia de mercado: estás recibiendo objetos con tendencias Bajando o Inestable`
        : `Market warning: You are receiving items with Dropping or Unstable trends`
    );
  } else if (them.hasRisingOrGlazed && !you.hasRisingOrGlazed) {
    points.push(
      lang === 'es'
        ? `Impulso de mercado: su oferta incluye objetos Subiendo o Populares`
        : `Market momentum: Their offer includes Rising or Glazed items`
    );
  }

  // 4. Gem tax notice if gems are involved
  if (them.rawGems > 0) {
    points.push(
      lang === 'es'
        ? `Impuesto de gemas aplicado: 8% deducido (-${formatMilitaryValue(them.gemTaxAmount)}), entregando ${formatMilitaryValue(them.netGems)} netas`
        : `Gem tax applied: 8% tax deducted (-${formatMilitaryValue(them.gemTaxAmount)}), delivering ${formatMilitaryValue(them.netGems)} net`
    );
  }

  // Comprehensive logic for isGoodIdea and recommendation
  if (verdictType === 'BIG_WIN') {
    if (hasDemandComparison && them.averageDemand < 4.0 && you.averageDemand >= 8.0) {
      isGoodIdea = true;
      recommendation = 'CONSIDER';
      riskLevel = 'caution';
      headline = lang === 'es' ? 'Gran ganancia de valor, pero menor demanda' : 'High Value Win, but Lower Demand';
      description = lang === 'es'
        ? `Obtienes un gran beneficio en valor nominal (${pctFormatted}), pero ten en cuenta que sus objetos pueden tardar más en intercambiarse debido a su menor demanda en el mercado.`
        : `You make a massive profit in nominal value (${pctFormatted}), but be aware that their items may take longer to trade away due to lower market demand.`;
    } else {
      isGoodIdea = true;
      recommendation = 'DO_TRADE';
      riskLevel = 'safe';
      headline = lang === 'es' ? 'Intercambio excepcional — Altamente recomendado' : 'Outstanding Trade — Highly Recommended';
      description = lang === 'es'
        ? `Te llevas un superávit masivo de valor del ${pctFormatted} (${diffFormatted}). Aceptar este intercambio es altamente rentable.`
        : `You are taking home a massive ${pctFormatted} value surplus (${diffFormatted}). Accepting this trade is highly profitable.`;
    }
  } else if (verdictType === 'WIN') {
    if (them.hasDroppingOrUnstable && hasDemandComparison && demandDiff !== null && demandDiff <= -2.0) {
      isGoodIdea = false;
      recommendation = 'CONSIDER';
      riskLevel = 'caution';
      headline = lang === 'es' ? 'Ganancia en valor, pero demanda engañosa' : 'Value Win, but Trappy Demand';
      description = lang === 'es'
        ? `En el papel ganas ${pctFormatted}, pero estás intercambiando objetos sólidos de alta demanda por objetos en caída o baja demanda que podrían perder valor pronto.`
        : `On paper, you gain ${pctFormatted}, but you are trading solid high-demand items for dropping or low-demand items that could lose value quickly.`;
    } else {
      isGoodIdea = true;
      recommendation = 'DO_TRADE';
      riskLevel = 'safe';
      headline = lang === 'es' ? 'Intercambio sólido — Buena idea aceptar' : 'Solid Trade — Good Idea to Do';
      description = lang === 'es'
        ? `Ganas ${pctFormatted} en poder adquisitivo con demanda de mercado saludable. Este es un intercambio favorable.`
        : `You gain ${pctFormatted} in purchasing power with healthy market demand. This is a favorable trade.`;
    }
  } else if (verdictType === 'FAIR') {
    if ((hasDemandComparison && demandDiff !== null && demandDiff >= 1.5) || (them.hasRisingOrGlazed && !you.hasRisingOrGlazed)) {
      isGoodIdea = true;
      recommendation = 'DO_TRADE';
      riskLevel = 'safe';
      headline = lang === 'es' ? 'Gran mejora — Aumento de alta demanda' : 'Great Upgrade — High Demand Gain';
      description = lang === 'es'
        ? `Los valores están equilibrados (${pctFormatted}), pero estás mejorando hacia vehículos de mayor demanda y rápida venta con impulso positivo.`
        : `Values are balanced (${pctFormatted}), but you are upgrading into higher-demand, faster-selling vehicles with positive momentum.`;
    } else if ((hasDemandComparison && demandDiff !== null && demandDiff <= -1.5) || (them.hasDroppingOrUnstable && you.hasRisingOrGlazed)) {
      isGoodIdea = false;
      recommendation = 'CONSIDER';
      riskLevel = 'caution';
      headline = lang === 'es' ? 'Valor justo, pero baja de demanda' : 'Fair Value, but Demand Downgrade';
      description = lang === 'es'
        ? `Valores parejos (${pctFormatted}), pero sus objetos tienen menor liquidez y menor demanda de mercado que los tuyos. Solo hazlo si deseas personalmente estos objetos.`
        : `Even values (${pctFormatted}), but their items have weaker liquidity and lower market demand than yours. Only do this if you personally want these items.`;
    } else {
      isGoodIdea = true;
      recommendation = 'EQUAL';
      riskLevel = 'neutral';
      headline = lang === 'es' ? 'Intercambio justo y equilibrado' : 'Balanced & Fair Trade';
      description = lang === 'es'
        ? `Tanto el valor como la demanda del mercado están parejos (${pctFormatted}). Un trato completamente justo para ambos jugadores.`
        : `Both value and market demand are evenly matched (${pctFormatted}). A completely fair deal for both players.`;
    }
  } else if (verdictType === 'LOSE') {
    if (hasDemandComparison && demandDiff !== null && percentDiff >= -8 && demandDiff >= 3.0 && them.hasRisingOrGlazed) {
      isGoodIdea = true;
      recommendation = 'CONSIDER';
      riskLevel = 'caution';
      headline = lang === 'es' ? 'Sobrepago aceptable por alta demanda' : 'Acceptable Overpay for High Demand';
      description = lang === 'es'
        ? `Pagas un poco más (${pctFormatted}), pero estás adquiriendo objetos de demanda ultra alta o en aumento que justifican un pequeño sobrepago.`
        : `You are slightly underpaid (${pctFormatted}), but you are upgrading into ultra-high demand or rising items that justify a small overpay.`;
    } else {
      isGoodIdea = false;
      recommendation = 'DECLINE';
      riskLevel = 'warning';
      headline = lang === 'es' ? 'Intercambio desfavorable — Pérdida de valor' : 'Unfavorable Trade — Value Loss';
      description = lang === 'es'
        ? `Estás entregando ${diffFormatted} (${pctFormatted}) más de lo que recibes. Recomendamos pedirles que agreguen gemas u objetos.`
        : `You are giving away ${diffFormatted} (${pctFormatted}) more than you receive. We recommend asking them to add gems or items.`;
    }
  } else {
    // BIG_LOSE
    isGoodIdea = false;
    recommendation = 'DECLINE';
    riskLevel = 'warning';
    headline = lang === 'es' ? 'Mal intercambio — Gran pérdida de valor' : 'Bad Trade — Heavy Value Loss';
    description = lang === 'es'
      ? `Estás perdiendo ${diffFormatted} (${pctFormatted}). No aceptes este intercambio a menos que agreguen valor significativo.`
      : `You are losing ${diffFormatted} (${pctFormatted}). Do not accept this trade unless they add significant value.`;
  }

  return {
    you,
    them,
    netValueDiff,
    percentDiff,
    starsDiff,
    demandDiff,
    hasDemandComparison,
    verdictType,
    advice: {
      isGoodIdea,
      verdictType,
      headline,
      recommendation,
      description,
      points,
      riskLevel
    },
    hasItems
  };
}

/**
 * Calculates the exact gems needed on either side to bring the trade to 100% parity,
 * strictly factoring in the 8% game trade tax on gems.
 */
export function calculateRequiredGemsToBalance(
  netValueDiff: number
): { sideToGive: 'you' | 'them'; rawGemsNeeded: number; netGemsEffect: number; taxDeduction: number } | null {
  if (Math.abs(netValueDiff) < 10) return null;

  if (netValueDiff < 0) {
    // You are overpaying (giving more value than receiving).
    // Them needs to add gems.
    // Since gems from them incur an 8% tax, gross gems = deficit / (1 - 0.08)
    const deficit = Math.abs(netValueDiff);
    const rawGemsNeeded = Math.ceil(deficit / (1 - GEM_TAX_RATE));
    const taxDeduction = Math.round(rawGemsNeeded * GEM_TAX_RATE);
    const netGemsEffect = rawGemsNeeded - taxDeduction;

    return {
      sideToGive: 'them',
      rawGemsNeeded,
      netGemsEffect,
      taxDeduction
    };
  } else {
    // You are underpaying (receiving more value than giving).
    // You can add gems to balance your offer.
    const deficit = netValueDiff;
    const rawGemsNeeded = Math.round(deficit);
    const taxDeduction = Math.round(rawGemsNeeded * GEM_TAX_RATE);
    const netGemsEffect = rawGemsNeeded;

    return {
      sideToGive: 'you',
      rawGemsNeeded,
      netGemsEffect,
      taxDeduction
    };
  }
}

/**
 * Generates a clean, emoji-free trade evaluation summary for sharing.
 */
export function generateTradeShareText(
  analysis: TradeAnalysisResult,
  siteName: string = 'Military Tycoon Services',
  lang: 'es' | 'en' = 'en',
  siteUrl?: string
): string {
  const { you, them, verdictType, netValueDiff, percentDiff, starsDiff, demandDiff, hasDemandComparison } = analysis;

  const verdictLabel = lang === 'es'
    ? (verdictType === 'BIG_WIN' ? 'GRAN GANANCIA' :
       verdictType === 'WIN' ? 'GANANCIA' :
       verdictType === 'FAIR' ? 'INTERCAMBIO JUSTO' :
       verdictType === 'LOSE' ? 'PÉRDIDA' :
       verdictType === 'BIG_LOSE' ? 'GRAN PÉRDIDA' : 'EVALUACIÓN DE INTERCAMBIO')
    : (verdictType === 'BIG_WIN' ? 'BIG WIN' :
       verdictType === 'WIN' ? 'WIN' :
       verdictType === 'FAIR' ? 'FAIR TRADE' :
       verdictType === 'LOSE' ? 'LOSE' :
       verdictType === 'BIG_LOSE' ? 'BIG LOSE' : 'TRADE CHECK');

  const diffSign = netValueDiff >= 0 ? '+' : '-';
  const diffStr = `${diffSign}${formatPlainMilitaryValue(Math.abs(netValueDiff))}`;
  const pctStr = `${percentDiff >= 0 ? '+' : ''}${percentDiff.toFixed(1)}%`;

  const formatSideItemList = (side: EvaluatedTradeSide) => {
    if (side.items.length === 0 && side.rawGems === 0) {
      return lang === 'es' ? '  • (Nada ofrecido)' : '  • (Nothing offered)';
    }

    const lines: string[] = [];
    side.items.forEach(slot => {
      const acronymStr = slot.item.acronym ? ` [${slot.item.acronym}]` : '';
      const starStr = slot.unitStars > 0 ? ` (${slot.tierLabel})` : '';
      const qtyStr = slot.quantity > 1 ? ` x${slot.quantity}` : '';
      const demandLabel = lang === 'es' ? 'Demanda' : 'Demand';
      lines.push(`  • ${slot.item.name}${acronymStr}${starStr}${qtyStr} — ${formatPlainMilitaryValue(slot.totalValue)} (${demandLabel}: ${slot.demand}/10)`);
    });

    if (side.rawGems > 0) {
      if (side.gemTaxAmount > 0) {
        lines.push(lang === 'es'
          ? `  • +${side.rawGems.toLocaleString()} Gemas (-8% impuesto = ${side.netGems.toLocaleString()} Gemas netas)`
          : `  • +${side.rawGems.toLocaleString()} Gems (-8% tax = ${side.netGems.toLocaleString()} Gems net)`);
      } else {
        lines.push(lang === 'es'
          ? `  • +${side.rawGems.toLocaleString()} Gemas`
          : `  • +${side.rawGems.toLocaleString()} Gems`);
      }
    }

    return lines.join('\n');
  };

  const youDemandStr = you.hasItemDemand ? `${you.averageDemand}/10` : 'N/A';
  const themDemandStr = them.hasItemDemand ? `${them.averageDemand}/10` : 'N/A';
  const demandDeltaStr = hasDemandComparison && demandDiff !== null
    ? `${demandDiff >= 0 ? '+' : ''}${demandDiff} pts`
    : 'N/A';

  if (lang === 'es') {
    return [
      `**[EVALUACIÓN DE INTERCAMBIO DE MILITARY TYCOON]**`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `**TÚ ENTREGAS** (Total: **${formatPlainMilitaryValue(you.totalValue)}** | Demanda Prom: ${youDemandStr} | ${you.totalStars}★)`,
      formatSideItemList(you),
      ``,
      `**ELLOS ENTREGAN** (Total: **${formatPlainMilitaryValue(them.totalValue)}** | Demanda Prom: ${themDemandStr} | ${them.totalStars}★)`,
      formatSideItemList(them),
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `**VEREDICTO: ${verdictLabel}** (${pctStr} / ${diffStr})`,
      `**Diferencia de estrellas:** ${starsDiff >= 0 ? '+' : ''}${starsDiff}★ | **Diferencia de demanda:** ${demandDeltaStr}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Evaluado a través de ${siteName}${siteUrl ? `\n🔗 ${siteUrl}` : ''}`
    ].join('\n');
  }

  return [
    `**[MILITARY TYCOON TRADE EVALUATION]**`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `**YOU GIVE** (Total: **${formatPlainMilitaryValue(you.totalValue)}** | Avg Demand: ${youDemandStr} | ${you.totalStars}★)`,
    formatSideItemList(you),
    ``,
    `**THEY GIVE** (Total: **${formatPlainMilitaryValue(them.totalValue)}** | Avg Demand: ${themDemandStr} | ${them.totalStars}★)`,
    formatSideItemList(them),
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `**VERDICT: ${verdictLabel}** (${pctStr} / ${diffStr})`,
    `**Star Delta:** ${starsDiff >= 0 ? '+' : ''}${starsDiff}★ | **Demand Delta:** ${demandDeltaStr}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Evaluated via ${siteName}${siteUrl ? `\n🔗 ${siteUrl}` : ''}`
  ].join('\n');
}
