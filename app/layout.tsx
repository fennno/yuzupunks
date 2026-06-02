import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" className="h-full">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="https://use.typekit.net/wpi7bjz.css" />
      </head>
      <body className="h-full">{children}</body>
    </html>
  );
}
