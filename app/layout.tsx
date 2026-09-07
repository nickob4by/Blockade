import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blockade | 2D Strategy Grid Racing Game",
  description: "A fast-paced 2-player strategic grid game on mobile. Race to the opposite side while placing tactical walls to blockade your opponent!",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Blockade",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#090d16",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body className="h-full bg-slate-950 text-slate-100 antialiased selection:bg-sky-500 selection:text-white overscroll-none touch-manipulation select-none">
        {children}
      </body>
    </html>
  );
}
