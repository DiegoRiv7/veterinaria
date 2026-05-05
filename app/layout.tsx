import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { BackgroundDecor } from "@/components/BackgroundDecor";

export const metadata: Metadata = {
  title: "Vetsfriend — Clínica & Grooming",
  description: "Agenda la cita de tu mascota en segundos.",
  icons: {
    icon: [
      { url: "/vetsfriend-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/vetsfriend-icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/vetsfriend-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#fceadb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col antialiased">
        <BackgroundDecor />
        {children}
        <SpeedInsights />
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            style: {
              borderRadius: "14px",
              fontFamily: "inherit",
            },
          }}
        />
      </body>
    </html>
  );
}
