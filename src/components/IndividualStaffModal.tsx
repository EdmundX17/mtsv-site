import React, { useState } from 'react';
import { useValueList } from '../context/ValueListContext';
import { StaffMember, StaffRole } from '../types';
import { 
  calculateConsultantQuotaStats, 
  getStaffChangesStats, 
  formatDurationMinutes, 
  formatRelativeTime 
} from '../utils/quotaHelper';
import {
  X,
  User,
  Crown,
  BarChart3,
  ShieldCheck,
  MessageSquare,
  Key,
  Trash2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Activity,
  ArrowRight,
  Sparkles,
  Sliders,
  History,
  FileText,
  UserCheck,
  TrendingUp,
  Monitor,
  Check,
  Edit3
} from 'lucide-react';

interface IndividualStaffModalProps {
  member: StaffMember;
  onClose: () => void;
  onResetPassword: (member: StaffMember) => void;
  onRemoveMember: (member: StaffMember) => void;
}

export const IndividualStaffModal: React.FC<IndividualStaffModalProps> = ({
  member,
  onClose,
  onResetPassword,
  onRemoveMember
}) => {
  const {
    activeStaff,
    isAdmin,
    staffMembers,
    consultantProposals,
    auditLogs,
    effectiveDate,
    updateStaffWeeklyQuota,
    updateStaffRole,
    excuseUnmetQuota
  } = useValueList();

  // Find the latest member record in state
  const currentMember = staffMembers.find(s => s.id === member.id) || member;
  const isConsultant = currentMember.role === 'Consultant';

  const [activeSubTab, setActiveSubTab] = useState<'quota' | 'changes' | 'sessions'>('quota');

  // Quota editable state for Admin
  const [quotaInput, setQuotaInput] = useState<number>(
    typeof currentMember.weeklyQuota === 'number' && currentMember.weeklyQuota > 0 
      ? currentMember.weeklyQuota 
      : 5
  );
  const [quotaFeedback, setQuotaFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Excuse modal state
  const [excuseWeekKey, setExcuseWeekKey] = useState<string | null>(null);
  const [excuseReason, setExcuseReason] = useState('Authorized absence / approved exemption');

  // Compute consultant quota stats
  const consultantStats = calculateConsultantQuotaStats(currentMember, consultantProposals, effectiveDate);

  // Compute staff changes stats from audit logs
  const changesStats = getStaffChangesStats(currentMember, auditLogs, effectiveDate);

  // Determine if active recently (within last 10 minutes)
  const isOnline = React.useMemo(() => {
    if (activeStaff && (activeStaff.id === currentMember.id || activeStaff.username.toLowerCase() === currentMember.username.toLowerCase())) {
      return true;
    }
    if (!currentMember.lastActive) return false;
    const diff = Date.now() - new Date(currentMember.lastActive).getTime();
    return diff < 10 * 60 * 1000;
  }, [activeStaff, currentMember]);

  const handleSaveQuota = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const res = updateStaffWeeklyQuota(currentMember.id, quotaInput);
    if (res.success) {
      setQuotaFeedback({ type: 'success', message: res.message });
      setTimeout(() => setQuotaFeedback(null), 3500);
    } else {
      setQuotaFeedback({ type: 'error', message: res.message });
    }
  };

  const handleConfirmExcuse = () => {
    if (!excuseWeekKey) return;
    excuseUnmetQuota(currentMember.id, excuseWeekKey, excuseReason);
    setExcuseWeekKey(null);
    setExcuseReason('Authorized absence / approved exemption');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#151722] border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-6 bg-neutral-50/80 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg text-white shrink-0 shadow-md ${
              currentMember.role === 'Admin'
                ? 'bg-gradient-to-tr from-amber-500 to-orange-500 shadow-amber-500/20'
                : currentMember.role === 'Analyst'
                ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-cyan-500/20'
                : currentMember.role === 'Consultant'
                ? 'bg-gradient-to-tr from-emerald-500 to-teal-600 shadow-emerald-500/20'
                : 'bg-gradient-to-tr from-blue-500 to-cyan-500 shadow-blue-500/20'
            }`}>
              {currentMember.role === 'Admin' ? (
                <Crown className="w-7 h-7" />
              ) : currentMember.role === 'Analyst' ? (
                <BarChart3 className="w-7 h-7" />
              ) : currentMember.role === 'Consultant' ? (
                <MessageSquare className="w-7 h-7" />
              ) : (
                <ShieldCheck className="w-7 h-7" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-['Chakra_Petch'] text-lg sm:text-xl font-bold text-neutral-900 dark:text-white truncate">
                  {currentMember.displayName || currentMember.username}
                </h3>

                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border flex items-center gap-1 ${
                  currentMember.role === 'Admin'
                    ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
                    : currentMember.role === 'Analyst'
                    ? 'bg-cyan-100 dark:bg-cyan-950/60 border-cyan-300 dark:border-cyan-700 text-cyan-800 dark:text-cyan-300'
                    : currentMember.role === 'Consultant'
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                    : 'bg-blue-100 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300'
                }`}>
                  {currentMember.role}
                </span>

                {isOnline ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    ONLINE NOW
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[10px] font-bold font-mono">
                    OFFLINE
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400 font-mono mt-1 flex-wrap">
                <span>User: <strong className="text-neutral-700 dark:text-neutral-200">@{currentMember.username}</strong></span>
                <span>•</span>
                <span>Added {new Date(currentMember.addedAt).toLocaleDateString()} {currentMember.addedBy ? `by ${currentMember.addedBy}` : ''}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {isAdmin && (
              <select
                value={currentMember.role === 'Moderator' ? 'Staff' : currentMember.role}
                onChange={(e) => updateStaffRole(currentMember.id, e.target.value as StaffRole)}
                className="px-2.5 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold cursor-pointer"
                title="Change role"
              >
                <option value="Consultant">Role: Consultant</option>
                <option value="Staff">Role: Staff</option>
                <option value="Analyst">Role: Analyst</option>
                <option value="Admin">Role: Admin</option>
              </select>
            )}

            <button
              type="button"
              onClick={() => onResetPassword(currentMember)}
              className="p-2 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:border-amber-500 text-neutral-700 dark:text-neutral-300 hover:text-amber-600 cursor-pointer transition-colors"
              title="Change password"
            >
              <Key className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* HIGH-LEVEL SUMMARY STATS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 sm:p-5 bg-neutral-100/50 dark:bg-neutral-900/30 border-b border-neutral-200 dark:border-neutral-800">
          <div className="p-3 rounded-2xl bg-white dark:bg-[#181c2b] border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
            <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-xs font-mono mb-1">
              <Clock className="w-3.5 h-3.5 text-orange-500" />
              <span>Last Logged On</span>
            </div>
            <div className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
              {formatRelativeTime(currentMember.lastLogin)}
            </div>
            <div className="text-[10px] text-neutral-400 font-mono truncate">
              {currentMember.lastLogin ? new Date(currentMember.lastLogin).toLocaleDateString() : 'Never logged in'}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-[#181c2b] border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
            <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-xs font-mono mb-1">
              <Activity className="w-3.5 h-3.5 text-blue-500" />
              <span>Total Logged Time</span>
            </div>
            <div className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
              {formatDurationMinutes(currentMember.totalSessionMinutes || 0)}
            </div>
            <div className="text-[10px] text-neutral-400 font-mono">
              {currentMember.sessionLogs?.length || 0} recorded sessions
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-[#181c2b] border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
            <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-xs font-mono mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isConsultant ? 'This Week Suggestions' : 'This Week Changes'}</span>
            </div>
            <div className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
              {isConsultant ? (
                <span>
                  {consultantStats.currentWeekCount} / {consultantStats.targetQuota}
                  {consultantStats.isQuotaMet && <span className="text-emerald-500 ml-1 text-xs">✓ Met</span>}
                </span>
              ) : (
                <span>{changesStats.thisWeekChangesCount} edits</span>
              )}
            </div>
            <div className="text-[10px] text-neutral-400 font-mono">
              Cycle: {consultantStats.weekInfo.formattedRange}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-[#181c2b] border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
            <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-xs font-mono mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{isConsultant ? 'Lifetime Suggestions' : 'Lifetime Changes'}</span>
            </div>
            <div className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
              {isConsultant ? (
                <span>{consultantStats.lifetimeCount} ({consultantStats.approvalRate}% approved)</span>
              ) : (
                <span>{changesStats.lifetimeChangesCount} catalog actions</span>
              )}
            </div>
            <div className="text-[10px] text-neutral-400 font-mono">
              {isConsultant ? `${consultantStats.lifetimeApproved} approved proposals` : 'Internal audit log'}
            </div>
          </div>
        </div>

        {/* ADMIN QUOTA CONFIGURATION SECTION (FOR CONSULTANTS) */}
        {isConsultant && isAdmin && (
          <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border-b border-neutral-200 dark:border-neutral-800">
            <form onSubmit={handleSaveQuota} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="font-['Chakra_Petch'] text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                    Weekly Suggestions Quota (Admin Setting)
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-mono">
                    Target: {currentMember.weeklyQuota || 5} / week
                  </span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-300">
                  Configure the number of required suggestions per week (X) for this consultant. Sundays trigger deadline alerts; Mondays reset the cycle.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl overflow-hidden shadow-xs">
                  <button
                    type="button"
                    onClick={() => setQuotaInput(prev => Math.max(1, prev - 1))}
                    className="px-2.5 py-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-bold"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={quotaInput}
                    onChange={(e) => setQuotaInput(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-14 text-center font-bold text-xs bg-transparent border-none text-neutral-900 dark:text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setQuotaInput(prev => Math.min(100, prev + 1))}
                    className="px-2.5 py-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-bold"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  {[3, 5, 10].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setQuotaInput(preset)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                        quotaInput === preset
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-emerald-400'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs cursor-pointer shadow-sm flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Update Quota</span>
                </button>
              </div>
            </form>

            {quotaFeedback && (
              <div className={`mt-2 p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                quotaFeedback.type === 'success'
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
              }`}>
                {quotaFeedback.type === 'success' ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                <span>{quotaFeedback.message}</span>
              </div>
            )}
          </div>
        )}

        {/* SUB-TABS NAVIGATION */}
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-3 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#151722]">
          {isConsultant && (
            <button
              type="button"
              onClick={() => setActiveSubTab('quota')}
              className={`pb-2.5 px-3 font-['Chakra_Petch'] text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'quota'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Weekly Quota & Suggestions ({consultantStats.lifetimeCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveSubTab('changes')}
            className={`pb-2.5 px-3 font-['Chakra_Petch'] text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'changes'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Activity & Edits ({changesStats.lifetimeChangesCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('sessions')}
            className={`pb-2.5 px-3 font-['Chakra_Petch'] text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'sessions'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Login & Session Logs ({currentMember.sessionLogs?.length || 0})</span>
          </button>
        </div>

        {/* TAB CONTENTS (SCROLLABLE) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB: CONSULTANT QUOTA & SUGGESTIONS */}
          {activeSubTab === 'quota' && isConsultant && (
            <div className="space-y-6">
              
              {/* CURRENT WEEK DETAILED PROGRESS */}
              <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-[#181c2b] border border-neutral-200 dark:border-neutral-800 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <h5 className="font-['Chakra_Petch'] font-bold text-sm text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-500" />
                      <span>Current Weekly Cycle: {consultantStats.weekInfo.formattedRange}</span>
                    </h5>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Cycle runs Monday 00:00 to Sunday 23:59 • {consultantStats.weekInfo.daysRemainingInWeek} days remaining
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {consultantStats.isQuotaMet ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-bold font-mono flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Quota Fulfilled (100%)
                      </span>
                    ) : consultantStats.isSunday ? (
                      <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-xs font-bold font-mono flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Sunday Final Day ({consultantStats.remainingNeeded} needed)
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-bold font-mono">
                        {consultantStats.remainingNeeded} suggestions remaining
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono font-bold">
                    <span className="text-neutral-700 dark:text-neutral-300">
                      {consultantStats.currentWeekCount} completed of {consultantStats.targetQuota} required suggestions
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {consultantStats.percentComplete}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        consultantStats.isQuotaMet
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                          : consultantStats.isSunday
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                          : 'bg-gradient-to-r from-blue-500 to-emerald-500'
                      }`}
                      style={{ width: `${Math.max(4, consultantStats.percentComplete)}%` }}
                    />
                  </div>
                </div>

                {/* This week status counts */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <div className="text-xs font-mono text-emerald-700 dark:text-emerald-300">Approved This Week</div>
                    <div className="font-bold text-lg text-emerald-700 dark:text-emerald-300">{consultantStats.currentWeekApproved}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <div className="text-xs font-mono text-amber-700 dark:text-amber-300">Pending Review</div>
                    <div className="font-bold text-lg text-amber-700 dark:text-amber-300">{consultantStats.currentWeekPending}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                    <div className="text-xs font-mono text-rose-700 dark:text-rose-300">Denied This Week</div>
                    <div className="font-bold text-lg text-rose-700 dark:text-rose-300">{consultantStats.currentWeekDenied}</div>
                  </div>
                </div>
              </div>

              {/* HISTORICAL WEEKLY QUOTA PERFORMANCE LOG */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-['Chakra_Petch'] font-bold text-sm text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <History className="w-4 h-4 text-orange-500" />
                    <span>Past 8 Weeks Quota Compliance Log</span>
                  </h5>
                  <span className="text-xs text-neutral-400 font-mono">Evaluated Every Monday</span>
                </div>

                <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-neutral-100 dark:bg-neutral-900/80 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono">
                        <th className="p-3 font-bold">Cycle Range</th>
                        <th className="p-3 font-bold">Required</th>
                        <th className="p-3 font-bold">Completed</th>
                        <th className="p-3 font-bold">Status</th>
                        <th className="p-3 font-bold text-right">Admin Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800/80 font-mono">
                      {consultantStats.pastWeeksHistory.map((pastWeek) => (
                        <tr key={pastWeek.weekKey} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                          <td className="p-3 font-sans font-semibold text-neutral-800 dark:text-neutral-200">
                            <div>{pastWeek.weekRange}</div>
                            <div className="text-[10px] text-neutral-400 font-mono">{pastWeek.weekKey}</div>
                          </td>
                          <td className="p-3 text-neutral-700 dark:text-neutral-300">
                            {pastWeek.targetQuota}
                          </td>
                          <td className="p-3 font-bold text-neutral-900 dark:text-white">
                            {pastWeek.completedCount}
                          </td>
                          <td className="p-3">
                            {pastWeek.status === 'met' ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-[10px] font-bold">
                                Met Quota ✓
                              </span>
                            ) : pastWeek.status === 'excused' ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[10px] font-bold">
                                Excused
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700 text-[10px] font-bold">
                                Missed ({pastWeek.deficit} short)
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {pastWeek.status === 'missed' && isAdmin && (
                              <button
                                type="button"
                                onClick={() => setExcuseWeekKey(pastWeek.weekKey)}
                                className="px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700 text-[11px] font-sans font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer transition-colors"
                              >
                                Excuse
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* RECENT PROPOSALS SUBMITTED */}
              <div className="space-y-3">
                <h5 className="font-['Chakra_Petch'] font-bold text-sm text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <span>Recent Proposals Submitted ({consultantStats.lifetimeProposals.length})</span>
                </h5>

                {consultantStats.lifetimeProposals.length === 0 ? (
                  <div className="p-6 text-center text-xs text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
                    No suggestions submitted yet by this consultant.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {consultantStats.lifetimeProposals.slice(0, 15).map((prop) => (
                      <div
                        key={prop.id}
                        className="p-3 rounded-xl bg-neutral-50 dark:bg-[#181c2b] border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-neutral-900 dark:text-white truncate">
                              {prop.itemName}
                            </span>
                            <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold uppercase ${
                              prop.status === 'approved'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                : prop.status === 'denied'
                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                            }`}>
                              {prop.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                            "{prop.commentary || 'No rationale provided'}"
                          </div>
                        </div>

                        <div className="text-[10px] text-neutral-400 font-mono shrink-0">
                          {new Date(prop.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB: ACTIVITY & EDITS (FROM AUDIT LOGS) */}
          {activeSubTab === 'changes' && (
            <div className="space-y-6">
              {/* Activity breakdown */}
              <div className="space-y-2">
                <h5 className="font-['Chakra_Petch'] font-bold text-sm text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-orange-500" />
                  <span>Action Breakdown</span>
                </h5>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {Object.entries(changesStats.actionBreakdown).map(([act, count]) => (
                    <div key={act} className="p-3 rounded-xl bg-neutral-50 dark:bg-[#181c2b] border border-neutral-200 dark:border-neutral-800">
                      <div className="text-[10px] text-neutral-400 font-mono uppercase">{act.replace(/_/g, ' ')}</div>
                      <div className="font-bold text-base text-neutral-900 dark:text-white mt-0.5">{count}</div>
                    </div>
                  ))}
                  {Object.keys(changesStats.actionBreakdown).length === 0 && (
                    <div className="col-span-full p-4 text-center text-xs text-neutral-400">
                      No administrative changes recorded for this user yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Audit Logs Feed */}
              <div className="space-y-2">
                <h5 className="font-['Chakra_Petch'] font-bold text-sm text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-500" />
                  <span>Recent Administrative Actions ({changesStats.recentLogs.length})</span>
                </h5>

                {changesStats.recentLogs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
                    No audit records logged for this account.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {changesStats.recentLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-xl bg-neutral-50 dark:bg-[#181c2b] border border-neutral-200 dark:border-neutral-800 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-800 font-mono font-bold text-[10px] text-neutral-800 dark:text-neutral-200">
                              {log.action}
                            </span>
                            <span className="font-bold text-neutral-900 dark:text-white">
                              {log.itemName}
                            </span>
                          </div>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            {formatRelativeTime(log.timestamp)}
                          </span>
                        </div>
                        <p className="text-neutral-600 dark:text-neutral-300 text-[11px]">
                          {log.details}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: LOGIN & SESSION LOGS */}
          {activeSubTab === 'sessions' && (
            <div className="space-y-6">
              {/* Session overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#181c2b] border border-neutral-200 dark:border-neutral-800">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">Last Active Ping</div>
                  <div className="font-bold text-sm text-neutral-900 dark:text-white mt-1">
                    {formatRelativeTime(currentMember.lastActive || currentMember.lastLogin)}
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono">
                    {currentMember.lastActive ? new Date(currentMember.lastActive).toLocaleTimeString() : 'N/A'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#181c2b] border border-neutral-200 dark:border-neutral-800">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">Total Lifetime Time</div>
                  <div className="font-bold text-sm text-neutral-900 dark:text-white mt-1">
                    {formatDurationMinutes(currentMember.totalSessionMinutes || 0)}
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono">
                    Across {currentMember.sessionLogs?.length || 0} sessions
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#181c2b] border border-neutral-200 dark:border-neutral-800">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">Last Logoff</div>
                  <div className="font-bold text-sm text-neutral-900 dark:text-white mt-1">
                    {formatRelativeTime(currentMember.lastLogout)}
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono">
                    {currentMember.lastLogout ? new Date(currentMember.lastLogout).toLocaleTimeString() : 'Active or closed tab'}
                  </div>
                </div>
              </div>

              {/* Sessions Log Table */}
              <div className="space-y-2">
                <h5 className="font-['Chakra_Petch'] font-bold text-sm text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-blue-500" />
                  <span>Recorded Login Sessions ({currentMember.sessionLogs?.length || 0})</span>
                </h5>

                {(!currentMember.sessionLogs || currentMember.sessionLogs.length === 0) ? (
                  <div className="p-8 text-center text-xs text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
                    No individual session history recorded yet. Future logins will log exact duration and timestamps.
                  </div>
                ) : (
                  <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-neutral-100 dark:bg-neutral-900/80 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono">
                          <th className="p-3 font-bold">Login Timestamp</th>
                          <th className="p-3 font-bold">Logout Timestamp</th>
                          <th className="p-3 font-bold">Duration</th>
                          <th className="p-3 font-bold">Platform / Client</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800/80 font-mono">
                        {currentMember.sessionLogs.map((sess, sIdx) => {
                          const isCurrentActive = !sess.logoutAt && isOnline && sIdx === 0;
                          return (
                            <tr key={sess.id || sIdx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                              <td className="p-3 text-neutral-800 dark:text-neutral-200">
                                <div>{new Date(sess.loginAt).toLocaleDateString()} {new Date(sess.loginAt).toLocaleTimeString()}</div>
                                <div className="text-[10px] text-neutral-400">{formatRelativeTime(sess.loginAt)}</div>
                              </td>
                              <td className="p-3 text-neutral-700 dark:text-neutral-300">
                                {isCurrentActive ? (
                                  <span className="text-emerald-500 font-bold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Active Now
                                  </span>
                                ) : sess.logoutAt ? (
                                  <div>{new Date(sess.logoutAt).toLocaleTimeString()}</div>
                                ) : (
                                  <span className="text-neutral-400 italic">Ended</span>
                                )}
                              </td>
                              <td className="p-3 font-bold text-neutral-900 dark:text-white">
                                {formatDurationMinutes(sess.durationMinutes)}
                              </td>
                              <td className="p-3 text-neutral-500 dark:text-neutral-400 truncate max-w-xs text-[11px]">
                                {sess.deviceInfo || 'Standard Web Browser'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 bg-neutral-50 dark:bg-neutral-900/80 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isAdmin && currentMember.role !== 'Admin' && (
              <button
                type="button"
                onClick={() => onRemoveMember(currentMember)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Revoke Access</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-bold text-xs cursor-pointer transition-colors"
            >
              Done / Close View
            </button>
          </div>
        </div>

      </div>

      {/* EXCUSE REASON PROMPT MODAL */}
      {excuseWeekKey && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-sm bg-white dark:bg-[#181c2b] border border-amber-300 dark:border-amber-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                <UserCheck className="w-5 h-5" />
              </div>
              <h4 className="font-['Chakra_Petch'] text-base font-bold text-neutral-900 dark:text-white">
                Excuse Weekly Quota
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Grant quota exemption for <strong>{currentMember.displayName || currentMember.username}</strong> for week <strong>{excuseWeekKey}</strong>
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold font-mono uppercase text-neutral-700 dark:text-neutral-300">
                Exemption Reason
              </label>
              <input
                type="text"
                value={excuseReason}
                onChange={(e) => setExcuseReason(e.target.value)}
                placeholder="e.g. Authorized medical absence, exam season"
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExcuseWeekKey(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExcuse}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-neutral-950 font-bold text-xs cursor-pointer shadow-sm"
              >
                Confirm Exemption
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
