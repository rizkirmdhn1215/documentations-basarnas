import { Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

export const metadata = {
  title: "BASARNAS Media Archive",
  description: "National Search and Rescue Agency of Indonesia - Media Documentation Archive",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={sora.variable}>
        {children}
      </body>
    </html>
  );
}
