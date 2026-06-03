import type { Metadata } from "next";
import Script from "next/script";
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
      <body>
        {children}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2916098907518176"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
