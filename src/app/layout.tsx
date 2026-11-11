import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#090a0d" },
  ],
};

export const metadata: Metadata = {
  title: "SARA — GoldTouch Dealer Supply AI Assistant",
  description: "Smart Autonomous Real-time Assistant for GoldTouch Dealer Supply. Live queries across Customer Orders, Invoices, Dealership Rooftops, Purchasing, Fulfillments, and Supply Catalog.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SARA",
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css?family=Google+Sans:400,500,600,700|Google+Sans+Text:400,500,700|Google+Sans+Mono:400,500&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col bg-white text-slate-900 font-sans selection:bg-amber-100 selection:text-amber-900">
        {children}
      </body>
    </html>
  );
}
