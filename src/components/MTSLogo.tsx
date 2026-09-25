import React from 'react';

interface MTSLogoProps {
  className?: string;
}

export const MTSLogo: React.FC<MTSLogoProps> = ({ className = 'w-8 h-8' }) => {
  return (
    <img
      src="/mtsanimated.gif"
      alt="Military Tycoon Services"
      className={`rounded-lg object-contain ${className}`}
      onError={(e) => {
        // Fallback if gif fails to render
        const target = e.currentTarget;
        target.style.display = 'none';
        if (target.parentElement) {
          const fallback = document.createElement('div');
          fallback.className = 'w-full h-full bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center font-bold text-white text-xs';
          fallback.textContent = 'MTS';
          target.parentElement.appendChild(fallback);
        }
      }}
    />
  );
};
