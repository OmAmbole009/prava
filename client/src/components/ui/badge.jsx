import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none transition-colors duration-180 overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-white/[0.08] bg-[#0B0F19] text-white",
        secondary:
          "border-white/[0.06] bg-[#0E1424] text-slate-400",
        destructive:
          "border-rose-500/30 bg-rose-500/10 text-rose-400",
        outline:
          "border-white/[0.08] bg-transparent text-slate-400",
        eyebrow:
          "border-white/[0.08] bg-[#0B0F19] text-slate-400 lowercase tracking-normal pl-2 pr-2.5",
        success:
          "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
        warning:
          "border-amber-500/25 bg-amber-500/10 text-amber-400",
        danger:
          "border-rose-500/25 bg-rose-500/10 text-rose-400",
        info:
          "border-sky-500/25 bg-sky-500/10 text-sky-400",
        accent:
          "border-sky-500/30 bg-sky-500/15 text-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.15)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
