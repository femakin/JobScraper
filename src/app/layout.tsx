import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JobScraper - Frontend Jobs for Nigerian Developers",
  description:
    "AI-powered job scraper that finds remote frontend developer jobs friendly to Nigerian applicants, with WhatsApp notifications.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t py-6">
          <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
            JobScraper &mdash; Finding remote frontend jobs for Nigerian
            developers
          </div>
        </footer>
      </body>
    </html>
  );
}
