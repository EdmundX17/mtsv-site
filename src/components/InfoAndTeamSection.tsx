import React from 'react';
import { useValueList } from '../context/ValueListContext';
import { Shield, Users, ChevronDown, ChevronUp, CheckCircle, ExternalLink, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DiscordLogo } from './DiscordLogo';

export const InfoAndTeamSection: React.FC = () => {
  const { siteInfo, isInfoSectionMinimized, toggleInfoSectionMinimized } = useValueList();

  if (!siteInfo) return null;

  return (
    <section className="w-full mb-6 bg-white/70 dark:bg-[#161b22]/70 backdrop-blur-md border border-neutral-200 dark:border-[#30363d] rounded-2xl shadow-xs overflow-hidden transition-all">
      {/* Collapsible Header */}
      <div
        onClick={toggleInfoSectionMinimized}
        className="flex items-center justify-between p-4 sm:px-6 cursor-pointer select-none hover:bg-neutral-50 dark:hover:bg-[#21262d]/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-neutral-900 dark:text-white flex items-center gap-2">
              <span>{siteInfo.title || 'Military Tycoon Services (MTS)'}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20">
                Official
              </span>
            </h3>
            <p className="text-xs text-neutral-500 line-clamp-1">
              {siteInfo.description || 'Official Roblox Military Tycoon value list & verified trading guide.'}
            </p>
          </div>
        </div>
        <button className="p-1 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
          {isInfoSectionMinimized ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
        </button>
      </div>

      {/* Collapsible Content */}
      <AnimatePresence>
        {!isInfoSectionMinimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-neutral-200 dark:border-[#30363d] p-4 sm:p-6 space-y-4"
          >
            {/* Announcement if present */}
            {siteInfo.announcement && (
              <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>{siteInfo.announcement}</span>
              </div>
            )}

            {/* Bullet points */}
            {siteInfo.bulletPoints && siteInfo.bulletPoints.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                {siteInfo.bulletPoints.map((point, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Team Members */}
            {siteInfo.teamMembers && siteInfo.teamMembers.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>Leadership & Value Analysts</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {siteInfo.teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="p-3 rounded-xl bg-neutral-50 dark:bg-[#0d1117] border border-neutral-200 dark:border-[#30363d] flex items-center gap-3"
                    >
                      <div className="w-9 h-9 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center font-bold text-xs shrink-0">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-neutral-900 dark:text-white block truncate">
                          {member.name}
                        </span>
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block truncate">
                          {member.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
