import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AuroraDiary — 今日の色を漂わせる",
  description: "感情を色と揺らぎで観測するデジタル日記。分析ではなく、ただ眺める。",
  keywords: ["日記", "感情", "色", "オーロラ", "観測", "癒し"],
  openGraph: {
    title: "AuroraDiary",
    description: "今日の気持ちを、色として月に還す。",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        {/* Google AdSense — <head>直書きでクローラーが確実に検出できる */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2916098907518176"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
