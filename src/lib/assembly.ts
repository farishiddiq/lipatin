import type { ResolvedNet } from "./geometry/resolve";

export interface AssemblyStep {
  kind: "prep" | "cut" | "score" | "fold" | "done";
  title: string;
  body: string;
  /** Kedalaman lipatan yang dianimasikan pada langkah ini. */
  depth?: number;
  panelIds?: string[];
}

const list = (names: string[]) => {
  const uniq = [...new Set(names)];
  if (uniq.length <= 3) return uniq.join(", ");
  return `${uniq.slice(0, 3).join(", ")}, dan ${uniq.length - 3} lainnya`;
};

/** Langkah rakit otomatis dari urutan pohon lipatan (induk dulu, lalu anak). */
export function assemblySteps(net: ResolvedNet): AssemblyStep[] {
  const steps: AssemblyStep[] = [
    { kind: "prep", title: "Siapkan bahan dan alat", body: "Cetak pola dengan skala 100%, lalu ukur kotak kalibrasi 10 cm. Tempel pola ke kardus dengan lem kertas atau selotip di sudutnya." },
    { kind: "cut", title: "Potong semua garis hitam", body: "Gunakan cutter dan penggaris besi di atas alas potong. Potong lubang dan jendela lebih dulu, baru keliling luar." },
  ];
  const hasValley = net.lines.some((l) => l.type === "valley");
  steps.push({
    kind: "score",
    title: "Gores (score) semua garis lipat",
    body: hasValley
      ? "Gores garis merah putus-putus (gunung) dari sisi depan. Untuk garis biru putus-titik (lembah), tusuk ujungnya dengan jarum lalu gores dari sisi belakang."
      : "Tekan garis merah putus-putus dengan pulpen habis tinta atau tulang lipat supaya kardus terlipat rapi tanpa retak.",
  });
  if (net.maxDepth === 0 && net.panels.filter((p) => p.rootPose).length > 1) {
    steps.push({
      kind: "fold",
      title: "Tumpuk & rekatkan lapisan",
      body: "Mulai dari lapisan dasar (terbesar). Oleskan lem tipis, lalu tempel lapisan berikutnya tepat di atasnya sesuai gambar yang tercetak. Ulangi sampai lapisan terkecil.",
      depth: 0,
      panelIds: net.order,
    });
  }
  for (let d = 1; d <= net.maxDepth; d++) {
    const ids = net.order.filter((id) => net.depth.get(id) === d);
    if (!ids.length) continue;
    const panels = ids.map((id) => net.byId.get(id)!);
    const faces = panels.filter((p) => p.kind !== "tab");
    const tabs = panels.filter((p) => p.kind === "tab");
    const angles = [...new Set(faces.map((p) => Math.round(Math.abs(net.angles.get(p.id) ?? 0))))];
    const valleys = faces.filter((p) => (net.angles.get(p.id) ?? 0) < 0).length;
    let body = "";
    if (faces.length) {
      body = `Lipat ${list(faces.map((p) => p.label ?? "panel"))} sekitar ${angles.join("°/")}°${valleys ? ` (${valleys} di antaranya lipat lembah, ke arah sebaliknya)` : ""}.`;
    }
    if (tabs.length) {
      body += `${body ? " " : ""}Lipat ${tabs.length} tab lem ke dalam, oleskan lem tipis, lalu tempelkan ke tepi yang bernomor sama. Tahan 20–30 detik.`;
    }
    steps.push({
      kind: "fold",
      title: faces.length ? `Lipat ${faces.length === 1 ? (faces[0].label ?? "panel") : `${faces.length} panel`}` : "Rekatkan tab lem",
      body,
      depth: d,
      panelIds: ids,
    });
  }
  steps.push({ kind: "done", title: "Selesai!", body: "Periksa semua sambungan. Kalau ada celah, tekan tab dari dalam dengan jari atau batang pensil sampai lemnya kering." });
  return steps;
}
