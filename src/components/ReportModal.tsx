import React, { useState, useMemo } from 'react';
import { useValueList } from '../context/ValueListContext';
import { MilitaryItem, PriceTrend, StarTier, SoldierDroneStarTier } from '../types';
import { 
  formatMilitaryValue, 
  getRarityConfig, 
  normalizeTrend, 
  isVehicleCategory, 
  isSoldierOrDroneCategory,
  STAR_TIERS,
  SOLDIER_DRONE_STAR_TIERS,
  getItemStarTierData
} from '../utils/formatters';
import { Flag, X, Send, CheckCircle2, AlertTriangle, Star, ArrowRight } from 'lucide-react';
import { CloudflareTurnstile } from './CloudflareTurnstile';
import confetti from 'canvas-confetti';
import { VehicleImage } from './VehicleImage';

const TREND_OPTIONS: { id: PriceTrend; label: string }[] = [
  { id: 'Glazed', label: 'Glazed' },
  { id: 'Rising', label: 'Rising ↗' },
  { id: 'Stable', label: 'Stable ═' },
  { id: 'Dropping', label: 'Dropping ↘' },
  { id: 'Unstable', label: 'Unstable' }
];

const ReportModalContent: React.FC<{
  item: MilitaryItem;
  onClose: () => void;
}> = ({ item, onClose }) => {
  const { 
    submitReport, 
    theme, 
    t, 
    translateCategory, 
    translateRarity, 
    translateTrend, 
    language,
    universalStarConfig,
    universalSoldierDroneStarConfig
  } = useValueList();
  
  const rarityConfig = getRarityConfig(item.rarity);
  const isVehicle = isVehicleCategory(item.category, item);
  const isSoldierDrone = isSoldierOrDroneCategory(item.category, item);
  const hasStarTiers = isVehicle || isSoldierDrone;

  const availableStarTiers = useMemo(() => {
    if (isVehicle) return STAR_TIERS;
    if (isSoldierDrone) return SOLDIER_DRONE_STAR_TIERS;
    return [];
  }, [isVehicle, isSoldierDrone]);

  const [selectedStarTier, setSelectedStarTier] = useState<string>('0');

  // Compute current data for the selected star tier
  const currentTierData = useMemo(() => {
    return getItemStarTierData(
      item, 
      selectedStarTier, 
      universalStarConfig, 
      universalSoldierDroneStarConfig
    );
  }, [item, selectedStarTier, universalStarConfig, universalSoldierDroneStarConfig]);

  const [suggestedValue, setSuggestedValue] = useState<number>(currentTierData.value || item.value || 50000);
  const [suggestedDemand, setSuggestedDemand] = useState<number>(currentTierData.demand || item.demand || 5);
  const [suggestedTrend, setSuggestedTrend] = useState<PriceTrend>(normalizeTrend(currentTierData.trend || item.trend));
  const [playerUsername, setPlayerUsername] = useState('');
  const [discordTag, setDiscordTag] = useState('');
  const [proofLink, setProofLink] = useState('');
  const [reason, setReason] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string>('');
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [isVerifyingCaptcha, setIsVerifyingCaptcha] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // When user switches star tier, synchronize suggested values
  const handleSelectStarTier = (tierId: string) => {
    setSelectedStarTier(tierId);
    const newTierData = getItemStarTierData(
      item, 
      tierId, 
      universalStarConfig, 
      universalSoldierDroneStarConfig
    );
    setSuggestedValue(newTierData.value);
    setSuggestedDemand(newTierData.demand);
    setSuggestedTrend(normalizeTrend(newTierData.trend));
  };

  const selectedTierOption = availableStarTiers.find(t => t.id === selectedStarTier);
  const selectedStarLabel = selectedTierOption ? selectedTierOption.label : `${selectedStarTier}★`;

  const handleClose = () => {
    onClose();
    setIsSubmitted(false);
    setReason('');
    setProofLink('');
    setCaptchaToken('');
    setCaptchaError(null);
    setCaptchaResetKey((key) => key + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!proofLink.trim()) {
      setCaptchaError(language === 'es' ? 'Se requiere un enlace de evidencia.' : 'Evidence / Proof link is required.');
      return;
    }
    if (!reason.trim()) {
      setCaptchaError(language === 'es' ? 'Se requiere el motivo de la sugerencia.' : 'Reason for suggestion is required.');
      return;
    }
    if (!captchaToken) {
      setCaptchaError(t('captchaRequiredError'));
      return;
    }
    setCaptchaError(null);
    setIsVerifyingCaptcha(true);
    const reporterName = playerUsername.trim() || (language === 'es' ? 'Comerciante Anónimo' : 'Anonymous Trader');
    try {
      await submitReport({
        itemId: item.id,
        itemName: item.name,
        itemCategory: item.category,
        itemThumbnail: item.thumbnail,
        starTier: hasStarTiers ? selectedStarTier : undefined,
        starLabel: hasStarTiers ? selectedStarLabel : undefined,
        currentValue: currentTierData.value,
        suggestedValue,
        currentDemand: currentTierData.demand,
        suggestedDemand,
        currentTrend: normalizeTrend(currentTierData.trend),
        suggestedTrend,
        playerUsername: reporterName,
        discordTag: discordTag.trim() || undefined,
        reason: reason.trim(),
        proofLink: proofLink.trim()
      }, captchaToken);

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#f97316', '#fb923c', '#fdba74', '#ea580c']
        });
      } catch (e) {}
      setIsSubmitted(true);
    } catch (error: any) {
      setCaptchaError(error?.message || 'Could not submit the report. Please try again.');
    } finally {
      setIsVerifyingCaptcha(false);
      setCaptchaToken('');
      setCaptchaResetKey((key) => key + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white/95 dark:bg-[#121520]/95 backdrop-blur-2xl border border-orange-200/80 dark:border-neutral-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden max-h-[90vh] flex flex-col transition-colors">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-orange-500/10 dark:from-orange-500/15 via-amber-500/5 to-transparent border-b border-orange-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-orange-500 text-white shadow-md shadow-orange-500/25">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-['Chakra_Petch'] text-xl font-bold text-neutral-900 dark:text-white uppercase tracking-tight">
                {t('suggestValueUpdate')}
              </h3>
              {hasStarTiers && (
                <p className="text-xs text-orange-700 dark:text-orange-400 font-medium mt-0.5">
                  Targeting: <span className="font-bold font-mono">{selectedStarLabel}</span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-800 dark:hover:text-white hover:bg-orange-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title={t('close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {isSubmitted ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-['Chakra_Petch'] text-2xl font-bold text-neutral-900 dark:text-white">
                {t('suggestionSubmitted')}
              </h4>
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 max-w-sm mx-auto text-left space-y-2 text-xs">
                <div className="flex items-center justify-between text-neutral-600 dark:text-neutral-400">
                  <span>Item:</span>
                  <span className="font-bold text-neutral-900 dark:text-white">{item.name} {hasStarTiers ? `(${selectedStarLabel})` : ''}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Valuation:</span>
                  <span className="font-mono flex items-center gap-1.5 font-bold">
                    <span className="text-neutral-400 line-through">{formatMilitaryValue(currentTierData.value)}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-orange-500" />
                    <span className="text-orange-600 dark:text-orange-400">{formatMilitaryValue(suggestedValue)}</span>
                  </span>
                </div>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto leading-relaxed">
                Thank you! Your proposed valuation has been submitted to public audit for staff and market verification.
              </p>
              <div className="pt-3">
                <button
                  onClick={handleClose}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                >
                  {t('done')}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Item Info Summary Card */}
              <div className="p-3.5 rounded-2xl bg-orange-50/60 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-orange-200/60 dark:border-neutral-700 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                  <VehicleImage
                    src={item.thumbnail}
                    alt={item.name}
                    itemId={item.id}
                    category={item.category}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-500/20 text-orange-800 dark:text-orange-300 font-bold">
                      {translateCategory(item.category)}
                    </span>
                    <span className={`text-[11px] font-bold ${rarityConfig.text}`}>
                      {translateRarity(item.rarity)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h4 className="font-['Chakra_Petch'] text-base font-bold text-neutral-900 dark:text-white truncate">
                      {item.name}
                    </h4>
                    {item.acronym && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-orange-200/80 dark:bg-orange-950 text-orange-800 dark:text-orange-300 uppercase shrink-0">
                        {item.acronym}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-neutral-500 dark:text-neutral-400 mt-0.5 flex-wrap">
                    <span>Current: <strong className="text-neutral-800 dark:text-neutral-200">{formatMilitaryValue(currentTierData.value)}</strong></span>
                    <span>•</span>
                    <span>Demand: <strong className="text-neutral-800 dark:text-neutral-200">{currentTierData.demand}/10</strong></span>
                    <span>•</span>
                    <span>Trend: <strong className="text-neutral-800 dark:text-neutral-200">{currentTierData.trend}</strong></span>
                  </div>
                </div>
              </div>

              {/* STAR OPTIONS SELECTOR (Vehicles & Soldiers/Drones) */}
              {hasStarTiers && availableStarTiers.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-500/5 dark:bg-neutral-900/90 border border-amber-300/40 dark:border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold font-['Chakra_Petch'] uppercase tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>Select Star Tier to Suggest:</span>
                    </label>
                    <span className="text-[11px] font-mono font-semibold text-amber-700 dark:text-amber-400">
                      {selectedStarLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                    {availableStarTiers.map((tier) => {
                      const tierData = getItemStarTierData(
                        item, 
                        tier.id, 
                        universalStarConfig, 
                        universalSoldierDroneStarConfig
                      );
                      const isSelected = selectedStarTier === tier.id;

                      return (
                        <button
                          key={tier.id}
                          type="button"
                          onClick={() => handleSelectStarTier(tier.id)}
                          className={`px-2 py-1.5 rounded-xl text-xs font-mono font-bold flex flex-col items-center justify-center transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-gradient-to-b from-orange-500 to-amber-600 text-white border-orange-500 shadow-sm scale-[1.02]'
                              : 'bg-white dark:bg-neutral-800/80 hover:bg-orange-50 dark:hover:bg-neutral-700/80 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                          }`}
                        >
                          <span className="text-xs font-['Chakra_Petch']">{tier.shortLabel}</span>
                          <span className={`text-[10px] truncate max-w-full ${isSelected ? 'text-amber-100' : 'text-neutral-400 dark:text-neutral-500'}`}>
                            {formatMilitaryValue(tierData.value)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Value Input (Current Value -> Suggested Value) */}
              <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900/80 border border-orange-100 dark:border-neutral-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                    {hasStarTiers ? `Suggested Value for ${selectedStarLabel}` : t('suggestedValueLabel')}
                  </label>
                  
                  {/* Current -> Suggested Value Comparison Pill */}
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 text-xs font-mono">
                    <span className="text-neutral-500 line-through">{formatMilitaryValue(currentTierData.value)}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span className="font-bold text-orange-600 dark:text-orange-400 text-sm">{formatMilitaryValue(suggestedValue)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-mono font-bold text-sm">$</span>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={suggestedValue}
                      onChange={(e) => setSuggestedValue(Number(e.target.value))}
                      className="w-full pl-8 pr-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white font-mono text-sm focus:border-orange-500 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-orange-500/20 transition-all"
                      placeholder={t('enterValuationPlaceholder')}
                    />
                  </div>

                  {/* Quick Value Adjusters in Thousands */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    {[
                      { label: '-50K', val: -50000 },
                      { label: '-10K', val: -10000 },
                      { label: '+10K', val: 10000 },
                      { label: '+50K', val: 50000 },
                      { label: '+100K', val: 100000 }
                    ].map(btn => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => setSuggestedValue(prev => Math.max(0, prev + btn.val))}
                        className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-orange-50 dark:hover:bg-orange-500/20 text-neutral-700 dark:text-neutral-300 hover:text-orange-600 dark:hover:text-orange-400 font-mono text-[11px] font-semibold border border-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Demand & Trend */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900/80 border border-orange-100 dark:border-neutral-800 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                      {t('suggestedDemandLabel')}
                    </label>
                    <span className="text-xs font-mono text-neutral-500">
                      Current: {currentTierData.demand}/10
                    </span>
                  </div>
                  <select
                    value={suggestedDemand}
                    onChange={(e) => setSuggestedDemand(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-800 dark:text-neutral-200 text-sm font-mono focus:border-orange-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <option key={num} value={num}>
                        {num}/10 — {num === 10 ? (language === 'es' ? 'Demanda Máxima' : 'Max Demand') : num >= 9 ? (language === 'es' ? 'Muy Alta' : 'Very High') : num >= 7 ? (language === 'es' ? 'Alta' : 'High') : num >= 5 ? (language === 'es' ? 'Moderada' : 'Moderate') : num >= 3 ? (language === 'es' ? 'Baja' : 'Low') : (language === 'es' ? 'Muy Baja' : 'Very Low')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900/80 border border-orange-100 dark:border-neutral-800 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
                      {t('priceTrendLabel')}
                    </label>
                    <span className="text-xs font-mono text-neutral-500">
                      Current: {currentTierData.trend}
                    </span>
                  </div>
                  <select
                    value={suggestedTrend}
                    onChange={(e) => setSuggestedTrend(e.target.value as PriceTrend)}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-800 dark:text-neutral-200 text-sm focus:border-orange-500"
                  >
                    {TREND_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {translateTrend(opt.id)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* User Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                    {t('discordUsernameLabel')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('discordUsernamePlaceholder')}
                    value={playerUsername}
                    onChange={(e) => setPlayerUsername(e.target.value)}
                    className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-800 dark:text-neutral-200 text-sm focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                    {t('evidenceProofUrl')} <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://..."
                    value={proofLink}
                    onChange={(e) => setProofLink(e.target.value)}
                    className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-800 dark:text-neutral-200 text-sm focus:border-orange-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  {t('reasonMarketJustification')} <span className="text-rose-500 font-bold">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder={t('reasonMarketPlaceholder')}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-800 dark:text-neutral-200 text-sm focus:border-orange-500 resize-none font-sans"
                />
              </div>

              {/* Cloudflare CAPTCHA Verification */}
              <div className="pt-1">
                <CloudflareTurnstile
                  onVerify={(token) => {
                    setCaptchaToken(token);
                    setCaptchaError(null);
                  }}
                  onExpire={() => setCaptchaToken('')}
                  theme={theme === 'dark' ? 'dark' : 'light'}
                  isInvalid={Boolean(captchaError && !captchaToken)}
                  resetKey={captchaResetKey}
                />
                {captchaError && !captchaToken && (
                  <p className="mt-2 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5 animate-in fade-in">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{captchaError}</span>
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm font-medium transition-colors cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!captchaToken || isVerifyingCaptcha}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all ${
                    captchaToken && !isVerifyingCaptcha
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/25 cursor-pointer active:scale-[0.98]'
                      : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed shadow-none border border-neutral-300 dark:border-neutral-700'
                  }`}
                  title={isVerifyingCaptcha ? 'Checking Cloudflare verification…' : !captchaToken ? t('captchaRequiredError') : t('submitSuggestion')}
                >
                  <Send className="w-4 h-4" />
                  <span>{isVerifyingCaptcha ? 'Checking verification…' : captchaToken ? t('submitSuggestion') : t('verifyToSubmit')}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export const ReportModal: React.FC = () => {
  const { activeReportModalItem, setActiveReportModalItem } = useValueList();

  if (!activeReportModalItem) return null;

  return (
    <ReportModalContent
      key={activeReportModalItem.id}
      item={activeReportModalItem}
      onClose={() => setActiveReportModalItem(null)}
    />
  );
};
