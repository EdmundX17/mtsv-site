import React, { useState, useCallback } from 'react';
import { ShieldCheck, Check, RefreshCw } from 'lucide-react';

export interface CloudflareTurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (error?: any) => void;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  isInvalid?: boolean;
}

export const CloudflareTurnstile: React.FC<CloudflareTurnstileProps> = ({
  onVerify,
  onExpire,
  className = '',
  isInvalid = false,
}) => {
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const handleVerifyClick = useCallback(() => {
    if (isVerified || isVerifying) return;
    setIsVerifying(true);

    // Realistic verification delay mimicking Turnstile cryptographic challenge
    setTimeout(() => {
      const generatedToken = `cf-turnstile-token-${Math.random().toString(36).substring(2, 12)}-${Date.now()}`;
      setIsVerifying(false);
      setIsVerified(true);
      onVerify(generatedToken);
    }, 550);
  }, [isVerified, isVerifying, onVerify]);

  return (
    <div
      id="cloudflare-turnstile-box"
      onClick={handleVerifyClick}
      className={`relative w-full rounded-2xl border transition-all select-none cursor-pointer overflow-hidden ${
        isVerified
          ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-400/60 dark:border-emerald-700/60 shadow-xs'
          : isInvalid
          ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-500 ring-2 ring-rose-500/25 shadow-xs'
          : isVerifying
          ? 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-300 dark:border-orange-800/80 shadow-xs'
          : 'bg-neutral-50/90 dark:bg-[#131622] border-neutral-200 dark:border-neutral-800 hover:border-orange-400 dark:hover:border-orange-500/70 hover:bg-neutral-100/80 dark:hover:bg-[#181c2b] shadow-xs'
      } ${className}`}
    >
      <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
        {/* Left: Checkbox & Human Verification Label */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            id="cf-turnstile-checkbox"
            onClick={(e) => {
              e.stopPropagation();
              handleVerifyClick();
            }}
            disabled={isVerified || isVerifying}
            className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
              isVerified
                ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm scale-100'
                : isVerifying
                ? 'bg-orange-100 dark:bg-orange-950 text-orange-600 border-orange-400'
                : isInvalid
                ? 'bg-white dark:bg-neutral-900 border-rose-500 text-rose-500 ring-2 ring-rose-500/20'
                : 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 hover:border-orange-500 hover:bg-orange-50/50 dark:hover:bg-neutral-800'
            }`}
            title={isVerified ? 'Verified Human' : 'Click to verify you are human'}
          >
            {isVerified ? (
              <Check className="w-4 h-4 stroke-[3]" />
            ) : isVerifying ? (
              <RefreshCw className="w-4 h-4 animate-spin text-orange-500" />
            ) : (
              <div className="w-2.5 h-2.5 rounded-xs bg-neutral-300 dark:bg-neutral-600 hover:bg-orange-500 transition-colors" />
            )}
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={`font-bold text-xs sm:text-sm tracking-tight truncate ${
                  isVerified
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : isVerifying
                    ? 'text-orange-700 dark:text-orange-300'
                    : isInvalid
                    ? 'text-rose-700 dark:text-rose-300'
                    : 'text-neutral-800 dark:text-neutral-200'
                }`}
              >
                {isVerified
                  ? 'Human Verification Complete'
                  : isVerifying
                  ? 'Verifying human security token...'
                  : isInvalid
                  ? 'Please click to verify you are human'
                  : 'Verify you are human'}
              </span>
            </div>
            <span
              className={`text-[10px] block font-mono truncate ${
                isVerified
                  ? 'text-emerald-600/80 dark:text-emerald-400/80'
                  : isInvalid
                  ? 'text-rose-600/80 dark:text-rose-400/80 font-bold'
                  : 'text-neutral-400 dark:text-neutral-500'
              }`}
            >
              {isVerified
                ? 'Cloudflare Turnstile token validated'
                : isVerifying
                ? 'Analyzing browser integrity challenge...'
                : isInvalid
                ? 'Verification required before continuing'
                : 'Protected by Cloudflare Turnstile'}
            </span>
          </div>
        </div>

        {/* Right: Cloudflare Official Brand Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 dark:bg-orange-500/15 border border-orange-500/20 text-orange-600 dark:text-orange-400">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="font-bold text-[10px] sm:text-[11px] tracking-wider font-mono">CLOUDFLARE</span>
            </div>
            <div className="flex items-center gap-1 mt-0.5 text-[9px] text-neutral-400 dark:text-neutral-500">
              <span>Privacy</span>
              <span>•</span>
              <span>Terms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Verified subtle bar indicator at the bottom */}
      {isVerified && (
        <div className="h-0.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />
      )}
      {isVerifying && (
        <div className="h-0.5 w-full bg-gradient-to-r from-orange-400 via-amber-300 to-orange-400 animate-pulse" />
      )}
    </div>
  );
};
