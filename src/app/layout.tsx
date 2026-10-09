import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, JetBrains_Mono, Noto_Serif } from "next/font/google";
import "./globals.css";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, LOCALE, SITE_NAME, SITE_URL } from "@/lib/seo/config";

// Font stacks that use these live in globals.css (--font-*-stack). Mono and serif are rarely used, so skip preloading them.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", preload: false });
const notoSerif = Noto_Serif({ subsets: ["latin"], variable: "--font-noto-serif", preload: false });

export const metadata: Metadata = {
  title: { default: DEFAULT_TITLE, template: `%s | ${SITE_NAME}` },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  metadataBase: new URL(SITE_URL),
  openGraph: { siteName: SITE_NAME, locale: LOCALE, type: "website", title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION },
  twitter: { card: "summary_large_image" },
  appleWebApp: { capable: true, title: "MathFlex", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
  ],
};

// Runs before first paint so there's no light/dark flash. Default is dark (Netflix feel).
const themeScript = `try{var t=localStorage.getItem("mf-theme");if(t!=="light")document.documentElement.classList.add("dark")}catch(e){document.documentElement.classList.add("dark")}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable} ${notoSerif.variable}`}>
      {/* Browser extensions (e.g. ClickUp) add classes to <body>; don't flag that as a mismatch. */}
      <body className="min-h-dvh" suppressHydrationWarning>
        {/* next/script injects this into the initial HTML; a raw <script> would warn on client renders. */}
        <Script id="theme" strategy="beforeInteractive">{themeScript}</Script>
        {children}
      </body>
    </html>
  );
}
