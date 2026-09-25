import React, { useState, useMemo } from 'react';
import { useValueList } from '../context/ValueListContext';
import { ConsultantProposal } from '../types';
import { formatMilitaryValue } from '../utils/formatters';
import { ConsultantQuotaBanner } from './ConsultantQuotaBanner';
import { AdminQuotaAlerts } from './AdminQuotaAlerts';
import {
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  ArrowRight,
  Search,
  Check,
  X,
  Trash2,
  Eye,
  Sliders,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const ConsultantReviewPanel: React.FC = () => {
  const {
    consultantProposals = [],
    approveConsultantProposal,
    denyConsultantProposal,
    deleteConsultantProposal,
    isAdmin,
    items = [],
    setActiveEditModalItem
  } = useValueList();

  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [denialModalProposal, setDenialModalProposal] = useState<ConsultantProposal | null>(null);
  const [denialReason, setDenialReason] = useState('Insufficient market evidence or trade volume.');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const safeProposals = useMemo(() => {
    return Array.isArray(consultantProposals) ? consultantProposals : [];
  }, [consultantProposals]);

  // Filter proposals safely
  const filteredProposals = useMemo(() => {
    return safeProposals.filter(proposal => {
      if (!proposal) return false;
      // Status filter
      if (filter !== 'all' && proposal.status !== filter) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesItem = (proposal.itemName || '').toLowerCase().includes(query);
        const matchesConsultant =
          (proposal.consultantDisplayName || '').toLowerCase().includes(query) ||
          (proposal.consultantUsername || '').toLowerCase().includes(query);
        const matchesComment = (proposal.commentary || '').toLowerCase().includes(query);
        return matchesItem || matchesConsultant || matchesComment;
      }
      return true;
    });
  }, [safeProposals, filter, searchQuery]);

  const pendingCount = safeProposals.filter(p => p && p.status === 'pending').length;
  const approvedCount = safeProposals.filter(p => p && p.status === 'approved').length;
  const deniedCount = safeProposals.filter(p => p && p.status === 'denied').length;

  const handleOneClickApprove = async (proposal: ConsultantProposal, note?: string) => {
    if (!proposal?.id) return;
    setIsProcessing(proposal.id);
    try {
      await approveConsultantProposal(proposal.id, note);
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#10b981', '#34d399', '#6ee7b7', '#059669']
        });
      } catch {
        // Confetti fallback
      }
    } catch (err) {
      console.error('Failed to approve proposal', err);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleConfirmDenial = async () => {
    if (!denialModalProposal?.id) return;
    setIsProcessing(denialModalProposal.id);
    try {
      await denyConsultantProposal(denialModalProposal.id, denialReason);
    } catch (err) {
      console.error('Failed to deny proposal', err);
    } finally {
      setIsProcessing(null);
      setDenialModalProposal(null);
      setDenialReason('Insufficient market evidence or trade volume.');
    }
  };

  const formatTimestamp = (iso?: string) => {
    if (!iso) return 'Recently';
    try {
      const date = new Date(iso);
      if (isNaN(date.getTime())) return 'Recently';
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return iso || 'Recently';
    }
  };

  return (
    <div className="space-y-6">
      {/* Consultant Quota Warning / Progress Banner */}
      <ConsultantQuotaBanner />

      {/* Admin Unmet Quota Alerts */}
      <AdminQuotaAlerts />

      {/* Top Banner / Explainer */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-transparent border border-emerald-300/60 dark:border-emerald-700/60 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 dark:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-400/40">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-['Chakra_Petch'] font-bold text-lg text-neutral-900 dark:text-white uppercase tracking-wider">
                  Consultant Commentator Review Panel
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/60">
                  Google Docs Mode
                </span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5 max-w-2xl">
                Consultants provide Google Docs style commentary and proposed value updates. Administrators can review their detailed rationale, inspect before/after diffs, and approve or deny proposals in one click.
              </p>
            </div>
          </div>

          {/* Pending badge indicator */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-2 shadow-xs">
              <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
              <span>{pendingCount} Pending Decision</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              filter === 'pending'
                ? 'bg-amber-500 text-white font-bold shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Review</span>
            {pendingCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                filter === 'pending' ? 'bg-white text-amber-600' : 'bg-amber-500 text-white'
              }`}>
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setFilter('approved')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              filter === 'approved'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved ({approvedCount})</span>
          </button>

          <button
            onClick={() => setFilter('denied')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              filter === 'denied'
                ? 'bg-rose-600 text-white font-bold shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Denied ({deniedCount})</span>
          </button>

          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              filter === 'all'
                ? 'bg-neutral-800 dark:bg-neutral-700 text-white font-bold shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <span>All ({safeProposals.length})</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search proposals or comments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Proposals List */}
      {filteredProposals.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <h4 className="font-['Chakra_Petch'] font-bold text-base text-neutral-800 dark:text-neutral-200">
            {filter === 'pending' ? 'No Pending Proposals' : 'No Proposals Found'}
          </h4>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
            {filter === 'pending'
              ? 'All consultant suggestions have been reviewed! New proposals will appear here immediately.'
              : 'Try clearing your search query or changing your status filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProposals.map((proposal, pIdx) => {
            if (!proposal) return null;
            const isPending = proposal.status === 'pending';
            const isApproved = proposal.status === 'approved';
            const isDenied = proposal.status === 'denied';
            const originalItem = (items || []).find(i => i && i.id === proposal.itemId);
            const diffs = Array.isArray(proposal.diffs) ? proposal.diffs : [];
            const consultantName = proposal.consultantDisplayName || proposal.consultantUsername || 'Consultant';
            const consultantInitial = (consultantName.trim().charAt(0) || 'C').toUpperCase();

            return (
              <div
                key={proposal.id || `proposal-${proposal.itemName || 'item'}-${pIdx}`}
                className={`rounded-2xl border transition-all p-4 sm:p-5 space-y-4 shadow-sm ${
                  isPending
                    ? 'bg-white dark:bg-[#131622] border-amber-300 dark:border-amber-700/60 ring-1 ring-amber-400/20'
                    : isApproved
                    ? 'bg-white dark:bg-[#12151e] border-emerald-200 dark:border-emerald-900/60'
                    : 'bg-white dark:bg-[#12151e] border-neutral-200 dark:border-neutral-800/80 opacity-80'
                }`}
              >
                {/* Header: Item preview & Consultant info & Status */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Item thumbnail */}
                    <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-1 shrink-0 overflow-hidden flex items-center justify-center">
                      <img
                        src={proposal.itemThumbnail || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80'}
                        alt={proposal.itemName || 'Proposal Item'}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-['Chakra_Petch'] font-bold text-base text-neutral-900 dark:text-white truncate">
                          {proposal.itemName || 'Unnamed Unit'}
                        </h4>
                        {proposal.itemCategory && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                            {proposal.itemCategory}
                          </span>
                        )}
                        {proposal.itemRarity && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800/60">
                            {proposal.itemRarity}
                          </span>
                        )}
                        {proposal.type === 'NEW_ITEM' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                            NEW CATALOG ITEM
                          </span>
                        )}
                      </div>

                      {/* Consultant author tag */}
                      <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">
                          Suggested by <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{consultantName}</strong>
                          {proposal.consultantUsername && ` (@${proposal.consultantUsername})`}
                        </span>
                        <span>•</span>
                        <span className="text-[11px] font-mono">{formatTimestamp(proposal.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                    {isPending && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 shadow-xs">
                        <Clock className="w-3.5 h-3.5 animate-pulse" />
                        <span>Awaiting Admin Decision</span>
                      </span>
                    )}
                    {isApproved && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Approved & Applied</span>
                      </span>
                    )}
                    {isDenied && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700/60">
                        <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                        <span>Denied</span>
                      </span>
                    )}

                    {/* Admin delete proposal record */}
                    {isAdmin && proposal.id && (
                      <button
                        onClick={() => deleteConsultantProposal(proposal.id)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                        title="Delete proposal record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Google Docs Style Commentator Box */}
                <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-[#1a1c26] border border-amber-200/80 dark:border-amber-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">
                        {consultantInitial}
                      </div>
                      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        Commentator Rationale & Market Evidence
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 uppercase">
                      Google Docs Comment
                    </span>
                  </div>
                  <blockquote className="text-xs text-neutral-700 dark:text-neutral-300 italic pl-3 border-l-2 border-emerald-500 dark:border-emerald-400 whitespace-pre-wrap leading-relaxed">
                    "{proposal.commentary || 'No specific rationale provided.'}"
                  </blockquote>
                </div>

                {/* Detailed Diff Report (Before ➔ After) */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-orange-500" />
                    <span>Detailed Changes Report ({diffs.length} fields modified)</span>
                  </h5>

                  {diffs.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {diffs.map((diff, idx) => {
                        if (!diff) return null;
                        const fieldName = diff.field || '';
                        const isValueDiff = fieldName.toLowerCase().includes('value');

                        let deltaBadge = null;
                        if (isValueDiff && typeof diff.oldValue === 'number' && typeof diff.newValue === 'number') {
                          const delta = diff.newValue - diff.oldValue;
                          const pct = diff.oldValue > 0 ? ((delta / diff.oldValue) * 100).toFixed(1) : '0';
                          const isUp = delta > 0;
                          deltaBadge = (
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                              isUp 
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' 
                                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                            }`}>
                              {isUp ? '+' : ''}{formatMilitaryValue(delta)} ({isUp ? '+' : ''}{pct}%)
                            </span>
                          );
                        }

                        return (
                          <div
                            key={`diff-${diff.field || 'field'}-${idx}`}
                            className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                                {diff.label || diff.field || 'Change'}
                              </span>
                              {deltaBadge}
                            </div>

                            <div className="flex items-center justify-between text-xs font-mono">
                              <div className="text-neutral-500 dark:text-neutral-400 line-through">
                                {isValueDiff && typeof diff.oldValue === 'number'
                                  ? formatMilitaryValue(diff.oldValue)
                                  : String(diff.oldValue ?? 'None')}
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-neutral-400 shrink-0 mx-1" />
                              <div className="font-bold text-neutral-900 dark:text-white">
                                {isValueDiff && typeof diff.newValue === 'number'
                                  ? formatMilitaryValue(diff.newValue)
                                  : String(diff.newValue ?? 'None')}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl text-xs text-neutral-500 dark:text-neutral-400 italic">
                      No individual field differences recorded.
                    </div>
                  )}

                  {/* Notes / Description change check */}
                  {proposal.proposedChanges?.notes !== undefined &&
                   proposal.originalSnapshot?.notes !== undefined &&
                   proposal.proposedChanges.notes !== proposal.originalSnapshot.notes && (
                    <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 text-xs space-y-1">
                      <span className="font-bold text-neutral-600 dark:text-neutral-400 uppercase text-[10px]">
                        Updated Notes / Meta Description:
                      </span>
                      <p className="text-neutral-800 dark:text-neutral-200 italic font-sans whitespace-pre-wrap">
                        {proposal.proposedChanges.notes || '(Empty)'}
                      </p>
                    </div>
                  )}

                  {/* New item notes */}
                  {proposal.type === 'NEW_ITEM' && proposal.proposedChanges?.notes && (
                    <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 text-xs space-y-1">
                      <span className="font-bold text-neutral-600 dark:text-neutral-400 uppercase text-[10px]">
                        Proposed Item Notes / Lore:
                      </span>
                      <p className="text-neutral-800 dark:text-neutral-200 italic font-sans whitespace-pre-wrap">
                        {proposal.proposedChanges.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Admin Feedback note (if approved or denied) */}
                {proposal.adminFeedback && (
                  <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                    isApproved
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                  }`}>
                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">
                        Admin Decision Note ({proposal.resolvedBy || 'Admin'}):
                      </span>{' '}
                      <span>{proposal.adminFeedback}</span>
                    </div>
                  </div>
                )}

                {/* Action Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    {originalItem && (
                      <button
                        type="button"
                        onClick={() => setActiveEditModalItem(originalItem)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Live Item</span>
                      </button>
                    )}
                  </div>

                  {/* 1-Click Approve / Deny buttons for Admins */}
                  {isPending && (
                    <div className="flex items-center gap-2">
                      {isAdmin ? (
                        <>
                          <button
                            type="button"
                            disabled={isProcessing === proposal.id}
                            onClick={() => setDenialModalProposal(proposal)}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                            <span>1-Click Deny</span>
                          </button>

                          <button
                            type="button"
                            disabled={isProcessing === proposal.id}
                            onClick={() => handleOneClickApprove(proposal)}
                            className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                            <span>1-Click Approve & Apply</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-neutral-400 italic">
                          (Pending Administrator review)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Denial Confirmation Modal */}
      {denialModalProposal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#151722] border border-rose-200 dark:border-rose-900/80 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-['Chakra_Petch'] text-lg font-bold text-neutral-900 dark:text-white">
                  Deny Consultant Proposal
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Unit: {denialModalProposal.itemName || 'Proposal Item'}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Feedback for Consultant ({denialModalProposal.consultantDisplayName || 'Consultant'}):
              </label>
              <textarea
                rows={3}
                value={denialReason}
                onChange={(e) => setDenialReason(e.target.value)}
                placeholder="Explain why this proposal is denied (e.g. invalid trade proof, market volatility, etc.)..."
                className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDenialModalProposal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing === denialModalProposal.id}
                onClick={handleConfirmDenial}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-md shadow-rose-600/30 disabled:opacity-50"
              >
                Confirm Denial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
