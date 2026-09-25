import React, { useState } from 'react';
import { useValueList } from '../context/ValueListContext';
import { Download, Copy, Check, FileText, Database } from 'lucide-react';

export const DataExportView: React.FC = () => {
  const { exportAllDataText, downloadExportedData, canExport } = useValueList();
  const [format, setFormat] = useState<'json' | 'csv' | 'summary'>('json');
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  if (!canExport) {
    return (
      <div className="p-6 text-center text-neutral-400 text-xs">
        Analyst or Admin permissions required to access database export tools.
      </div>
    );
  }

  const handleCopy = () => {
    const text = exportAllDataText(format);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const res = downloadExportedData(format);
    if (res.success) {
      setStatusMessage(`Downloaded ${res.filename}`);
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  return (
    <div className="space-y-4 max-w-xl">
      <div>
        <h3 className="font-bold text-base text-neutral-900 dark:text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-orange-500" />
          <span>Catalog & Database Export</span>
        </h3>
        <p className="text-xs text-neutral-500">
          Export full MTS catalog, star multipliers, audit logs, and reports in structured formats.
        </p>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs rounded-xl">
          {statusMessage}
        </div>
      )}

      <div className="flex gap-2">
        {(['json', 'csv', 'summary'] as const).map(fmt => (
          <button
            key={fmt}
            onClick={() => setFormat(fmt)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-colors ${
              format === fmt
                ? 'bg-orange-500 text-white shadow-xs'
                : 'bg-neutral-100 dark:bg-[#21262d] text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-[#30363d]'
            }`}
          >
            {fmt}
          </button>
        ))}
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Download {format.toUpperCase()} File</span>
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-4 py-2 bg-neutral-100 dark:bg-[#21262d] hover:bg-neutral-200 dark:hover:bg-[#30363d] text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-neutral-200 dark:border-[#30363d]"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Copied to Clipboard' : 'Copy Text'}</span>
        </button>
      </div>
    </div>
  );
};
