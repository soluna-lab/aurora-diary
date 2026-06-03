import type { Emotion, EmotionWeight } from "./types";

export const EMOTION_META: Record<Emotion, { color: string; glow: string; label: string }> = {
  joy:     { color: "#f5a623", glow: "rgba(245,166,35,0.4)",  label: "よろこび" },
  sadness: { color: "#6ab0f5", glow: "rgba(106,176,245,0.4)", label: "かなしみ" },
  anger:   { color: "#e05252", glow: "rgba(224,82,82,0.4)",   label: "いかり" },
  fear:    { color: "#b06af5", glow: "rgba(176,106,245,0.4)", label: "ふあん" },
  calm:    { color: "#52c8a0", glow: "rgba(82,200,160,0.4)",  label: "おだやか" },
  neutral: { color: "#8899aa", glow: "rgba(136,153,170,0.4)", label: "ふつう" },
};

// 感情ウェイト配列から色をブレンド（加重RGB平均）
export function blendEmotionColors(emotions: EmotionWeight[]): string {
  if (emotions.length === 0) return "#8899aa";
  let r = 0, g = 0, b = 0, total = 0;
  for (const { emotion, weight } of emotions) {
    const hex = EMOTION_META[emotion].color.replace("#", "");
    r += parseInt(hex.slice(0, 2), 16) * weight;
    g += parseInt(hex.slice(2, 4), 16) * weight;
    b += parseInt(hex.slice(4, 6), 16) * weight;
    total += weight;
  }
  if (total === 0) return "#8899aa";
  const toHex = (v: number) => Math.round(v / total).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Oklab変換ユーティリティ（RGBより明るさ・色相を知覚的に正しく扱う）
function hexToOklab(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const lin = (s: string) => { const c = parseInt(s, 16) / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const r = lin(h.slice(0, 2)), g = lin(h.slice(2, 4)), b = lin(h.slice(4, 6));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

function oklabToHex(L: number, a: number, b: number): string {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const rl = l_ ** 3, gm = m_ ** 3, bs = s_ ** 3;
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const r = clamp(+4.0767416621 * rl - 3.3077115913 * gm + 0.2309699292 * bs);
  const g = clamp(-1.2684380046 * rl + 2.6097574011 * gm - 0.3413193965 * bs);
  const bv = clamp(-0.0041960863 * rl - 0.7034186147 * gm + 1.7076147010 * bs);
  const gam = (c: number) => Math.round((c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055) * 255).toString(16).padStart(2, "0");
  return `#${gam(r)}${gam(g)}${gam(bv)}`;
}

// 月の全エントリーから月の色をブレンド（1日1票・Oklab均等平均）
// Oklabで平均することで「暗い色が足を引っ張る」RGB問題を解消し、
// 明るさを保ったまま自然な混色を実現する
export function blendColors(entries: { color: string; intensity: number }[]): string {
  if (entries.length === 0) return "#8899aa";
  let L = 0, a = 0, b = 0;
  for (const e of entries) {
    const [eL, ea, eb] = hexToOklab(e.color);
    L += eL; a += ea; b += eb;
  }
  const n = entries.length;
  return oklabToHex(L / n, a / n, b / n);
}
