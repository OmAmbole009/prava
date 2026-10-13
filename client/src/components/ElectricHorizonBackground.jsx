import React from "react";

/**
 * ElectricHorizonBackground
 *
 * Exact BrandGenie Dark SaaS Geometric Horizon Semicircle Dome:
 * - Deep space obsidian background (#030712)
 * - Radiant electric blue & celestial cyan glowing dome arch
 * - Multi-layer atmosphere glow bloom (sapphire to electric cyan to white-hot zenith)
 * - Faint stardust motes in deep space corners
 * - Seamless fade-out into page canvas
 */
export function ElectricHorizonBackground({ variant = "hero", className = "" }) {
  if (variant === "header") {
    return (
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 overflow-hidden ${className}`}
        aria-hidden="true"
        style={{ height: "340px", zIndex: 0 }}
      >
        {/* Celestial blue ambient glow */}
        <div
          className="absolute left-1/2 -top-[140px] h-[340px] w-[90%] max-w-[1200px] -translate-x-1/2 rounded-[50%]"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(37, 99, 235, 0.22) 0%, rgba(56, 189, 248, 0.12) 40%, transparent 75%)",
            filter: "blur(50px)",
          }}
        />

        {/* Faint semicircle dome hairline */}
        <svg
          className="absolute left-1/2 top-0 h-[240px] w-[90%] max-w-[1000px] -translate-x-1/2"
          viewBox="0 0 1000 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 100 230 A 400 210 0 0 1 900 230"
            stroke="url(#headerBloomGrad)"
            strokeWidth="8"
            strokeLinecap="round"
            filter="url(#headerBlur)"
          />
          <path
            d="M 100 230 A 400 210 0 0 1 900 230"
            stroke="url(#headerHairlineGrad)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <defs>
            <filter id="headerBlur" x="-20%" y="-40%" width="140%" height="180%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
            <linearGradient id="headerBloomGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(37, 99, 235, 0)" />
              <stop offset="30%" stopColor="rgba(37, 99, 235, 0.25)" />
              <stop offset="50%" stopColor="rgba(56, 189, 248, 0.55)" />
              <stop offset="70%" stopColor="rgba(37, 99, 235, 0.25)" />
              <stop offset="100%" stopColor="rgba(37, 99, 235, 0)" />
            </linearGradient>
            <linearGradient id="headerHairlineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(56, 189, 248, 0)" />
              <stop offset="35%" stopColor="rgba(56, 189, 248, 0.3)" />
              <stop offset="50%" stopColor="rgba(255, 255, 255, 0.85)" />
              <stop offset="65%" stopColor="rgba(56, 189, 248, 0.3)" />
              <stop offset="100%" stopColor="rgba(56, 189, 248, 0)" />
            </linearGradient>
          </defs>
        </svg>

        <div
          className="absolute inset-x-0 bottom-0 h-28"
          style={{
            background: "linear-gradient(to bottom, transparent 0%, #030712 100%)",
          }}
        />
      </div>
    );
  }

  // Hero variant: Signature Grand Semicircle Arch from Reference Image
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 top-0 overflow-hidden ${className}`}
      aria-hidden="true"
      style={{ height: "680px", zIndex: 0 }}
    >
      {/* 1. Deep Celestial Stardust Speckles in upper corners */}
      <div
        className="absolute inset-0 opacity-55"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 15% 15%, rgba(255,255,255,0.85) 1px, transparent 0), " +
            "radial-gradient(1.5px 1.5px at 28% 22%, rgba(56,189,248,0.95) 1px, transparent 0), " +
            "radial-gradient(1px 1px at 78% 14%, rgba(255,255,255,0.75) 1px, transparent 0), " +
            "radial-gradient(1.5px 1.5px at 85% 25%, rgba(56,189,248,0.85) 1px, transparent 0), " +
            "radial-gradient(1px 1px at 92% 10%, rgba(255,255,255,0.9) 1px, transparent 0), " +
            "radial-gradient(1px 1px at 7% 32%, rgba(255,255,255,0.65) 1px, transparent 0), " +
            "radial-gradient(1.2px 1.2px at 42% 12%, rgba(147,197,253,0.7) 1px, transparent 0), " +
            "radial-gradient(1.2px 1.2px at 62% 16%, rgba(147,197,253,0.7) 1px, transparent 0)",
          backgroundSize: "100% 100%",
        }}
      />

      {/* 2. Atmospheric Volumetric Light Beams (Angled God Rays from Reference) */}
      <div
        className="absolute inset-0 opacity-25 mix-blend-screen"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.25) 0%, transparent 50%), " +
            "linear-gradient(115deg, transparent 35%, rgba(56, 189, 248, 0.12) 48%, transparent 52%), " +
            "linear-gradient(65deg, transparent 48%, rgba(37, 99, 235, 0.15) 52%, transparent 65%)",
        }}
      />

      {/* 3. Majestic atmospheric cone of light shining down from the dome apex */}
      <div
        className="absolute left-1/2 -top-[140px] h-[520px] w-[94%] max-w-[1360px] -translate-x-1/2 rounded-[50%]"
        style={{
          background:
            "radial-gradient(ellipse 75% 55% at 50% 45%, rgba(37, 99, 235, 0.35) 0%, rgba(56, 189, 248, 0.22) 30%, rgba(14, 165, 233, 0.08) 55%, transparent 75%)",
          filter: "blur(60px)",
        }}
      />

      {/* 4. Intense focal bloom directly behind the apex of the arch */}
      <div
        className="absolute left-1/2 top-[0px] h-[180px] w-[50%] max-w-[600px] -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.45) 0%, rgba(56, 189, 248, 0.45) 28%, rgba(37, 99, 235, 0.25) 60%, transparent 80%)",
          filter: "blur(32px)",
        }}
      />

      {/* 5. The Grand Geometric Semicircle Dome Arch */}
      <svg
        className="absolute left-1/2 top-0 h-[480px] w-[98%] max-w-[1280px] -translate-x-1/2"
        viewBox="0 0 1200 440"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          maskImage: "linear-gradient(to bottom, black 0%, black 80%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 80%, transparent 100%)",
        }}
      >
        {/* Soft volumetric gradient fill under the dome */}
        <path
          d="M 80 430 A 520 370 0 0 1 1120 430 Z"
          fill="url(#brandgenieDomeFill)"
        />

        {/* Outer wide atmospheric glow aura */}
        <path
          d="M 80 430 A 520 370 0 0 1 1120 430"
          stroke="url(#brandgenieWideGlow)"
          strokeWidth="32"
          strokeLinecap="round"
          filter="url(#brandgenieWideBlur)"
        />

        {/* Inner vivid electric blue bloom */}
        <path
          d="M 80 430 A 520 370 0 0 1 1120 430"
          stroke="url(#brandgenieMidGlow)"
          strokeWidth="12"
          strokeLinecap="round"
          filter="url(#brandgenieMidBlur)"
        />

        {/* Razor-sharp glowing electric rim (Pure white-hot at zenith, cyan along flanks) */}
        <path
          d="M 80 430 A 520 370 0 0 1 1120 430"
          stroke="url(#brandgenieCoreRim)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        <defs>
          {/* Subtle dark sapphire dome body fill */}
          <radialGradient id="brandgenieDomeFill" cx="50%" cy="10%" r="65%">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.12" />
            <stop offset="35%" stopColor="#0B132B" stopOpacity="0.06" />
            <stop offset="85%" stopColor="#030712" stopOpacity="0" />
          </radialGradient>

          {/* Wide atmospheric blur filter */}
          <filter id="brandgenieWideBlur" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="18" />
          </filter>

          {/* Mid electric blur filter */}
          <filter id="brandgenieMidBlur" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="6" />
          </filter>

          {/* Wide gradient stroke */}
          <linearGradient id="brandgenieWideGlow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(37, 99, 235, 0)" />
            <stop offset="25%" stopColor="rgba(37, 99, 235, 0.2)" />
            <stop offset="40%" stopColor="rgba(56, 189, 248, 0.45)" />
            <stop offset="50%" stopColor="rgba(147, 197, 253, 0.65)" />
            <stop offset="60%" stopColor="rgba(56, 189, 248, 0.45)" />
            <stop offset="75%" stopColor="rgba(37, 99, 235, 0.2)" />
            <stop offset="100%" stopColor="rgba(37, 99, 235, 0)" />
          </linearGradient>

          {/* Mid electric cyan gradient */}
          <linearGradient id="brandgenieMidGlow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(37, 99, 235, 0)" />
            <stop offset="20%" stopColor="rgba(37, 99, 235, 0.3)" />
            <stop offset="38%" stopColor="rgba(56, 189, 248, 0.7)" />
            <stop offset="50%" stopColor="rgba(255, 255, 255, 0.95)" />
            <stop offset="62%" stopColor="rgba(56, 189, 248, 0.7)" />
            <stop offset="80%" stopColor="rgba(37, 99, 235, 0.3)" />
            <stop offset="100%" stopColor="rgba(37, 99, 235, 0)" />
          </linearGradient>

          {/* Core hairline rim: vibrant cyan fading to white-hot peak */}
          <linearGradient id="brandgenieCoreRim" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(37, 99, 235, 0)" />
            <stop offset="18%" stopColor="rgba(37, 99, 235, 0.4)" />
            <stop offset="32%" stopColor="rgba(56, 189, 248, 0.85)" />
            <stop offset="45%" stopColor="rgba(255, 255, 255, 0.95)" />
            <stop offset="50%" stopColor="#FFFFFF" />
            <stop offset="55%" stopColor="rgba(255, 255, 255, 0.95)" />
            <stop offset="68%" stopColor="rgba(56, 189, 248, 0.85)" />
            <stop offset="82%" stopColor="rgba(37, 99, 235, 0.4)" />
            <stop offset="100%" stopColor="rgba(37, 99, 235, 0)" />
          </linearGradient>
        </defs>
      </svg>

      {/* 5. Smooth bottom fade into deep obsidian page canvas */}
      <div
        className="absolute inset-x-0 bottom-0 h-36"
        style={{
          background: "linear-gradient(to bottom, transparent 0%, #030712 100%)",
        }}
      />
    </div>
  );
}

export default ElectricHorizonBackground;
