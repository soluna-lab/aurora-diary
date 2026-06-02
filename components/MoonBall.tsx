"use client";
import { useEffect, useRef } from "react";

// ---- Tuning constants ----
const PARTICLE_COUNT  = 1100;
const SPHERE_R_FACTOR = 0.44;  // radius as fraction of size
const ROT_Y_SPEED     = 0.0018;
const ROT_X_SPEED     = 0.0007;
const BROWNIAN        = 0.007; // random force per frame
const PULL            = 0.005; // center-attraction strength
const MAX_SPD         = 0.38;
const PULSE_FORCE     = 1.8;   // outward kick on diary confirm

interface Particle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  size: number;
  baseOp: number;
}

interface MoonBallProps {
  color: string;
  size?: number;
  pulseSignal?: number;
}

// Slight center-concentration: pow(0.6) → denser core, sparser edge
function spawnInSphere(R: number): Particle {
  const r     = R * Math.pow(Math.random(), 0.6);
  const theta = Math.random() * Math.PI * 2;
  const phi   = Math.acos(2 * Math.random() - 1);
  const sin   = Math.sin(phi);
  return {
    x: r * sin * Math.cos(theta),
    y: r * sin * Math.sin(theta),
    z: r * Math.cos(phi),
    vx: (Math.random() - 0.5) * 0.12,
    vy: (Math.random() - 0.5) * 0.12,
    vz: (Math.random() - 0.5) * 0.12,
    size:   Math.random() * 1.0 + 0.3,
    baseOp: Math.random() * 0.6 + 0.18,
  };
}

export function MoonBall({ color, size = 280, pulseSignal = 0 }: MoonBallProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef       = useRef<number>(0);
  const rgbRef       = useRef<[number, number, number]>([136, 153, 170]);
  const rotYRef      = useRef(0);
  const rotXRef      = useRef(0);
  const lastTsRef    = useRef<number | null>(null);
  const prevPulse    = useRef(0);
  // Pre-allocated sort buffer
  const sortBufRef   = useRef<{ px: number; py: number; z: number; op: number; sz: number }[]>([]);

  useEffect(() => {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    rgbRef.current = [r, g, b];
  }, [color]);

  useEffect(() => {
    const R = size * SPHERE_R_FACTOR;
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => spawnInSphere(R));
    sortBufRef.current   = Array.from({ length: PARTICLE_COUNT }, () => ({ px: 0, py: 0, z: 0, op: 0, sz: 0 }));
  }, [size]);

  // Pulse: burst particles outward on diary confirm
  useEffect(() => {
    if (pulseSignal === prevPulse.current) return;
    prevPulse.current = pulseSignal;
    for (const p of particlesRef.current) {
      const dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z) || 1;
      p.vx += (p.x / dist) * PULSE_FORCE;
      p.vy += (p.y / dist) * PULSE_FORCE;
      p.vz += (p.z / dist) * PULSE_FORCE;
    }
  }, [pulseSignal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    if (!ctx) return;

    canvas.width  = size;
    canvas.height = size;
    const cx = size / 2, cy = size / 2;
    const R  = size * SPHERE_R_FACTOR;

    const draw = (ts: number) => {
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dt = Math.min((ts - lastTsRef.current) / 16.67, 2.5);
      lastTsRef.current = ts;

      ctx.clearRect(0, 0, size, size);

      // Very subtle sphere-hint glow (cheap: 1 gradient per frame)
      const [r, g, b] = rgbRef.current;
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      grd.addColorStop(0,   `rgba(${r},${g},${b},0.08)`);
      grd.addColorStop(0.6, `rgba(${r},${g},${b},0.04)`);
      grd.addColorStop(1,   `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.05, 0, Math.PI * 2);
      ctx.fill();

      // Advance global rotation
      rotYRef.current += ROT_Y_SPEED * dt;
      rotXRef.current += ROT_X_SPEED * dt;
      const cosY = Math.cos(rotYRef.current), sinY = Math.sin(rotYRef.current);
      const cosX = Math.cos(rotXRef.current), sinX = Math.sin(rotXRef.current);

      const ps  = particlesRef.current;
      const buf = sortBufRef.current;

      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];

        // Brownian motion (random kick)
        p.vx += (Math.random() - 0.5) * BROWNIAN * dt;
        p.vy += (Math.random() - 0.5) * BROWNIAN * dt;
        p.vz += (Math.random() - 0.5) * BROWNIAN * dt;

        // Center attraction (keeps particles inside sphere)
        const dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z) || 1;
        const pull = PULL * (dist / R) * dt; // stronger pull when far from center
        p.vx -= (p.x / dist) * pull;
        p.vy -= (p.y / dist) * pull;
        p.vz -= (p.z / dist) * pull;

        // Speed clamp
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz);
        if (spd > MAX_SPD) { const s = MAX_SPD / spd; p.vx *= s; p.vy *= s; p.vz *= s; }

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;

        // Rotate Y
        const rx =  p.x * cosY + p.z * sinY;
        let   rz = -p.x * sinY + p.z * cosY;
        // Rotate X
        const ry =  p.y * cosX - rz * sinX;
              rz =  p.y * sinX + rz * cosX;

        const depth = (rz / R + 1) / 2; // 0=back, 1=front
        const scale = 0.3 + 0.7 * depth;

        buf[i].px = cx + rx;
        buf[i].py = cy + ry;
        buf[i].z  = rz;
        buf[i].op = p.baseOp * scale;
        buf[i].sz = p.size * (0.45 + 0.55 * depth);
      }

      // Painter's sort: back-to-front
      buf.sort((a, b) => a.z - b.z);

      for (let i = 0; i < buf.length; i++) {
        const { px, py, op, sz } = buf[i];
        ctx.beginPath();
        ctx.arc(px, py, sz, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${op.toFixed(3)})`;
        ctx.fill();
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
      style={{ display: "block", flexShrink: 0 }}
    />
  );
}
