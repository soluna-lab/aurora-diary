"use client";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface MoonBallProps {
  color: string;       // hex — 月の支配色
  size?: number;       // px
  pulseSignal?: number; // 増加するたびに発光パルスを発火
}

export function MoonBall({ color, size = 280, pulseSignal = 0 }: MoonBallProps) {
  const prevPulse = useRef(0);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pulseSignal === prevPulse.current || !glowRef.current) return;
    prevPulse.current = pulseSignal;
    const el = glowRef.current;
    el.style.transition = "none";
    el.style.opacity = "0.9";
    requestAnimationFrame(() => {
      el.style.transition = "opacity 1.2s ease-out";
      el.style.opacity = "0";
    });
  }, [pulseSignal]);

  const r = Math.round(parseInt(color.slice(1, 3), 16));
  const g = Math.round(parseInt(color.slice(3, 5), 16));
  const b = Math.round(parseInt(color.slice(5, 7), 16));
  const glow = `rgba(${r},${g},${b},0.35)`;
  const glow2 = `rgba(${r},${g},${b},0.15)`;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {/* SVG feTurbulence による外縁ガス揺らぎ */}
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <filter id="aurora-turbulence" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.008"
              numOctaves="3"
              seed="5"
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                values="0.012 0.008;0.016 0.012;0.010 0.006;0.012 0.008"
                dur="14s"
                repeatCount="indefinite"
                className="aurora-turbulence"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="18"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* 月ボール本体 */}
      <motion.div
        animate={{ scale: [1, 1.012, 1], rotate: [0, 1, -1, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          filter: "url(#aurora-turbulence)",
          background: `
            radial-gradient(circle at 38% 35%, rgba(255,255,255,0.18) 0%, transparent 55%),
            conic-gradient(from 0deg, ${color}cc, ${color}66, ${color}aa, ${color}cc),
            radial-gradient(circle at 50% 50%, ${color}bb 0%, ${color}44 60%, transparent 100%)
          `,
          boxShadow: `0 0 60px ${glow}, 0 0 120px ${glow2}`,
          mixBlendMode: "normal",
        }}
      >
        {/* 内部の conic 回転（オーロラが球面を流れる） */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          style={{
            position: "absolute",
            inset: "12%",
            borderRadius: "50%",
            background: `conic-gradient(
              transparent 0deg,
              ${color}55 60deg,
              transparent 120deg,
              ${color}33 200deg,
              transparent 280deg,
              ${color}44 340deg,
              transparent 360deg
            )`,
            mixBlendMode: "screen",
          }}
        />
        {/* 内側グロー */}
        <div style={{
          position: "absolute",
          inset: "25%",
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)`,
        }} />
      </motion.div>

      {/* 発光パルス（吸収時） */}
      <div
        ref={glowRef}
        style={{
          position: "absolute",
          inset: -size * 0.15,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${glow} 0%, transparent 70%)`,
          opacity: 0,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
