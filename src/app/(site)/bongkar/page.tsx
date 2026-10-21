import type { Metadata } from "next";
import { UnfoldStudio } from "./unfold-studio";

export const metadata: Metadata = {
  title: "Bongkar model 3D",
  description: "Bongkar model 3D (primitif atau OBJ/STL/GLB low-poly) menjadi jaring-jaring 2D siap potong dengan nomor pasangan tepi.",
};

export default function BongkarPage() {
  return <UnfoldStudio />;
}
