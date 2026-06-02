"use client";
import { useEffect, useRef } from "react";

// ---- Tuning constants ----
const PARTICLE_COUNT  = 90;
const CANVAS_SCALE    = 1.6;
const SPHERE_R_FACTOR = 0.52;  // orbit radius as fraction of `size`
const SPHERE_SCATTER  = 0.16;  // ±radial variance to break perfect shell
const ROT_Y_SPEED     = 0.003; // sphere Y-rotation per frame (radians)
const ROT_X_SPEED     = 0.001; // gentle X tilt
const DRIFT_THETA     = 0.006; // max per-particle drift speed on sphere
const DRIFT_PHI       = 0.004;

interface Particle {
  theta: number;   // longitude 0..2π
  phi:   number;   // polar angle 0..π
  dTheta: number;  // per-particle surface drift
  dPhi:   number;
  r: number;       // slight radius scatter
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

// Uniform distribution on sphere surface (avoids polar clustering)
function uniformPhi(): number {
  return Math.acos(2 * Math.random() - 1);
}

function spawnParticle(sphereR: number): Particle {
  const r = sphereR * (1 - SPHERE_SCATTER + Math.random() * SPHERE_SCATTER * 2);
  return {
    theta: Math.random() * Math.PI * 2,
    phi:   uniformPhi(),
    dTheta: (Math.random() - 0.5) * DRIFT_THETA,
    dPhi:   (Math.random() - 0.5) * DRIFT_PHI,
    r,
    size:        Math.random() * 1.2 + 0.5,
    baseOpacity: Math.random() * 0.55 + 0.25,
  };
}

export function ParticleField({ color, size, burstSignal = 0 }: ParticleFieldProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const burstsRef    = useRef<BurstParticle[]>([]);
  const rafRef       = useRef<number>(0);
  const prevBurstRef = useRef(0);
  const rgbRef       = useRef<[number, number, number]>([136, 153, 170]);
  const rotYRef      = useRef(0);
  const rotXRef      = useRef(0);
  const lastTsRef    = useRef<number | null>(null);
  // Pre-allocated sort buffer — no per-frame GC
  const sortBufRef   = useRef<{ px: number; py: number; z: number; p: Particle }[]>([]);

  useEffect(() => {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    rgbRef.current = [r, g, b];
  }, [color]);

  useEffect(() => {
    const sphereR = size * SPHERE_R_FACTOR;
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => spawnParticle(sphereR));
    sortBufRef.current   = Array.from({ length: PARTICLE_COUNT }, () => ({ px: 0, py: 0, z: 0, p: particlesRef.current[0] }));
  }, [size]);

  useEffect(() => {
    if (burstSignal === prevBurstRef.current) return;
    prevBurstRef.current = burstSignal;
    const cs = size * CANVAS_SCALE;
    const cx = cs / 2, cy = cs / 2;
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const spd   = Math.random() * 2.4 + 0.8;
      burstsRef.current.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0, maxLife: Math.random() * 0.55 + 0.45,
        size: Math.random() * 3 + 1.2,
      });
    }
  }, [burstSignal, size]);

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
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dt = Math.min((ts - lastTsRef.current) / 16.67, 2.5);
      lastTsRef.current = ts;

      // Crisp clear — no trail → さらさら感
      ctx.clearRect(0, 0, cs, cs);

      // Advance global sphere rotation
      rotYRef.current += ROT_Y_SPEED * dt;
      rotXRef.current += ROT_X_SPEED * dt;
      const cosY = Math.cos(rotYRef.current), sinY = Math.sin(rotYRef.current);
      const cosX = Math.cos(rotXRef.current), sinX = Math.sin(rotXRef.current);

      const [r, g, b] = rgbRef.current;
      const ps  = particlesRef.current;
      const buf = sortBufRef.current;

      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];

        // Surface drift
        p.theta += p.dTheta * dt;
        p.phi   += p.dPhi   * dt;
        if (p.phi <              0.05) { p.phi =              0.05; p.dPhi *= -1; }
        if (p.phi > Math.PI  - 0.05)  { p.phi = Math.PI  - 0.05;  p.dPhi *= -1; }

        // Spherical → Cartesian
        const sinPhi = Math.sin(p.phi);
        let sx = p.r * sinPhi * Math.cos(p.theta);
        let sy = p.r * sinPhi * Math.sin(p.theta);
        let sz = p.r * Math.cos(p.phi);

        // Rotate Y-axis
        const rx =  sx * cosY + sz * sinY;
              sz = -sx * sinY + sz * cosY;
        // Rotate X-axis
        const ry =  sy * cosX - sz * sinX;
        const rz =  sy * sinX + sz * cosX;

        buf[i].px = cx + rx;
        buf[i].py = cy + ry;
        buf[i].z  = rz;
        buf[i].p  = p;
      }

      // Painter's sort: back-to-front (ascending z)
      buf.sort((a, b) => a.z - b.z);

      const sphereR = size * SPHERE_R_FACTOR;
      for (let i = 0; i < buf.length; i++) {
        const { px, py, z, p } = buf[i];
        const depth = (z / sphereR + 1) / 2;          // 0=back, 1=front
        const scale   = 0.35 + 0.65 * depth;
        const opacity = p.baseOpacity * scale;
        const drawSz  = p.size * (0.5 + 0.5 * depth); // front particles visibly larger

        ctx.beginPath();
        ctx.arc(px, py, drawSz, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${opacity.toFixed(3)})`;
        ctx.fill();
      }

      // ---- Burst particles ----
      for (let i = burstsRef.current.length - 1; i >= 0; i--) {
        const bp = burstsRef.current[i];
        bp.x  += bp.vx * dt;
        bp.y  += bp.vy * dt;
        bp.vx *= Math.pow(0.962, dt);
        bp.vy *= Math.pow(0.962, dt);
        bp.life += 0.016 * dt;

        const tBp    = bp.life / bp.maxLife;
        const opacity = tBp < 0.25 ? (tBp / 0.25) * 0.8 : (1 - (tBp - 0.25) / 0.75) * 0.8;
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
