import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "CC Rotation Ledger | Internal Tracker",
  description: "Internal Credit Card Rotation & Ledger Tracking Portal (manual entries only).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
