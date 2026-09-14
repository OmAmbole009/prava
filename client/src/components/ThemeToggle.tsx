import { useTheme } from "@/contexts/ThemeContext";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sparkles, Sun } from "lucide-react";

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.04 }}
      transition={{ type: "spring", stiffness: 450, damping: 22 }}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={`group relative inline-flex h-8 items-center gap-1.5 overflow-hidden rounded-full border border-slate-300/80 bg-white/80 px-3 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-md transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-white/15 dark:bg-white/[0.08] dark:text-slate-200 dark:hover:bg-white/15 dark:hover:text-white ${className || ""}`}
    >
      {/* Animated Icon with 360 spin */}
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div
            key="dark-icon"
            initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex items-center gap-1.5"
          >
            <Moon className="size-3.5 text-sky-300 drop-shadow-[0_0_6px_rgba(56,189,248,0.6)]" />
            <span className="text-[11px] font-mono tracking-wide">Dark</span>
          </motion.div>
        ) : (
          <motion.div
            key="light-icon"
            initial={{ rotate: 90, scale: 0.5, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: -90, scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="flex items-center gap-1.5"
          >
            <Sun className="size-3.5 text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
            <span className="text-[11px] font-mono tracking-wide">Light</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sparkle Burst indicator */}
      <span className="pointer-events-none absolute -right-1 -top-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Sparkles className="size-2.5 text-amber-400 dark:text-sky-300 animate-spin" style={{ animationDuration: "4s" }} />
      </span>
    </motion.button>
  );
}
