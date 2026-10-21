import type { MaterialSettings } from "./materials";
import type { Params } from "./templates";

export interface CommunityPost {
  id: string;
  title: string;
  author: string;
  handle: string;
  templateId: string;
  params: Params;
  color: MaterialSettings["color"];
  likes: number;
  remixes: number;
  description: string;
  tags: string[];
  days: number;
}

export const COMMUNITY: CommunityPost[] = [
  {
    id: "rumah-kampung-rina",
    title: "Rumah kampung untuk diorama",
    author: "Rina Kusuma",
    handle: "rinabikin",
    templateId: "rumah",
    params: { W: 140, D: 170, H: 85, R: 70, tab: 12 },
    color: "kraft",
    likes: 412,
    remixes: 58,
    description: "Atap sengaja dibuat lebih curam supaya mirip rumah panggung. Pintu bisa dibuka-tutup, anak-anak suka sekali.",
    tags: ["diorama", "rumah", "konten"],
    days: 2,
  },
  {
    id: "kotak-nastar-dimas",
    title: "Kotak nastar 12 butir",
    author: "Dimas Prasetyo",
    handle: "kuedimas",
    templateId: "kotak-kue",
    params: { W: 170, D: 130, H: 55, win: 80, tab: 15 },
    color: "white",
    likes: 236,
    remixes: 91,
    description: "Ukuran pas untuk 12 nastar dalam cup kertas. Jendela mika ditempel dari dalam, tutup selip tidak perlu lem.",
    tags: ["umkm", "kue", "lebaran"],
    days: 5,
  },
  {
    id: "limas-kelas-5",
    title: "Set limas untuk kelas 5",
    author: "Pak Budi Santoso",
    handle: "gurubudi",
    templateId: "limas-segi-n",
    params: { n: 5, s: 50, h: 90, tab: 12 },
    color: "white",
    likes: 188,
    remixes: 140,
    description: "Siswa mengubah jumlah sisi alas lalu membandingkan banyaknya rusuk. Cetak di A4, satu lembar per kelompok.",
    tags: ["edukasi", "matematika", "sd"],
    days: 9,
  },
  {
    id: "truk-sampah-sari",
    title: "Truk bak kayu",
    author: "Sari Wulandari",
    handle: "sari.maker",
    templateId: "truk",
    params: { L: 300, H: 130, W: 110, tab: 12 },
    color: "kraft",
    likes: 321,
    remixes: 44,
    description: "Pakai double wall 6,5 mm supaya kuat diduduki boneka. Kompensasi ketebalan wajib dinyalakan.",
    tags: ["mainan", "kendaraan", "double wall"],
    days: 12,
  },
  {
    id: "helm-astronot",
    title: "Helm astronot ulang tahun",
    author: "Keluarga Hadi",
    handle: "rumahhadi",
    templateId: "helm-ksatria",
    params: { W: 240, H: 300, tab: 20 },
    color: "white",
    likes: 97,
    remixes: 12,
    description: "Dari Helm Ksatria: visor T dilapisi plastik bening, lalu dicat putih setelah dirakit.",
    tags: ["kostum", "pesta", "anak"],
    days: 16,
  },
  {
    id: "lampion-ramadan",
    title: "Lampion ramadan mini",
    author: "Nadia Putri",
    handle: "nadiacraft",
    templateId: "lentera-ramadan",
    params: { s: 50, H: 140, roof: 70, tab: 10 },
    color: "kraft",
    likes: 274,
    remixes: 66,
    description: "Jendela bulan sabit dilapisi kertas minyak warna-warni. Isi dengan lampu LED baterai.",
    tags: ["dekorasi", "ramadan"],
    days: 21,
  },
  {
    id: "stand-hp-kantor",
    title: "Stand HP meja kantor",
    author: "Andi Wijaya",
    handle: "andiw",
    templateId: "stand-hp",
    params: { L: 120, H: 115, W: 80, tab: 12 },
    color: "kraft",
    likes: 143,
    remixes: 30,
    description: "Sudut sandaran pas untuk video call. Bibir penahan muat untuk HP dengan casing tebal.",
    tags: ["meja", "gadget"],
    days: 24,
  },
  {
    id: "menara-kastil-anak",
    title: "Kastil pasir kardus",
    author: "Maya & Bima",
    handle: "mayabima",
    templateId: "menara",
    params: { n: 8, s: 35, H: 160, roof: 110, tab: 10 },
    color: "kraft",
    likes: 165,
    remixes: 27,
    description: "Empat menara disusun di sudut baki besar. Bima yang mewarnai jendelanya.",
    tags: ["anak", "miniatur"],
    days: 30,
  },
  {
    id: "ikosahedron-lampu",
    title: "Kap lampu ikosahedron",
    author: "Studio Lipat",
    handle: "studiolipat",
    templateId: "ikosahedron",
    params: { e: 70, tab: 8 },
    color: "white",
    likes: 208,
    remixes: 39,
    description: "Dua puluh segitiga dari karton dupleks, dirakit dengan tab lem. Lubangi satu sisi untuk fitting lampu.",
    tags: ["dekorasi", "lampu", "platonik"],
    days: 33,
  },
];

export const postById = (id: string) => COMMUNITY.find((p) => p.id === id);
