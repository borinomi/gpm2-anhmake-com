import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Facebook Scraper v2",
  description: "Advanced Facebook group posts scraper with analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}