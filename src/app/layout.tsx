import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Plus_Jakarta_Sans, Sora } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
const sora = Sora({ subsets: ["latin"], variable: "--font-sora", weight: ["600", "700", "800"] });

export const metadata: Metadata = {
  title: { default: "MathFlex — Binge-learn JEE Maths", template: "%s · MathFlex" },
  description:
    "Netflix-style JEE & Board maths. Buy only the chapters you need, unlock parts as you go, earn XP and climb the leaderboard. By IIT Delhi & NIT Jalandhar alumni.",
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  appleWebApp: { capable: true, title: "MathFlex", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#08080d" },
    { media: "(prefers-color-scheme: light)", color: "#f7f7fa" },
  ],
};

// Runs before first paint so there's no light/dark flash. Default is dark (Netflix feel).
const themeScript = `try{var t=localStorage.getItem("mf-theme");if(t!=="light")document.documentElement.classList.add("dark")}catch(e){document.documentElement.classList.add("dark")}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${jakarta.variable} ${sora.variable}`}>
      {/* Browser extensions (e.g. ClickUp) add classes to <body>; don't flag that as a mismatch. */}
      <body className="min-h-dvh" suppressHydrationWarning>
        {/* next/script injects this into the initial HTML; a raw <script> would warn on client renders. */}
        <Script id="theme" strategy="beforeInteractive">{themeScript}</Script>
        {children}
      </body>
    </html>
  );
}
