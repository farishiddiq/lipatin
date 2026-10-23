import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = localFont({
  src: "./fonts/InterVariable.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://lipatin.id"),
  title: { default: "Lipatin — Pola potong kardus 2D ↔ 3D", template: "%s · Lipatin" },
  description: "Pilih dari 149 model 3D kardus (mainan, budaya, cita-cita, hobi), atur ukurannya, tempel logo, lihat lipatannya dalam 3D, lalu cetak pola 1:1 dari browser.",
  openGraph: {
    title: "Lipatin — Pola potong kardus 2D ↔ 3D",
    description: "Pilih model → lihat 3D → sesuaikan → cetak. 149 model 3D kardus dan logo di sisi kardus.",
    type: "website",
    locale: "id_ID",
    siteName: "Lipatin",
  },
};

export const viewport: Viewport = {
  themeColor: "#f0e7d6",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="min-h-dvh">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
