import React, { useState } from 'react';
import { useValueList } from '../context/ValueListContext';
import { formatMilitaryValue } from '../utils/formatters';
import { DiscordLogo } from './DiscordLogo';
import { useAutoTranslateBatch } from '../hooks/useAutoTranslate';
import { 
  Info, 
  Users, 
  Sparkles, 
  ExternalLink, 
  Edit3, 
  Gamepad2, 
  Flame, 
  TrendingUp,
  Minimize2,
  Maximize2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const InfoAndTeamSection: React.FC = () => {
  const {
    siteInfo,
    isAdmin,
    setIsStaffPanelOpen,
    items,
    t,
    language,
    isInfoSectionMinimized,
    toggleInfoSectionMinimized
  } = useValueList();

  const isMinimized = isInfoSectionMinimized;
  const toggleMinimized = toggleInfoSectionMinimized;

  const DEFAULT_DESC_ES = `**Military Tycoon Services (MTS)** es la red de referencia de valores y centro de intercambios líder para el universo de Military Tycoon en Roblox.

Nuestro equipo de verificación especializado monitorea continuamente la economía del juego, tasas de subasta, mejoras de nivel e intercambios verificados en Discord para ofrecer valoraciones precisas, equilibradas y a prueba de manipulaciones.`;

  const DEFAULT_ANNOUNCEMENT_ES = '🌟 ¡Únete a nuestro Discord para participar en auditorías de intercambios verificados y ajustes de valores de objetos!';

  const DEFAULT_BULLETS_ES = [
    'Actualizaciones de valoración en tiempo real respaldadas por registros verificables de intercambios de alto nivel.',
    'Equipo de personal transparente con roles designados, avatares y comunicación directa en Discord.',
    'Multiplicadores de mejora por estrellas de múltiples niveles y calculadora de valor justo en vivo.'
  ];

  const isDefaultTitle = !siteInfo.title || siteInfo.title.trim().toLowerCase() === 'about military tycoon services';
  const isDefaultDescription = !siteInfo.description || siteInfo.description.includes('premier value reference network');
  const isDefaultAnnouncement = !siteInfo.announcement || siteInfo.announcement.includes('Join our Discord to participate');
  const isDefaultBullets = !siteInfo.bulletPoints || siteInfo.bulletPoints.some(b => b.includes('Real-time valuation updates'));

  // Custom text extraction for AI translation
  const rawTitle = siteInfo.title || '';
  const rawDesc = siteInfo.description || '';
  const rawAnnouncement = siteInfo.announcement || '';
  const rawBullets = siteInfo.bulletPoints || [];
  const teamMembers = siteInfo.teamMembers || [];
  const rawBios = teamMembers.map(m => m.bio || '');

  const textsToTranslate = React.useMemo(() => {
    return [
      isDefaultTitle ? '' : rawTitle,
      isDefaultDescription ? '' : rawDesc,
      isDefaultAnnouncement ? '' : rawAnnouncement,
      ...(isDefaultBullets ? [] : rawBullets),
      ...rawBios
    ];
  }, [isDefaultTitle, rawTitle, isDefaultDescription, rawDesc, isDefaultAnnouncement, rawAnnouncement, isDefaultBullets, rawBullets, rawBios]);

  const {
    displayTexts,
    isTranslated,
    isTranslating,
    showOriginal,
    toggleOriginal
  } = useAutoTranslateBatch(textsToTranslate, language);

  const customBulletsCount = isDefaultBullets ? 0 : rawBullets.length;
  const translatedTitle = isDefaultTitle ? '' : displayTexts[0];
  const translatedDesc = isDefaultDescription ? '' : displayTexts[1];
  const translatedAnnouncement = isDefaultAnnouncement ? '' : displayTexts[2];
  const translatedBullets = customBulletsCount > 0 ? displayTexts.slice(3, 3 + customBulletsCount) : [];
  const translatedBios = displayTexts.slice(3 + customBulletsCount);

  // Resolved display values
  const displayTitle = isDefaultTitle
    ? (language === 'es' ? t('aboutMilitaryTycoonServices') : (siteInfo.title || t('aboutMilitaryTycoonServices')))
    : (translatedTitle || rawTitle || t('aboutMilitaryTycoonServices'));

  const displayDescription = isDefaultDescription
    ? (language === 'es' ? DEFAULT_DESC_ES : (siteInfo.description || ''))
    : (translatedDesc || rawDesc);

  const displayAnnouncement = isDefaultAnnouncement
    ? (language === 'es' ? DEFAULT_ANNOUNCEMENT_ES : (siteInfo.announcement || ''))
    : (translatedAnnouncement || rawAnnouncement);

  const displayBullets = isDefaultBullets
    ? (language === 'es' ? DEFAULT_BULLETS_ES : (siteInfo.bulletPoints || []))
    : (translatedBullets.length > 0 ? translatedBullets : (siteInfo.bulletPoints || []));

  const translateRole = (role: string): string => {
    if (language !== 'es') return role;
    const lower = role.toLowerCase();
    if (lower.includes('admin')) return t('roleAdmin');
    if (lower.includes('founder')) return t('roleFounder');
    if (lower.includes('staff')) return t('roleStaff');
    if (lower.includes('analyst')) return t('roleAnalyst');
    if (lower.includes('developer') || lower.includes('dev')) return t('roleDeveloper');
    return role;
  };

  const totalMarketValuation = React.useMemo(() => {
    return items.reduce((acc, item) => acc + (Number(item.value) || 0), 0);
  }, [items]);

  const getBadgeStyle = (color?: string) => {
    switch (color) {
      case 'orange':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30';
      case 'emerald':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'blue':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'purple':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';
      case 'rose':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
      case 'cyan':
        return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30';
      case 'amber':
      default:
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
    }
  };

  const getAvatarGradient = (name: string, index: number) => {
    const gradients = [
      'from-orange-500 to-amber-600',
      'from-purple-500 to-indigo-600',
      'from-blue-500 to-cyan-600',
      'from-emerald-500 to-teal-600',
      'from-rose-500 to-pink-600'
    ];
    return gradients[index % gradients.length];
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {isMinimized ? (
          /* =========================================================================
             MINIMIZED BAR VIEW: Compact, space-saving preview banner with quick expand
             ========================================================================= */
          <motion.div
            key="minimized-info-bar"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="p-3.5 sm:p-4 rounded-2xl bg-white/90 dark:bg-[#11131c]/95 border border-orange-200/70 dark:border-neutral-800 shadow-xs flex flex-wrap items-center justify-between gap-3 group"
          >
            {/* Left: Combined Icons, Title & Quick Statistics */}
            <div className="flex items-center flex-wrap gap-2.5 sm:gap-3.5 min-w-0">
              <div className="flex items-center -space-x-1.5 shrink-0">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-500/20 shadow-2xs z-10">
                  <Info className="w-4 h-4" />
                </div>
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20 shadow-2xs">
                  <Users className="w-4 h-4" />
                </div>
              </div>

              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-['Chakra_Petch'] font-bold tracking-tight text-neutral-900 dark:text-white truncate">
                  {displayTitle} &amp; {t('ourTeam')}
                </h2>
                <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                  <span>{siteInfo.teamMembers?.length || 0} {t('staffMembers')}</span>
                  <span>•</span>
                  <span>{items.length} {t('itemsCount')}</span>
                  <span>•</span>
                  <span className="text-orange-600 dark:text-orange-400 font-bold">{formatMilitaryValue(totalMarketValuation)}</span>
                </div>
              </div>
            </div>

            {/* Right: Actions & Expand Button */}
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              <a
                href={siteInfo.discordUrl || 'https://discord.gg/yenZH7FaXU'}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#5865F2] hover:bg-[#4752c4] text-white transition-all cursor-pointer shadow-xs shadow-[#5865F2]/20"
                title={t('joinOfficialDiscord')}
              >
                <DiscordLogo className="w-3.5 h-3.5" />
                <span>Discord</span>
              </a>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsStaffPanelOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-orange-500 hover:text-white text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer"
                  title={t('adminEdit')}
                >
                  <Edit3 className="w-3 h-3" />
                  <span className="hidden sm:inline">{t('adminEdit')}</span>
                </button>
              )}

              <button
                type="button"
                onClick={toggleMinimized}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white transition-all cursor-pointer shadow-xs shadow-orange-500/20"
                title={t('expand')}
              >
                <ChevronDown className="w-4 h-4" />
                <span>{t('expand')}</span>
              </button>
            </div>
          </motion.div>
        ) : (
          /* =========================================================================
             EXPANDED FULL VIEW: Comprehensive 2-Column Info & Our Team Showcase
             ========================================================================= */
          <motion.section
            key="expanded-info-team"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6"
          >
            {/* Left Column: Information (Col span 6) */}
            <div className="lg:col-span-6 flex flex-col justify-between p-5 sm:p-6 rounded-3xl bg-white/90 dark:bg-[#11131c]/95 border border-orange-200/70 dark:border-neutral-800 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/5 dark:bg-orange-500/10 rounded-full blur-3xl pointer-events-none -mr-12 -mt-12" />

              <div className="space-y-4 relative z-10">
                {/* Header & Actions */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-500/20 shadow-xs">
                      <Info className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-['Chakra_Petch'] font-bold tracking-tight text-neutral-900 dark:text-white">
                        {displayTitle}
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isTranslated && (
                      <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-[11px] font-mono font-semibold">
                        <Sparkles className="w-3 h-3 text-orange-500" />
                        <span>{t('autoTranslated')}</span>
                        <button
                          type="button"
                          onClick={toggleOriginal}
                          className="ml-1 underline hover:text-orange-700 dark:hover:text-orange-300 cursor-pointer"
                        >
                          {showOriginal ? t('viewTranslation') : t('viewOriginal')}
                        </button>
                      </div>
                    )}

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setIsStaffPanelOpen(true)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-orange-500 hover:text-white text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer"
                        title={t('adminEdit')}
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{t('adminEdit')}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={toggleMinimized}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-orange-500 hover:text-white text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer"
                      title={t('minimize')}
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>{t('minimize')}</span>
                    </button>
                  </div>
                </div>

                {/* Mobile Auto-translate Badge */}
                {isTranslated && (
                  <div className="sm:hidden flex items-center justify-between px-2.5 py-1 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-[11px] font-mono font-semibold">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-orange-500" />
                      {t('autoTranslated')}
                    </span>
                    <button
                      type="button"
                      onClick={toggleOriginal}
                      className="underline hover:text-orange-700 dark:hover:text-orange-300 cursor-pointer"
                    >
                      {showOriginal ? t('viewTranslation') : t('viewOriginal')}
                    </button>
                  </div>
                )}

                {/* Description */}
                <div className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed font-normal space-y-2 whitespace-pre-line">
                  {displayDescription ? (
                    displayDescription.split('\n\n').map((paragraph, pIdx) => (
                      <p key={pIdx}>
                        {paragraph.split(/(\*\*.*?\*\*)/g).map((chunk, cIdx) => {
                          if (chunk.startsWith('**') && chunk.endsWith('**')) {
                            return <strong key={cIdx} className="font-bold text-neutral-900 dark:text-white">{chunk.slice(2, -2)}</strong>;
                          }
                          return chunk;
                        })}
                      </p>
                    ))
                  ) : null}
                </div>

                {/* Announcement Banner */}
                {displayAnnouncement && displayAnnouncement.trim() !== '' && (
                  <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                    <Flame className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <span className="font-medium leading-normal">{displayAnnouncement}</span>
                  </div>
                )}

                {/* Bullet Points */}
                {displayBullets && displayBullets.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {displayBullets.map((bullet, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-[13px] text-neutral-700 dark:text-neutral-300 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 mt-1.5" />
                        <span className="leading-snug">{bullet}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Social / Community Links */}
              <div className="flex flex-wrap items-center gap-2 pt-4 mt-4 border-t border-neutral-100 dark:border-neutral-800/80 relative z-10">
                <a
                  href={siteInfo.discordUrl || 'https://discord.gg/yenZH7FaXU'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#5865F2] hover:bg-[#4752c4] text-white transition-all cursor-pointer shadow-sm shadow-[#5865F2]/25"
                >
                  <DiscordLogo className="w-4 h-4" />
                  <span>{t('joinOfficialDiscord')}</span>
                  <ExternalLink className="w-3 h-3 opacity-80 ml-0.5" />
                </a>
              </div>
            </div>

            {/* Right Column: Our Team (Col span 6 - Larger & Prominent) */}
            <div className="lg:col-span-6 flex flex-col p-5 sm:p-6 rounded-3xl bg-white/90 dark:bg-[#11131c]/95 border border-orange-200/70 dark:border-neutral-800 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-56 h-56 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-3xl pointer-events-none -mr-12 -mt-12" />

              <div className="relative z-10 flex-1 flex flex-col min-h-0">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20 shadow-xs">
                      <Users className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-['Chakra_Petch'] font-bold tracking-tight text-neutral-900 dark:text-white">
                        {t('ourTeam')}
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      {siteInfo.teamMembers?.length || 0} {t('staffMembers')}
                    </span>
                    <button
                      type="button"
                      onClick={toggleMinimized}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-orange-500 hover:text-white text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer"
                      title={t('minimize')}
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>{t('minimize')}</span>
                    </button>
                  </div>
                </div>

                {/* Team Members List */}
                <div className="space-y-2.5 flex-1 min-h-[380px] max-h-[500px] lg:max-h-[560px] overflow-y-auto pr-1.5 scrollbar-thin">
                  {siteInfo.teamMembers && siteInfo.teamMembers.length > 0 ? (
                    siteInfo.teamMembers.map((member, idx) => (
                      <div
                        key={member.id || idx}
                        className="p-3 rounded-2xl bg-neutral-50/80 dark:bg-neutral-900/80 border border-neutral-200/70 dark:border-neutral-800 hover:border-orange-300 dark:hover:border-neutral-700 transition-all flex items-start gap-3.5"
                      >
                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarGradient(member.name, idx)} text-white font-bold font-['Chakra_Petch'] text-sm sm:text-base flex items-center justify-center shrink-0 shadow-xs`}>
                          {member.name.slice(0, 2).toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1.5">
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                              {member.name}
                            </h3>
                            <span className={`text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${getBadgeStyle(member.badgeColor)}`}>
                              {translateRole(member.role)}
                            </span>
                          </div>

                          {(() => {
                            const memberBio = (rawBios[idx] && translatedBios[idx]) ? translatedBios[idx] : member.bio;
                            return memberBio ? (
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-0.5 font-normal">
                                {memberBio}
                              </p>
                            ) : null;
                          })()}

                          {(member.discord || member.robloxUsername) && (
                            <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono text-neutral-400">
                              {member.discord && (
                                <span className="flex items-center gap-1">
                                  <DiscordLogo className="w-3 h-3 text-[#5865F2]" />
                                  @{member.discord}
                                </span>
                              )}
                              {member.robloxUsername && (
                                <span className="flex items-center gap-1">
                                  <Gamepad2 className="w-3 h-3 text-neutral-500" />
                                  {member.robloxUsername}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-xs text-neutral-400">
                      {t('noTeamMembers')}
                    </div>
                  )}
                </div>

                {/* Catalog & Total Valuation Stats */}
                <div className="pt-3 mt-3 border-t border-neutral-100 dark:border-neutral-800/80 shrink-0">
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    {/* Catalog Stat */}
                    <div className="p-3.5 rounded-2xl bg-neutral-50/90 dark:bg-neutral-900/90 border border-orange-200/70 dark:border-neutral-800 shadow-xs flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/20">
                        <Sparkles className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
                          {t('catalogStat')}
                        </span>
                        <span className="font-['Chakra_Petch'] text-sm sm:text-base font-extrabold text-neutral-900 dark:text-white truncate block">
                          {items.length} {t('itemsCount')}
                        </span>
                      </div>
                    </div>

                    {/* Total Valuation Stat */}
                    <div className="p-3.5 rounded-2xl bg-neutral-50/90 dark:bg-neutral-900/90 border border-orange-200/70 dark:border-neutral-800 shadow-xs flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                        <TrendingUp className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
                          {t('totalValueStat')}
                        </span>
                        <span className="font-['Chakra_Petch'] text-sm sm:text-base font-extrabold text-orange-600 dark:text-orange-400 truncate block">
                          {formatMilitaryValue(totalMarketValuation)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
};

