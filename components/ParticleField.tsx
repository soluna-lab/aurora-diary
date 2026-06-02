"use client";
import { useEffect, useRef } from "react";

// ---- Inline Value Noise (no dependencies) ----
function hash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return (
    hash(ix,     iy    ) * (1 - ux) * (1 - uy) +
    hash(ix + 1, iy    ) * ux       * (1 - uy) +
    hash(ix,     iy + 1) * (1 - ux) * uy       +
    hash(ix + 1, iy + 1) * ux       * uy
  );
}

// ---- Tuning constants ----
const PARTICLE_COUNT = 60;
const CANVAS_SCALE   = 1.6;
const TRAIL_ALPHA    = 0.07;   // higher = shorter trail / less blur
const NOISE_SCALE    = 0.003;  // lower = larger swirl radius
const NOISE_SPEED    = 0.06;   // how fast flow field evolves
const FORCE_STRENGTH = 0.011;
const CORE_PULL      = 0.0005; // gentle pull back toward orbit radius
const MAX_SPEED      = 1.2;

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  baseOpacity: number;
}

interface BurstParticle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
}

interface ParticleFieldProps {
  color: string;
  size: number;
  burstSignal?: number;
}

function spawnParticle(cs: number, size: number, stagger = false): Particle {
  const angle  = Math.random() * Math.PI * 2;
  const radius = size * 0.44 + Math.random() * size * 0.30;
  const cx = cs / 2, cy = cs / 2;
  const spd = Math.random() * 0.25 + 0.04;
  const maxLife = Math.random() * 200 + 140;
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
    vx: (Math.random() - 0.5) * spd,
    vy: (Math.random() - 0.5) * spd,
    life: stagger ? Math.random() * maxLife : 0,
    maxLife,
    size: Math.random() * 2.2 + 0.8,
    baseOpacity: Math.random() * 0.22 + 0.06,
  };
}

export function ParticleField({ color, size, burstSignal = 0 }: ParticleFieldProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const burstsRef    = useRef<BurstParticle[]>([]);
  const rafRef       = useRef<number>(0);
  const prevBurstRef = useRef(0);
  // RGB cache — parsed once on color change, never inside the draw loop
  const rgbRef       = useRef<[number, number, number]>([136, 153, 170]);
  const timeRef      = useRef(0);
  const lastTsRef    = useRef<number | null>(null);

  // Update RGB cache whenever color prop changes
  useEffect(() => {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    rgbRef.current = [r, g, b];
  }, [color]);

  // Spawn / re-spawn particles when size changes
  useEffect(() => {
    const cs = size * CANVAS_SCALE;
    particlesRef.current = Array.from(
      { length: PARTICLE_COUNT },
      () => spawnParticle(cs, size, true), // stagger=true so they don't all die together
    );
  }, [size]);

  // Burst trigger
  useEffect(() => {
    if (burstSignal === prevBurstRef.current) return;
    prevBurstRef.current = burstSignal;
    const cs = size * CANVAS_SCALE;
    const cx = cs / 2, cy = cs / 2;
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const spd   = Math.random() * 2.2 + 0.6;
      burstsRef.current.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0,
        maxLife: Math.random() * 0.6 + 0.5,
        size: Math.random() * 3.5 + 1.5,
      });
    }
  }, [burstSignal, size]);

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    if (!ctx) return;

    const cs = size * CANVAS_SCALE;
    canvas.width  = cs;
    canvas.height = cs;
    const cx = cs / 2, cy = cs / 2;

    const draw = (ts: number) => {
      // Delta-time capping — prevents particle jumps after tab switch
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const rawDt = (ts - lastTsRef.current) / 16.67; // 1.0 = one 60-fps frame
      const dt    = Math.min(rawDt, 2.5);
      lastTsRef.current = ts;
      timeRef.current  += dt;
      const t = timeRef.current;

      // Trail: partial clear instead of full clearRect → residual glow
      ctx.fillStyle = `rgba(0,0,3,${TRAIL_ALPHA})`;
      ctx.fillRect(0, 0, cs, cs);

      const [r, g, b] = rgbRef.current; // no per-frame parseInt

      // ---- Orbital particles ----
      for (const p of particlesRef.current) {
        p.life += dt;

        // Rebirth when lifecycle ends
        if (p.life >= p.maxLife) {
          Object.assign(p, spawnParticle(cs, size, false));
          continue;
        }

        // Value-Noise flow field → organic, non-repeating direction changes
        const nx = p.x * NOISE_SCALE + t * NOISE_SPEED;
        const ny = p.y * NOISE_SCALE + t * NOISE_SPEED * 0.73;
        const noiseAngle = (valueNoise(nx, ny) * 2 - 1) * Math.PI * 2;
        p.vx += Math.cos(noiseAngle) * FORCE_STRENGTH * dt;
        p.vy += Math.sin(noiseAngle) * FORCE_STRENGTH * dt;

        // Radial tether — gentle pull toward target orbit radius
        const dx = cx - p.x, dy = cy - p.y;
        const dist       = Math.sqrt(dx * dx + dy * dy) || 1;
        const targetDist = size * 0.52;
        const stretch    = (dist - targetDist) / targetDist;
        p.vx += (dx / dist) * stretch * CORE_PULL * dt;
        p.vy += (dy / dist) * stretch * CORE_PULL * dt;

        // Speed clamp
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (spd > MAX_SPEED) { p.vx *= MAX_SPEED / spd; p.vy *= MAX_SPEED / spd; }

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Opacity & size: fade-in → full → fade-out (breathe)
        const progress = p.life / p.maxLife;
        const envelope = progress < 0.15
          ? progress / 0.15
          : progress > 0.85
          ? (1 - progress) / 0.15
          : 1;
        const opacity   = p.baseOpacity * envelope;
        const drawSize  = p.size * (0.55 + 0.45 * Math.sin(progress * Math.PI));

        ctx.beginPath();
        ctx.arc(p.x, p.y, drawSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${(opacity).toFixed(3)})`;
        ctx.fill();
      }

      // ---- Burst particles ----
      for (let i = burstsRef.current.length - 1; i >= 0; i--) {
        const bp = burstsRef.current[i];
        bp.x  += bp.vx * dt;
        bp.y  += bp.vy * dt;
        bp.vx *= Math.pow(0.968, dt);
        bp.vy *= Math.pow(0.968, dt);
        bp.life += 0.016 * dt;

        const tBp    = bp.life / bp.maxLife;
        const opacity = tBp < 0.25
          ? (tBp / 0.25) * 0.75
          : (1 - (tBp - 0.25) / 0.75) * 0.75;

        ctx.beginPath();
        ctx.arc(bp.x, bp.y, bp.size * (1 - tBp * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${Math.max(0, opacity).toFixed(3)})`;
        ctx.fill();

        if (bp.life >= bp.maxLife) burstsRef.current.splice(i, 1);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
