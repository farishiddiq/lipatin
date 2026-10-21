import type { Metadata } from "next";
import { ImageToPattern } from "./image-to-pattern";

export const metadata: Metadata = {
  title: "Gambar jadi pola",
  description: "Unggah foto, sketsa, atau siluet. Lipatin mendeteksi konturnya dan membuat pola kardus 2D yang bisa diedit, lengkap dengan simulasi lipat 3D.",
};

export default function GambarPage() {
  return <ImageToPattern />;
}
