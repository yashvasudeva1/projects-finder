"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, useSpring } from "framer-motion";

// ── Fibonacci sphere: evenly distributes N points on unit sphere ─────────────
const N      = 320;   // particle count
const RADIUS = 200;   // sphere radius in CSS pixels

function buildSpherePoints(n: number): [number, number, number][] {
  const pts: [number, number, number][] = [];
  const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;        // y ∈ [-1, 1]
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;
    pts.push([Math.cos(theta) * r, y, Math.sin(theta) * r]);
  }
  return pts;
}

const POINTS = buildSpherePoints(N);

export default function ParticleSphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Raw mouse-driven tilt values
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  // Spring-smoothed versions — gives the satisfying "inertia" feel
  const springX = useSpring(rawX, { stiffness: 45, damping: 16 });
  const springY = useSpring(rawY, { stiffness: 45, damping: 16 });

  const autoAngle = useRef(0);
  const animId    = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── Resize handler ─────────────────────────────────────────────────
    let dpr = window.devicePixelRatio || 1;
    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      canvas.width  = window.innerWidth  * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width  = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    resize();
    window.addEventListener("resize", resize);

    // ── Mouse tracking — maps cursor offset from viewport centre → tilt ─
    const onMouseMove = (e: MouseEvent) => {
      const cx = window.innerWidth  / 2;
      const cy = window.innerHeight / 2;
      rawY.set(((e.clientX - cx) / cx) * 0.9);   // horizontal → Y-axis rotation
      rawX.set(((e.clientY - cy) / cy) * -0.55);  // vertical   → X-axis rotation
    };
    window.addEventListener("mousemove", onMouseMove);

    // ── Draw loop ──────────────────────────────────────────────────────
    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) { animId.current = requestAnimationFrame(draw); return; }

      const W = window.innerWidth;
      const H = window.innerHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);

      // Auto-rotate + cursor tilt
      autoAngle.current += 0.0035;
      const rx = springX.get();
      const ry = springY.get() + autoAngle.current;

      const cosX = Math.cos(rx), sinX = Math.sin(rx);
      const cosY = Math.cos(ry), sinY = Math.sin(ry);

      const cx = W / 2;
      const cy = H / 2;
      const fov = 520;

      // Project 3D sphere points → 2D canvas
      const projected = POINTS.map(([x, y, z]) => {
        // Rotate around Y
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;
        // Rotate around X
        const y2 = y * cosX  - z1 * sinX;
        const z2 = y * sinX  + z1 * cosX;

        const scale = fov / (fov + z2 * RADIUS + RADIUS * 0.5);
        return {
          px:    cx + x1 * RADIUS * scale,
          py:    cy + y2 * RADIUS * scale,
          depth: z2,
          scale,
        };
      });

      // Painter's algorithm: back-to-front so front dots occlude back dots
      projected.sort((a, b) => a.depth - b.depth);

      for (const { px, py, depth, scale } of projected) {
        const alpha  = 0.08 + ((depth + 1) / 2) * 0.38;  // fades away from camera
        const radius = Math.max(0.6, 1.6 * scale);

        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 255, 87, ${alpha})`;  // --accent lime
        ctx.fill();
      }

      // Subtle equatorial ring for extra depth cue
      ctx.beginPath();
      ctx.ellipse(cx, cy, RADIUS * 0.97, RADIUS * 0.18, ry % (Math.PI * 2), 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(200, 255, 87, 0.04)";
      ctx.lineWidth   = 0.8;
      ctx.stroke();

      ctx.restore();
      animId.current = requestAnimationFrame(draw);
    };

    animId.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(animId.current);
    };
  }, [rawX, rawY, springX, springY]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position:      "fixed",
        top:            0,
        left:           0,
        zIndex:         0,
        pointerEvents:  "none",
        opacity:        0.7,
        // Soft radial vignette so the sphere fades at edges
        WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 40%, transparent 100%)",
        maskImage:        "radial-gradient(ellipse 70% 70% at 50% 50%, black 40%, transparent 100%)",
      }}
    />
  );
}
