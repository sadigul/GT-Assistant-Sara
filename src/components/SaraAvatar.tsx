"use client";

import React, { useState } from "react";

interface SaraAvatarProps {
  size?: "sm" | "md" | "lg" | "xl";
  showStatus?: boolean;
  className?: string;
}

export const SaraAvatar: React.FC<SaraAvatarProps> = ({
  size = "md",
  className = ""
}) => {
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    sm: "h-8 w-8 p-1 rounded-full text-[10px]",
    md: "h-9 w-9 p-1 rounded-full text-xs",
    lg: "h-12 w-12 p-1.5 rounded-full text-sm",
    xl: "h-16 w-16 p-2 rounded-full text-base"
  };

  return (
    <div className={`relative shrink-0 select-none ${className}`}>
      <div
        className={`${sizeClasses[size]} relative overflow-hidden rounded-full bg-white dark:bg-slate-900 ring-1 ring-slate-900/[0.08] dark:ring-white/[0.12] shadow-2xs flex items-center justify-center`}
      >
        {!hasError ? (
          <img
            src="/logo.png"
            alt="GoldTouch"
            className="h-full w-full object-contain object-center rounded-full"
            onError={() => setHasError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-900 font-bold text-white">
            GT
          </div>
        )}
      </div>
    </div>
  );
};
