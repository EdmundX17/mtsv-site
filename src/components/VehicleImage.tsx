import React, { useState, useEffect, useRef } from 'react';
import { ItemCategory } from '../types';
import { Plane, Shield, Anchor, Crosshair, Radio, HelpCircle, Image as ImageIcon, Tag } from 'lucide-react';
import { getSafeImageUrl } from '../utils/imageOptimizer';
import { INITIAL_ITEMS } from '../data/initialItems';
import { getVehicleImageUrl } from '../data/vehicleImageMap';

interface VehicleImageProps {
  src?: string;
  alt: string;
  className?: string;
  category?: ItemCategory | string;
  fallbackUrl?: string;
  priority?: boolean;
  itemId?: string;
}

const CANONICAL_THUMB_MAP = new Map<string, string>();
INITIAL_ITEMS.forEach(item => {
  if (item.thumbnail && item.thumbnail.trim()) {
    CANONICAL_THUMB_MAP.set(item.id, item.thumbnail);
    CANONICAL_THUMB_MAP.set(item.name.toLowerCase().trim(), item.thumbnail);
  }
});

export function getCanonicalItemThumbnail(id?: string, name?: string): string {
  // First, check if there's a modern vehicle image render in vehicleImageMap!
  const modernImg = getVehicleImageUrl(name) || getVehicleImageUrl(id);
  if (modernImg) {
    return modernImg;
  }
  if (id && CANONICAL_THUMB_MAP.has(id)) {
    return CANONICAL_THUMB_MAP.get(id) || '';
  }
  if (name && CANONICAL_THUMB_MAP.has(name.toLowerCase().trim())) {
    return CANONICAL_THUMB_MAP.get(name.toLowerCase().trim()) || '';
  }
  return '';
}

const CATEGORY_FALLBACK_ICONS: Record<string, React.ReactNode> = {
  Air: <Plane className="w-12 h-12 text-blue-400 opacity-80" />,
  Land: <Shield className="w-12 h-12 text-emerald-400 opacity-80" />,
  Naval: <Anchor className="w-12 h-12 text-cyan-400 opacity-80" />,
  Sea: <Anchor className="w-12 h-12 text-cyan-400 opacity-80" />,
  Soldier: <Crosshair className="w-12 h-12 text-amber-400 opacity-80" />,
  Drone: <Radio className="w-12 h-12 text-purple-400 opacity-80" />,
  Tags: <Tag className="w-12 h-12 text-pink-400 opacity-80" />,
  Other: <HelpCircle className="w-12 h-12 text-neutral-400 opacity-80" />,
};

export const VehicleImage = React.memo<VehicleImageProps>(({
  src,
  alt,
  className = 'w-full h-full object-contain',
  category = 'Other',
  fallbackUrl,
  priority = false,
  itemId
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [triedProxy, setTriedProxy] = useState(false);
  const [triedCanonical, setTriedCanonical] = useState(false);
  const [triedFallback, setTriedFallback] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Check if a modern, crisp vehicle render is available
  const modernVehicleImg = getVehicleImageUrl(alt) || getVehicleImageUrl(itemId);
  const isOldRobloxImage = !src || src.includes('tr.rbxcdn.com') || src.includes('roblox.com/Thumbs') || src.includes('images.unsplash.com');
  const targetSrc = (modernVehicleImg && isOldRobloxImage) ? modernVehicleImg : (src || modernVehicleImg);

  // Compute safe URL with Discord/expiring link protection
  const safeSrc = getSafeImageUrl(targetSrc);
  const canonicalThumbnail = getCanonicalItemThumbnail(itemId, alt);

  // Reset states when source prop changes
  useEffect(() => {
    setHasError(false);
    setTriedProxy(false);
    setTriedCanonical(false);
    setTriedFallback(false);

    // If image is already complete in browser cache upon mount / prop change
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    } else {
      setIsLoaded(false);
    }
  }, [src, safeSrc]);

  // If no source provided, try canonical or modern vehicle image immediately
  const isInvalidSrc = !safeSrc || safeSrc.trim() === '';

  const handleImageError = () => {
    // 1. If we haven't tried the server-side image proxy yet and it's a remote http URL
    if (!triedProxy && src && (src.startsWith('http://') || src.startsWith('https://')) && !safeSrc.startsWith('/api/proxy-image')) {
      setTriedProxy(true);
      return;
    }

    // 2. If modern vehicle image is available and hasn't been tried yet
    if (modernVehicleImg && activeSrc !== modernVehicleImg) {
      setTriedCanonical(true);
      return;
    }

    // 3. If primary image failed, fall back to canonical catalog thumbnail
    if (!triedCanonical && canonicalThumbnail && canonicalThumbnail !== safeSrc && canonicalThumbnail !== src) {
      setTriedCanonical(true);
      return;
    }

    // 4. If explicit custom fallbackUrl is provided and not generic placeholder
    if (fallbackUrl && !triedFallback && !fallbackUrl.includes('images.unsplash.com')) {
      setTriedFallback(true);
      return;
    }

    setHasError(true);
  };

  // Determine current image source to attempt
  let activeSrc = safeSrc;
  if (isInvalidSrc && modernVehicleImg) {
    activeSrc = modernVehicleImg;
  } else if (isInvalidSrc && canonicalThumbnail) {
    activeSrc = canonicalThumbnail;
  } else if (triedProxy && src) {
    activeSrc = `/api/proxy-image?url=${encodeURIComponent(src)}`;
  } else if (triedCanonical && modernVehicleImg) {
    activeSrc = modernVehicleImg;
  } else if (triedCanonical && canonicalThumbnail) {
    activeSrc = canonicalThumbnail;
  } else if (triedFallback && fallbackUrl) {
    activeSrc = fallbackUrl;
  }

  if ((isInvalidSrc && !canonicalThumbnail) || hasError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900/60 p-4 text-center select-none">
        <div className="p-3 rounded-2xl bg-neutral-800/80 border border-neutral-700/60 shadow-inner mb-2 flex items-center justify-center">
          {CATEGORY_FALLBACK_ICONS[category] || <ImageIcon className="w-10 h-10 text-neutral-400 opacity-80" />}
        </div>
        <span className="text-xs font-mono font-bold text-neutral-400 tracking-wider truncate max-w-[90%]">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={activeSrc}
      alt={alt}
      className={className}
      onError={handleImageError}
      onLoad={() => setIsLoaded(true)}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
    />
  );
});
