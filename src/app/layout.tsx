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
  description: "Rancang pola potong kardus kustom, tempel logo di sisinya, lihat lipatannya dalam 3D, ubah gambar jadi pola, lalu cetak 1:1 dari browser.",
  openGraph: {
    title: "Lipatin — Pola potong kardus 2D ↔ 3D",
    description: "Desain → lihat 3D → sesuaikan → cetak. Template parametrik, logo di sisi kardus, dan gambar jadi pola.",
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
