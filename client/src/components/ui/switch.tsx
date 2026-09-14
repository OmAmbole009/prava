import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "group peer relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent p-0.5",
        "transition-[background-color,box-shadow,transform] duration-300 ease-out",
        "data-[state=unchecked]:bg-slate-300/80 dark:data-[state=unchecked]:bg-white/[0.14]",
        "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-sky-500 data-[state=checked]:via-indigo-500 data-[state=checked]:to-cyan-500",
        "data-[state=checked]:shadow-[0_0_14px_rgba(56,189,248,0.45)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "active:scale-95 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {/* Dynamic Background Track Particle/Glow */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-data-[state=checked]:opacity-100 group-data-[state=checked]:animate-pulse"
        style={{
          background:
            "radial-gradient(circle at 75% 50%, rgba(255,255,255,0.3) 0%, transparent 70%)",
        }}
      />

      {/* Spring-elastic tactile thumb */}
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none relative flex size-5 items-center justify-center rounded-full bg-white text-slate-900 shadow-[0_2px_6px_rgba(0,0,0,0.3),0_0_1px_rgba(0,0,0,0.2)]",
          "transition-[transform,width] duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]",
          "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
          "group-active:w-6 group-data-[state=checked]:group-active:translate-x-4",
          "dark:bg-slate-100"
        )}
      >
        {/* Playful micro-indicator inside thumb */}
        <span
          className={cn(
            "size-1.5 rounded-full transition-all duration-300",
            "group-data-[state=unchecked]:bg-slate-400/60 group-data-[state=unchecked]:scale-75",
            "group-data-[state=checked]:bg-sky-600 group-data-[state=checked]:scale-100 group-data-[state=checked]:shadow-[0_0_6px_rgba(2,132,199,0.8)]"
          )}
        />
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  );
}

export { Switch };
