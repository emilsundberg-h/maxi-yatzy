import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { AuthInit } from "@/components/auth/AuthInit";
import { PendingInviteModal } from "@/components/invites/PendingInviteModal";
import "./globals.css";

// Self-hosted (not next/font/google): that loader fetches each family's CSS
// + font file straight from Google's servers *during the build*, and a
// blocked/rate-limited fetch there crashes the whole build with an opaque
// "Cannot read properties of null" from next/font's internal parser — it
// happened twice in a row on Vercel. These are the same latin-subset files
// Google was already serving (each an actual variable font covering its
// whole weight range in one file, same as Google's own CSS referenced),
// just vendored locally so the build never depends on reaching Google Fonts.
const cormorant = localFont({
  src: "./fonts/cormorant-garamond/variable.woff2",
  variable: "--font-cormorant",
  weight: "500 700",
});

const manrope = localFont({
  src: "./fonts/manrope/variable.woff2",
  variable: "--font-manrope",
  weight: "400 800",
});

// Loaded for the non-forest Färgteman (color themes) — see app/globals.css'
// per-theme `--font-serif`/`--font-sans` overrides and lib/theme/themes.ts.
const archivo = localFont({
  src: "./fonts/archivo/variable.woff2",
  variable: "--font-archivo",
  weight: "400 700",
});

const archivoBlack = localFont({
  src: "./fonts/archivo-black/400.woff2",
  variable: "--font-archivo-black",
  weight: "400",
});

const caveat = localFont({
  src: "./fonts/caveat/variable.woff2",
  variable: "--font-caveat",
  weight: "500 700",
});

const quicksand = localFont({
  src: "./fonts/quicksand/variable.woff2",
  variable: "--font-quicksand",
  weight: "400 700",
});

const jost = localFont({
  src: "./fonts/jost/variable.woff2",
  variable: "--font-jost",
  weight: "300 600",
});

export const metadata: Metadata = {
  title: "Maxi Yatzy",
  description: "Maxi Yatzy — tärningsspel med 6 tärningar för flera spelare",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Maxi Yatzy",
  },
  // Next only emits the modern "mobile-web-app-capable" meta tag. Some iOS
  // versions specifically need the legacy apple-prefixed one to actually
  // launch chrome-less standalone from the home screen — without it they can
  // fall back to a mode that still shows a sliver of native Safari UI, which
  // no page-level CSS can remove since it isn't part of the page at all.
  other: { "apple-mobile-web-app-capable": "yes" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0f3a2b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sv"
      className={`${cormorant.variable} ${manrope.variable} ${archivo.variable} ${archivoBlack.variable} ${caveat.variable} ${quicksand.variable} ${jost.variable} h-full antialiased`}
      // The no-flash theme-init Script below sets data-theme on this element
      // *before* hydration runs, straight from localStorage — the server
      // markup never has it (it doesn't know the visitor's saved theme), so
      // React would otherwise flag a hydration mismatch on exactly this
      // attribute every load. This is the standard fix for that class of
      // "apply a client-only preference before paint" script.
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col font-sans text-paper [padding:env(safe-area-inset-top)_env(safe-area-inset-right)_env(safe-area-inset-bottom)_env(safe-area-inset-left)]">
        {/* Applies a locally-saved theme choice before first paint — without
            this, the page would flash the default "skog" look and then snap
            to the saved theme once lib/store/useThemeStore.ts hydrates on
            the client. Kept in sync with that store's storage key/theme ids. */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`try {
            var t = localStorage.getItem("mx-theme");
            if (t && t !== "skog" && ["bauhaus","kollegie","pastell","greige"].indexOf(t) !== -1) {
              document.documentElement.dataset.theme = t;
            }
          } catch (e) {}`}
        </Script>
        <AuthInit />
        <PendingInviteModal />
        {children}
      </body>
    </html>
  );
}
