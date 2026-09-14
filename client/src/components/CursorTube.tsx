/**
 * SpaceSkyBackground.tsx (CursorTube.tsx)
 * 
 * Theme-aware 60fps Canvas System:
 * - NO FOREGROUND CURSOR TUBE (Clean, natural cursor experience)
 * - DARK MODE: Deep Space Cosmos
 *   - Twinkling multi-magnitude stellar field
 *   - Celestial ringed planet with atmospheric crescent glow
 *   - Cosmic wave of light (ethereal solar wind / starlight ribbon) undulating across the cosmos
 *   - Subtle gravitational lensing ripple where the mouse moves
 * - LIGHT MODE: Sky & Earth Atmosphere
 *   - Radiant daylight sky with soft golden sun flare
 *   - Gentle drifting translucent cloud wisps
 *   - Sunlit iridescent sky-stream wave flowing through the atmosphere
 *   - Floating golden dust motes / pollen catching the daylight
 */
import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  r: number;
  baseAlpha: number;
  twinkleSpeed: number;
  phase: number;
  hue: number;
}

interface CloudWisp {
  x: number;
  y: number;
  rx: number;
  ry: number;
  speed: number;
  alpha: number;
}

interface ParticleMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  hue: number;
}

interface CometSpark {
  p: number;
  offset: number;
  speed: number;
  r: number;
  alpha: number;
  hue: number;
}

interface DistantShootingStar {
  x: number;
  y: number;
  startX: number;
  startY: number;
  len: number;
  angle: number;
  progress: number;
  speed: number;
  active: boolean;
  timer: number;
}

interface EarthCloud {
  angle: number;
  distRatio: number;
  rx: number;
  ry: number;
  rot: number;
  driftSpeed: number;
  alpha: number;
  type: number;
}

interface SandGrain {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  hue: number;
  wobbleSpeed: number;
}

