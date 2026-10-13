import React from "react";

/**
 * ElectricCard
 * Reproduces the dark, subtly illuminated card treatment from the reference screenshot:
 * - Near-black surface (#07090E / #080B11)
 * - Soft electric-blue gradient lighting near upper edges
 * - Fine subtle gray border with a luminous top edge highlight
 * - Soft dark shadow and restrained hover transitions
 */
export function ElectricCard({
  children,
  className = "",
  glow = true,
  onClick,
  as: Component = "div",
  ...props
}) {
  return (
    <Component
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border border-slate-700/30 bg-[#07090E] p-6 text-[#F5F7FA] shadow-[0_16px_40px_-10px_rgba(0,0,0,0.85)] transition-all duration-300 hover:border-slate-600/40 hover:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.95),0_0_30px_rgba(59,130,246,0.12)] ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
      {...props}
    >
      {/* Upper edge electric-blue diffused light (from reference screenshot) */}
      {glow && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-90 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(ellipse 90% 60% at 50% -10%, rgba(59, 130, 246, 0.18) 0%, rgba(37, 99, 235, 0.06) 50%, transparent 85%)",
          }}
          aria-hidden="true"
        />
      )}

      {/* Thin luminous top rim highlight */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-blue-300/35 to-transparent transition-opacity duration-300 group-hover:via-blue-300/60"
        aria-hidden="true"
      />

      {/* Content wrapper with proper z-index */}
      <div className="relative z-10">{children}</div>
    </Component>
  );
}

/**
 * ElectricPillButton
 * Pill-shaped action button directly matching reference controls:
 * e.g. "Generate AI Logos ->" or "Try it for free ->"
 */
export function ElectricPillButton({
  children,
  variant = "white", // "white" | "dark" | "outline"
  icon: Icon,
  className = "",
  onClick,
  type = "button",
  ...props
}) {
  const base =
    "inline-flex items-center justify-between gap-3 rounded-full px-5 py-2 text-xs font-semibold tracking-wide transition-all duration-200 active:scale-[0.98]";

  const variants = {
    white:
      "bg-white text-slate-950 hover:bg-slate-100 hover:shadow-[0_0_25px_rgba(255,255,255,0.35)] shadow-md",
    dark:
      "bg-[#090D15] text-white border border-slate-700/40 hover:border-blue-400/50 hover:bg-[#0E131F] hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] shadow-lg",
    outline:
      "bg-transparent text-slate-300 border border-slate-700/50 hover:border-slate-500 hover:text-white hover:bg-white/[0.04]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${base} ${variants[variant] || variants.white} ${className}`}
      {...props}
    >
      <span>{children}</span>
      {Icon ? (
        <span
          className={`grid size-5 place-items-center rounded-full ${
            variant === "white"
              ? "bg-slate-950 text-white"
              : "bg-white/10 text-white group-hover:bg-blue-500/20"
          }`}
        >
          <Icon className="size-3" />
        </span>
      ) : (
        <span
          className={`grid size-5 place-items-center rounded-full ${
            variant === "white"
              ? "bg-slate-950 text-white"
              : "bg-white/15 text-white"
          }`}
        >
          <svg
            className="size-2.5"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M 2 5 L 8 5" />
            <path d="M 5 2 L 8 5 L 5 8" />
          </svg>
        </span>
      )}
    </button>
  );
}

export default ElectricCard;
