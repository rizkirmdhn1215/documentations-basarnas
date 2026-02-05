import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Records App",
  description: "Monthly records with categories, entries, and S3 images",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-cream text-ink">{children}</body>
    </html>
  );
}