export function CursorTube() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);

    let cachedGradients: Record<string, CanvasGradient> = {};

    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      cachedGradients = {};
    };
    window.addEventListener("resize", onResize, { passive: true });

    // ── Mouse & Interaction for Subtle Gravitational Ripple ───────────────────
    const mouse = {
      x: W * 0.5,
      y: H * 0.5,
      tx: W * 0.5,
      ty: H * 0.5,
      moved: false,
    };

    const onPointerMove = (e: PointerEvent) => {
      mouse.tx = e.clientX;
      mouse.ty = e.clientY;
      mouse.moved = true;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    // ── Stars for Space (Dark Mode) ───────────────────────────────────────────
    const NUM_STARS = 220;
    const stars: Star[] = Array.from({ length: NUM_STARS }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() < 0.88 ? 0.6 + Math.random() * 1.2 : 1.8 + Math.random() * 1.6,
      baseAlpha: 0.18 + Math.random() * 0.72,
      twinkleSpeed: 0.7 + Math.random() * 2.4,
      phase: Math.random() * Math.PI * 2,
      hue: Math.random() < 0.6 ? 205 : Math.random() < 0.5 ? 270 : 45, // electric blue/cyan, violet, gold
    }));

    // ── Earth Swirling Clouds (Dark Mode) ─────────────────────────────────────
    const NUM_EARTH_CLOUDS = 28;
    const earthClouds: EarthCloud[] = Array.from({ length: NUM_EARTH_CLOUDS }, (_, i) => ({
      angle: Math.PI * 1.08 + (i / NUM_EARTH_CLOUDS) * Math.PI * 0.84 + (Math.random() - 0.5) * 0.12,
      distRatio: 0.72 + Math.random() * 0.26,
      rx: 45 + Math.random() * 75,
      ry: 16 + Math.random() * 28,
      rot: (Math.random() - 0.5) * 0.6,
      driftSpeed: 0.008 + Math.random() * 0.018,
      alpha: 0.28 + Math.random() * 0.48,
      type: i % 3, // 0: cyclonic vortex, 1: curved band, 2: fluffy cluster
    }));

    // ── Clouds for Sky (Light Mode) ───────────────────────────────────────────
    const NUM_CLOUDS = 10;
    const clouds: CloudWisp[] = Array.from({ length: NUM_CLOUDS }, (_, i) => ({
      x: (i / NUM_CLOUDS) * W + Math.random() * 100,
      y: 60 + Math.random() * (H * 0.5),
      rx: 120 + Math.random() * 200,
      ry: 45 + Math.random() * 70,
      speed: 0.08 + Math.random() * 0.12,
      alpha: 0.08 + Math.random() * 0.12,
    }));

    // ── Floating Motes / Stardust ─────────────────────────────────────────────
    const NUM_MOTES = 35;
    const motes: ParticleMote[] = Array.from({ length: NUM_MOTES }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25 - 0.1,
      r: 1 + Math.random() * 2,
      alpha: 0.15 + Math.random() * 0.35,
      hue: Math.random() * 360,
    }));

    // ── Light Wave Nodes (Light Mode) ─────────────────────────────────────────
    const WAVE_POINTS = 32;
    const waveNodes = Array.from({ length: WAVE_POINTS }, (_, i) => ({
      x: (i / (WAVE_POINTS - 1)) * (W + 200) - 100,
      y: H * 0.44,
    }));

    // ── Flying Sand Grains & Desert Dust (Light Mode) ─────────────────────────
    const NUM_SAND = 75;
    const sandGrains: SandGrain[] = Array.from({ length: NUM_SAND }, () => ({
      x: Math.random() * W,
      y: H * 0.40 + Math.random() * (H * 0.60),
      vx: 3.5 + Math.random() * 5.5, // fast desert wind drift
      vy: (Math.random() - 0.5) * 0.75,
      r: 0.8 + Math.random() * 1.8,
      alpha: 0.25 + Math.random() * 0.65,
      hue: 28 + Math.random() * 22, // warm desert gold/amber
      wobbleSpeed: 2.2 + Math.random() * 4.2,
    }));

    // ── Asteroid Plasma Sparks (Dark Mode) ───────────────────────────────────
    const NUM_COMET_SPARKS = 45;
    const cometSparks: CometSpark[] = Array.from({ length: NUM_COMET_SPARKS }, () => ({
      p: Math.random(),
      offset: (Math.random() - 0.5) * 22,
      speed: 0.35 + Math.random() * 0.65,
      r: 0.8 + Math.random() * 2.0,
      alpha: 0.35 + Math.random() * 0.65,
      hue: Math.random() < 0.75 ? 205 : 275,
    }));

    // ── Distant Secondary Shooting Stars (as in user reference photo) ─────────
    const distantShootingStars: DistantShootingStar[] = [
      {
        x: W * 0.22,
        y: H * 0.26,
        startX: W * 0.22,
        startY: H * 0.26,
        len: 110,
        angle: -Math.PI * 0.16,
        progress: 0,
        speed: 0.6,
        active: true,
        timer: 1.0,
      },
      {
        x: W * 0.76,
        y: H * 0.52,
        startX: W * 0.76,
        startY: H * 0.52,
        len: 95,
        angle: -Math.PI * 0.18,
        progress: 0,
        speed: 0.7,
        active: true,
        timer: 3.2,
      },
    ];

    // ── Main Render Loop ──────────────────────────────────────────────────────
    let rafId: number;
    let t = 0;
    let lastTime = 0;

    const render = (time: number) => {
      rafId = requestAnimationFrame(render);
      if (typeof document !== "undefined" && document.hidden) return;
      if (time - lastTime < 14) return; // Cap at ~60-70 FPS to save GPU/CPU cycles
      lastTime = time;
      t = time * 0.001;

      // Detect dark vs light mode dynamically
      const isDark = document.documentElement.classList.contains("dark");

      // Smooth mouse lerp
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      ctx.clearRect(0, 0, W, H);

      // ─────────────────────────────────────────────────────────────────────────
      // DARK MODE: Cosmic Space, Stars, Celestial Planet, Ethereal Light Ribbon
      // ─────────────────────────────────────────────────────────────────────────
      if (isDark) {
        // 0. Planet Geometry (Earth at bottom horizon)
        const earthR = Math.max(W * 0.58, 640);
        const earthCenterX = W * 0.5;
        const earthTopY = H - 190;
        const earthCenterY = earthTopY + earthR;

        // 1. Deep Cosmic Space Base & Vast Celestial Radiance (Cached)
        let spaceBase = cachedGradients.spaceBase;
        if (!spaceBase) {
          spaceBase = ctx.createLinearGradient(0, 0, 0, H);
          spaceBase.addColorStop(0, "#030611");
          spaceBase.addColorStop(0.45, "#050b1d");
          spaceBase.addColorStop(0.85, "#030814");
          spaceBase.addColorStop(1, "#02040a");
          cachedGradients.spaceBase = spaceBase;
        }
        ctx.fillStyle = spaceBase;
        ctx.fillRect(0, 0, W, H);

        // Vast celestial blue space aura radiating upward from behind Earth (Cached)
        let spaceAura = cachedGradients.spaceAura;
        if (!spaceAura) {
          spaceAura = ctx.createRadialGradient(
            earthCenterX,
            earthTopY + 70,
            40,
            earthCenterX,
            earthTopY + 70,
            earthR * 1.35
          );
          spaceAura.addColorStop(0, "rgba(2, 132, 199, 0.32)"); // luminous celestial cyan/blue
          spaceAura.addColorStop(0.26, "rgba(14, 165, 233, 0.18)");
          spaceAura.addColorStop(0.55, "rgba(30, 58, 138, 0.08)");
          spaceAura.addColorStop(1, "rgba(0, 0, 0, 0)");
          cachedGradients.spaceAura = spaceAura;
        }
        ctx.fillStyle = spaceAura;
        spaceAura.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = spaceAura;
        ctx.fillRect(0, 0, W, H);

        // 2. Concentric Orbital Trajectory Rings (as in reference image)
        ctx.save();
        ctx.strokeStyle = "rgba(56, 189, 248, 0.13)";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 8]);
        const orbitRadii = [earthR * 1.08, earthR * 1.22, earthR * 1.38, earthR * 1.58, earthR * 1.82];
        for (let i = 0; i < orbitRadii.length; i++) {
          const oR = orbitRadii[i];
          ctx.beginPath();
          ctx.arc(earthCenterX, earthCenterY, oR, Math.PI * 1.10, Math.PI * 1.90);
          ctx.stroke();

          // Gliding telemetry beacons along the orbits
          const beaconAngle = Math.PI * 1.5 + Math.sin(t * (0.12 + i * 0.05) + i * 1.7) * 0.32;
          const bx = earthCenterX + Math.cos(beaconAngle) * oR;
          const by = earthCenterY + Math.sin(beaconAngle) * oR;
          if (by < H + 10 && by > 0 && bx > 0 && bx < W) {
            ctx.fillStyle = "rgba(186, 230, 253, 0.85)";
            ctx.beginPath();
            ctx.arc(bx, by, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();

        // 3. Cosmic Nebula Dust Clouds (Cached)
        let nebulaGrad1 = cachedGradients.nebulaGrad1;
        if (!nebulaGrad1) {
          nebulaGrad1 = ctx.createRadialGradient(W * 0.75, H * 0.22, 10, W * 0.75, H * 0.22, 450);
          nebulaGrad1.addColorStop(0, "rgba(88, 28, 135, 0.10)"); // deep purple
          nebulaGrad1.addColorStop(0.5, "rgba(14, 116, 144, 0.06)"); // cyan
          nebulaGrad1.addColorStop(1, "rgba(0, 0, 0, 0)");
          cachedGradients.nebulaGrad1 = nebulaGrad1;
        }
        ctx.fillStyle = nebulaGrad1;
        ctx.fillRect(0, 0, W, H);

        let nebulaGrad2 = cachedGradients.nebulaGrad2;
        if (!nebulaGrad2) {
          nebulaGrad2 = ctx.createRadialGradient(W * 0.18, H * 0.45, 10, W * 0.18, H * 0.45, 380);
          nebulaGrad2.addColorStop(0, "rgba(6, 78, 59, 0.07)"); // emerald cosmic dust
          nebulaGrad2.addColorStop(1, "rgba(0, 0, 0, 0)");
          cachedGradients.nebulaGrad2 = nebulaGrad2;
        }
        ctx.fillStyle = nebulaGrad2;
        ctx.fillRect(0, 0, W, H);

        // 4. Celestial Planet Saturn (Right upper horizon)
        const planetX = W * 0.84;
        const planetY = Math.min(220, H * 0.26);
        const planetR = Math.min(64, W * 0.055);

        ctx.save();
        // Saturn Atmospheric Glow Halo
        const planetAtmosphere = ctx.createRadialGradient(planetX, planetY, planetR * 0.8, planetX, planetY, planetR * 2.2);
        planetAtmosphere.addColorStop(0, "rgba(56, 189, 248, 0.22)"); // sky blue glow
        planetAtmosphere.addColorStop(0.5, "rgba(139, 92, 246, 0.10)"); // purple
        planetAtmosphere.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = planetAtmosphere;
        ctx.beginPath();
        ctx.arc(planetX, planetY, planetR * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Saturn Body with Crescent Shadow
        const planetBody = ctx.createRadialGradient(
          planetX - planetR * 0.35,
          planetY - planetR * 0.35,
          planetR * 0.1,
          planetX,
          planetY,
          planetR
        );
        planetBody.addColorStop(0, "rgba(224, 242, 254, 0.95)"); // ice highlight
        planetBody.addColorStop(0.35, "rgba(56, 189, 248, 0.75)"); // azure
        planetBody.addColorStop(0.7, "rgba(15, 23, 42, 0.9)"); // deep midnight shadow
        planetBody.addColorStop(1, "rgba(2, 6, 23, 0.98)");

        ctx.fillStyle = planetBody;
        ctx.beginPath();
        ctx.arc(planetX, planetY, planetR, 0, Math.PI * 2);
        ctx.fill();

        // Saturn Orbital Rings (Tilted ellipse)
        ctx.beginPath();
        ctx.ellipse(planetX, planetY, planetR * 2.3, planetR * 0.55, -Math.PI / 7, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(186, 230, 253, 0.30)";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(planetX, planetY, planetR * 2.5, planetR * 0.62, -Math.PI / 7, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(139, 92, 246, 0.18)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        // 5. Twinkling Stars
        ctx.save();
        for (const star of stars) {
          const twinkle = Math.sin(t * star.twinkleSpeed + star.phase) * 0.35 + 0.65;
          const alpha = star.baseAlpha * twinkle;
          ctx.fillStyle = `hsla(${star.hue}, 90%, 88%, ${alpha})`;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
          ctx.fill();

          // Diamond sparkle spikes for brighter stars
          if (star.r > 2.0) {
            ctx.strokeStyle = `hsla(${star.hue}, 100%, 95%, ${alpha * 0.6})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(star.x - star.r * 2.2, star.y);
            ctx.lineTo(star.x + star.r * 2.2, star.y);
            ctx.moveTo(star.x, star.y - star.r * 2.2);
            ctx.lineTo(star.x, star.y + star.r * 2.2);
            ctx.stroke();
          }
        }
        ctx.restore();

        // 6. Distant Secondary Shooting Stars (Subtle Comets in Background)
        ctx.save();
        for (const dStar of distantShootingStars) {
          dStar.timer -= 0.016;
          if (dStar.timer <= 0) {
            dStar.progress += dStar.speed * 0.02;
            if (dStar.progress > 1.4) {
              dStar.progress = 0;
              dStar.timer = 2.5 + Math.random() * 3.5;
              dStar.startX = (dStar.startX < W * 0.5 ? W * 0.15 : W * 0.70) + (Math.random() - 0.5) * 80;
              dStar.startY = (dStar.startY < H * 0.4 ? H * 0.22 : H * 0.48) + (Math.random() - 0.5) * 60;
            }
          }

          if (dStar.progress > 0 && dStar.progress <= 1.4) {
            const currentP = Math.min(dStar.progress, 1);
            const fade = dStar.progress < 0.3 ? dStar.progress / 0.3 : Math.max(0, 1 - (dStar.progress - 0.3) / 1.1);
            const curHeadX = dStar.startX - currentP * 140 * Math.cos(-dStar.angle);
            const curHeadY = dStar.startY + currentP * 140 * Math.sin(-dStar.angle);
            const curTailX = curHeadX + dStar.len * Math.cos(-dStar.angle);
            const curTailY = curHeadY - dStar.len * Math.sin(-dStar.angle);

            const dGrad = ctx.createLinearGradient(curHeadX, curHeadY, curTailX, curTailY);
            dGrad.addColorStop(0, `rgba(255, 255, 255, ${fade * 0.9})`);
            dGrad.addColorStop(0.2, `rgba(186, 230, 253, ${fade * 0.6})`);
            dGrad.addColorStop(1, "rgba(56, 189, 248, 0)");

            ctx.lineWidth = 1.8;
            ctx.strokeStyle = dGrad;
            ctx.beginPath();
            ctx.moveTo(curHeadX, curHeadY);
            ctx.lineTo(curTailX, curTailY);
            ctx.stroke();

            // Small glowing spark head
            ctx.fillStyle = `rgba(255, 255, 255, ${fade * 0.95})`;
            ctx.beginPath();
            ctx.arc(curHeadX, curHeadY, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();

        // 7. Majestic Earth / Ocean Planet Rising at Bottom Horizon
        ctx.save();
        // Earth Atmosphere Exosphere Corona (Outer glow)
        const earthAtmoGlow = ctx.createRadialGradient(
          earthCenterX,
          earthCenterY,
          earthR * 0.94,
          earthCenterX,
          earthCenterY,
          earthR * 1.14
        );
        earthAtmoGlow.addColorStop(0, "rgba(56, 189, 248, 0.50)");
        earthAtmoGlow.addColorStop(0.28, "rgba(14, 165, 233, 0.28)");
        earthAtmoGlow.addColorStop(0.65, "rgba(99, 102, 241, 0.12)");
        earthAtmoGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = earthAtmoGlow;
        ctx.beginPath();
        ctx.arc(earthCenterX, earthCenterY, earthR * 1.14, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Earth Spherical Body (Clipped)
        ctx.save();
        ctx.beginPath();
        ctx.arc(earthCenterX, earthCenterY, earthR, 0, Math.PI * 2);
        ctx.clip();

        // Ocean Sphere 3D Gradient (Lit from upper right angle)
        const sunX = earthCenterX + earthR * 0.35;
        const sunY = earthCenterY - earthR * 0.65;
        const oceanGrad = ctx.createRadialGradient(sunX, sunY, earthR * 0.05, earthCenterX, earthCenterY, earthR);
        oceanGrad.addColorStop(0, "rgba(56, 189, 248, 0.98)");
        oceanGrad.addColorStop(0.18, "rgba(14, 165, 233, 0.95)");
        oceanGrad.addColorStop(0.42, "rgba(2, 132, 199, 0.92)");
        oceanGrad.addColorStop(0.68, "rgba(3, 70, 140, 0.90)");
        oceanGrad.addColorStop(0.88, "rgba(2, 30, 75, 0.95)");
        oceanGrad.addColorStop(1, "rgba(1, 10, 30, 0.99)");
        ctx.fillStyle = oceanGrad;
        ctx.fillRect(earthCenterX - earthR, earthCenterY - earthR, earthR * 2, earthR * 2);

        // Continental Landmasses & Turquoise Coastal Shelves
        const drawContinent = (cx: number, cy: number, w: number, h: number, rot: number) => {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(rot);
          // Shallow turquoise coastal shelf
          ctx.fillStyle = "rgba(20, 184, 166, 0.38)";
          ctx.beginPath();
          ctx.ellipse(0, 0, w * 1.22, h * 1.25, 0, 0, Math.PI * 2);
          ctx.fill();
          // Inner landmass
          ctx.fillStyle = "rgba(15, 76, 129, 0.65)";
          ctx.beginPath();
          ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(13, 148, 136, 0.45)";
          ctx.beginPath();
          ctx.ellipse(w * 0.15, -h * 0.1, w * 0.6, h * 0.55, 0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        };

        drawContinent(earthCenterX - earthR * 0.25, earthCenterY - earthR * 0.88, earthR * 0.22, earthR * 0.12, -0.2);
        drawContinent(earthCenterX + earthR * 0.22, earthCenterY - earthR * 0.90, earthR * 0.26, earthR * 0.14, 0.25);
        drawContinent(earthCenterX - earthR * 0.02, earthCenterY - earthR * 0.78, earthR * 0.18, earthR * 0.09, 0.05);
        drawContinent(earthCenterX + earthR * 0.45, earthCenterY - earthR * 0.80, earthR * 0.14, earthR * 0.08, -0.3);
        drawContinent(earthCenterX - earthR * 0.48, earthCenterY - earthR * 0.76, earthR * 0.15, earthR * 0.07, 0.15);

        // Swirling Dynamic Atmospheric Clouds (Drifting smoothly across the globe)
        for (const c of earthClouds) {
          const curAngle = c.angle + t * c.driftSpeed;
          const curDist = earthR * c.distRatio;
          const cx = earthCenterX + Math.cos(curAngle) * curDist;
          const cy = earthCenterY + Math.sin(curAngle) * curDist;

          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(curAngle + Math.PI * 0.5 + c.rot + Math.sin(t * 0.4 + curAngle) * 0.15);

          if (c.type === 0) {
            // Cyclonic vortex swirl
            const swirlGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, c.rx);
            swirlGrad.addColorStop(0, `rgba(255, 255, 255, ${c.alpha * 0.95})`);
            swirlGrad.addColorStop(0.4, `rgba(224, 242, 254, ${c.alpha * 0.65})`);
            swirlGrad.addColorStop(1, "rgba(224, 242, 254, 0)");
            ctx.fillStyle = swirlGrad;
            ctx.beginPath();
            ctx.arc(0, 0, c.rx, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Elongated banded cloud wisp
            const wispGrad = ctx.createRadialGradient(0, 0, 3, 0, 0, c.rx);
            wispGrad.addColorStop(0, `rgba(255, 255, 255, ${c.alpha * 0.90})`);
            wispGrad.addColorStop(0.5, `rgba(186, 230, 253, ${c.alpha * 0.55})`);
            wispGrad.addColorStop(1, "rgba(186, 230, 253, 0)");
            ctx.fillStyle = wispGrad;
            ctx.beginPath();
            ctx.ellipse(0, 0, c.rx, c.ry, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        // Atmospheric Stratospheric Haze / Limb Darkening Overlay
        const innerHaze = ctx.createRadialGradient(
          earthCenterX,
          earthCenterY,
          earthR * 0.85,
          earthCenterX,
          earthCenterY,
          earthR
        );
        innerHaze.addColorStop(0, "rgba(56, 189, 248, 0)");
        innerHaze.addColorStop(0.7, "rgba(14, 165, 233, 0.20)");
        innerHaze.addColorStop(1, "rgba(224, 242, 254, 0.75)");
        ctx.fillStyle = innerHaze;
        ctx.fillRect(earthCenterX - earthR, earthCenterY - earthR, earthR * 2, earthR * 2);
        ctx.restore(); // end clip

        // Brilliant Cyan Fresnel Horizon Rim Light
        ctx.save();
        ctx.beginPath();
        ctx.arc(earthCenterX, earthCenterY, earthR, Math.PI * 1.08, Math.PI * 1.92);
        ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
        ctx.lineWidth = 6;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(earthCenterX, earthCenterY, earthR, Math.PI * 1.10, Math.PI * 1.90);
        ctx.strokeStyle = "rgba(240, 249, 255, 0.98)";
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.restore();

        // 5. Majestic Asteroid / Celestial Comet Blazing Halfway on the Screen
        // Stationary halfway on screen (does not fly off), with continuous streaming hypersonic tail
        const baseHeadX = W * 0.45;
        const baseHeadY = H * 0.45;

        // Subtle celestial hover breathing drift
        const hoverX = Math.sin(t * 1.1) * 6 + Math.cos(t * 0.7) * 3;
        const hoverY = Math.cos(t * 0.9) * 5 + Math.sin(t * 1.3) * 2;

        // Gentle mouse gravitational reaction
        const distToComet = Math.hypot(baseHeadX - mouse.x, baseHeadY - mouse.y);
        let mousePullX = 0;
        let mousePullY = 0;
        if (distToComet < 360) {
          const pull = Math.pow(1 - distToComet / 360, 2) * 24;
          mousePullX = ((mouse.x - baseHeadX) / distToComet) * pull;
          mousePullY = ((mouse.y - baseHeadY) / distToComet) * pull;
        }

        const headX = baseHeadX + hoverX + mousePullX;
        const headY = baseHeadY + hoverY + mousePullY;

        // Angle: Asteroid head points toward lower-left (~215°), tail streams upward-right (~35°)
        const tailAngle = -Math.PI * 0.16; // ~ -29° vector pointing to upper right
        const cosA = Math.cos(tailAngle);
        const sinA = Math.sin(tailAngle);
        const perpX = -sinA;
        const perpY = cosA;

        const tailLen = Math.min(W * 0.52, 640);
        const TAIL_SEGS = 32;
        const tailNodes: { x: number; y: number; p: number }[] = [];

        for (let i = 0; i <= TAIL_SEGS; i++) {
          const p = i / TAIL_SEGS; // 0 = head, 1 = tail tip
          const d = p * tailLen;

          // Natural sweeping celestial curve (as shown in reference photo)
          const curveBend = Math.pow(p, 1.45) * -42;

          // Continuous hypersonic plasma wave ripple rushing backward from the head at high speed!
          const waveRipple = Math.sin(p * 14 - t * 9.5) * (Math.sin(p * Math.PI) * 11);

          const tx = headX + d * cosA + perpX * (curveBend + waveRipple);
          const ty = headY + d * sinA + perpY * (curveBend + waveRipple);

          tailNodes.push({ x: tx, y: ty, p });
        }

        ctx.save();

        // ── A. Tail Layer 1: Outer Luminous Aurora Plasma (Width: 38px -> 4px) ──
        ctx.beginPath();
        ctx.moveTo(tailNodes[0].x, tailNodes[0].y);
        for (let i = 1; i < TAIL_SEGS; i++) {
          const xc = (tailNodes[i].x + tailNodes[i + 1].x) * 0.5;
          const yc = (tailNodes[i].y + tailNodes[i + 1].y) * 0.5;
          ctx.quadraticCurveTo(tailNodes[i].x, tailNodes[i].y, xc, yc);
        }

        const tailTip = tailNodes[tailNodes.length - 1];
        const auroraGrad = ctx.createLinearGradient(headX, headY, tailTip.x, tailTip.y);
        auroraGrad.addColorStop(0, "rgba(56, 189, 248, 0.55)"); // intense electric cyan at head
        auroraGrad.addColorStop(0.18, "rgba(99, 102, 241, 0.45)"); // royal indigo
        auroraGrad.addColorStop(0.45, "rgba(168, 85, 247, 0.32)"); // celestial purple
        auroraGrad.addColorStop(0.75, "rgba(59, 130, 246, 0.18)"); // deep space blue
        auroraGrad.addColorStop(1, "rgba(15, 23, 42, 0)"); // fades into void

        ctx.strokeStyle = auroraGrad;
        ctx.lineWidth = 42;
        ctx.lineCap = "round";
        ctx.stroke();

        // ── B. Tail Layer 2: Radiant Ion Core Stream (Width: 14px -> 2px) ─────
        const coreGrad = ctx.createLinearGradient(headX, headY, tailTip.x, tailTip.y);
        coreGrad.addColorStop(0, "rgba(224, 242, 254, 0.88)"); // bright ice white-cyan
        coreGrad.addColorStop(0.25, "rgba(125, 211, 252, 0.65)"); // sky cyan
        coreGrad.addColorStop(0.6, "rgba(147, 197, 253, 0.30)"); // soft azure
        coreGrad.addColorStop(1, "rgba(192, 132, 252, 0)");

        ctx.lineWidth = 14;
        ctx.strokeStyle = coreGrad;
        ctx.stroke();

        // ── C. Tail Layer 3: Specular Pure White Incandescent Spine ────────────
        const spineGrad = ctx.createLinearGradient(headX, headY, tailNodes[14].x, tailNodes[14].y);
        spineGrad.addColorStop(0, "rgba(255, 255, 255, 0.98)"); // pure white
        spineGrad.addColorStop(0.5, "rgba(224, 242, 254, 0.70)");
        spineGrad.addColorStop(1, "rgba(186, 230, 253, 0)");

        ctx.lineWidth = 3.2;
        ctx.strokeStyle = spineGrad;
        ctx.stroke();

        // ── D. Streaming Tail Sparks & Cosmic Embers (Continuous forward motion) ─
        for (const spark of cometSparks) {
          // Advance spark along the tail
          spark.p += spark.speed * 0.014;
          if (spark.p > 1) {
            spark.p = 0;
            spark.offset = (Math.random() - 0.5) * 24;
            spark.r = 0.8 + Math.random() * 2.0;
            spark.speed = 0.35 + Math.random() * 0.65;
          }

          // Interpolate node position
          const nodeIdx = Math.min(TAIL_SEGS - 1, Math.floor(spark.p * TAIL_SEGS));
          const nextIdx = Math.min(TAIL_SEGS - 1, nodeIdx + 1);
          const localP = spark.p * TAIL_SEGS - nodeIdx;
          const n1 = tailNodes[nodeIdx];
          const n2 = tailNodes[nextIdx];

          const baseX = n1.x + (n2.x - n1.x) * localP;
          const baseY = n1.y + (n2.y - n1.y) * localP;
          const spreadFactor = Math.sin(spark.p * Math.PI) * (1 + spark.p * 1.5);

          const sx = baseX + perpX * (spark.offset * spreadFactor);
          const sy = baseY + perpY * (spark.offset * spreadFactor);
          const alpha = spark.alpha * (1 - spark.p) * 0.85;

          ctx.fillStyle = `hsla(${spark.hue}, 95%, 85%, ${alpha})`;
          ctx.beginPath();
          ctx.arc(sx, sy, spark.r * (1 - spark.p * 0.45), 0, Math.PI * 2);
          ctx.fill();
        }

        // ── E. Asteroid Head: Incandescent Thermal Flare & Starburst Halo ──────
        const flareR = 48 + Math.sin(t * 12) * 4;
        const headGlow = ctx.createRadialGradient(headX, headY, 2, headX, headY, flareR);
        headGlow.addColorStop(0, "rgba(255, 255, 255, 1.0)");
        headGlow.addColorStop(0.18, "rgba(224, 242, 254, 0.95)");
        headGlow.addColorStop(0.42, "rgba(56, 189, 248, 0.55)");
        headGlow.addColorStop(0.75, "rgba(139, 92, 246, 0.22)");
        headGlow.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = headGlow;
        ctx.beginPath();
        ctx.arc(headX, headY, flareR, 0, Math.PI * 2);
        ctx.fill();

        // ── F. Asteroid Head: 4-Point Primary Diffraction Starburst Spikes ──────
        // Matching the exact lens-flare cross spikes from the user reference photo
        const spikeLen = 58 + Math.sin(t * 14) * 6;
        const spikeWidth = 2.8;

        const drawSpike = (angle: number, length: number, width: number, isPrimary = true) => {
          const c = Math.cos(angle);
          const s = Math.sin(angle);
          const px = -s * width;
          const py = c * width;

          ctx.beginPath();
          ctx.moveTo(headX, headY);
          ctx.lineTo(headX + px, headY + py);
          ctx.lineTo(headX + c * length, headY + s * length);
          ctx.lineTo(headX - px, headY - py);
          ctx.closePath();

          const spikeGrad = ctx.createLinearGradient(headX, headY, headX + c * length, headY + s * length);
          spikeGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
          spikeGrad.addColorStop(0.35, isPrimary ? "rgba(186, 230, 253, 0.85)" : "rgba(186, 230, 253, 0.65)");
          spikeGrad.addColorStop(1, "rgba(56, 189, 248, 0)");

          ctx.fillStyle = spikeGrad;
          ctx.fill();
        };

        // 4 Primary Cardinal Spikes
        drawSpike(0, spikeLen, spikeWidth, true); // Right
        drawSpike(Math.PI, spikeLen * 0.85, spikeWidth, true); // Left
        drawSpike(Math.PI * 0.5, spikeLen * 0.9, spikeWidth, true); // Down
        drawSpike(-Math.PI * 0.5, spikeLen * 0.9, spikeWidth, true); // Up

        // 4 Secondary Diagonal Spikes (Slightly shorter)
        const diagLen = spikeLen * 0.52;
        const diagWidth = 1.8;
        drawSpike(Math.PI * 0.25, diagLen, diagWidth, false);
        drawSpike(-Math.PI * 0.25, diagLen, diagWidth, false);
        drawSpike(Math.PI * 0.75, diagLen, diagWidth, false);
        drawSpike(-Math.PI * 0.75, diagLen, diagWidth, false);

        // ── G. Blazing Asteroid Core Star ──────────────────────────────────────
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(headX, headY, 5.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // ─────────────────────────────────────────────────────────────────────────
      // LIGHT MODE: Sunlit Sky & Earth Atmosphere, Clouds, Golden Sunlight Stream
      // ─────────────────────────────────────────────────────────────────────────
      else {
        // ───────────────────────────────────────────────────────────────────────
        // 0. Desert Vector Sky Gradient (Cached)
        // ───────────────────────────────────────────────────────────────────────
        let desertSky = cachedGradients.desertSky;
        if (!desertSky) {
          desertSky = ctx.createLinearGradient(0, 0, 0, H);
          desertSky.addColorStop(0, "#486581"); // steel cobalt slate zenith
          desertSky.addColorStop(0.32, "#627d98"); // dusty atmospheric blue
          desertSky.addColorStop(0.50, "#829ab1"); // soft haze
          desertSky.addColorStop(0.66, "#b98368"); // warm terracotta horizon
          desertSky.addColorStop(0.82, "#d97736"); // glowing desert peach
          desertSky.addColorStop(1, "#c25e1a"); // deep sand horizon
          cachedGradients.desertSky = desertSky;
        }
        ctx.fillStyle = desertSky;
        ctx.fillRect(0, 0, W, H);

        // ───────────────────────────────────────────────────────────────────────
        // 1. Radiant Desert Sun & Solar Flare (Cached)
        // ───────────────────────────────────────────────────────────────────────
        const sunX = W * 0.80;
        const sunY = Math.min(170, H * 0.18);
        let sunHalo = cachedGradients.sunHalo;
        if (!sunHalo) {
          sunHalo = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, 460);
          sunHalo.addColorStop(0, "rgba(255, 255, 255, 0.95)");
          sunHalo.addColorStop(0.08, "rgba(254, 240, 138, 0.85)"); // sunlit gold
          sunHalo.addColorStop(0.28, "rgba(251, 146, 60, 0.25)"); // amber glow
          sunHalo.addColorStop(0.60, "rgba(234, 88, 12, 0.08)");
          sunHalo.addColorStop(1, "rgba(0, 0, 0, 0)");
          cachedGradients.sunHalo = sunHalo;
        }
        ctx.fillStyle = sunHalo;
        ctx.fillRect(0, 0, W, H);

        // ───────────────────────────────────────────────────────────────────────
        // 2. Layer 1: Distant Clay Mountains & Mesa Horizon
        // ───────────────────────────────────────────────────────────────────────
        ctx.save();
        ctx.fillStyle = "#875249";
        ctx.beginPath();
        ctx.moveTo(0, H * 0.72);
        ctx.lineTo(0, H * 0.67);
        ctx.bezierCurveTo(W * 0.12, H * 0.64, W * 0.18, H * 0.59, W * 0.26, H * 0.61);
        ctx.bezierCurveTo(W * 0.36, H * 0.64, W * 0.42, H * 0.58, W * 0.52, H * 0.62);
        ctx.bezierCurveTo(W * 0.64, H * 0.67, W * 0.74, H * 0.60, W * 0.86, H * 0.64);
        ctx.lineTo(W, H * 0.66);
        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // ───────────────────────────────────────────────────────────────────────
        // 3. Layer 2: Midground Rolling Terracotta Sand Dunes
        // ───────────────────────────────────────────────────────────────────────
        ctx.save();
        ctx.fillStyle = "#69372c";
        ctx.beginPath();
        ctx.moveTo(0, H * 0.76);
        ctx.bezierCurveTo(W * 0.16, H * 0.69, W * 0.28, H * 0.64, W * 0.44, H * 0.71);
        ctx.bezierCurveTo(W * 0.58, H * 0.77, W * 0.70, H * 0.69, W * 0.82, H * 0.74);
        ctx.lineTo(W, H * 0.77);
        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // ───────────────────────────────────────────────────────────────────────
        // 4. Layer 3: The Hero Namibia Sinuous Sand Dune (Sharp S-Curve Crest)
        // ───────────────────────────────────────────────────────────────────────
        // A. Hero Dune Shadow Side (Deep Auburn-Plum / Maroon Shadow)
        ctx.save();
        ctx.fillStyle = "#3d242f";
        ctx.beginPath();
        ctx.moveTo(W * 0.22, H * 0.90);
        ctx.bezierCurveTo(W * 0.44, H * 0.80, W * 0.65, H * 0.65, W * 0.84, H * 0.45);
        ctx.lineTo(W, H * 0.52);
        ctx.lineTo(W, H);
        ctx.lineTo(W * 0.22, H);
        ctx.closePath();
        ctx.fill();

        // B. Hero Dune Sunlit Face (Fiery Marigold & Golden Sand Face with S-Curve)
        const sunlitDune = ctx.createLinearGradient(W * 0.75, H * 0.45, W, H * 0.82);
        sunlitDune.addColorStop(0, "#fb923c"); // golden crest
        sunlitDune.addColorStop(0.35, "#f97316"); // vivid marigold
        sunlitDune.addColorStop(0.80, "#ea580c"); // rich desert amber
        sunlitDune.addColorStop(1, "#c2410c");
        ctx.fillStyle = sunlitDune;
        ctx.beginPath();
        // Sinuous S-curve crest
        ctx.moveTo(W * 0.84, H * 0.45);
        ctx.bezierCurveTo(W * 0.87, H * 0.47, W * 0.83, H * 0.54, W * 0.86, H * 0.60);
        ctx.bezierCurveTo(W * 0.89, H * 0.66, W * 0.81, H * 0.73, W * 0.87, H * 0.81);
        ctx.lineTo(W, H * 0.86);
        ctx.lineTo(W, H * 0.52);
        ctx.closePath();
        ctx.fill();

        // C. Razor-Sharp S-Curve Crest Highlight
        ctx.beginPath();
        ctx.moveTo(W * 0.84, H * 0.45);
        ctx.bezierCurveTo(W * 0.87, H * 0.47, W * 0.83, H * 0.54, W * 0.86, H * 0.60);
        ctx.bezierCurveTo(W * 0.89, H * 0.66, W * 0.81, H * 0.73, W * 0.87, H * 0.81);
        ctx.strokeStyle = "rgba(254, 240, 138, 0.85)";
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.restore();

        // ───────────────────────────────────────────────────────────────────────
        // 5. Layer 4: Foreground Sweeping Sand Floor
        // ───────────────────────────────────────────────────────────────────────
        ctx.save();
        const floorGrad = ctx.createLinearGradient(0, H * 0.82, 0, H);
        floorGrad.addColorStop(0, "#ea580c");
        floorGrad.addColorStop(1, "#c2410c");
        ctx.fillStyle = floorGrad;
        ctx.beginPath();
        ctx.moveTo(0, H * 0.84);
        ctx.bezierCurveTo(W * 0.35, H * 0.81, W * 0.65, H * 0.85, W, H * 0.83);
        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // ───────────────────────────────────────────────────────────────────────
        // 6. Desert Saguaro Cactuses
        // ───────────────────────────────────────────────────────────────────────
        const drawCactus = (
          cx: number,
          cy: number,
          height: number,
          hasLeft = true,
          hasRight = true,
          leftArmY = 0.55,
          rightArmY = 0.42
        ) => {
          ctx.save();
          const trunkW = height * 0.13;
          const armW = trunkW * 0.82;
          ctx.fillStyle = "#1b3325"; // deep desert saguaro green
          ctx.strokeStyle = "#1b3325";
          ctx.lineCap = "round";
          ctx.lineJoin = "round";

          // Base shadow on the sand
          ctx.fillStyle = "rgba(45, 18, 12, 0.45)";
          ctx.beginPath();
          ctx.ellipse(cx + trunkW * 0.4, cy + 2, trunkW * 2.2, trunkW * 0.6, 0.1, 0, Math.PI * 2);
          ctx.fill();

          // Main vertical trunk
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx, cy - height);
          ctx.lineWidth = trunkW;
          ctx.stroke();

          // Left branching arm
          if (hasLeft) {
            const armH = cy - height * leftArmY;
            const span = height * 0.25;
            const up = height * 0.32;
            ctx.beginPath();
            ctx.lineWidth = armW;
            ctx.moveTo(cx, armH);
            ctx.lineTo(cx - span, armH);
            ctx.lineTo(cx - span, armH - up);
            ctx.stroke();
          }

          // Right branching arm
          if (hasRight) {
            const armH = cy - height * rightArmY;
            const span = height * 0.26;
            const up = height * 0.34;
            ctx.beginPath();
            ctx.lineWidth = armW;
            ctx.moveTo(cx, armH);
            ctx.lineTo(cx + span, armH);
            ctx.lineTo(cx + span, armH - up);
            ctx.stroke();
          }
          ctx.restore();
        };

        // Midground prominent cactus on dune ridge
        drawCactus(W * 0.22, H * 0.74, 98, true, true, 0.54, 0.40);
        // Distant smaller cactus for depth of field
        drawCactus(W * 0.12, H * 0.66, 52, true, false, 0.50, 0.38);
        // Companion small cactus
        drawCactus(W * 0.38, H * 0.80, 70, false, true, 0.45, 0.48);
        // Right foreground framing cactus
        drawCactus(W * 0.94, H * 0.84, 115, true, true, 0.52, 0.42);

        // ───────────────────────────────────────────────────────────────────────
        // 7. Animated Flying Sand Grains & Blowing Dust Plumes
        // ───────────────────────────────────────────────────────────────────────
        ctx.save();
        for (const grain of sandGrains) {
          grain.x += grain.vx;
          grain.y += Math.sin(t * grain.wobbleSpeed) * 0.45;
          if (grain.x > W) {
            grain.x = 0;
            grain.y = H * 0.40 + Math.random() * (H * 0.58);
          }

          ctx.fillStyle = `hsla(${grain.hue}, 95%, 68%, ${grain.alpha})`;
          ctx.beginPath();
          ctx.arc(grain.x, grain.y, grain.r, 0, Math.PI * 2);
          ctx.fill();
        }

        // Wind blown sand dust trail lifting off the hero dune crest
        const dustGrad = ctx.createLinearGradient(W * 0.84, H * 0.45, W * 0.98, H * 0.40);
        dustGrad.addColorStop(0, "rgba(254, 240, 138, 0.45)");
        dustGrad.addColorStop(0.5, "rgba(251, 146, 60, 0.25)");
        dustGrad.addColorStop(1, "rgba(234, 88, 12, 0)");
        ctx.fillStyle = dustGrad;
        ctx.beginPath();
        ctx.moveTo(W * 0.84, H * 0.45);
        ctx.bezierCurveTo(W * 0.88, H * 0.42 + Math.sin(t * 3) * 6, W * 0.94, H * 0.41, W * 0.98, H * 0.39);
        ctx.lineTo(W * 0.98, H * 0.44);
        ctx.bezierCurveTo(W * 0.94, H * 0.44, W * 0.88, H * 0.46, W * 0.84, H * 0.46);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // ───────────────────────────────────────────────────────────────────────
        // 8. The Desert Wind Ribbon / Tube (Matching Golden Sands & Sky Breeze)
        // ───────────────────────────────────────────────────────────────────────
        for (let i = 0; i < WAVE_POINTS; i++) {
          const p = i / (WAVE_POINTS - 1);
          const baseWaveX = p * (W + 240) - 120;
          // Graceful swoop weaving across the desert sky above and between dunes
          const sine1 = Math.sin(p * 3.4 + t * 0.55) * (H * 0.10);
          const sine2 = Math.cos(p * 1.8 - t * 0.35) * (H * 0.06);
          let targetY = H * 0.42 + sine1 + sine2;

          const distToMouse = Math.hypot(baseWaveX - mouse.x, targetY - mouse.y);
          if (distToMouse < 340) {
            const pull = Math.pow(1 - distToMouse / 340, 2) * 35;
            targetY += (mouse.y > targetY ? pull : -pull) * 0.25;
          }

          waveNodes[i].x += (baseWaveX - waveNodes[i].x) * 0.15;
          waveNodes[i].y += (targetY - waveNodes[i].y) * 0.15;
        }

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(waveNodes[0].x, waveNodes[0].y);
        for (let i = 1; i < WAVE_POINTS - 1; i++) {
          const xc = (waveNodes[i].x + waveNodes[i + 1].x) * 0.5;
          const yc = (waveNodes[i].y + waveNodes[i + 1].y) * 0.5;
          ctx.quadraticCurveTo(waveNodes[i].x, waveNodes[i].y, xc, yc);
        }

        // Layer A: Outer Desert Sand Wind Stream (Width: 52px)
        const desertWave = ctx.createLinearGradient(0, 0, W, H);
        desertWave.addColorStop(0, "rgba(245, 158, 11, 0.24)"); // molten sun gold
        desertWave.addColorStop(0.35, "rgba(234, 88, 12, 0.20)"); // fiery terracotta
        desertWave.addColorStop(0.65, "rgba(56, 189, 248, 0.18)"); // sky azure breeze reflection
        desertWave.addColorStop(1, "rgba(251, 191, 36, 0.22)"); // warm amber

        ctx.strokeStyle = desertWave;
        ctx.lineWidth = 52;
        ctx.lineCap = "round";
        ctx.stroke();

        // Layer B: Inner Radiant Sand Stream (Width: 12px)
        ctx.lineWidth = 12;
        ctx.strokeStyle = "rgba(254, 240, 138, 0.65)";
        ctx.stroke();

        // Layer C: Specular Sunlight Spine (Width: 2.8px)
        ctx.lineWidth = 2.8;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
        ctx.stroke();
        ctx.restore();
      }
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 h-full w-full"
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}

export default CursorTube;
