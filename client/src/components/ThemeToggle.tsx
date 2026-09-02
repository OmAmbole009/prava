import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="group relative inline-flex h-9 items-center gap-1.5 rounded-full border border-[#d8ceb9] bg-[#fffdf8] px-3 text-xs font-semibold text-[#315b4c] transition hover:border-[#b77a43] hover:bg-[#f7f3e9] dark:border-[#41685a] dark:bg-[#1d453c] dark:text-[#cfe4ad] dark:hover:bg-[#275246]"
    >
      {isDark ? (
        <>
          <Moon className="size-4 text-[#d5bd90] transition-transform duration-300 group-hover:rotate-12" />
          <span className="hidden sm:inline">Dark</span>
        </>
      ) : (
        <>
          <Sun className="size-4 text-[#b77a43] transition-transform duration-300 group-hover:rotate-45" />
          <span className="hidden sm:inline">Light</span>
        </>
      )}
    </button>
  );
}
