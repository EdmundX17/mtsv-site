import React, { useState, useEffect } from 'react';
import { getVehicleImageUrl } from '../data/vehicleImageMap';

interface VehicleImageProps {
  src?: string;
  alt?: string;
  itemId?: string;
  category?: string;
  className?: string;
}

export const VehicleImage: React.FC<VehicleImageProps> = ({
  src,
  alt = 'Military Item',
  category,
  className = 'w-full h-full object-cover object-center'
}) => {
  const [errorState, setErrorState] = useState(0);

  useEffect(() => {
    setErrorState(0);
  }, [src, alt]);

  const mapUrl = alt ? getVehicleImageUrl(alt, category) : '';

  let effectiveSrc = src;
  if (errorState === 1 && mapUrl && mapUrl !== src) {
    effectiveSrc = mapUrl;
  } else if (errorState >= 2 || (!src && !mapUrl)) {
    effectiveSrc = '/mtsanimated.gif';
  } else if (!src && mapUrl) {
    effectiveSrc = mapUrl;
  }

  return (
    <img
      src={effectiveSrc || '/mtsanimated.gif'}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => {
        setErrorState(prev => prev + 1);
      }}
    />
  );
};
