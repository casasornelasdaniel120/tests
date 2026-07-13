import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// viewport-fit=cover permite usar env(safe-area-inset-*) en iPhones con notch
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "POS Fotografía",
  description: "Sistema de punto de venta para consultorio fotográfico",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${inter.variable} h-full`}>
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
