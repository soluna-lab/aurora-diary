"use client";
import { useEffect, useRef } from "react";

interface Particle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  opacity: number;
  opacityTarget: number;
  driftR: number;
  driftRSpeed: number;
}

interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

interface ParticleFieldProps {
  color: string;
  size: number;
  burstSignal?: number;
}

const CANVAS_SCALE = 1.6;
const PARTICLE_COUNT = 22;

export function ParticleField({ color, size, burstSignal = 0 }: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const burstsRef = useRef<BurstParticle[]>([]);
  const rafRef = useRef<number>(0);
  const prevBurstRef = useRef(0);
  const colorRef = useRef(color);

  useEffect(() => { colorRef.current = color; }, [color]);

  useEffect(() => {
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: size * 0.54 + Math.random() * size * 0.2,
      speed: (Math.random() * 0.00025 + 0.0001) * (Math.random() < 0.5 ? 1 : -1),
      size: Math.random() * 2 + 1,
      opacity: 0,
      opacityTarget: Math.random() * 0.18 + 0.05,
      driftR: 0,
      driftRSpeed: (Math.random() - 0.5) * 0.06,
    }));
  }, [size]);

  // Burst trigger
  useEffect(() => {
    if (burstSignal === prevBurstRef.current) return;
    prevBurstRef.current = burstSignal;
    const cs = size * CANVAS_SCALE;
    const cx = cs / 2;
    const cy = cs / 2;
    for (let i = 0; i < 38; i++) {
      const angle = (i / 38) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = Math.random() * 2.0 + 0.7;
      burstsRef.current.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: Math.random() * 0.55 + 0.55,
        size: Math.random() * 3 + 1.5,
      });
    }
  }, [burstSignal, size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cs = size * CANVAS_SCALE;
    canvas.width = cs;
    canvas.height = cs;
    const cx = cs / 2;
    const cy = cs / 2;

    const draw = () => {
      ctx.clearRect(0, 0, cs, cs);
      const hex = colorRef.current;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);

      for (const p of particlesRef.current) {
        p.angle += p.speed;
        p.driftR += p.driftRSpeed;
        if (Math.abs(p.driftR) > size * 0.06) p.driftRSpeed *= -1;
        p.opacity += (p.opacityTarget - p.opacity) * 0.015;

        const px = cx + Math.cos(p.angle) * (p.radius + p.driftR);
        const py = cy + Math.sin(p.angle) * (p.radius + p.driftR);

        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${p.opacity})`;
        ctx.fill();
      }

      for (let i = burstsRef.current.length - 1; i >= 0; i--) {
        const bp = burstsRef.current[i];
        bp.x += bp.vx;
        bp.y += bp.vy;
        bp.vx *= 0.968;
        bp.vy *= 0.968;
        bp.life += 0.016;

        const t = bp.life / bp.maxLife;
        const opacity = t < 0.25 ? (t / 0.25) * 0.75 : (1 - (t - 0.25) / 0.75) * 0.75;

        ctx.beginPath();
        ctx.arc(bp.x, bp.y, bp.size * (1 - t * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${Math.max(0, opacity)})`;
        ctx.fill();

        if (bp.life >= bp.maxLife) burstsRef.current.splice(i, 1);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
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
