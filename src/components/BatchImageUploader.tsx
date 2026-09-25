import React, { useState } from 'react';
import { useValueList } from '../context/ValueListContext';
import { optimizeImage } from '../utils/imageOptimizer';
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react';

export const BatchImageUploader: React.FC = () => {
  const { items, updateItem } = useValueList();
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id || '');
  const [imageUrl, setImageUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleApplyUrl = async () => {
    if (!selectedItemId || !imageUrl.trim()) return;
    setIsProcessing(true);
    setStatus(null);
    try {
      await updateItem({ id: selectedItemId, thumbnail: imageUrl.trim() }, 'Batch thumbnail URL update');
      setStatus({ type: 'success', message: 'Thumbnail updated successfully!' });
      setImageUrl('');
    } catch (e: any) {
      setStatus({ type: 'error', message: e?.message || 'Failed to update thumbnail.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedItemId) return;

    setIsProcessing(true);
    setStatus(null);
    try {
      const optimized = await optimizeImage(file, { maxWidth: 600, maxHeight: 600, quality: 0.85 });
      await updateItem({ id: selectedItemId, thumbnail: optimized }, 'Batch thumbnail image upload');
      setStatus({ type: 'success', message: `Image compressed and uploaded for selected item!` });
    } catch (err: any) {
      setStatus({ type: 'error', message: err?.message || 'Failed to optimize image.' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4 max-w-xl">
      <div>
        <h3 className="font-bold text-base text-neutral-900 dark:text-white">Batch Image Manager</h3>
        <p className="text-xs text-neutral-500">Upload or link optimized images directly to military catalog items.</p>
      </div>

      {status && (
        <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
          status.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500'
            : 'bg-rose-500/10 border border-rose-500/30 text-rose-500'
        }`}>
          {status.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{status.message}</span>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
            Target Item
          </label>
          <select
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-[#0d1117] border border-neutral-300 dark:border-[#30363d] text-neutral-900 dark:text-white text-xs"
          >
            {items.map(item => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.category}) {item.thumbnail ? '✓ Has Image' : '⚠ Missing'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
            Option A: Direct Image URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://... or /images/..."
              className="grow px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-[#0d1117] border border-neutral-300 dark:border-[#30363d] text-neutral-900 dark:text-white text-xs font-mono"
            />
            <button
              onClick={handleApplyUrl}
              disabled={isProcessing || !imageUrl.trim()}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </div>

        <div className="pt-2">
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
            Option B: Upload Local File (Auto-Compressed)
          </label>
          <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-neutral-300 dark:border-[#30363d] rounded-2xl cursor-pointer hover:border-orange-500 transition-colors">
            <Upload className="w-6 h-6 text-neutral-400 mb-1" />
            <span className="text-xs text-neutral-500 font-medium">Click to select PNG or WEBP image</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
