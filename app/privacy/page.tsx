import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "プライバシーポリシー — AuroraDiary",
};

export default function PrivacyPage() {
  return (
    <main style={{
      minHeight: "100svh",
      background: "#000308",
      color: "rgba(255,255,255,0.65)",
      fontFamily: "-apple-system, sans-serif",
      padding: "48px 24px 80px",
      maxWidth: 640,
      margin: "0 auto",
      lineHeight: 1.8,
      letterSpacing: "0.03em",
    }}>
      <Link href="/" style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", textDecoration: "none", letterSpacing: "0.06em" }}>
        ← AuroraDiary に戻る
      </Link>

      <h1 style={{ fontSize: 20, fontWeight: 600, color: "rgba(255,255,255,0.75)", marginTop: 32, marginBottom: 8, letterSpacing: "0.12em" }}>
        プライバシーポリシー
      </h1>
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginBottom: 40 }}>最終更新：2026年6月</p>

      <Section title="1. 基本方針">
        AuroraDiary（以下「本サービス」）は、ユーザーの感情記録を扱うアプリとして、プライバシーの保護を最優先に設計されています。
        診断・分析・点数化は行わず、感情を「色と揺らぎ」として観測するだけのサービスです。
      </Section>

      <Section title="2. 収集する情報">
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          <li style={{ marginBottom: 8 }}>
            <strong>日記テキスト</strong>：入力された断片テキストは感情分析APIに送信され、感情の割合・色・キーワードに変換されます。
            変換後、元のテキストは端末内のlocalStorageにのみ保存されます。
          </li>
          <li style={{ marginBottom: 8 }}>
            <strong>感情分析結果</strong>（色・感情割合・サマリー）：端末のlocalStorageに保存されます。サーバーには送信・保存されません。
          </li>
          <li>
            <strong>利用状況ログ</strong>：ページビュー・機能利用状況（Vercel Analytics）およびGoogle AdSenseの広告配信のためにCookieが使用されます。
          </li>
        </ul>
      </Section>

      <Section title="3. AIによる感情分析">
        入力テキストの感情分析には、Groq Cloud（<a href="https://groq.com" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.4)" }}>groq.com</a>）が提供するAI APIを使用しています。
        送信されるのは分析のためのテキストのみです。分析結果はGroqのプライバシーポリシーに従って処理されます。
        第三者への販売・目的外利用は行いません。
      </Section>

      <Section title="4. データの保存と管理">
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          <li style={{ marginBottom: 8 }}>すべての日記データは、お使いの端末の<strong>localStorage</strong>にのみ保存されます。</li>
          <li style={{ marginBottom: 8 }}>サーバーやデータベースへの送信・保存は行いません。</li>
          <li>ブラウザのデータを削除することで、すべての記録を削除できます。</li>
        </ul>
      </Section>

      <Section title="5. Google AdSenseについて">
        本サービスはGoogle AdSenseを使用しています。Googleはユーザーのウェブ閲覧履歴に基づく広告を配信するためにCookieを使用する場合があります。
        Googleによる広告Cookieの使用については
        <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.4)" }}> こちら</a>
        をご覧ください。ユーザーは
        <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.4)" }}> 広告設定</a>
        から広告のカスタマイズを無効にできます。
      </Section>

      <Section title="6. お問い合わせ">
        プライバシーに関するご質問は、アプリ内のフィードバック機能またはGitHubのIssueよりお問い合わせください。
      </Section>

      <p style={{ marginTop: 48, fontSize: 11, color: "rgba(255,255,255,0.15)" }}>
        © 2026 SOLUNA HOLDINGS — AuroraDiary
      </p>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.55)", marginBottom: 12, letterSpacing: "0.06em" }}>
        {title}
      </h2>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
        {children}
      </div>
    </section>
  );
}
