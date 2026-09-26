import React, { useState, useRef } from 'react';
import { 
  ShieldCheck, 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  Trash2, 
  Clock, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar,
  Archive,
  ArrowDownToLine,
  Cloud,
} from 'lucide-react';
import { useValueList } from '../context/ValueListContext';
import { SiteBackup, BackupType } from '../types';

export const SiteBackupsManager: React.FC = () => {
  const {
    items,
    siteBackups,
    isBackingUp,
    lastBackupDate,
    createBackup,
    restoreBackup,
    deleteBackup,
    exportBackupJSON,
    importBackupJSON,
    isAdmin
  } = useValueList();

  const [filterType, setFilterType] = useState<BackupType | 'all'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [customBackupName, setCustomBackupName] = useState('');
  const [customBackupNotes, setCustomBackupNotes] = useState('');
  const [actionFeedback, setActionFeedback] = useState<{ 
    type: 'success' | 'error' | 'info'; 
    message: string;
  } | null>(null);
  
  // Restore confirmation modal state
  const [selectedBackupToRestore, setSelectedBackupToRestore] = useState<SiteBackup | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // File upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (
    type: 'success' | 'error' | 'info', 
    message: string
  ) => {
    setActionFeedback({ type, message });
    setTimeout(() => {
      setActionFeedback(prev => (prev?.message === message ? null : prev));
    }, 7000);
  };

  const handleCreateManualBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = customBackupName.trim() || `Manual Snapshot - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    const res = await createBackup(name, 'manual', customBackupNotes.trim() || undefined);
    if (res.success) {
      showFeedback('success', res.message);
      setIsCreateModalOpen(false);
      setCustomBackupName('');
      setCustomBackupNotes('');
    } else {
      showFeedback('error', res.message);
    }
  };

  const handleConfirmRestore = async () => {
    if (!selectedBackupToRestore) return;
    setIsRestoring(true);
    try {
      const res = await restoreBackup(selectedBackupToRestore);
      if (res.success) {
        showFeedback('success', res.message);
        setSelectedBackupToRestore(null);
      } else {
        showFeedback('error', res.message);
      }
    } catch (err: any) {
      showFeedback('error', err?.message || 'Restore failed');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDownloadBackup = (backup: SiteBackup) => {
    try {
      const jsonStr = exportBackupJSON(backup);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const cleanName = backup.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      link.href = url;
      link.download = `mts_backup_${cleanName}_${backup.dateKey || 'date'}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showFeedback('success', `Downloaded backup file: ${backup.name}`);
    } catch (err: any) {
      showFeedback('error', 'Failed to download backup JSON');
    }
  };

  const handleDownloadCurrentCatalog = () => {
    try {
      const jsonStr = exportBackupJSON();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const nowStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `mts_live_catalog_backup_${nowStr}_${items.length}_items.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showFeedback('success', `Exported live database backup with ${items.length} items!`);
    } catch (err: any) {
      showFeedback('error', 'Failed to export live database backup');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) {
        showFeedback('error', 'Uploaded file is empty.');
        return;
      }
      const res = await importBackupJSON(content);
      if (res.success) {
        showFeedback('success', res.message);
      } else {
        showFeedback('error', res.message);
      }
    };
    reader.onerror = () => {
      showFeedback('error', 'Error reading uploaded file.');
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredBackups = siteBackups.filter(b => {
    if (filterType === 'all') return true;
    return b.type === filterType;
  });

  const todayKey = new Date().toISOString().split('T')[0];
  const hasDailyToday = siteBackups.some(b => b.dateKey === todayKey && b.type === 'daily_auto');

  if (!isAdmin) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 sm:p-12 text-center shadow-sm max-w-xl mx-auto my-8">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold font-['Chakra_Petch'] text-neutral-900 dark:text-white uppercase tracking-wide">
          Admin Access Required
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
          Site Backups and Disaster Recovery are restricted to verified Administrator accounts only to prevent unauthorized database restores.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Status Cards */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-['Chakra_Petch'] text-neutral-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
                  Site Backups & Disaster Recovery
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-semibold lowercase tracking-normal">
                    automated daily
                  </span>
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Automated daily catalog snapshots and instant disaster recovery points stored in the site database.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleDownloadCurrentCatalog}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-['Chakra_Petch'] font-bold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 border border-neutral-300/80 dark:border-neutral-700 flex items-center gap-2 transition-all cursor-pointer"
              title="Download full JSON file of current live database"
            >
              <Download className="w-4 h-4 text-neutral-500" />
              <span>Download JSON</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-['Chakra_Petch'] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-2 transition-all cursor-pointer"
              title="Upload and restore a JSON backup file"
            >
              <Upload className="w-4 h-4 text-indigo-500" />
              <span>Restore JSON File</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-['Chakra_Petch'] font-bold uppercase tracking-wider bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Backup Now</span>
            </button>
          </div>
        </div>

        {/* Feedback alert */}
        {actionFeedback && (
          <div className={`mt-4 p-3.5 rounded-xl border flex items-center justify-between gap-3 text-sm animate-fade-in ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : actionFeedback.type === 'info'
              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}>
            <div className="flex items-center gap-2.5">
              {actionFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : actionFeedback.type === 'info' ? (
                <Cloud className="w-4 h-4 text-blue-500 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              )}
              <span className="font-medium">{actionFeedback.message}</span>
            </div>
          </div>
        )}

        {/* Metric Overview Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5">
          <div className="bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-semibold font-['Chakra_Petch']">
                Daily Backup Status
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${hasDailyToday ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-lg font-bold text-neutral-900 dark:text-white font-['Chakra_Petch']">
                {hasDailyToday ? 'Today Backed Up' : 'Scheduled Today'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {hasDailyToday ? 'Daily snapshot saved to cloud' : 'Will automatically capture daily snapshot'}
            </p>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-semibold font-['Chakra_Petch']">
                Live Catalog Health
              </span>
              <Database className="w-4 h-4 text-orange-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-neutral-900 dark:text-white font-['Chakra_Petch']">
                {items.length}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">Total Items in Database</span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              100% synchronized with master value list
            </p>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-semibold font-['Chakra_Petch']">
                Saved Snapshots
              </span>
              <Archive className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-neutral-900 dark:text-white font-['Chakra_Petch']">
                {siteBackups.length}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">Cloud Recovery Points</span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {lastBackupDate ? `Last backup: ${new Date(lastBackupDate).toLocaleDateString()}` : 'No backups saved'}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-['Chakra_Petch'] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            All Backups ({siteBackups.length})
          </button>
          <button
            onClick={() => setFilterType('daily_auto')}
            className={`px-3 py-1.5 rounded-lg text-xs font-['Chakra_Petch'] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              filterType === 'daily_auto'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Daily Automated ({siteBackups.filter(b => b.type === 'daily_auto').length})
          </button>
          <button
            onClick={() => setFilterType('manual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-['Chakra_Petch'] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              filterType === 'manual'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Manual Snapshots ({siteBackups.filter(b => b.type === 'manual').length})
          </button>
        </div>

        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          Showing {filteredBackups.length} recovery point(s)
        </span>
      </div>

      {/* Backups List */}
      {filteredBackups.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-10 text-center">
          <Database className="w-12 h-12 mx-auto text-neutral-400 mb-3" />
          <h3 className="text-base font-bold text-neutral-900 dark:text-white font-['Chakra_Petch'] uppercase">
            No Backups Found
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto mt-1 mb-4">
            Click "Create Backup Now" to capture an instant snapshot of the entire database catalog and configuration.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-['Chakra_Petch'] font-bold uppercase tracking-wider bg-orange-500 hover:bg-orange-600 text-white inline-flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Backup</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredBackups.map((backup) => {
            const isDaily = backup.type === 'daily_auto';
            const isPreImport = backup.type === 'pre_import';
            const formattedDate = new Date(backup.createdAt).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={backup.id}
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all shadow-sm"
              >
                <div className="flex items-start gap-3.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    isDaily
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : isPreImport
                      ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
                      : 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400'
                  }`}>
                    {isDaily ? <Calendar className="w-5 h-5" /> : <Database className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold font-['Chakra_Petch'] text-neutral-900 dark:text-white">
                        {backup.name}
                      </h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        isDaily
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : isPreImport
                          ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                          : 'bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800'
                      }`}>
                        {isDaily ? 'Daily Auto' : isPreImport ? 'Pre-Import' : 'Manual Snapshot'}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono font-medium">
                        {backup.itemCount || (backup.items?.length ?? 0)} items
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 text-xs text-neutral-500 dark:text-neutral-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formattedDate}
                      </span>
                      {backup.createdBy && (
                        <span>• By {backup.createdBy}</span>
                      )}
                    </div>

                    {backup.notes && (
                      <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1 italic">
                        "{backup.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Backup Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                  {/* Download JSON Button */}
                  <button
                    onClick={() => handleDownloadBackup(backup)}
                    className="p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer border border-neutral-200 dark:border-neutral-700"
                    title="Download JSON copy of this backup to your computer"
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                  </button>

                  {/* Restore Button */}
                  <button
                    onClick={() => setSelectedBackupToRestore(backup)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-['Chakra_Petch'] font-bold uppercase tracking-wider bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Restore catalog from this backup snapshot"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>

                  {isAdmin && (
                    <button
                      onClick={async () => {
                        if (confirm(`Are you sure you want to delete backup "${backup.name}"?`)) {
                          const res = await deleteBackup(backup.id);
                          if (res.success) showFeedback('success', res.message);
                          else showFeedback('error', res.message);
                        }
                      }}
                      className="p-2 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer border border-rose-200/60 dark:border-rose-900/40"
                      title="Delete this backup snapshot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE BACKUP MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold font-['Chakra_Petch'] text-neutral-900 dark:text-white uppercase">
                Create Catalog Snapshot
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              This will capture a complete snapshot of all {items.length} items, star configurations, soldier multipliers, and site settings.
            </p>

            <form onSubmit={handleCreateManualBackup} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-700 dark:text-neutral-300 mb-1">
                  Backup Label / Title
                </label>
                <input
                  type="text"
                  placeholder={`Manual Snapshot - ${new Date().toLocaleDateString()}`}
                  value={customBackupName}
                  onChange={(e) => setCustomBackupName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-700 dark:text-neutral-300 mb-1">
                  Notes / Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Snapshot before bulk weapon update..."
                  value={customBackupNotes}
                  onChange={(e) => setCustomBackupNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-['Chakra_Petch'] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBackingUp}
                  className="px-4 py-2 rounded-xl text-xs font-['Chakra_Petch'] font-bold uppercase tracking-wider bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isBackingUp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>{isBackingUp ? 'Saving Snapshot...' : 'Save Snapshot'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESTORE CONFIRMATION MODAL */}
      {selectedBackupToRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-['Chakra_Petch'] text-neutral-900 dark:text-white uppercase">
                  Restore Database from Snapshot?
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Target: {selectedBackupToRestore.name}
                </p>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl p-3.5 text-xs text-amber-900 dark:text-amber-300 space-y-1.5">
              <p className="font-semibold">
                ⚠️ Disaster Recovery Warning:
              </p>
              <p>
                Restoring this snapshot will safely overwrite the live database catalog with the <strong>{selectedBackupToRestore.itemCount || selectedBackupToRestore.items?.length} items</strong> and configuration saved in this backup on {new Date(selectedBackupToRestore.createdAt).toLocaleString()}.
              </p>
              <p>
                A safety archive of your current database will automatically be taken before restoring.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSelectedBackupToRestore(null)}
                disabled={isRestoring}
                className="px-4 py-2 rounded-xl text-xs font-['Chakra_Petch'] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="px-5 py-2 rounded-xl text-xs font-['Chakra_Petch'] font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isRestoring ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>{isRestoring ? 'Restoring All Items...' : 'Confirm & Restore Live Catalog'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
