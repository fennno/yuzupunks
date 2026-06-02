import type { Metadata } from "next";
import { Fredoka_One } from "next/font/google";
import "./globals.css";

const fredokaOne = Fredoka_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Yuzu Punks",
  description: "Yuzu Punks — blind box collectibles",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fredokaOne.variable} h-full`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
