import React, { useState } from 'react';
import { useValueList } from '../context/ValueListContext';
import { getAdminUnmetQuotaAlerts, AdminUnmetQuotaAlert } from '../utils/quotaHelper';
import { StaffMember } from '../types';
import { 
  AlertTriangle, 
  UserCheck, 
  ExternalLink, 
  Check, 
  X, 
  HelpCircle,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Clock
} from 'lucide-react';

interface AdminQuotaAlertsProps {
  onSelectStaffMember?: (member: StaffMember) => void;
}

export const AdminQuotaAlerts: React.FC<AdminQuotaAlertsProps> = ({
  onSelectStaffMember
}) => {
  const {
    isAdmin,
    staffMembers,
    consultantProposals,
    effectiveDate,
    acknowledgeUnmetQuota,
    excuseUnmetQuota
  } = useValueList();

  const [excuseModalAlert, setExcuseModalAlert] = useState<AdminUnmetQuotaAlert | null>(null);
  const [excuseReason, setExcuseReason] = useState('Authorized absence / exam period');
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!isAdmin) return null;

  const allAlerts = getAdminUnmetQuotaAlerts(staffMembers, consultantProposals, effectiveDate);
  // Show active unacknowledged alerts first, but allow viewing all
  const activeAlerts = allAlerts.filter(a => !a.isAcknowledged && !a.isExcused);

  if (allAlerts.length === 0) {
    return null;
  }

  const handleAcknowledge = (alert: AdminUnmetQuotaAlert) => {
    acknowledgeUnmetQuota(alert.staffId, alert.weekKey);
  };

  const handleConfirmExcuse = () => {
    if (!excuseModalAlert) return;
    excuseUnmetQuota(excuseModalAlert.staffId, excuseModalAlert.weekKey, excuseReason);
    setExcuseModalAlert(null);
    setExcuseReason('Authorized absence / exam period');
  };

  return (
    <div className="rounded-2xl border-2 border-rose-500/40 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-rose-500/5 dark:from-rose-950/40 dark:via-neutral-900 dark:to-transparent p-4 sm:p-5 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/40 animate-pulse">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-['Chakra_Petch'] text-sm sm:text-base font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                Unmet Weekly Quota Warnings ({activeAlerts.length} Unresolved)
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
                Admin Notice
              </span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-300">
              The following consultants did not complete their required weekly suggestion quota prior to the Monday cycle reset.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
          title={isCollapsed ? "Expand warnings" : "Collapse warnings"}
        >
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Alert list */}
      {!isCollapsed && (
        <div className="space-y-2.5 pt-1">
          {allAlerts.map((alert, idx) => {
            const isResolved = alert.isAcknowledged || alert.isExcused;
            return (
              <div
                key={`${alert.staffId}-${alert.weekKey}-${idx}`}
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                  isResolved
                    ? 'bg-neutral-100/70 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800 opacity-75'
                    : 'bg-white dark:bg-[#151824] border-rose-200 dark:border-rose-900/60 shadow-xs'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
                      {alert.displayName}
                    </span>
                    <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                      (@{alert.username})
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[10px] font-mono">
                      Cycle: {alert.weekRangeLabel} ({alert.weekKey})
                    </span>
                    {alert.isAcknowledged && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-[10px] font-bold">
                        Acknowledged
                      </span>
                    )}
                    {alert.isExcused && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[10px] font-bold">
                        Excused
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-neutral-700 dark:text-neutral-300">
                    Did <strong>{alert.actualDone}</strong> suggestions when they should have done <strong>{alert.targetQuota}</strong> suggestions (<span className="text-rose-600 dark:text-rose-400 font-bold">deficit of {alert.deficit}</span>).
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {onSelectStaffMember && (
                    <button
                      type="button"
                      onClick={() => onSelectStaffMember(alert.member)}
                      className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:border-orange-500 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                      title="View individual staff profile & activity"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-orange-500" />
                      <span>View Profile</span>
                    </button>
                  )}

                  {!alert.isAcknowledged && (
                    <button
                      type="button"
                      onClick={() => handleAcknowledge(alert)}
                      className="px-3 py-1.5 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                      title="Acknowledge warning"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Acknowledge</span>
                    </button>
                  )}

                  {!alert.isExcused && (
                    <button
                      type="button"
                      onClick={() => setExcuseModalAlert(alert)}
                      className="px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700/60 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                      title="Excuse this week's quota requirement"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Excuse</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EXCUSE REASON MODAL */}
      {excuseModalAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-sm bg-white dark:bg-[#181c2b] border border-amber-300 dark:border-amber-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                <UserCheck className="w-5 h-5" />
              </div>
              <h4 className="font-['Chakra_Petch'] text-base font-bold text-neutral-900 dark:text-white">
                Excuse Weekly Quota
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Grant quota exemption for <strong>{excuseModalAlert.displayName}</strong> for week <strong>{excuseModalAlert.weekRangeLabel}</strong>
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold font-mono uppercase text-neutral-700 dark:text-neutral-300">
                Reason / Note
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
                onClick={() => setExcuseModalAlert(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExcuse}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-neutral-950 font-bold text-xs cursor-pointer shadow-sm"
              >
                Confirm Excuse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
