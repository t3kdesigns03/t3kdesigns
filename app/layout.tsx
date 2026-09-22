import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SITE } from "@/lib/theme";
import "./globals.css";

/**
 * Self-hosted variable fonts. No Google Fonts request at build or runtime:
 * one file each, full weight axis, no layout shift, no third-party origin.
 */
const syne = localFont({
  src: "./fonts/syne-var.woff2",
  weight: "400 800",
  style: "normal",
  variable: "--font-syne",
  display: "swap",
  preload: true,
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

const sora = localFont({
  src: "./fonts/sora-var.woff2",
  weight: "100 800",
  style: "normal",
  variable: "--font-sora",
  display: "swap",
  preload: true,
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: SITE.name,
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "design studio",
    "web development",
    "Iowa",
    "custom software",
    "brand systems",
    "T3KDesigns",
  ],
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  openGraph: {
    type: "website",
    url: SITE.url,
    siteName: SITE.name,
    title: SITE.name,
    description: SITE.description,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.name,
    description: SITE.description,
    creator: SITE.x,
  },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#05030a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${syne.variable} ${sora.variable}`}>
      <body>{children}</body>
    </html>
  );
}
