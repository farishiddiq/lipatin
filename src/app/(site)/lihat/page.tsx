import type { Metadata } from "next";
import { SharedView } from "./shared-view";

export const metadata: Metadata = { title: "Karya dibagikan", description: "Lihat model 3D dan pola kardus yang dibagikan lewat Lipatin.", robots: { index: false } };

export default function LihatPage() {
  return <SharedView />;
}
