import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { NextAuthProvider } from "@/components/providers/NextAuthProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Sahsra CC Rotations",
  description: "Manage every swipe, every payment, every rupee — in one command center.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans antialiased">
        <NextAuthProvider>{children}</NextAuthProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
