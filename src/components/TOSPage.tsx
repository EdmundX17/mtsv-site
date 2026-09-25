import React, { useState } from 'react';
import { ArrowLeft, FileText, Shield, Scale, Lock, AlertTriangle, Check, Copy, Printer, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { MTSLogo } from './MTSLogo';
import { DiscordLogo } from './DiscordLogo';

interface TOSPageProps {
  onBack: () => void;
}

export const TOSPage: React.FC<TOSPageProps> = ({ onBack }) => {
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = () => {
    try {
      const url = `${window.location.origin}${window.location.pathname}#tos`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch (e) {
      console.error('Failed to copy link', e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="w-full max-w-4xl mx-auto pb-12"
      id="terms-of-service-page"
    >
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-4 mb-6 border-b border-orange-200/60 dark:border-neutral-800">
        <button
          id="tos-back-button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-200 hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-400 shadow-xs transition-all cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Value List</span>
        </button>

        <div className="flex items-center gap-2 text-xs">
          <button
            id="tos-copy-link-button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 text-neutral-600 dark:text-neutral-300 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-300 dark:hover:border-orange-500/40 transition-colors cursor-pointer"
            title="Copy direct link to Terms of Service"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Link Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </>
            )}
          </button>

          <button
            id="tos-print-button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 text-neutral-600 dark:text-neutral-300 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-300 dark:hover:border-orange-500/40 transition-colors cursor-pointer"
            title="Print Terms of Service"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Main Document Container */}
      <article className="rounded-2xl border border-orange-200/80 dark:border-neutral-800/90 bg-white dark:bg-[#11131a] shadow-sm overflow-hidden p-6 sm:p-10 text-neutral-800 dark:text-neutral-200">
        {/* Document Header */}
        <header className="border-b border-neutral-200 dark:border-neutral-800/80 pb-8 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 dark:bg-orange-500/15 border border-orange-500/20 flex items-center justify-center shrink-0">
                <MTSLogo className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                    Legal Documentation
                  </span>
                  <span className="inline-block w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    Effective 2026
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-['Chakra_Petch'] font-extrabold tracking-tight text-neutral-900 dark:text-white mt-1">
                  Military Tycoon Services™
                </h1>
              </div>
            </div>

            <div className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-700/60 text-[11px] font-mono text-neutral-600 dark:text-neutral-400">
              © 2026 Military Tycoon Services
            </div>
          </div>

          <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-2xl">
            Please read these Terms of Service carefully before utilizing the Military Tycoon Services valuation catalog, analytics, community reporting portals, or related tools.
          </p>
        </header>

        {/* Quick Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10 text-xs">
          <div className="p-3.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/40 flex items-start gap-2.5">
            <Scale className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-neutral-900 dark:text-white">Fair Use Guidance</div>
              <div className="text-neutral-500 dark:text-neutral-400 mt-0.5">Asset references strictly for informational & identification purposes.</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/40 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-neutral-900 dark:text-white">Bot & Scraping Ban</div>
              <div className="text-neutral-500 dark:text-neutral-400 mt-0.5">Automated harvesting, scraping, or endpoint tracing is strictly prohibited.</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/40 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-neutral-900 dark:text-white">Independent Platform</div>
              <div className="text-neutral-500 dark:text-neutral-400 mt-0.5">Not affiliated with Roblox, InfinityInteractive, or Gamefam.</div>
            </div>
          </div>
        </div>

        {/* Legal Clauses */}
        <div className="space-y-8 text-sm sm:text-base leading-relaxed divide-y divide-neutral-100 dark:divide-neutral-800/80">
          {/* Section 1: Intellectual Property and Trademarks */}
          <section className="pt-6 first:pt-0" id="intellectual-property">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-bold font-mono flex items-center justify-center">
                1
              </span>
              <h2 className="text-lg sm:text-xl font-bold font-['Chakra_Petch'] text-neutral-900 dark:text-white">
                Intellectual Property and Trademarks
              </h2>
            </div>
            <p className="text-neutral-700 dark:text-neutral-300 pl-8">
              <strong>Intellectual Property and Trademarks.</strong> Military Tycoon Services™ (MTS™) is an independent trade name owned by Military Tycoon Services. Roblox® is a registered trademark of Roblox Corporation. References to Military Tycoon, including game assets, vehicle titles, and related visual media, remain the exclusive property of their respective creators, such as InfinityInteractive and Gamefam. All third-party intellectual property is presented solely for descriptive, informational, and identification purposes.
            </p>
          </section>

          {/* Section 2: Proprietary Content and Copyright */}
          <section className="pt-6" id="proprietary-content">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-bold font-mono flex items-center justify-center">
                2
              </span>
              <h2 className="text-lg sm:text-xl font-bold font-['Chakra_Petch'] text-neutral-900 dark:text-white">
                Proprietary Content and Copyright
              </h2>
            </div>
            <p className="text-neutral-700 dark:text-neutral-300 pl-8">
              <strong>Proprietary Content and Copyright.</strong> The source code, software, visual design, layout styling, database architecture, valuation calculations, and original written copy across this website belong exclusively to Military Tycoon Services and are protected under domestic and international copyright legislation. No portion of this site may be reproduced, distributed, republished, or adapted into derivative works without prior written authorization. Third-party in-game visuals and vehicle designations are displayed under fair use principles for player guidance, commentary, and evaluation.
            </p>
          </section>

          {/* Section 3: Acceptable Use and Platform Security */}
          <section className="pt-6" id="acceptable-use">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-bold font-mono flex items-center justify-center">
                3
              </span>
              <h2 className="text-lg sm:text-xl font-bold font-['Chakra_Petch'] text-neutral-900 dark:text-white">
                Acceptable Use and Platform Security
              </h2>
            </div>
            <p className="text-neutral-700 dark:text-neutral-300 pl-8">
              <strong>Acceptable Use and Platform Security.</strong> Users are strictly prohibited from scraping, crawling, caching, extracting, or harvesting data or content from this platform through bots, spiders, or other automated mechanisms without explicit written consent. You may not reverse engineer, decompile, trace, or inspect private internal endpoints or API routes. Any attempt to compromise security features, circumvent rate limits, access restricted administrative areas, or degrade system integrity will lead to immediate revocation of access and potential legal recourse.
            </p>
          </section>

          {/* Section 4: Disclaimer and Non-Affiliation */}
          <section className="pt-6" id="disclaimer-non-affiliation">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-bold font-mono flex items-center justify-center">
                4
              </span>
              <h2 className="text-lg sm:text-xl font-bold font-['Chakra_Petch'] text-neutral-900 dark:text-white">
                Disclaimer and Non-Affiliation
              </h2>
            </div>
            <p className="text-neutral-700 dark:text-neutral-300 pl-8">
              <strong>Disclaimer and Non-Affiliation.</strong> Military Tycoon Services (MTS) is an independent, community-driven trading and valuation resource. This platform is not affiliated with, sponsored by, authorized by, or associated with Roblox Corporation, InfinityInteractive, Gamefam, or any of their parent companies or subsidiaries.
            </p>
          </section>
        </div>

        {/* Closing Notice & Inquiries */}
        <footer className="mt-10 pt-8 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-neutral-500 dark:text-neutral-400">
          <div>
            <p className="font-semibold text-neutral-700 dark:text-neutral-300">
              © 2026 Military Tycoon Services. All rights reserved.
            </p>
            <p className="mt-0.5">
              For legal inquiries, copyright concerns, or data requests, contact our team via Discord.
            </p>
          </div>

          <a
            id="tos-discord-link"
            href="https://discord.gg/yenZH7FaXU"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#5865F2]/10 hover:bg-[#5865F2]/20 text-[#5865F2] font-semibold transition-colors shrink-0"
          >
            <DiscordLogo className="w-4 h-4" />
            <span>MTS Official Discord</span>
            <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
          </a>
        </footer>
      </article>
    </motion.div>
  );
};
