// ─── Spring Presets ───────────────────────────────────────────────────────────
export const spring = {
  snappy: { type: "spring", stiffness: 500, damping: 30, mass: 0.8 },
  smooth: { type: "spring", stiffness: 320, damping: 28, mass: 1 },
  bouncy: { type: "spring", stiffness: 420, damping: 20, mass: 0.9 },
  playful: { type: "spring", stiffness: 520, damping: 22, mass: 0.7 },
  gentle: { type: "spring", stiffness: 180, damping: 24, mass: 1 },
  slow: { type: "spring", stiffness: 80, damping: 20, mass: 1.2 },
};

// ─── Hardware-Accelerated Fade + Slide Variants (Zero Blur Jank) ───────────────
export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: spring.smooth,
  },
};

export const fadeDown = {
  hidden: { opacity: 0, y: -12 },
  visible: { opacity: 1, y: 0, transition: spring.smooth },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25, ease: "easeOut" } },
};

export const slideInLeft = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: spring.snappy },
};

export const slideInRight = {
  hidden: { opacity: 0, x: 16 },
  visible: { opacity: 1, x: 0, transition: spring.snappy },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: spring.bouncy },
};

export const popIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: spring.playful },
};

// ─── Fun & Buttery Page Transition (Snappy 60/120 FPS, No Blur Delay) ─────────
export const pageVariants = {
  initial: { opacity: 0, y: 10, scale: 0.99 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 380,
      damping: 28,
      mass: 0.8,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.995,
    transition: { duration: 0.12, ease: "easeIn" },
  },
};

// ─── Fun Switch & Tab Switch Variants ─────────────────────────────────────────
export const funTabContentVariants = {
  initial: { opacity: 0, y: 8, scale: 0.99 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 420, damping: 26, mass: 0.8 },
  },
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.99,
    transition: { duration: 0.12, ease: "easeOut" },
  },
};

// ─── Container (Stagger) ──────────────────────────────────────────────────────
export const staggerContainer = (staggerChildren = 0.05, delayChildren = 0.02) => ({
  hidden: {},
  visible: {
    transition: { staggerChildren, delayChildren },
  },
});

export const listContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};

export const listItem = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: spring.snappy },
};

// ─── Card 3D Tilt (mouse tracking) ───────────────────────────────────────────
export function get3dTiltStyle(e, intensity = 8) {
  const rect = e.currentTarget.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = (e.clientX - cx) / (rect.width / 2);
  const dy = (e.clientY - cy) / (rect.height / 2);
  return {
    transform: `perspective(800px) rotateY(${dx * intensity}deg) rotateX(${-dy * intensity}deg) scale3d(1.02, 1.02, 1.02)`,
  };
}

export const flatTiltStyle = {
  transform: "perspective(800px) rotateY(0deg) rotateX(0deg) scale3d(1,1,1)",
};

// ─── Shimmer (loading) ────────────────────────────────────────────────────────
export const shimmerVariants = {
  initial: { backgroundPosition: "-400px 0" },
  animate: {
    backgroundPosition: "400px 0",
    transition: { repeat: Infinity, duration: 1.5, ease: "linear" },
  },
};

// ─── Viewport defaults ────────────────────────────────────────────────────────
export const viewportOnce = { once: true, margin: "-40px" };
