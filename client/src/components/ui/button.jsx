import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-xs font-medium transition-colors duration-200 ease-out disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3.5 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-1 focus-visible:ring-sky-400 focus-visible:border-white/20 select-none",
  {
    variants: {
      variant: {
        default:
          "rounded-full bg-white text-[#030712] hover:bg-slate-100 shadow-xs font-medium active:scale-[0.98]",
        pill:
          "rounded-full bg-white text-[#030712] hover:bg-slate-100 shadow-xs font-medium active:scale-[0.98]",
        cta:
          "rounded-full bg-white text-[#030712] hover:bg-slate-100 pl-4 pr-2 py-1.5 gap-2.5 font-medium shadow-xs active:scale-[0.98]",
        destructive:
          "rounded-full bg-rose-600 text-white hover:bg-rose-500 active:scale-[0.98]",
        outline:
          "rounded-full border border-white/[0.08] bg-transparent text-white hover:bg-white/[0.04] hover:border-white/[0.14] active:scale-[0.98]",
        secondary:
          "rounded-full border border-white/[0.08] bg-[#0B0F19] text-white hover:bg-[#111827] active:scale-[0.98]",
        ghost:
          "rounded-full text-slate-400 hover:text-white hover:bg-white/[0.04]",
        link: "text-sky-400 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8.5 px-3.5 py-1.5 has-[>svg]:px-3",
        sm: "h-7.5 px-3 text-[11px] gap-1.5 has-[>svg]:px-2.5",
        lg: "h-10 px-5 text-sm has-[>svg]:px-4",
        icon: "size-8.5 rounded-full",
        "icon-sm": "size-7.5 rounded-full",
        "icon-lg": "size-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
