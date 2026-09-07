import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blockade | 2D Strategy Grid Racing Game",
  description: "A fast-paced 2-player strategic grid game. Race to the opposite side while placing tactical walls to blockade your opponent!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-sky-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
