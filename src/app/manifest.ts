import type { MetadataRoute } from "next";

export const dynamic = "force-static";

// Lipatin bisa dipasang sebagai aplikasi dari Chrome/Edge (Windows, Android, macOS).
// Jalur relatif terhadap lokasi manifest supaya tetap benar di bawah basePath GitHub Pages.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lipatin — pola kardus 3D",
    short_name: "Lipatin",
    description: "149 model 3D kardus yang dibongkar jadi pola potong siap cetak. Gratis.",
    start_url: "./",
    scope: "./",
    display: "standalone",
    background_color: "#f0e7d6",
    theme_color: "#ea2e00",
    lang: "id",
    icons: [
      { src: "icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
