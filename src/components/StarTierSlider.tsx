import React, { useState, useEffect, useRef } from 'react';
import { Star } from 'lucide-react';

export interface StarTierOptionItem {
  id: string;
  label: string;
  shortLabel: string;
  starsCount?: number;
}

export interface StarTierSliderProps {
  tiers: StarTierOptionItem[];
  currentTierId: string;
  onSelectTier: (tierId: string) => void;
  titleLabel: string;
  size?: 'sm' | 'md';
  getTierHeaderLabel?: (tier: StarTierOptionItem, isDragging: boolean) => React.ReactNode;
  formatValueTooltip?: (tierId: string) => string | undefined;
}

export const StarTierSlider: React.FC<StarTierSliderProps> = ({
  tiers,
  currentTierId,
  onSelectTier,
  titleLabel,
  size = 'sm',
  getTierHeaderLabel,
  formatValueTooltip,
}) => {
  const maxIndex = Math.max(0, tiers.length - 1);
  const targetIndex = Math.max(0, tiers.findIndex((t) => t.id === currentTierId));

  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState<number>(targetIndex);
  const dragValueRef = useRef(dragValue);
  dragValueRef.current = dragValue;
  const isDraggingRef = useRef(isDragging);
  isDraggingRef.current = isDragging;

  const trackRef = useRef<HTMLDivElement>(null);

  // Keep in sync with active tier prop when not actively dragging
  useEffect(() => {
    if (!isDragging) {
      setDragValue(targetIndex);
    }
  }, [targetIndex, isDragging]);

  const updateFromPointer = (clientX: number) => {
    if (!trackRef.current || maxIndex === 0) return;
    const rect = trackRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const val = ratio * maxIndex;
    setDragValue(val);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (e.button !== 0) return; // Only primary button/touch

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if setPointerCapture is unsupported in environment
    }

    setIsDragging(true);
    updateFromPointer(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    e.stopPropagation();
    updateFromPointer(e.clientX);
  };

  const handleRelease = (e?: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    if (e) {
      e.stopPropagation();
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore
      }
    }

    const current = dragValueRef.current;
    const closestIdx = Math.max(0, Math.min(maxIndex, Math.round(current)));
    setIsDragging(false);
    setDragValue(closestIdx);

    if (tiers[closestIdx] && tiers[closestIdx].id !== currentTierId) {
      onSelectTier(tiers[closestIdx].id);
    }
  };

  // Global window release fallback in case cursor leaves frame without pointer capture
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalRelease = () => {
      if (isDraggingRef.current) {
        const current = dragValueRef.current;
        const closestIdx = Math.max(0, Math.min(maxIndex, Math.round(current)));
        setIsDragging(false);
        setDragValue(closestIdx);

        if (tiers[closestIdx] && tiers[closestIdx].id !== currentTierId) {
          onSelectTier(tiers[closestIdx].id);
        }
      }
    };

    window.addEventListener('pointerup', handleGlobalRelease);
    window.addEventListener('pointercancel', handleGlobalRelease);
    window.addEventListener('touchend', handleGlobalRelease);
    window.addEventListener('mouseup', handleGlobalRelease);

    return () => {
      window.removeEventListener('pointerup', handleGlobalRelease);
      window.removeEventListener('pointercancel', handleGlobalRelease);
      window.removeEventListener('touchend', handleGlobalRelease);
      window.removeEventListener('mouseup', handleGlobalRelease);
    };
  }, [isDragging, maxIndex, currentTierId, tiers, onSelectTier]);

  // Keyboard navigation (Arrow keys, Home, End)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIdx = Math.min(maxIndex, targetIndex + 1);
      setDragValue(nextIdx);
      onSelectTier(tiers[nextIdx].id);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      const prevIdx = Math.max(0, targetIndex - 1);
      setDragValue(prevIdx);
      onSelectTier(tiers[prevIdx].id);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setDragValue(0);
      onSelectTier(tiers[0].id);
    } else if (e.key === 'End') {
      e.preventDefault();
      setDragValue(maxIndex);
      onSelectTier(tiers[maxIndex].id);
    }
  };

  const handleLabelClick = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(false);
    setDragValue(idx);
    if (tiers[idx] && tiers[idx].id !== currentTierId) {
      onSelectTier(tiers[idx].id);
    }
  };

  // Visual calculation
  const progressPercent = maxIndex > 0 ? Math.max(0, Math.min(100, (dragValue / maxIndex) * 100)) : 0;
  const activeIndex = Math.max(0, Math.min(maxIndex, Math.round(dragValue)));
  const activeTier = tiers[activeIndex] || tiers[0];

  // While dragging: 0ms delay for ultra-smooth instantaneous tracking
  // When released: smooth cubic-bezier easing to simulate snapping into notch
  const transitionStyle: React.CSSProperties = isDragging
    ? { transition: 'none' }
    : { transition: 'all 220ms cubic-bezier(0.16, 1, 0.3, 1)' };

  const isFresh = activeTier.id === 'fresh';

  return (
    <div className="w-full select-none" onClick={(e) => e.stopPropagation()}>
      {/* Header with Title and Dynamic Active Tier Display */}
      <div
        className={`flex items-center justify-between font-mono ${
          size === 'md' ? 'text-xs sm:text-sm' : 'text-[10px] sm:text-[11px]'
        }`}
      >
        <span
          className={`font-bold flex items-center gap-1.5 ${
            size === 'md'
              ? 'text-neutral-500 dark:text-neutral-400 uppercase tracking-wider'
              : 'text-neutral-500 dark:text-neutral-400'
          }`}
        >
          <Star className={`${size === 'md' ? 'w-4 h-4' : 'w-3 h-3'} text-amber-400 fill-amber-400`} />
          <span>{titleLabel}:</span>
        </span>
        <span
          className={`font-black ${
            isFresh ? 'text-amber-400' : 'text-amber-500 dark:text-amber-400'
          }`}
        >
          {getTierHeaderLabel ? getTierHeaderLabel(activeTier, isDragging) : activeTier.label}
        </span>
      </div>

      {/* Slider Area with horizontal inset padding to keep outer notch labels flush inside card */}
      <div className="relative pt-2 pb-0.5 px-3.5 sm:px-4">
        {/* Interactive Track Area: handles smooth drag & release with pointer capture */}
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handleRelease}
          onPointerCancel={handleRelease}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={maxIndex}
          aria-valuenow={targetIndex}
          aria-label={titleLabel}
          className={`relative w-full rounded-full flex items-center cursor-pointer touch-none select-none outline-hidden ${
            size === 'md' ? 'h-2.5' : 'h-2'
          }`}
        >
          {/* Background Track Line */}
          <div className="absolute inset-0 rounded-full bg-neutral-200/90 dark:bg-[#21262d]" />

          {/* Smooth Highlighted Progress Fill */}
          <div
            className="absolute left-0 top-0 bottom-0 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.45)]"
            style={{
              width: `${progressPercent}%`,
              ...transitionStyle,
            }}
          />

          {/* Discrete Notch Points */}
          {tiers.map((tier, idx) => {
            const notchPercent = maxIndex > 0 ? (idx / maxIndex) * 100 : 0;
            const isPassed = idx <= activeIndex;
            const isClosest = idx === activeIndex;

            return (
              <div
                key={tier.id}
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full z-10 pointer-events-none transition-all ${
                  size === 'md' ? 'w-2 h-2' : 'w-1.5 h-1.5'
                } ${
                  isPassed
                    ? 'bg-amber-100 dark:bg-neutral-900 border border-amber-400/50'
                    : 'bg-neutral-300 dark:bg-[#30363d]'
                } ${isClosest && isDragging ? 'scale-150 ring-2 ring-amber-400' : ''}`}
                style={{ left: `${notchPercent}%` }}
              />
            );
          })}

          {/* Smooth Dragging Thumb Handle with spring snapping animation */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-white dark:bg-[#161b22] border-2 border-amber-500 flex items-center justify-center z-20 pointer-events-none ${
              size === 'md' ? 'w-5 h-5' : 'w-4 h-4'
            } ${
              isDragging
                ? 'scale-125 shadow-lg shadow-amber-500/40 ring-4 ring-amber-400/40'
                : 'scale-100 shadow-md shadow-amber-500/30 ring-2 ring-amber-400/30'
            }`}
            style={{
              left: `${progressPercent}%`,
              ...transitionStyle,
            }}
          >
            <div
              className={`rounded-full bg-amber-500 ${
                size === 'md' ? 'w-2 h-2' : 'w-1.5 h-1.5'
              }`}
            />
          </div>
        </div>

        {/* Labels Row: identical coordinates (0% to 100%) so every label aligns right underneath its notch */}
        <div className={`relative w-full ${size === 'md' ? 'h-6 mt-1.5' : 'h-5 mt-1'}`}>
          {tiers.map((tier, idx) => {
            const notchPercent = maxIndex > 0 ? (idx / maxIndex) * 100 : 0;
            const isSelected = (!isDragging && tier.id === currentTierId) || (isDragging && idx === activeIndex);
            const isTierFresh = tier.id === 'fresh';
            const tooltip = formatValueTooltip ? formatValueTooltip(tier.id) : tier.label;

            return (
              <button
                key={tier.id}
                type="button"
                onClick={(e) => handleLabelClick(idx, e)}
                className={`absolute top-0 -translate-x-1/2 font-mono transition-all cursor-pointer px-1 py-0.5 rounded-sm select-none whitespace-nowrap flex items-center justify-center ${
                  size === 'md' ? 'text-xs sm:text-sm' : 'text-[9px] sm:text-[10px]'
                } ${
                  isSelected
                    ? 'text-amber-500 dark:text-amber-400 font-black scale-105'
                    : `hover:text-neutral-900 dark:hover:text-white ${
                        isTierFresh
                          ? 'text-amber-400/90 font-bold'
                          : 'text-neutral-500 dark:text-neutral-400'
                      }`
                }`}
                style={{ left: `${notchPercent}%` }}
                title={tooltip}
              >
                {tier.shortLabel}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
