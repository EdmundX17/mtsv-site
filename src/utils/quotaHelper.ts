import { ConsultantProposal, AuditLog, StaffMember, WeeklyQuotaRecord } from '../types';

export const DEFAULT_CONSULTANT_WEEKLY_QUOTA = 5;

export interface WeekInfo {
  weekKey: string; // e.g. "2026-W39"
  weekStart: Date; // Monday 00:00:00
  weekEnd: Date; // Sunday 23:59:59.999
  formattedRange: string; // "Sep 21 – Sep 27, 2026"
  isSunday: boolean;
  isMonday: boolean;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  dayName: string; // "Sunday", "Monday", etc.
  daysRemainingInWeek: number;
  hoursRemainingInWeek: number;
}

/**
 * Returns ISO week number and year
 */
export function getISOWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${weekNo < 10 ? '0' : ''}${weekNo}`;
}

/**
 * Get week boundaries (Monday 00:00:00 to Sunday 23:59:59.999) for any given date
 */
export function getWeekInfo(inputDate?: Date | string | null): WeekInfo {
  const target = inputDate ? new Date(inputDate) : new Date();
  const day = target.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Calculate distance back to Monday
  // If today is Sunday (0), Monday was 6 days ago. If Monday (1), Monday is today (diff 0).
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const weekStart = new Date(target);
  weekStart.setDate(target.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const weekKey = getISOWeekKey(weekStart);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const startMonth = monthNames[weekStart.getMonth()];
  const endMonth = monthNames[weekEnd.getMonth()];
  const startDay = weekStart.getDate();
  const endDay = weekEnd.getDate();
  const year = weekEnd.getFullYear();

  const formattedRange = startMonth === endMonth
    ? `${startMonth} ${startDay} – ${endDay}, ${year}`
    : `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;

  const msRemaining = Math.max(0, weekEnd.getTime() - target.getTime());
  const hoursRemainingInWeek = Math.max(0, Math.floor(msRemaining / (1000 * 60 * 60)));
  const daysRemainingInWeek = day === 0 ? 0 : 7 - day;

  return {
    weekKey,
    weekStart,
    weekEnd,
    formattedRange,
    isSunday: day === 0,
    isMonday: day === 1,
    dayOfWeek: day,
    dayName: dayNames[day],
    daysRemainingInWeek,
    hoursRemainingInWeek
  };
}

/**
 * Get week boundaries for the week preceding the current target date
 */
export function getPreviousWeekInfo(inputDate?: Date | string | null): WeekInfo {
  const current = inputDate ? new Date(inputDate) : new Date();
  const prevDate = new Date(current);
  prevDate.setDate(current.getDate() - 7);
  return getWeekInfo(prevDate);
}

export interface ConsultantQuotaStats {
  targetQuota: number; // X suggestions
  currentWeekProposals: ConsultantProposal[];
  currentWeekCount: number; // Z suggestions done this week
  currentWeekApproved: number;
  currentWeekPending: number;
  currentWeekDenied: number;
  remainingNeeded: number; // Y amount away from reaching X (max(0, X - Z))
  percentComplete: number; // 0 to 100%
  isQuotaMet: boolean;
  
  // Lifetime stats
  lifetimeProposals: ConsultantProposal[];
  lifetimeCount: number;
  lifetimeApproved: number;
  lifetimePending: number;
  lifetimeDenied: number;
  approvalRate: number; // percentage

  // Sunday warning state
  isSunday: boolean;
  sundayWarningActive: boolean;
  sundayWarningMessage: string;

  // Week context
  weekInfo: WeekInfo;
  pastWeeksHistory: Array<{
    weekKey: string;
    weekRange: string;
    targetQuota: number;
    completedCount: number;
    status: 'met' | 'missed' | 'excused';
    deficit: number;
  }>;
}

/**
 * Calculates comprehensive quota stats for a consultant
 */
