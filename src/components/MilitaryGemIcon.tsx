import React from 'react';

interface MilitaryGemIconProps {
  className?: string;
  size?: number;
}

/**
 * Authentic Military Tycoon Faceted Cyan Diamond Gem Icon
 * Scalable SVG with high-contrast cyan/sky-blue facets, inner highlights, and sparkle.
 */
export const MilitaryGemIcon: React.FC<MilitaryGemIconProps> = ({
  className = 'w-4 h-4',
  size
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 align-middle ${className}`}
      style={style}
    >
      <defs>
        {/* Main Gem Body Gradient */}
        <linearGradient id="mtGemMain" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="35%" stopColor="#38bdf8" />
          <stop offset="70%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>

        {/* Top Table / Crown Highlight */}
        <linearGradient id="mtGemTable" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.8" />
        </linearGradient>

        {/* Side Facet Shadow */}
        <linearGradient id="mtGemShadow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0369a1" />
          <stop offset="100%" stopColor="#075985" />
        </linearGradient>

        {/* Bright Sparkle Gradient */}
        <radialGradient id="mtGemGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="50%" stopColor="#7dd3fc" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Outer Cyan Glow Filter Background */}
      <polygon
        points="16,2 29,11 16,30 3,11"
        fill="#0284c7"
        opacity="0.3"
      />

      {/* Gem Pavilion Bottom Left */}
      <polygon
        points="3,11 16,30 16,11"
        fill="url(#mtGemShadow)"
      />

      {/* Gem Pavilion Bottom Center-Right */}
      <polygon
        points="16,30 29,11 16,11"
        fill="url(#mtGemMain)"
      />

      {/* Pavilion Facet Accents (Left triangle) */}
      <polygon
        points="3,11 10,11 16,30"
        fill="#0284c7"
        opacity="0.85"
      />

      {/* Pavilion Facet Accents (Right triangle) */}
      <polygon
        points="22,11 29,11 16,30"
        fill="#38bdf8"
        opacity="0.9"
      />

      {/* Pavilion Center facet reflection */}
      <polygon
        points="10,11 22,11 16,30"
        fill="#0ea5e9"
      />

      {/* Crown Center Table (Top flat surface) */}
      <polygon
        points="10,3 22,3 25,11 7,11"
        fill="url(#mtGemTable)"
      />

      {/* Crown Top-Left Facet */}
      <polygon
        points="3,11 7,11 10,3 8,3"
        fill="#e0f2fe"
      />

      {/* Crown Top-Right Facet */}
      <polygon
        points="22,3 24,3 29,11 25,11"
        fill="#7dd3fc"
      />

      {/* Crown Top-Center Left Triangle */}
      <polygon
        points="10,3 16,2 22,3 16,7"
        fill="#ffffff"
        opacity="0.9"
      />

      {/* Crown Upper Trapeze Left */}
      <polygon
        points="7,11 10,3 16,7 10,11"
        fill="#bae6fd"
        opacity="0.9"
      />

      {/* Crown Upper Trapeze Right */}
      <polygon
        points="25,11 22,3 16,7 22,11"
        fill="#38bdf8"
        opacity="0.8"
      />

      {/* Crisp Facet Outline Strokes */}
      <polygon
        points="16,2 29,11 16,30 3,11"
        stroke="#0c4a6e"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <line x1="3" y1="11" x2="29" y2="11" stroke="#0284c7" strokeWidth="1" />
      <line x1="10" y1="3" x2="7" y2="11" stroke="#38bdf8" strokeWidth="0.8" />
      <line x1="22" y1="3" x2="25" y2="11" stroke="#0284c7" strokeWidth="0.8" />
      <line x1="16" y1="2" x2="16" y2="30" stroke="#0284c7" strokeWidth="0.7" opacity="0.6" />

      {/* Top Left Sparkle / Glint Star */}
      <circle cx="11" cy="7" r="1.5" fill="#ffffff" />
      <polygon points="11,3.5 12,7 11,10.5 10,7" fill="#ffffff" opacity="0.85" />
      <polygon points="7.5,7 11,8 14.5,7 11,6" fill="#ffffff" opacity="0.85" />
    </svg>
  );
};
