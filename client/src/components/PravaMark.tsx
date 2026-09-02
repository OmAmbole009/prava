import { cn } from "@/lib/utils";

export function PravaMark({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)} aria-label="Prava">
      <span
        className={cn(
          "relative grid size-8 place-items-center overflow-hidden rounded-[10px] border",
          inverse
            ? "border-[#efe7d5]/30 bg-[#efe7d5] text-[#112a27]"
            : "border-[#0f2724]/15 bg-[#0f2724] text-[#f9f4e9]"
        )}
      >
        <span className="absolute top-[10px] h-px w-4 bg-current" />
        <span className="absolute left-[7px] top-[14px] size-2 -rotate-45 border-b border-l border-current" />
        <span className="absolute right-[7px] top-[14px] size-2 rotate-[135deg] border-b border-l border-current" />
        <span className="absolute bottom-[8px] h-px w-2.5 bg-current" />
      </span>
      <span className={cn("font-[700] tracking-[-0.065em]", inverse ? "text-[#f8f1e4]" : "text-[#0f2724]")}>Prava</span>
    </div>
  );
}
