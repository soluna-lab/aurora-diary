"use client";
import { useEffect } from "react";
import { motion, useAnimation } from "framer-motion";
import { logEvent } from "@/lib/logEvent";

interface EmotionOrbProps {
  color: string;
  moonCenter: { x: number; y: number }; // viewport px
  startPos: { x: number; y: number };   // viewport px
  onAbsorbed: () => void;
}

export function EmotionOrb({ color, moonCenter, startPos, onAbsorbed }: EmotionOrbProps) {
  const controls = useAnimation();

  useEffect(() => {
    const dx = moonCenter.x - startPos.x;
    const dy = moonCenter.y - startPos.y;

    controls.start({
      x: [0, dx * 0.15, dx * 0.6, dx],
      y: [0, dy * 0.05 - 40, dy * 0.5 - 20, dy],
      scale: [1, 1.2, 0.7, 0.05],
      opacity: [1, 1, 0.9, 0],
      filter: ["blur(0px)", "blur(0px)", "blur(2px)", "blur(8px)"],
      transition: {
        duration: 2.2,
        ease: [0.25, 0.1, 0.25, 1],
        times: [0, 0.2, 0.7, 1],
      },
    }).then(() => {
      logEvent("orb_absorb_complete", { color });
      onAbsorbed();
    });
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  return (
    <motion.div
      animate={controls}
      style={{
        position: "fixed",
        left: startPos.x - 20,
        top: startPos.y - 20,
        width: 40,
        height: 40,
        borderRadius: "50%",
        background: `radial-gradient(circle, rgba(${r},${g},${b},0.9) 0%, rgba(${r},${g},${b},0.4) 70%)`,
        boxShadow: `0 0 16px rgba(${r},${g},${b},0.6)`,
        pointerEvents: "none",
        zIndex: 60,
      }}
    />
  );
}
