import React from 'react';

interface MilitaryGemIconProps {
  className?: string;
}

export const MilitaryGemIcon: React.FC<MilitaryGemIconProps> = ({ className = 'w-4 h-4' }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-cyan-400 inline-block shrink-0 ${className}`}
    >
      <polygon points="6 3 18 3 22 9 12 22 2 9" fill="currentColor" fillOpacity="0.25" />
      <polygon points="6 3 18 3 22 9 12 22 2 9" />
      <line x1="12" y1="22" x2="12" y2="9" />
      <line x1="2" y1="9" x2="22" y2="9" />
      <line x1="6" y1="3" x2="10" y2="9" />
      <line x1="18" y1="3" x2="14" y2="9" />
    </svg>
  );
};
