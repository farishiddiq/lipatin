# Lipatin — pola potong kardus 3D, gratis

Lipatin mengubah model 3D menjadi **pola potong kardus siap cetak**. Pilih model, atur ukurannya, lihat
lipatannya dalam 3D, lalu cetak polanya 1:1 dari browser. Tanpa daftar akun, tanpa biaya.

**Buka:** https://farishiddiq.github.io/lipatin/

## Fitur

- **149 model 3D** dalam 21 kategori:
  - **Mainan 3D** (13): controller PS4, mobil sport, truk monster, tank, jet, helikopter, roket, robot, T-Rex, pedang, kapal bajak laut, ekskavator, kereta uap.
  - **Budaya** (40): 20 khas Nusantara (Rumah Gadang, Tongkonan, Borobudur, Prambanan, Monas, pinisi, keris, ondel-ondel, Garuda, …) dan 20 Mesir kuno (piramida, Sphinx, topeng Tutankhamun, Abu Simbel, Anubis, …).
  - **Cita-cita** (42): dokter & perawat, pilot & astronot, chef & barista, pemadam & polisi, arsitek & insinyur, ilmuwan, dokter hewan.
  - **Hobi** (54): gaming, musik, konten kreator, fashion & kecantikan, rumah boneka, olahraga meja, berkebun, koleksi & display, cosplay.
- **Pola fungsional**: kotak dengan pintu atau tutup selip, laci yang bisa ditarik, sekat silang tanpa lem, lubang (jendela, lubang suara, lubang lensa), dan jaring berlubang kisi.
- **Galeri**: kartu menampilkan foto hasil jadi; disorot (atau diketuk) menjadi model 3D yang bisa diputar lalu membuka menjadi polanya. Kelompok → kategori, pencarian, dan filter kesulitan/waktu/ukuran/usia.
- **Studio**: atur ukuran model, lihat pola 2D dan lipatan 3D berdampingan, tambah tab/slot/lubang, ubah sudut lipat, cek validasi (panel bertumpuk, tab yatim, tepi tidak menutup).
- **Logo di sisi kardus**: unggah gambar, pilih sisi, atur posisi/skala/rotasi; ikut ke 3D dan ekspor.
- **Ekspor cetak 1:1**: PDF ditiling ke A4/A3/F4/Letter dengan kotak kalibrasi 10 cm dan daftar bahan, SVG berlapis, PNG 150/300 dpi.
- **Panduan rakit** otomatis dengan animasi 3D per langkah, **komunitas** dengan remix, dan **link publik** tanpa login.
- Semua fitur gratis, tanpa batas proyek, tanpa watermark.

## Cara pakai

1. Buka https://farishiddiq.github.io/lipatin/ lalu klik **Mulai mendesain**.
2. Pilih model di galeri (sorot kartu untuk melihat 3D dan polanya).
3. Di Studio, atur ukuran dengan slider; cek tab **Cek** bila ada peringatan.
4. Klik **Ekspor** → pilih PDF → cetak dengan skala 100% (pastikan kotak kalibrasi tepat 10 cm).
5. Potong garis tebal, lipat garis putus-putus (merah = lipat gunung, biru = lipat lembah), rekatkan tab sesuai nomor pasangan tepi.

### Pasang sebagai aplikasi (Windows, Android, macOS)

Lipatin adalah aplikasi web progresif (PWA). Di **Chrome** atau **Edge**, buka situsnya lalu klik ikon
**Instal aplikasi** di bilah alamat (atau menu ⋮ → *Instal Lipatin*). Lipatin akan muncul di Start Menu
dan berjalan di jendela sendiri. Uninstall dari jendela aplikasi (⋮ → *Copot pemasangan*) atau dari
pengaturan aplikasi Windows.

## Privasi

- Tidak ada akun, server, atau analitik. Semua proyek tersimpan di `localStorage` browser perangkatmu.
- Link publik menyimpan data desain di **fragmen URL** (`#...`), yang tidak dikirim ke server mana pun.
- Gambar logo yang diunggah diproses di browser dan tidak diunggah ke mana-mana.

## Keterbatasan

- Proyek tersimpan per browser/perangkat; menghapus data situs akan menghapus proyek. Belum ada sinkron cloud.
- Model 3D yang rumit memiliki ratusan panel dan polanya butuh beberapa lembar A3; tepi yang lebih pendek dari 8 mm tidak diberi tab (rekatkan dengan selotip).
- Antarmuka hanya Bahasa Indonesia.
- Bagian yang saling menempel pada model 3D digambar sedikit menembus satu sama lain; saat dirakit cukup ditempel di permukaannya.

## Pengembangan

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint       # type check (tsc --noEmit)
npm run build      # ekspor statis ke out/
```

Situs dideploy ke GitHub Pages oleh `.github/workflows/pages.yml` setiap ada push ke `main`
(`NEXT_PUBLIC_BASE_PATH=/<nama-repo>`).

### Teknologi

- **Next.js 16** (App Router, ekspor statis), **React 19**, **Tailwind CSS 4**, Base UI, Zustand, lucide-react.
- **three.js** + react-three-fiber/drei untuk 3D; tekstur kardus dan flute prosedural.
- motion/react + Lenis untuk animasi landing; semua menghormati `prefers-reduced-motion`.
- jsPDF untuk ekspor PDF, lz-string untuk link publik.

### Arsitektur singkat

- `src/lib/solid.ts` — pembangun bentuk 3D low-poly: loft, selubung cembung, silinder, benda putar, tabung melengkung, elipsoid.
- `src/lib/geometry/unfold.ts` — bongkar 3D → 2D: las titik, gabung segitiga sebidang (sisi berlubang dipecah), pohon rentang dengan deteksi tumpang tindih, tab lem otomatis.
- `src/lib/kit.ts` — pembangun pola fungsional: menggabungkan bangun 3D, kotak berpintu/berlubang, profil ekstrusi, dan lembaran lepas (sekat silang, papan, jaring) dengan pose akhirnya.
- `src/lib/geometry/resolve.ts` — garis potong/lipat, pasangan tepi bernomor, sudut tab otomatis, validasi.
- `src/lib/templates-*.ts` — katalog model per kelompok.

## Lisensi

[MIT](LICENSE) © 2026 farishiddiq
