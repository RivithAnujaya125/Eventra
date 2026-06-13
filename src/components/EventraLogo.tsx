import React from "react";

interface EventraLogoProps {
  className?: string;
  showText?: boolean;
}

export default function EventraLogo({ className = "h-10", showText = true }: EventraLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Brand Icon Badge */}
      <div className="relative flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-white to-zinc-600 p-[1.5px] shadow-[0_0_20px_rgba(255,255,255,0.15)]">
        <div className="w-full h-full bg-black rounded-[11px] flex items-center justify-center">
          <svg
            viewBox="0 0 100 100"
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Monogram E with cinematic strokes */}
            <path d="M80 20 H25 V80 H80" />
            <path d="M25 50 H65" />
          </svg>
        </div>
      </div>
      {/* Text Wordmark */}
      {showText && (
        <span className="font-sans font-bold tracking-[0.25em] text-white text-lg uppercase select-none">
          Eventra
        </span>
      )}
    </div>
  );
}
