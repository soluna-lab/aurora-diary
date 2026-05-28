import type { Emotion } from "./types";

export const EMOTION_META: Record<Emotion, { color: string; glow: string; label: string }> = {
  joy:     { color: "#f5a623", glow: "rgba(245,166,35,0.4)",  label: "よろこび" },
  sadness: { color: "#6ab0f5", glow: "rgba(106,176,245,0.4)", label: "かなしみ" },
  anger:   { color: "#e05252", glow: "rgba(224,82,82,0.4)",   label: "いかり" },
  fear:    { color: "#b06af5", glow: "rgba(176,106,245,0.4)", label: "ふあん" },
  calm:    { color: "#52c8a0", glow: "rgba(82,200,160,0.4)",  label: "おだやか" },
  neutral: { color: "#8899aa", glow: "rgba(136,153,170,0.4)", label: "ふつう" },
};

export function blendColors(entries: { color: string; intensity: number }[]): string {
  if (entries.length === 0) return "#8899aa";
  let r = 0, g = 0, b = 0, total = 0;
  for (const e of entries) {
    const hex = e.color.replace("#", "");
    r += parseInt(hex.slice(0, 2), 16) * e.intensity;
    g += parseInt(hex.slice(2, 4), 16) * e.intensity;
    b += parseInt(hex.slice(4, 6), 16) * e.intensity;
    total += e.intensity;
  }
  if (total === 0) return "#8899aa";
  const toHex = (v: number) => Math.round(v / total).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
