import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  onClick?: () => void;
  glare?: boolean;
}

export function TiltCard({
  children,
  className = "",
  intensity = 8,
  onClick,
  glare = true,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setTilt({ x: -dy * intensity, y: dx * intensity });
    setGlarePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  };

  return (
    <motion.div
      ref={ref}
      className={cn("relative overflow-hidden", className)}
      onClick={onClick}
      style={{ transformStyle: "preserve-3d", perspective: 800 }}
      animate={{
        rotateX: tilt.x,
        rotateY: tilt.y,
        scale: isHovered ? 1.025 : 1,
        boxShadow: isHovered
          ? "0 20px 60px -10px rgba(0,0,0,0.3), 0 8px 24px -4px rgba(0,0,0,0.2)"
          : "0 4px 16px -4px rgba(0,0,0,0.1)",
      }}
      transition={{ type: "spring", stiffness: 400, damping: 25, mass: 0.8 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {/* Glare overlay */}
      {glare && isHovered && (
        <div
          className="pointer-events-none absolute inset-0 rounded-inherit opacity-20"
          style={{
            background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.6) 0%, transparent 60%)`,
            transition: "background 50ms",
          }}
        />
      )}
    </motion.div>
  );
}
