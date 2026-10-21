import type { Metadata } from "next";
import { Projects } from "./projects";

export const metadata: Metadata = { title: "Proyek saya", robots: { index: false } };

export default function DashboardPage() {
  return <Projects />;
}
