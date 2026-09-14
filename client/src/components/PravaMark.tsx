import { cn } from "@/lib/utils";

export function PravaLogoIcon({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const iconSizes = {
    sm: "size-7 rounded-lg",
    md: "size-8 rounded-xl",
    lg: "size-10 rounded-2xl",
  };

  return (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden shrink-0 shadow-md transition-transform duration-300 hover:scale-105",
        iconSizes[size],
        className
      )}
      style={{
        background: "linear-gradient(135deg, #163a34 0%, #0d2521 100%)",
        border: "1px solid rgba(215, 233, 183, 0.25)",
        boxShadow: "0 2px 10px rgba(22, 58, 52, 0.35)",
      }}
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-4/5"
      >
        {/* Diamond/V-Polygon Emblem from Favicon */}
        <path
          d="M17 19h30L32 46 17 19Zm7 5 8 14 8-14H24Z"
          fill="#d7e9b7"
        />
        {/* Warm Golden/Bronze Accent Bar */}
        <path
          d="M25 42h14"
          stroke="#b77a43"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function PravaMark({
  className,
  inverse = false,
  size = "md",
  showText = true,
}: {
  className?: string;
  inverse?: boolean;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}) {
  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
  };

  return (
    <div
      className={cn("inline-flex items-center gap-2 select-none", className)}
      aria-label="Prava Operating System"
    >
      <PravaLogoIcon size={size} />
      {showText && (
        <div className="flex items-baseline gap-1 leading-none">
          <span
            className={cn(
              "font-['Playfair_Display',Georgia,serif] font-bold tracking-tight",
              textSizes[size],
              inverse ? "text-white" : "text-slate-900 dark:text-white"
            )}
          >
            Prava
          </span>
          <span className="text-[8px] font-mono font-bold tracking-widest text-emerald-500/90 uppercase">
            OS
          </span>
        </div>
      )}
    </div>
  );
}

export default PravaMark;
