import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

// Shared 1200×630 social card: the item's own poster gradient, a big heading and a MathFlex
// footer. Plain system font on purpose (no font download, keeps the image small).
export function ogCard({ heading, sub, from, to, symbol }: { heading: string; sub: string; from: string; to: string; symbol?: string }) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, color: "white", background: `linear-gradient(135deg, ${from}, ${to})` }}>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>MathFlex</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {symbol ? <div style={{ display: "flex", fontSize: 150, fontWeight: 800, lineHeight: 1, opacity: 0.35 }}>{symbol}</div> : null}
          <div style={{ display: "flex", fontSize: heading.length > 40 ? 62 : 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, marginTop: 8 }}>{heading}</div>
          <div style={{ display: "flex", fontSize: 32, marginTop: 20, opacity: 0.92 }}>{sub}</div>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
