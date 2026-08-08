import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import CacheManager from "./components/CacheManager";
import CachePreloader from "./components/CachePreloader";
import HomeLandingFooter from "./components/HomeLandingFooter";
import AnalyticsBeacon from "./components/AnalyticsBeacon";

const Navbar = dynamic(() => import("./components/Navbar"), {
  ssr: true,
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FunkyStats",
  description: "A high accuracy scoring estimation system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <CacheManager />
        <CachePreloader />
        <AnalyticsBeacon />
        <div className="page2">
          <Suspense fallback={<div style={{ height: "60px" }} />}>
            <Navbar />
          </Suspense>
          {children}
          <HomeLandingFooter />
        </div>
      </body>
    </html>
  );
}
