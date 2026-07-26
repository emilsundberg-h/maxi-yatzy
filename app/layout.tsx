import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { AuthInit } from "@/components/auth/AuthInit";
import { PendingInviteModal } from "@/components/invites/PendingInviteModal";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
      className={`${cormorant.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans text-paper [padding:env(safe-area-inset-top)_env(safe-area-inset-right)_env(safe-area-inset-bottom)_env(safe-area-inset-left)]">
        <AuthInit />
        <PendingInviteModal />
        {children}
      </body>
    </html>
  );
}
