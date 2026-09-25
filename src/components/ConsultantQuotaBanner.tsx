import React from 'react';
import { useValueList } from '../context/ValueListContext';
import { calculateConsultantQuotaStats } from '../utils/quotaHelper';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  ArrowRight, 
  Sparkles,
  MessageSquare
} from 'lucide-react';

interface ConsultantQuotaBannerProps {
  compact?: boolean;
  onOpenCatalog?: () => void;
}

export const ConsultantQuotaBanner: React.FC<ConsultantQuotaBannerProps> = ({
  compact = false,
  onOpenCatalog
}) => {
  const {
    activeStaff,
    isConsultant,
    staffMembers,
    consultantProposals,
    effectiveDate
  } = useValueList();

  if (!isConsultant || !activeStaff) {
    return null;
  }

  // Find member record for current consultant
  const currentMember = staffMembers.find(
    s => s.id === activeStaff.id || s.username?.toLowerCase() === activeStaff.username.toLowerCase()
  );

  if (!currentMember) return null;

  const stats = calculateConsultantQuotaStats(currentMember, consultantProposals, effectiveDate);
  const {
    targetQuota,
    currentWeekCount,
    remainingNeeded,
    percentComplete,
    isQuotaMet,
    isSunday,
    sundayWarningActive,
    weekInfo
  } = stats;

  // Compact badge mode (e.g., for navbar, header or quick pills)
  if (compact) {
    return (
      <div 
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold border transition-all ${
          isQuotaMet
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
            : isSunday
            ? 'bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-300 animate-pulse'
            : 'bg-neutral-100 dark:bg-neutral-800/80 border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
        }`}
        title={`Weekly Quota: ${currentWeekCount}/${targetQuota} suggestions submitted. ${remainingNeeded} more needed before Monday reset.`}
      >
        {isQuotaMet ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        ) : isSunday ? (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        ) : (
          <MessageSquare className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
        )}
        <span>
          Quota: <strong className="font-sans">{currentWeekCount}/{targetQuota}</strong>
        </span>
        {!isQuotaMet && isSunday && (
          <span className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300 font-extrabold ml-1">
            Sunday Final Day!
          </span>
        )}
      </div>
    );
  }

  // Sunday Deadline Alert (Specific user requirement)
  if (sundayWarningActive) {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/10 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-transparent border-2 border-amber-500/60 dark:border-amber-500/50 shadow-md shadow-amber-500/10 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40 animate-pulse">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-amber-500 text-neutral-950 text-[10px] font-black uppercase tracking-wider">
                  Sunday Quota Alert
                </span>
                <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">
                  Week Cycle: {weekInfo.formattedRange}
                </span>
              </div>
              <h4 className="font-['Chakra_Petch'] text-sm sm:text-base font-bold text-neutral-900 dark:text-white mt-1">
                You are {remainingNeeded} suggestion{remainingNeeded === 1 ? '' : 's'} away from reaching your required {targetQuota} suggestions!
              </h4>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5">
                Today is <strong>Sunday</strong>, the final day before the weekly quota reset on Monday. You have completed <strong>{currentWeekCount}</strong> of your required <strong>{targetQuota}</strong> suggestions. Submit your remaining suggestions before midnight to fulfill your weekly quota.
              </p>
            </div>
          </div>

          {onOpenCatalog && (
            <button
              type="button"
              onClick={onOpenCatalog}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0 transition-all self-end sm:self-center"
            >
              <span>Submit Suggestions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-neutral-600 dark:text-neutral-400 font-semibold">
              Weekly Progress: <strong className="text-neutral-900 dark:text-white">{currentWeekCount}</strong> / {targetQuota} Suggestions
            </span>
            <span className="font-bold text-amber-700 dark:text-amber-400">
              {percentComplete}% ({remainingNeeded} needed)
            </span>
          </div>
          <div className="w-full h-2.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(5, percentComplete)}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Quota Met Congratulatory Banner
  if (isQuotaMet) {
    return (
      <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/25 border border-emerald-500/40 text-neutral-900 dark:text-white flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-['Chakra_Petch'] text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                Weekly Quota Completed!
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                {currentWeekCount} / {targetQuota} Submitted
              </span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5">
              Outstanding work! You have fulfilled your required quota for week <strong>{weekInfo.formattedRange}</strong>. Additional suggestions continue to help keep valuations accurate.
            </p>
          </div>
        </div>

        <div className="text-right hidden sm:block shrink-0 font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
          <div>Resets Monday</div>
          <div className="text-emerald-600 dark:text-emerald-400 font-bold">Quota Met 100%</div>
        </div>
      </div>
    );
  }

  // Standard Weekday Quota Progress Banner
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-[#181c2b] border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <h4 className="font-['Chakra_Petch'] text-xs sm:text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
              Consultant Weekly Quota Tracker
            </h4>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
              Week: {weekInfo.formattedRange} • {weekInfo.daysRemainingInWeek} days left until Monday reset
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs font-bold text-neutral-700 dark:text-neutral-300">
          <span>{currentWeekCount} of {targetQuota} Done</span>
          <span className="text-neutral-400">•</span>
          <span className="text-amber-600 dark:text-amber-400">{remainingNeeded} remaining</span>
        </div>
      </div>

      <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
          style={{ width: `${Math.max(4, percentComplete)}%` }}
        />
      </div>
    </div>
  );
};
