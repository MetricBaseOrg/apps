import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { GridBg } from "@/components/mb/GridBg";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MetricBase Financial Tracker",
  description:
    "Multi-entity financial tracking for individuals and companies. Built for the operator who reads their own books.",
  metadataBase: new URL("https://apps.metricbase.org"),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="mb-page min-h-full flex flex-col">
        <GridBg />
        <div className="relative z-10 flex flex-col min-h-screen">{children}</div>
      </body>
    </html>
  );
}
