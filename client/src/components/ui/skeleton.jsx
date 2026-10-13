import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-white/[0.04] border border-white/[0.04] animate-pulse rounded-xl", className)}
      {...props}
    />
  );
}

export { Skeleton };