export function calculateConsultantQuotaStats(
  member: StaffMember,
  allProposals: ConsultantProposal[] = [],
  customDate?: Date | null
): ConsultantQuotaStats {
  const weekInfo = getWeekInfo(customDate);
  const targetQuota = typeof member.weeklyQuota === 'number' && member.weeklyQuota > 0
    ? member.weeklyQuota
    : DEFAULT_CONSULTANT_WEEKLY_QUOTA;

  const usernameLower = (member.username || '').toLowerCase().trim();
  const displayNameLower = (member.displayName || '').toLowerCase().trim();

  // All lifetime proposals by this consultant
  const lifetimeProposals = allProposals.filter(p => {
    if (!p) return false;
    const pUser = (p.consultantUsername || '').toLowerCase().trim();
    const pDisplay = (p.consultantDisplayName || '').toLowerCase().trim();
    const pId = (p.consultantId || '').toLowerCase().trim();
    return pUser === usernameLower || (displayNameLower && pDisplay === displayNameLower) || (member.id && pId === member.id.toLowerCase());
  });

  const lifetimeCount = lifetimeProposals.length;
  const lifetimeApproved = lifetimeProposals.filter(p => p.status === 'approved').length;
  const lifetimePending = lifetimeProposals.filter(p => p.status === 'pending').length;
  const lifetimeDenied = lifetimeProposals.filter(p => p.status === 'denied').length;
  const approvalRate = lifetimeCount > 0 ? Math.round((lifetimeApproved / lifetimeCount) * 100) : 0;

  // Current week proposals
  const currentWeekProposals = lifetimeProposals.filter(p => {
    if (!p.createdAt) return false;
    const createdTime = new Date(p.createdAt).getTime();
    return createdTime >= weekInfo.weekStart.getTime() && createdTime <= weekInfo.weekEnd.getTime();
  });

  const currentWeekCount = currentWeekProposals.length;
  const currentWeekApproved = currentWeekProposals.filter(p => p.status === 'approved').length;
  const currentWeekPending = currentWeekProposals.filter(p => p.status === 'pending').length;
  const currentWeekDenied = currentWeekProposals.filter(p => p.status === 'denied').length;

  const remainingNeeded = Math.max(0, targetQuota - currentWeekCount);
  const percentComplete = Math.min(100, Math.round((currentWeekCount / targetQuota) * 100));
  const isQuotaMet = currentWeekCount >= targetQuota;

  // Sunday warning check: is today Sunday and quota not yet met?
  const isSunday = weekInfo.isSunday;
  const sundayWarningActive = isSunday && !isQuotaMet;
  const sundayWarningMessage = isSunday
    ? (!isQuotaMet
        ? `⚠️ Weekly Quota Alert: Today is Sunday, the final day before the weekly quota reset! You are ${remainingNeeded} suggestion${remainingNeeded === 1 ? '' : 's'} away from reaching your required ${targetQuota} suggestions for this week.`
        : `🎉 Weekly Quota Completed! Fantastic job! You have submitted ${currentWeekCount} / ${targetQuota} suggestions this week.`)
    : (!isQuotaMet
        ? `Weekly Quota Progress: ${currentWeekCount} / ${targetQuota} suggestions submitted (${remainingNeeded} remaining). Cycle resets on Monday.`
        : `Weekly Quota Completed (${currentWeekCount} / ${targetQuota} suggestions).`);

  // Build past 8 weeks history
  const pastWeeksHistory: ConsultantQuotaStats['pastWeeksHistory'] = [];
  for (let i = 1; i <= 8; i++) {
    const pastRefDate = new Date(weekInfo.weekStart);
    pastRefDate.setDate(pastRefDate.getDate() - (i * 7));
    const pastW = getWeekInfo(pastRefDate);

    // Look for stored historical override or calculate from proposals
    const storedRecord = member.weeklyQuotaHistory?.find(r => r.weekKey === pastW.weekKey);
    const pastProposals = lifetimeProposals.filter(p => {
      if (!p.createdAt) return false;
      const t = new Date(p.createdAt).getTime();
      return t >= pastW.weekStart.getTime() && t <= pastW.weekEnd.getTime();
    });

    const completed = storedRecord ? storedRecord.completedCount : pastProposals.length;
    const weekTarget = storedRecord ? storedRecord.targetQuota : targetQuota;
    const isExcused = storedRecord?.status === 'excused';
    const met = isExcused || completed >= weekTarget;
    const deficit = Math.max(0, weekTarget - completed);

    pastWeeksHistory.push({
      weekKey: pastW.weekKey,
      weekRange: pastW.formattedRange,
      targetQuota: weekTarget,
      completedCount: completed,
      status: isExcused ? 'excused' : (met ? 'met' : 'missed'),
      deficit
    });
  }

  return {
    targetQuota,
    currentWeekProposals,
    currentWeekCount,
    currentWeekApproved,
    currentWeekPending,
    currentWeekDenied,
    remainingNeeded,
    percentComplete,
    isQuotaMet,
    lifetimeProposals,
    lifetimeCount,
    lifetimeApproved,
    lifetimePending,
    lifetimeDenied,
    approvalRate,
    isSunday,
    sundayWarningActive,
    sundayWarningMessage,
    weekInfo,
    pastWeeksHistory
  };
}

export interface StaffChangesStats {
  lifetimeChangesCount: number;
  thisWeekChangesCount: number;
  actionBreakdown: Record<string, number>;
  recentLogs: AuditLog[];
}

/**
 * Calculates activity change stats for any staff member (Admin, Analyst, Staff, Consultant)
 */
