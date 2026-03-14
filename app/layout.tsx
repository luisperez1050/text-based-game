import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Epic Game Battle",
  description: "This game is generated mostly with Trae's help",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const iconSvg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='#0f172a'/><rect x='12' y='16' width='40' height='28' rx='3' fill='#111827' stroke='#10b981' stroke-width='2'/><rect x='20' y='22' width='24' height='12' fill='#0f172a' stroke='#10b981' stroke-width='1'/><circle cx='24' cy='40' r='3' fill='#10b981'/><circle cx='40' cy='40' r='3' fill='#10b981'/></svg>";
  const iconHref = "data:image/svg+xml;utf8," + encodeURIComponent(iconSvg);
  return (
    <html lang="en" data-theme="red">
      <head>
        <link rel="icon" href={iconHref} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
