import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "nogtik — Download TikTok, Instagram & Snapchat Videos",
  description:
    "Download TikTok, Instagram Reels, and Snapchat videos in the highest quality with no watermark. Free, fast, and works on all devices.",
  keywords: [
    "tiktok downloader",
    "instagram reels downloader",
    "snapchat video downloader",
    "no watermark",
    "video downloader",
    "nogtik",
  ],
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "nogtik — Clean Video Downloads",
    description:
      "Download TikTok, Instagram Reels, and Snapchat videos — best quality, no watermark.",
    type: "website",
    siteName: "nogtik",
  },
  twitter: {
    card: "summary",
    title: "nogtik — Clean Video Downloads",
    description:
      "Download TikTok, Instagram Reels, and Snapchat videos — best quality, no watermark.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#06060b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <div className="bg-mesh" />
        <div className="noise" />
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        {children}
      </body>
    </html>
  );
}
