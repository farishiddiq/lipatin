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
    id: "controller-raka",
    title: "Controller PS4 ukuran jumbo",
    author: "Raka Pratama",
    handle: "rakabikin",
    templateId: "controller-ps4",
    params: { size: 240, tab: 8 },
    color: "white",
    likes: 512,
    remixes: 73,
    description: "Dicat hitam doff setelah dirakit, stik analognya ditempel tutup botol biar bisa diputar. Pajangan meja gaming.",
    tags: ["replika", "game", "pajangan"],
    days: 2,
  },
  {
    id: "tank-bima",
    title: "Tank kamuflase hijau",
    author: "Maya & Bima",
    handle: "mayabima",
    templateId: "tank-3d",
    params: { size: 340, tab: 8 },
    color: "kraft",
    likes: 398,
    remixes: 61,
    description: "Rantainya dicat abu tua, badannya hijau army. Meriamnya pakai sedotan supaya lebih kokoh.",
    tags: ["tank", "militer", "anak"],
    days: 4,
  },
  {
    id: "jet-dimas",
    title: "Jet tempur gantung kamar",
    author: "Dimas Prasetyo",
    handle: "dimasbikin",
    templateId: "jet-tempur-3d",
    params: { size: 360, tab: 8 },
    color: "white",
    likes: 286,
    remixes: 40,
    description: "Digantung pakai benang nilon di langit-langit kamar anak. Dudukannya tetap dipakai buat pajangan rak.",
    tags: ["pesawat", "dekorasi kamar"],
    days: 6,
  },
  {
    id: "trex-sari",
    title: "T-Rex kelas TK",
    author: "Sari Wulandari",
    handle: "sari.maker",
    templateId: "trex-3d",
    params: { size: 470, tab: 8 },
    color: "kraft",
    likes: 341,
    remixes: 88,
    description: "Dibuat bareng 12 murid TK. Tiap kelompok kebagian satu bagian, lalu dirakit bersama di akhir kelas.",
    tags: ["dinosaurus", "sekolah", "kerja kelompok"],
    days: 9,
  },
  {
    id: "robot-hadi",
    title: "Robot ulang tahun Hadi",
    author: "Keluarga Hadi",
    handle: "rumahhadi",
    templateId: "robot-3d",
    params: { size: 330, tab: 8 },
    color: "white",
    likes: 174,
    remixes: 22,
    description: "Visornya dilapisi plastik mika biru, dadanya ditempel logo nama. Jadi hiasan meja kue ulang tahun.",
    tags: ["robot", "pesta", "anak"],
    days: 12,
  },
  {
    id: "kapal-nadia",
    title: "Kapal bajak laut akuarium kering",
    author: "Nadia Putri",
    handle: "nadiacraft",
    templateId: "kapal-bajak-laut-3d",
    params: { size: 450, tab: 8 },
    color: "kraft",
    likes: 233,
    remixes: 35,
    description: "Layarnya diganti kain blacu bekas biar lebih mengembang. Bendera tengkorak digambar tangan.",
    tags: ["kapal", "bajak laut", "diorama"],
    days: 15,
  },
  {
    id: "bego-andi",
    title: "Bego proyek mainan pasir",
    author: "Andi Wijaya",
    handle: "andiw",
    templateId: "ekskavator-3d",
    params: { size: 420, tab: 8 },
    color: "kraft",
    likes: 205,
    remixes: 47,
    description: "Dilapisi selotip bening di bagian bucket supaya tahan dipakai main pasir kinetik.",
    tags: ["alat berat", "konstruksi"],
    days: 19,
  },
  {
    id: "kereta-budi",
    title: "Kereta uap untuk pelajaran sejarah",
    author: "Pak Budi Santoso",
    handle: "gurubudi",
    templateId: "kereta-uap-3d",
    params: { size: 440, tab: 8 },
    color: "white",
    likes: 167,
    remixes: 59,
    description: "Dipakai saat bercerita tentang kereta api zaman Belanda. Murid menghitung jumlah roda dan bagian kereta.",
    tags: ["kereta", "sekolah", "sejarah"],
    days: 23,
  },
  {
    id: "pedang-rina",
    title: "Pedang ksatria pentas seni",
    author: "Rina Kusuma",
    handle: "rinabikin",
    templateId: "pedang-3d",
    params: { size: 590, tab: 8 },
    color: "white",
    likes: 259,
    remixes: 31,
    description: "Bilahnya dicat perak, gagangnya dililit tali kur. Kuat untuk dipegang selama pentas drama.",
    tags: ["pedang", "kostum", "pentas"],
    days: 27,
  },
];

export const postById = (id: string) => COMMUNITY.find((p) => p.id === id);
