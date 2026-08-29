import type { Metadata, Viewport } from "next";
import { Inter, Sora, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RONDA — 30 segundos para presentarte. 5 minutos para conocerte.",
  description:
    "Dejá de deslizar perfiles. Empezá a conocer personas. RONDA te conecta en vivo: grabá tu presentación de 30 segundos y entrá a una ronda de 5 minutos.",
  icons: {
    icon: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/logo.svg`,
  },
  openGraph: {
    title: "RONDA",
    description: "30 segundos para presentarte. 5 minutos para conocerte.",
    siteName: "RONDA",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#100e12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-UY" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${sora.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
