import React, { useState, useMemo } from 'react';
import { useValueList } from '../context/ValueListContext';
import { 
  Download, 
  Copy, 
  Check, 
  FileSpreadsheet, 
  FileText, 
  FileCode, 
  Lock, 
  ShieldAlert, 
  Database, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  Table,
  Sliders,
  Sparkles,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const DataExportView: React.FC = () => {
  const {
    canExport,
    isAdmin,
    isAnalyst,
    activeStaff,
    items,
    exportAllDataText,
    downloadExportedData
  } = useValueList();

  // Primary default: Tabular CSV / Excel format
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'summary' | 'json'>('csv');
  const [headerCase, setHeaderCase] = useState<'lowercase' | 'titlecase'>('lowercase');
  const [columnLayout, setColumnLayout] = useState<'metric_first' | 'tier_paired'>('metric_first');
  const [asPlainTextFile, setAsPlainTextFile] = useState<boolean>(false);
  const [previewMode, setPreviewMode] = useState<'table' | 'raw'>('table');
  const [copied, setCopied] = useState<boolean>(false);
  const [downloadNotice, setDownloadNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Compute live preview text (Strictly items only, no logs, no reports)
  const previewText = useMemo(() => {
    if (!canExport) return '';
    try {
      return exportAllDataText(selectedFormat, {
        includeItems: true,
        includeReports: false,
        includeAuditLogs: false,
        includeConfigs: false,
        headerCase,
        columnLayout
      });
    } catch (e: any) {
      return `Error generating preview: ${e?.message || 'Unknown error'}`;
    }
  }, [canExport, selectedFormat, headerCase, columnLayout, exportAllDataText]);

  // Parse CSV for live table grid preview
  const tablePreviewData = useMemo(() => {
    if (selectedFormat !== 'csv' || !previewText) return null;
    const lines = previewText.trim().split('\r\n').filter(l => l.length > 0);
    if (lines.length === 0) return null;

    // Simple CSV parser for preview rows
    const parseRow = (line: string): string[] => {
      const cells: string[] = [];
      let cur = '';
      let inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuote && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuote = !inQuote;
          }
        } else if (ch === ',' && !inQuote) {
          cells.push(cur);
          cur = '';
        } else {
          cur += ch;
        }
      }
      cells.push(cur);
      return cells;
    };

    const headers = parseRow(lines[0]);
    const rows = lines.slice(1, 11).map(line => parseRow(line));
    return { headers, rows, totalRows: lines.length - 1 };
  }, [selectedFormat, previewText]);

  const previewStats = useMemo(() => {
    const lines = previewText.split('\n').length;
    const chars = previewText.length;
    const kb = (chars / 1024).toFixed(1);
    return { lines, chars, kb };
  }, [previewText]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(previewText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Failed to copy to clipboard', e);
    }
  };

  const handleDownload = () => {
    setDownloadNotice(null);
    const res = downloadExportedData(selectedFormat, {
      includeItems: true,
      includeReports: false,
      includeAuditLogs: false,
      includeConfigs: false,
      asPlainTextFile,
      headerCase,
      columnLayout
    });

    if (res.success) {
      setDownloadNotice({ type: 'success', message: res.message });
      setTimeout(() => setDownloadNotice(null), 5000);
    } else {
      setDownloadNotice({ type: 'error', message: res.message });
    }
  };

  // If user is not an Analyst or Admin, render restricted access notice
  if (!canExport) {
    return (
      <div className="p-8 rounded-2xl bg-white dark:bg-[#151722] border border-rose-200 dark:border-rose-900/40 text-center max-w-2xl mx-auto shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-200 dark:border-rose-800">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="font-['Chakra_Petch'] text-xl font-bold uppercase tracking-tight text-neutral-900 dark:text-white mb-2">
          Data Export Restricted
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6 leading-relaxed">
          The <span className="font-bold text-neutral-900 dark:text-white">Data Export</span> tool is an exclusive feature restricted to accounts with the <span className="font-bold text-cyan-600 dark:text-cyan-400">Analyst</span> or <span className="font-bold text-amber-600 dark:text-amber-400">Admin</span> role. Standard Staff accounts are not authorized to download bulk catalog datasets.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400 text-xs font-mono">
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          <span>Current Account Role: {activeStaff?.role || 'Staff'}</span>
        </div>
      </div>
    );
  }

  const roleLabel = isAdmin ? 'Administrator' : isAnalyst ? 'Analyst' : activeStaff?.role || 'Staff';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/5 to-transparent border border-emerald-200/80 dark:border-emerald-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
            <h3 className="font-['Chakra_Petch'] text-lg font-bold text-neutral-900 dark:text-white uppercase tracking-tight">
              Catalog Items CSV & Excel Export
            </h3>
            <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider font-mono border ${
              isAdmin
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                : 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800'
            }`}>
              Authorized: {roleLabel}
            </span>
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
              Items Only • No Logs • No Notes
            </span>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-3xl">
            Export all current catalog assets directly into a spreadsheet sheet (<code className="font-mono text-emerald-600 dark:text-emerald-400">.csv</code>). Includes base values, demands, trends, and all 0★–5★ star values, star demands, and star trends without notes or audit logs.
          </p>
        </div>

        {/* Quick Stats Pill */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#181c2b] border border-emerald-200/80 dark:border-emerald-900/40 text-center shadow-2xs">
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">{items.length}</div>
            <div className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-mono">Catalog Items</div>
          </div>
          <div className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#181c2b] border border-emerald-200/80 dark:border-emerald-900/40 text-center shadow-2xs">
            <div className="text-sm font-bold text-cyan-600 dark:text-cyan-400 font-mono">28</div>
            <div className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-mono">Total Columns</div>
          </div>
        </div>
      </div>

      {/* Main Configuration Card */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#181c2b] border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-5">
        <div>
          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-2 font-mono">
            1. Select Export Format
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Format: Tabular CSV / Excel */}
            <button
              type="button"
              id="format-csv-btn"
              onClick={() => setSelectedFormat('csv')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                selectedFormat === 'csv'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'bg-neutral-50 dark:bg-[#12141d] border-neutral-200 dark:border-neutral-700/80 text-neutral-700 dark:text-neutral-300 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                  <span className="font-['Chakra_Petch'] font-bold text-xs uppercase tracking-wide">CSV / Excel Spreadsheet</span>
                </div>
                {selectedFormat === 'csv' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-normal">
                Standard comma-separated table (.csv) with UTF-8 BOM encoding for Microsoft Excel, Google Sheets, or Apple Numbers.
              </p>
            </button>

            {/* Format: Plain Text Ledger */}
            <button
              type="button"
              id="format-summary-btn"
              onClick={() => setSelectedFormat('summary')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                selectedFormat === 'summary'
                  ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-500 text-cyan-950 dark:text-cyan-200 ring-2 ring-cyan-500/20 shadow-xs'
                  : 'bg-neutral-50 dark:bg-[#12141d] border-neutral-200 dark:border-neutral-700/80 text-neutral-700 dark:text-neutral-300 hover:border-cyan-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-500" />
                  <span className="font-['Chakra_Petch'] font-bold text-xs uppercase tracking-wide">Plain Text Ledger (.txt)</span>
                </div>
                {selectedFormat === 'summary' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500" />}
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-normal">
                Human-readable structured text document with item catalog, star values, and market category totals.
              </p>
            </button>

            {/* Format: Full JSON */}
            <button
              type="button"
              id="format-json-btn"
              onClick={() => setSelectedFormat('json')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                selectedFormat === 'json'
                  ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-950 dark:text-purple-200 ring-2 ring-purple-500/20 shadow-xs'
                  : 'bg-neutral-50 dark:bg-[#12141d] border-neutral-200 dark:border-neutral-700/80 text-neutral-700 dark:text-neutral-300 hover:border-purple-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-purple-500" />
                  <span className="font-['Chakra_Petch'] font-bold text-xs uppercase tracking-wide">Structured JSON (.json)</span>
                </div>
                {selectedFormat === 'json' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-500" />}
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-normal">
                Developer JSON schema containing item catalog array with calculated star values, star demands, and star trends.
              </p>
            </button>
          </div>
        </div>

        {/* CSV Specific Schema Options */}
        {selectedFormat === 'csv' && (
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Header Style */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-2 font-mono">
                Header Casing
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setHeaderCase('lowercase')}
                  className={`px-3 py-2 rounded-lg border text-xs font-mono text-left cursor-pointer transition-all ${
                    headerCase === 'lowercase'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold'
                      : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  <div>lowercase</div>
                  <span className="text-[10px] text-neutral-400 block font-sans">name, type, class...</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHeaderCase('titlecase')}
                  className={`px-3 py-2 rounded-lg border text-xs font-mono text-left cursor-pointer transition-all ${
                    headerCase === 'titlecase'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold'
                      : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  <div>Title Case</div>
                  <span className="text-[10px] text-neutral-400 block font-sans">Name, Type, Class...</span>
                </button>
              </div>
            </div>

            {/* Column Arrangement */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-2 font-mono">
                Column Ordering
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setColumnLayout('metric_first')}
                  className={`px-3 py-2 rounded-lg border text-xs font-mono text-left cursor-pointer transition-all ${
                    columnLayout === 'metric_first'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold'
                      : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  <div>Metric Sequential</div>
                  <span className="text-[10px] text-neutral-400 block font-sans">All values, then demands</span>
                </button>

                <button
                  type="button"
                  onClick={() => setColumnLayout('tier_paired')}
                  className={`px-3 py-2 rounded-lg border text-xs font-mono text-left cursor-pointer transition-all ${
                    columnLayout === 'tier_paired'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold'
                      : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  <div>Tier Paired</div>
                  <span className="text-[10px] text-neutral-400 block font-sans">0★ Val, 0★ Dem, 1★...</span>
                </button>
              </div>
            </div>

            {/* Extension Preference */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-2 font-mono">
                Download File Extension
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAsPlainTextFile(false)}
                  className={`px-3 py-2 rounded-lg border text-xs font-mono text-left cursor-pointer transition-all ${
                    !asPlainTextFile
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold'
                      : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  <div>.csv File</div>
                  <span className="text-[10px] text-neutral-400 block font-sans">Opens directly in Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAsPlainTextFile(true)}
                  className={`px-3 py-2 rounded-lg border text-xs font-mono text-left cursor-pointer transition-all ${
                    asPlainTextFile
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold'
                      : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  <div>.txt File</div>
                  <span className="text-[10px] text-neutral-400 block font-sans">Text editor file</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Columns Schema Summary Pills */}
        <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-[#12141d] border border-neutral-200/80 dark:border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-neutral-700 dark:text-neutral-300 font-mono flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-emerald-500" />
              Generated CSV Columns (28 columns total • NO notes • No logs):
            </span>
            <span className="text-[11px] font-mono text-neutral-400">
              Target: {items.length} Items
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
            {['name', 'type', 'class', 'tradable/untradable', 'value', 'demand', 'trend'].map(c => (
              <span key={c} className="px-2 py-0.5 rounded-md bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800 font-semibold">
                {headerCase === 'titlecase' ? c.replace(/\b\w/g, l => l.toUpperCase()) : c}
              </span>
            ))}
            {['fresh_value', '0_star_value', '1_star_value', '2_star_value', '3_star_value', '4_star_value', '5_star_value'].map(c => (
              <span key={c} className="px-2 py-0.5 rounded-md bg-cyan-100/70 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border border-cyan-300/60 dark:border-cyan-800">
                {headerCase === 'titlecase' ? c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : c}
              </span>
            ))}
            {['fresh_demand', '0_star_demand', '1_star_demand', '2_star_demand', '3_star_demand', '4_star_demand', '5_star_demand'].map(c => (
              <span key={c} className="px-2 py-0.5 rounded-md bg-blue-100/70 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300/60 dark:border-blue-800">
                {headerCase === 'titlecase' ? c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : c}
              </span>
            ))}
            {['fresh_trend', '0_star_trend', '1_star_trend', '2_star_trend', '3_star_trend', '4_star_trend', '5_star_trend'].map(c => (
              <span key={c} className="px-2 py-0.5 rounded-md bg-purple-100/70 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300/60 dark:border-purple-800">
                {headerCase === 'titlecase' ? c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : c}
              </span>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 font-mono">
            <span>Payload: {previewStats.lines} rows</span>
            <span>•</span>
            <span>{previewStats.chars.toLocaleString()} chars</span>
            <span>•</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{previewStats.kb} KB</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              id="copy-export-csv-btn"
              onClick={handleCopy}
              className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:border-emerald-400 dark:hover:border-emerald-500 text-xs font-bold font-['Chakra_Petch'] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-neutral-400" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy CSV Text'}</span>
            </button>

            <button
              type="button"
              id="download-data-export-btn"
              onClick={handleDownload}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-['Chakra_Petch'] text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shadow-sm shadow-emerald-500/20 active:scale-98"
            >
              <Download className="w-4 h-4" />
              <span>
                Download {selectedFormat === 'csv' ? (asPlainTextFile ? 'CSV (.txt)' : 'Excel Sheet (.csv)') : selectedFormat === 'summary' ? 'Summary (.txt)' : 'JSON (.json)'}
              </span>
            </button>
          </div>
        </div>

        {/* Download notification feedback */}
        <AnimatePresence>
          {downloadNotice && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className={`p-3 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                downloadNotice.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}
            >
              {downloadNotice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              )}
              <span>{downloadNotice.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Preview Section: Table vs Raw Text */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#181c2b] border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-500" />
            <h4 className="font-['Chakra_Petch'] text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
              Live Export Preview
            </h4>
            <span className="text-[11px] text-neutral-400 font-mono">
              ({items.length} items total)
            </span>
          </div>

          {selectedFormat === 'csv' && (
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-mono">
              <button
                type="button"
                onClick={() => setPreviewMode('table')}
                className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  previewMode === 'table'
                    ? 'bg-white dark:bg-[#181c2b] text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Spreadsheet Grid</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewMode('raw')}
                className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  previewMode === 'raw'
                    ? 'bg-white dark:bg-[#181c2b] text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Raw CSV Text</span>
              </button>
            </div>
          )}
        </div>

        {/* Spreadsheet Table View */}
        {selectedFormat === 'csv' && previewMode === 'table' && tablePreviewData && (
          <div className="space-y-2">
            <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800 max-h-96 overflow-y-auto scrollbar-thin">
              <table className="w-full text-xs text-left border-collapse whitespace-nowrap font-mono">
                <thead className="bg-neutral-100 dark:bg-neutral-900 sticky top-0 z-10 text-neutral-700 dark:text-neutral-300 border-b border-neutral-200 dark:border-neutral-800 font-bold text-[11px]">
                  <tr>
                    <th className="px-3 py-2 border-r border-neutral-200 dark:border-neutral-800 text-neutral-400 w-10 text-center">#</th>
                    {tablePreviewData.headers.map((h, i) => (
                      <th
                        key={i}
                        className={`px-3 py-2 border-r border-neutral-200 dark:border-neutral-800 ${
                          i < 7 ? 'text-emerald-700 dark:text-emerald-400' : 'text-neutral-600 dark:text-neutral-300'
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 bg-white dark:bg-[#151722]">
                  {tablePreviewData.rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="px-3 py-1.5 border-r border-neutral-100 dark:border-neutral-800 text-neutral-400 text-center text-[10px]">
                        {rowIdx + 1}
                      </td>
                      {row.map((cell, colIdx) => (
                        <td
                          key={colIdx}
                          className={`px-3 py-1.5 border-r border-neutral-100 dark:border-neutral-800 ${
                            colIdx === 0
                              ? 'font-bold text-neutral-900 dark:text-white'
                              : colIdx === 3
                              ? cell.toLowerCase().includes('untradable')
                                ? 'text-rose-500 font-semibold'
                                : 'text-emerald-600 dark:text-emerald-400 font-semibold'
                              : 'text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          {cell !== '' ? (
                            !isNaN(Number(cell)) && colIdx >= 4 && colIdx !== 6 ? (
                              Number(cell).toLocaleString()
                            ) : (
                              cell
                            )
                          ) : (
                            <span className="text-neutral-400/50">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center justify-between font-mono px-1">
              <span>Showing first 10 items of {tablePreviewData.totalRows} in spreadsheet preview</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Full file contains all {items.length} items</span>
            </div>
          </div>
        )}

        {/* Raw Text View */}
        {(selectedFormat !== 'csv' || previewMode === 'raw') && (
          <div className="relative">
            <pre className="p-4 rounded-xl bg-neutral-900 text-neutral-200 font-mono text-xs leading-relaxed overflow-x-auto max-h-96 overflow-y-auto select-all scrollbar-thin scrollbar-thumb-neutral-700">
              {previewText}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
