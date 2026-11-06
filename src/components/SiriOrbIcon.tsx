"use client";

import React from "react";

interface SiriOrbIconProps {
  active?: boolean;
  speaking?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Authentic iPhone Siri Orb Icon with multi-layer fluid wave petals,
 * intersecting 3D luminous ribbons, and smooth counter-rotating animations when active.
 */
export const SiriOrbIcon: React.FC<SiriOrbIconProps> = ({
  active = false,
  speaking = false,
  size = "md",
  className = "",
}) => {
  const sizeClasses =
    size === "sm"
      ? "h-6 w-6"
      : size === "lg"
      ? "h-10 w-10"
      : "h-8 w-8";

  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-full select-none shrink-0 ${sizeClasses} ${className}`}
    >
      {/* Outer Iridescent Siri Glow Ring when Live Voice Chat is Active */}
      {active && (
        <span
          className="absolute -inset-1 rounded-full opacity-90 blur-[3px] siri-spin-cw pointer-events-none"
          style={{
            background:
              "conic-gradient(from 0deg, #00f2fe, #4facfe, #ff0844, #c471ed, #00f5d4, #00f2fe)",
          }}
        />
      )}

      {/* Main Spherical Obsidian Glass Container */}
      <span
        className={`relative h-full w-full rounded-full overflow-hidden flex items-center justify-center transition-transform duration-300 ${
          speaking ? "scale-110" : active ? "scale-105" : "scale-100"
        }`}
        style={{
          background:
            "radial-gradient(circle at 50% 50%, #101738 0%, #070b1e 70%, #030511 100%)",
        }}
      >
        {/* Fluid Layer 1: Cyan / Electric Blue Lobe (Clockwise Rotation) */}
        <span
          className={`absolute -inset-1.5 rounded-full mix-blend-screen opacity-90 ${
            active ? "siri-spin-cw" : ""
          }`}
          style={{
            background:
              "conic-gradient(from 20deg at 42% 45%, transparent 0deg, #00f2fe 75deg, #0072ff 150deg, transparent 240deg, #00f5d4 320deg, transparent 360deg)",
            filter: "blur(2.5px)",
          }}
        />

        {/* Fluid Layer 2: Magenta / Crimson / Rose Lobe (Counter-Clockwise Rotation) */}
        <span
          className={`absolute -inset-1.5 rounded-full mix-blend-screen opacity-90 ${
            active ? "siri-spin-ccw" : ""
          }`}
          style={{
            background:
              "conic-gradient(from 140deg at 58% 54%, transparent 0deg, #ff0866 80deg, #ff5e9c 145deg, #9d4edd 230deg, transparent 310deg)",
            filter: "blur(2.5px)",
          }}
        />

        {/* Fluid Layer 3: Violet / Indigo / Aqua Morphing Petal */}
        <span
          className={`absolute -inset-1 rounded-full mix-blend-screen opacity-85 ${
            active ? "siri-wave-morph" : ""
          }`}
          style={{
            background:
              "radial-gradient(ellipse at 35% 65%, rgba(0, 245, 212, 0.9) 0%, rgba(114, 9, 183, 0.75) 48%, transparent 75%)",
            filter: "blur(1.5px)",
          }}
        />

        {/* Intersecting 3D Siri SVG Fluid Ribbons */}
        <svg
          viewBox="0 0 100 100"
          className={`relative z-10 h-full w-full opacity-95 ${
            active ? "siri-spin-cw" : ""
          }`}
        >
          <defs>
            <linearGradient id="siriCyanWave" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f5ff" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#3a86ff" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#00f5d4" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="siriPinkWave" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ff0a78" stopOpacity="0.95" />
              <stop offset="55%" stopColor="#ff5ca8" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#8338ec" stopOpacity="0.25" />
            </linearGradient>
            <linearGradient id="siriVioletWave" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7209b7" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#4cc9f0" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#f72585" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Ribbon 1: Cyan-Blue 3D Wave */}
          <path
            d="M 10,52 C 26,18 74,22 90,52 C 74,84 26,78 10,52 Z"
            fill="url(#siriCyanWave)"
            style={{ mixBlendMode: "screen" }}
          />

          {/* Ribbon 2: Pink-Magenta Tilted 3D Wave */}
          <path
            d="M 22,22 C 58,12 88,44 78,78 C 42,88 12,56 22,22 Z"
            fill="url(#siriPinkWave)"
            style={{ mixBlendMode: "screen" }}
          />

          {/* Ribbon 3: Violet-Aqua Cross Wave */}
          <path
            d="M 20,76 C 14,40 46,14 80,24 C 86,60 54,86 20,76 Z"
            fill="url(#siriVioletWave)"
            style={{ mixBlendMode: "screen" }}
          />
        </svg>

        {/* Luminous Pearl White Center Core */}
        <span
          className={`absolute h-[42%] w-[42%] rounded-full pointer-events-none z-20 ${
            active ? "siri-core-pulse" : ""
          }`}
          style={{
            background:
              "radial-gradient(circle, #ffffff 0%, rgba(185, 251, 255, 0.88) 42%, rgba(255, 110, 199, 0.35) 75%, transparent 100%)",
            filter: "blur(1px)",
          }}
        />

        {/* Top Glass Specular Rim Highlight (iPhone Orb Lens Reflection) */}
        <span
          className="absolute inset-0 rounded-full pointer-events-none z-30"
          style={{
            background:
              "radial-gradient(circle at 32% 24%, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.14) 26%, transparent 56%)",
            boxShadow: "inset 0 0 4px rgba(255, 255, 255, 0.45)",
          }}
        />
      </span>
    </span>
  );
};
