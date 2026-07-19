import type { Metadata } from "next";
import { Fraunces, DM_Sans, IBM_Plex_Mono } from "next/font/google";
import ClearServiceWorkers from "@/components/ClearServiceWorkers";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "ClosePath AI | Multi-agent Sales Assistant",
  description:
    "ClosePath is a multi-agent B2B sales assistant that discovers, qualifies, pitches, handles objections, and closes deals with live CRM tools and a manager dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(regs) {
                  regs.forEach(function(r) { r.unregister(); });
                });
              }
              if ('caches' in window) {
                caches.keys().then(function(keys) {
                  keys.forEach(function(k) { caches.delete(k); });
                });
              }
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <ClearServiceWorkers />
        {children}
      </body>
    </html>
  );
}
