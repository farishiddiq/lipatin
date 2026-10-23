# Lipatin — pola potong kardus 2D ↔ 3D

Prototipe web dari PRD *Lipatin Platform Kustomisasi Pola Potong Kardus 2D ↔ 3D*. UI dibangun mengikuti skill dari [ibelick/ui-skills](https://github.com/ibelick/ui-skills): **baseline-ui**, **fixing-accessibility**, dan **fixing-motion-performance** (salinannya ada di `.claude/skills/`).

## Menjalankan

```bash
npm install
npm run dev
```

Buka http://localhost:3000. Semua proyek tersimpan di `localStorage` browser (belum ada backend).

## Halaman

| Rute | Isi (PRD §10) |
| --- | --- |
| `/` | Landing satu halaman: preloader → hero kotak CSS 3D yang melipat mengikuti scroll, cara kerja, bento semua fitur, demo interaktif (logo di sisi kardus, model 3D yang membuka jadi pola), bukti angka, penutup. Satu CTA, tanpa menu |
| `/template` | Galeri 149 model 3D dalam 4 kelompok dan 21 kategori: Mainan 3D (13), Budaya (20 Nusantara + 20 Mesir kuno), Cita-cita (42: dokter, pilot & astronot, chef & barista, pemadam & polisi, arsitek, ilmuwan, dokter hewan), dan Hobi (54: gaming, musik, konten kreator, fashion, rumah boneka, olahraga meja, berkebun, koleksi, cosplay). Banyak yang fungsional: pintu, laci, sekat silang, lubang, dan jaring. Kartu menampilkan foto hasil jadi; disorot/diketuk jadi 3D yang bisa diputar lalu membuka jadi pola. Tiap model dibongkar otomatis dari bentuk 3D-nya. Satu kotak cari + chip kategori; filter kesulitan/waktu/ukuran/usia di dalam tombol Filter; pratinjau 3D yang bisa diputar |
| `/studio` | Editor: kanvas 2D (grid, snap, penggaris, mm/cm/inci), alat gambar, alat kardus, viewer 3D berdampingan, panel parameter/desain/material/validasi. Tab **Desain**: unggah logo, pilih sisi (chip atau klik di 2D/3D), posisi/skala/rotasi per sisi, ulangi ke semua sisi; ikut ke ekspor. Editor desain bawaan = kartu terkunci "Pro · Segera" |
| `/ekspor` | PDF 1:1 ditiling A4/A3/F4/Letter + kotak kalibrasi 10 cm, SVG berlapis, PNG, daftar bahan |
| `/panduan` | Panduan rakit otomatis dengan animasi 3D per langkah, mode layar penuh, mode anak + tips keselamatan |
| `/komunitas` | Feed karya, detail (3D + pola + remix dengan atribusi) |
| `/dashboard` | Proyek saya: folder, duplikat, hapus (AlertDialog), status paket |
| `/lihat#…` | Link publik tanpa login; data desain dipadatkan di fragmen URL |
| `/harga` | Paket Gratis/Pro/Bisnis/Edukasi + toggle Pro demo lokal |

## Arsitektur singkat

- **Mesin geometri** (`src/lib/geometry/`) dipakai bersama oleh editor 2D dan viewer 3D:
  - `builder.ts` — pembangun pola: kotak (dengan kompensasi ketebalan), profil yang diekstrusi (prisma, rumah, mobil…), limas, menara; tab lem pintar yang menghindari tumpang tindih.
  - `resolve.ts` — menerapkan modifikasi pengguna, mengubah sketsa potong tertutup menjadi lubang, menyusun garis potong/lipat, mencari pasangan tepi (penomoran 1↔1), menghitung sudut tab otomatis, dan validasi (panel bertumpuk, tab yatim, tepi tidak menutup, slot lebih sempit dari kardus).
  - `fold.ts` — matriks lipat per panel (pohon engsel); sudut positif = lipat gunung.
  - `unfold.ts` — 3D → 2D: las titik, gabung segitiga sebidang, pohon rentang graf dual dengan deteksi tumpang tindih, pecah jadi beberapa bagian bila perlu, tab lem otomatis.
- **3D**: react-three-fiber + drei, tekstur kardus & flute prosedural (tanpa unduhan aset), frameloop `demand` dan berhenti saat di luar layar.
- **UI**: Next.js 16, Tailwind CSS 4, primitif Base UI, Zustand, lucide-react, Inter variable, palet krem `#F0E7D6` / sage `#9DBDB8` / merah api `#EA2E00` (light mode saja).
- **Motion landing**: motion/react (scroll-linked, split text, count-up, magnetik, tilt), Lenis smooth scroll, filter SVG gooey untuk transisi tinta; semua menghormati `prefers-reduced-motion`.
- **Gambar → pola** (`src/lib/trace.ts`): masker (alfa atau jarak warna latar + Otsu), penelusuran Moore, Douglas–Peucker, alas di tali busur selubung cembung agar panel tidak bertumpuk.

## Belum dikerjakan (perlu backend atau fase berikutnya)

- Akun (email/Google), simpan ke cloud, sinkron offline, analitik.
- Bahasa Inggris (UI masih Bahasa Indonesia saja).
- Ekspor DXF, nesting otomatis, mode unfold slice/waffle, deteksi tabrakan 3D, AR.
- Komentar & tantangan komunitas; foto hasil nyata.
- Galeri kini berisi 149 model 3D penuh; template kemasan dan bangun ruang lama sudah dihapus; template kemasan FEFCO/ECMA belum ada.
