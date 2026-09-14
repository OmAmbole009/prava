/**
 * AnimatedPage.tsx
 * Drop-in wrappers to add entrance animations to any existing page section.
 * Import these and wrap page headings, grids, tables, etc.
 */
import { motion } from "framer-motion";
import { fadeUp, fadeDown, staggerContainer, listItem, viewportOnce, pageVariants, scaleIn } from "@/lib/animations";

// ─── Page Wrapper ─────────────────────────────────────────────────────────────
// Wrap the top-level page <div> with this to get a smooth entrance
export function AnimatedPage({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={staggerContainer(0.06)}
    >
      {children}
    </motion.div>
  );
}

// ─── Section Heading ──────────────────────────────────────────────────────────
// Wrap any <h1>/<h2> block — fades up on viewport enter
export function AnimatedSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

// ─── Grid Container ───────────────────────────────────────────────────────────
// Stagger-animates children (cards, tiles) on viewport enter
export function AnimatedGrid({ children, className = "", stagger = 0.07 }: { children: React.ReactNode; className?: string; stagger?: number }) {
  return (
    <motion.div
      className={className}
      variants={staggerContainer(stagger)}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
    >
      {children}
    </motion.div>
  );
}

// ─── Grid Item ────────────────────────────────────────────────────────────────
export function AnimatedItem({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={fadeUp}>
      {children}
    </motion.div>
  );
}

// ─── List Row (slides from left) ──────────────────────────────────────────────
export function AnimatedRow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={listItem}
      whileHover={{ x: 4, transition: { type: "spring", stiffness: 500, damping: 30 } }}
    >
      {children}
    </motion.div>
  );
}

// ─── List Container ───────────────────────────────────────────────────────────
export function AnimatedList({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={staggerContainer(0.06)}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
    >
      {children}
    </motion.div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
export function AnimatedStatCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={scaleIn}
      whileHover={{ scale: 1.03, transition: { type: "spring", stiffness: 400, damping: 22 } }}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.div>
  );
}

// ─── Fade In from below on scroll ────────────────────────────────────────────
export function FadeInView({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ type: "spring", stiffness: 320, damping: 28, delay }}
    >
      {children}
    </motion.div>
  );
}