export function getStaffChangesStats(
  member: StaffMember,
  auditLogs: AuditLog[] = [],
  customDate?: Date | null
): StaffChangesStats {
  const weekInfo = getWeekInfo(customDate);
  const usernameLower = (member.username || '').toLowerCase().trim();
  const displayNameLower = (member.displayName || '').toLowerCase().trim();

  const userLogs = auditLogs.filter(log => {
    if (!log) return false;
    const mod = (log.moderator || '').toLowerCase();
    return mod.includes(usernameLower) || (displayNameLower && mod.includes(displayNameLower));
  });

  const lifetimeChangesCount = userLogs.length;

  const thisWeekLogs = userLogs.filter(log => {
    if (!log.timestamp) return false;
    const time = new Date(log.timestamp).getTime();
    return time >= weekInfo.weekStart.getTime() && time <= weekInfo.weekEnd.getTime();
  });

  const thisWeekChangesCount = thisWeekLogs.length;

  const actionBreakdown: Record<string, number> = {};
  userLogs.forEach(log => {
    const act = log.action || 'MANUAL_EDIT';
    actionBreakdown[act] = (actionBreakdown[act] || 0) + 1;
  });

  const recentLogs = [...userLogs]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20);

  return {
    lifetimeChangesCount,
    thisWeekChangesCount,
    actionBreakdown,
    recentLogs
  };
}

export interface AdminUnmetQuotaAlert {
  staffId: string;
  username: string;
  displayName: string;
  weekKey: string;
  weekRangeLabel: string;
  targetQuota: number; // x amount
  actualDone: number; // z amount
  deficit: number; // x - z
  isAcknowledged: boolean;
  isExcused: boolean;
  member: StaffMember;
}

/**
 * Checks for past weeks where consultants did not complete their required weekly quota (Z < X).
 * Gives warnings to admins.
 */
export function getAdminUnmetQuotaAlerts(
  staffMembers: StaffMember[],
  allProposals: ConsultantProposal[] = [],
  customDate?: Date | null
): AdminUnmetQuotaAlert[] {
  const alerts: AdminUnmetQuotaAlert[] = [];
  const prevWeek = getPreviousWeekInfo(customDate);

  const consultants = staffMembers.filter(s => s.role === 'Consultant');

  consultants.forEach(consultant => {
    const targetQuota = typeof consultant.weeklyQuota === 'number' && consultant.weeklyQuota > 0
      ? consultant.weeklyQuota
      : DEFAULT_CONSULTANT_WEEKLY_QUOTA;

    const usernameLower = (consultant.username || '').toLowerCase().trim();
    const displayNameLower = (consultant.displayName || '').toLowerCase().trim();

    // Check previous week submissions
    const prevWeekProposals = allProposals.filter(p => {
      if (!p || !p.createdAt) return false;
      const pUser = (p.consultantUsername || '').toLowerCase().trim();
      const pDisplay = (p.consultantDisplayName || '').toLowerCase().trim();
      const matches = pUser === usernameLower || (displayNameLower && pDisplay === displayNameLower);
      if (!matches) return false;

      const createdTime = new Date(p.createdAt).getTime();
      return createdTime >= prevWeek.weekStart.getTime() && createdTime <= prevWeek.weekEnd.getTime();
    });

    const actualDone = prevWeekProposals.length;
    const isAcknowledged = Array.isArray(consultant.acknowledgedUnmetWeeks) &&
      consultant.acknowledgedUnmetWeeks.includes(prevWeek.weekKey);

    const isExcused = consultant.weeklyQuotaHistory?.some(
      r => r.weekKey === prevWeek.weekKey && r.status === 'excused'
    ) || false;

    if (actualDone < targetQuota && !isExcused) {
      alerts.push({
        staffId: consultant.id,
        username: consultant.username,
        displayName: consultant.displayName || consultant.username,
        weekKey: prevWeek.weekKey,
        weekRangeLabel: prevWeek.formattedRange,
        targetQuota,
        actualDone,
        deficit: targetQuota - actualDone,
        isAcknowledged,
        isExcused,
        member: consultant
      });
    }
  });

  return alerts;
}

/**
 * Human-readable duration formatting (e.g. "3 hrs 24 mins", "42 mins")
 */
export function formatDurationMinutes(minutes?: number): string {
  if (minutes === undefined || minutes === null || isNaN(minutes) || minutes <= 0) {
    return '0 mins';
  }
  const rounded = Math.round(minutes);
  if (rounded < 60) {
    return `${rounded} min${rounded === 1 ? '' : 's'}`;
  }
  const hrs = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (mins === 0) {
    return `${hrs} hr${hrs === 1 ? '' : 's'}`;
  }
  return `${hrs} hr${hrs === 1 ? '' : 's'} ${mins} min${mins === 1 ? '' : 's'}`;
}

/**
 * Formats an ISO string into relative time (e.g., "5 mins ago", "Yesterday at 4:15 PM")
 */
export function formatRelativeTime(isoString?: string): string {
  if (!isoString) return 'Never';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Never';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 45) return 'Just now';
    if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? '' : 's'} ago`;
    if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
    if (diffDay === 1) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffDay < 7) return `${diffDay} days ago`;

    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString || 'Never';
  }
}
