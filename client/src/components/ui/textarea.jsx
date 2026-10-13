import { useDialogComposition } from "@/components/ui/dialog";
import { useComposition } from "@/hooks/useComposition";
import { cn } from "@/lib/utils";
import * as React from "react";
function Textarea({ className, onKeyDown, onCompositionStart, onCompositionEnd, ...props }) {
    // Get dialog composition context if available (will be no-op if not inside Dialog)
    const dialogComposition = useDialogComposition();
    // Add composition event handlers to support input method editor (IME) for CJK languages.
    const { onCompositionStart: handleCompositionStart, onCompositionEnd: handleCompositionEnd, onKeyDown: handleKeyDown, } = useComposition({
        onKeyDown: (e) => {
            // Check if this is an Enter key that should be blocked
            const isComposing = e.nativeEvent.isComposing || dialogComposition.justEndedComposing();
            // If Enter key is pressed while composing or just after composition ended,
            // don't call the user's onKeyDown (this blocks the business logic)
            // Note: For textarea, Shift+Enter should still work for newlines
            if (e.key === "Enter" && !e.shiftKey && isComposing) {
                return;
            }
            // Otherwise, call the user's onKeyDown
            onKeyDown?.(e);
        },
        onCompositionStart: e => {
            dialogComposition.setComposing(true);
            onCompositionStart?.(e);
        },
        onCompositionEnd: e => {
            // Mark that composition just ended - this helps handle the Enter key that confirms input
            dialogComposition.markCompositionEnd();
            // Delay setting composing to false to handle Safari's event order
            // In Safari, compositionEnd fires before the ESC keydown event
            setTimeout(() => {
                dialogComposition.setComposing(false);
            }, 100);
            onCompositionEnd?.(e);
        },
    });
    return (<textarea data-slot="textarea" className={cn("placeholder:text-slate-500 bg-[#0B0F19] border border-white/[0.08] text-white focus-visible:border-sky-500/40 focus-visible:ring-1 focus-visible:ring-sky-500/50 aria-invalid:ring-rose-500/30 aria-invalid:border-rose-500 flex field-sizing-content min-h-20 w-full rounded-xl px-3.5 py-2.5 text-sm shadow-xs transition-colors duration-180 outline-none disabled:cursor-not-allowed disabled:opacity-40", className)} onCompositionStart={handleCompositionStart} onCompositionEnd={handleCompositionEnd} onKeyDown={handleKeyDown} {...props}/>);
}
export { Textarea };
