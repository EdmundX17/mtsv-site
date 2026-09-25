import React from 'react';

export const MTS_LOGO_URL = "https://images-ext-1.discordapp.net/external/yPL_I5G9oZ9bCtvAslVAMWtQxgnXgb5Ltx5DweoSPSM/%3Fsize%3D4096/https/cdn.discordapp.com/icons/1293033073239265351/a_532208718377648f4f8d5e7598becae5.gif";

interface MTSLogoProps {
  className?: string;
  size?: number;
  alt?: string;
}

export const MTSLogo: React.FC<MTSLogoProps> = ({
  className = "w-8 h-8",
  size,
  alt = "Military Tycoon Services Logo"
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <img
      src={MTS_LOGO_URL}
      alt={alt}
      referrerPolicy="no-referrer"
      className={`shrink-0 select-none object-contain rounded-full ${className}`}
      style={style}
    />
  );
};

