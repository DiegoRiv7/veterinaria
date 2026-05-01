import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { BackgroundDecor } from "@/components/BackgroundDecor";

export const metadata: Metadata = {
  title: "Patitas Felices",
  description: "Agenda la cita de tu mascota en segundos.",
};

export const viewport: Viewport = {
  themeColor: "#faf6f9",
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
