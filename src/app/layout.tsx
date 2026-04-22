import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Command Tower",
  description: "Premium EDH companion app foundation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full bg-app-bg text-foreground">{children}</body>
    </html>
  );
}
