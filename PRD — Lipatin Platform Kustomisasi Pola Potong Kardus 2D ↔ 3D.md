# PRD — Lipatin: Platform Kustomisasi Pola Potong Kardus 2D ↔ 3D

Oct 21, 2026 · @faris shiddiq

## 1. Ringkasan Produk

Lipatin adalah web app untuk merancang pola potong kardus (dieline) secara kustom, melihat hasil lipatannya dalam 3D yang realistis, dan sebaliknya membongkar model 3D jadi menjadi pola 2D siap potong. Targetnya: siapa pun bisa membuat kerajinan, kemasan, mainan, atau furnitur kardus tanpa harus paham geometri atau software CAD.

**Masalah yang diselesaikan**

- Pola kardus di internet kebanyakan berupa gambar statis; ukurannya tidak bisa diubah dan sering tidak presisi.
- Pemula sulit membayangkan bentuk 3D dari pola 2D, sehingga banyak kardus terbuang karena salah potong atau salah lipat.
- Ketebalan kardus (1,5–7 mm) jarang diperhitungkan, padahal itu membuat sambungan longgar atau tidak bisa menutup.
- Software CAD kemasan (misalnya ArtiosCAD) mahal dan terlalu rumit untuk hobi, sekolah, atau UMKM.

**Nilai utama:** desain → lihat 3D → sesuaikan → cetak/potong, dalam satu tempat, langsung di browser.

## 2. Tujuan & Metrik Keberhasilan

Dalam 6 bulan setelah peluncuran MVP, Lipatin harus membuktikan bahwa pengguna awam bisa menghasilkan pola kardus yang benar-benar jadi saat dirakit.

| Tujuan | Metrik | Target 6 bulan |
| --- | --- | --- |
| Pengguna berhasil membuat pola | % sesi editor yang berakhir dengan export PDF/SVG | ≥ 35% |
| Pola akurat saat dirakit | Rating "berhasil dirakit" dari pengguna | ≥ 4,2 / 5 |
| Fitur 3D dipakai | % proyek yang dibuka di preview 3D | ≥ 80% |
| Fitur unfold dipakai | Jumlah model 3D yang dibongkar ke 2D per bulan | ≥ 2.000 |
| Pertumbuhan | Pengguna aktif bulanan (MAU) | 20.000 |
| Komunitas | Template baru dari pengguna per bulan | ≥ 300 |
| Bisnis | Konversi free → Pro | ≥ 3% |
| Performa | Waktu muat editor (koneksi 4G) | < 3 detik |

## 3. Target Pengguna & Persona

Pengguna utama adalah penghobi dan pendidik; UMKM kemasan menjadi sumber pendapatan Pro.

| Persona | Profil | Kebutuhan utama | Hambatan saat ini |
| --- | --- | --- | --- |
| Rina, penghobi DIY | 27 th, konten kreator kerajinan | Pola unik yang cepat dibuat, hasil 3D untuk konten | Pola online tidak bisa diubah ukurannya |
| Pak Budi, guru SD/SMP | Mengajar prakarya & STEAM | Template sederhana, instruksi langkah demi langkah, cetak A4 | Siswa sering salah potong; sulit menjelaskan jaring-jaring bangun ruang |
| Dimas, pemilik UMKM | Jual kue/aksesoris, butuh kotak kemasan | Kotak custom sesuai ukuran produk, file untuk percetakan | Jasa desain dieline mahal, minimum order tinggi |
| Sari, maker/desainer | Membuat furnitur & mainan kardus besar | Kontrol presisi, sambungan slot, ketebalan material, export DXF untuk laser/plotter | Software CAD mahal dan rumit |
| Anak & orang tua | Usia 7–12 bersama orang tua | Proyek seru (rumah-rumahan, robot, kostum), mode mudah | Butuh panduan visual, bukan angka |

## 4. Ruang Lingkup

MVP fokus pada siklus inti: template parametrik → editor 2D → preview 3D realistis → export siap cetak, ditambah unfold dari bentuk dasar.

**Masuk MVP**

- Galeri ±50 template parametrik (kotak, kotak tutup, piramida, prisma, silinder segi-banyak, rumah, kendaraan sederhana, origami kardus dasar).
- Editor 2D: garis potong, garis lipat (gunung/lembah), tab lem, slot, ukuran, ketebalan material.
- Preview 3D realistis dengan animasi lipat dan tekstur kardus.
- Unfold 3D → 2D dari bentuk primitif dan file OBJ/STL low-poly (≤ 500 sisi).
- Export PDF (ditiling ke A4/A3/F4), SVG, PNG.
- Akun, simpan proyek, berbagi link publik.

**Fase berikutnya (bukan MVP)**

- Unfold model kompleks (> 500 sisi) dan dari foto/AI.
- Export DXF untuk mesin laser/plotter, nesting otomatis di lembar besar.
- Komunitas: like, komentar, remix, tantangan bulanan.
- Instruksi rakit otomatis (langkah demi langkah) dan mode AR di HP.
- Kolaborasi real-time, marketplace template berbayar.

**Di luar cakupan**

- Pemesanan cetak/potong fisik oleh Lipatin sendiri (hanya integrasi mitra di fase akhir).
- Simulasi kekuatan struktur (beban/tekanan) secara fisika penuh.

## 5. Fitur Utama & Kebutuhan Fungsional

Tujuh modul membentuk produk; modul A–E wajib untuk MVP. Prioritas: P0 = wajib MVP, P1 = segera setelah MVP, P2 = nanti.

### A. Galeri Template Parametrik

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| A1 | Katalog template per kategori: kemasan, origami kardus, mainan, rumah/miniatur, furnitur, edukasi (bangun ruang), dekorasi, kostum | P0 |
| A2 | Setiap template punya parameter yang bisa diubah: panjang, lebar, tinggi, jumlah sisi, lebar tab lem, jenis tutup | P0 |
| A3 | Pratinjau 3D mini (bisa diputar) di kartu template | P0 |
| A4 | Filter: tingkat kesulitan, waktu rakit, ukuran kardus yang dibutuhkan, usia | P0 |
| A5 | Pencarian teks dan tag | P0 |
| A6 | Template kemasan standar FEFCO/ECMA (RSC, tuck-end, mailer box) | P1 |

### B. Editor Pola 2D

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| B1 | Kanvas dengan grid, snap, penggaris, satuan mm/cm/inci | P0 |
| B2 | Alat gambar: garis, polyline, persegi, lingkaran, busur, bezier | P0 |
| B3 | Jenis garis berbeda warna: potong (hitam solid), lipat gunung (merah putus-putus), lipat lembah (biru putus-titik), perforasi, score | P0 |
| B4 | Alat khusus kardus: tab lem otomatis di tepi terpilih, slot sambungan (lebar = ketebalan kardus), lubang jari, sobekan | P0 |
| B5 | Pengaturan material: jenis (single wall, double wall, karton dupleks, karton tebal), ketebalan mm, arah flute | P0 |
| B6 | Kompensasi ketebalan otomatis pada garis lipat dan slot | P0 |
| B7 | Dimensi & label ukuran tampil di kanvas; edit angka langsung | P0 |
| B8 | Layer: potong, lipat, gambar/hiasan, teks | P1 |
| B9 | Undo/redo tanpa batas per sesi, riwayat versi tersimpan | P0 |
| B10 | Validasi pola: deteksi garis tidak tertutup, panel bertumpuk, lipatan yang tidak bisa menutup, dan beri peringatan | P0 |
| B11 | Tambah gambar/teks/warna di permukaan (untuk desain kemasan yang dicetak) | P1 |
| B12 | Import SVG/DXF pola yang sudah ada | P1 |

### C. Preview 3D Realistis (2D → 3D)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| C1 | Perubahan di editor 2D langsung tercermin di 3D (split view, jeda < 300 ms) | P0 |
| C2 | Slider animasi lipat 0–100% dan tombol putar animasi rakit | P0 |
| C3 | Material realistis: tekstur kardus cokelat/putih, tepi bergelombang (flute) terlihat, ketebalan nyata, bayangan | P0 |
| C4 | Kontrol kamera: putar, zoom, geser, tampilan depan/atas/samping | P0 |
| C5 | Deteksi tabrakan panel saat dilipat dan tandai merah | P1 |
| C6 | Mode lingkungan: meja kerja, studio putih, ruangan; skala pembanding (tangan, koin, kaleng) | P1 |
| C7 | Render screenshot resolusi tinggi dan video putar 360° untuk konten | P1 |
| C8 | Lihat di AR melalui HP (WebXR / Quick Look) | P2 |

### D. Bongkar 3D → 2D (Unfold)

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| D1 | Bangun model 3D dari bentuk primitif (kubus, prisma, piramida, silinder, kerucut, bola low-poly) lalu gabungkan | P0 |
| D2 | Import model 3D (OBJ, STL, GLB) dengan penyederhanaan otomatis ke jumlah sisi target | P0 |
| D3 | Unfold otomatis menjadi jaring-jaring tanpa panel bertumpuk; bila perlu dipecah menjadi beberapa bagian | P0 |
| D4 | Pengguna bisa memilih manual tepi mana yang dipotong/dilipat, lalu unfold diperbarui | P1 |
| D5 | Penomoran pasangan tepi (1↔1, 2↔2) agar mudah dirakit | P0 |
| D6 | Mode konstruksi: shell (lipat permukaan), slice (irisan bertumpuk), waffle/interlock (slot silang) | P1 |
| D7 | Ambil referensi dari template/karya publik yang sudah jadi lalu bongkar menjadi pola yang bisa diedit | P0 |
| D8 | Generate model 3D dari foto atau teks (AI), lalu unfold | P2 |

### E. Export & Cetak

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| E1 | PDF skala 1:1 dengan tiling otomatis ke A4/A3/F4/Letter, tanda sambung antar halaman, kotak kalibrasi 10 cm | P0 |
| E2 | SVG dengan layer terpisah per jenis garis | P0 |
| E3 | PNG resolusi tinggi dan lembar instruksi bergambar | P0 |
| E4 | DXF untuk laser cutter, Cricut, Silhouette, plotter | P1 |
| E5 | Nesting otomatis: susun beberapa bagian di ukuran kardus yang dimiliki pengguna, tampilkan % sisa | P1 |
| E6 | Daftar bahan: ukuran kardus minimum, jumlah lembar, lem, alat | P0 |

### F. Panduan Rakit

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| F1 | Langkah rakit otomatis dari urutan lipatan, dengan animasi 3D per langkah | P1 |
| F2 | Mode tampilan HP saat merakit (tombol besar, langkah berikutnya) | P1 |
| F3 | Tips keselamatan alat potong untuk mode anak | P0 |

### G. Akun, Proyek & Komunitas

| ID | Kebutuhan | Prioritas |
| --- | --- | --- |
| G1 | Daftar/masuk dengan email dan Google | P0 |
| G2 | Simpan proyek, folder, duplikat, riwayat versi | P0 |
| G3 | Bagikan link publik (lihat 3D tanpa login) | P0 |
| G4 | Unggah karya ke galeri komunitas dengan foto hasil nyata | P1 |
| G5 | Remix karya orang lain dengan atribusi otomatis | P1 |
| G6 | Like, komentar, simpan, ikuti kreator, tantangan bulanan | P1 |
| G7 | Ruang kelas: guru membuat tugas, siswa mengumpulkan proyek | P2 |

## 6. Alur Pengguna

&#91;embedded content: alur pengguna · 2 jalur masuk, 1 titik cek 3D\]

Pengguna mulai dari template (2D → 3D) atau dari model 3D yang dibongkar (3D → 2D); keduanya berakhir di editor yang sama. Preview 3D adalah titik cek wajib sebelum export, dan karya di galeri komunitas bisa di-remix kembali ke editor.

## 7. Kebutuhan Non-Fungsional

| Aspek | Kebutuhan |
| --- | --- |
| Performa | Editor siap pakai < 3 detik di 4G; preview 3D ≥ 45 fps di laptop menengah, ≥ 30 fps di HP Android kelas menengah |
| Akurasi | Deviasi ukuran export PDF ≤ 0,5 mm per 100 mm; kotak kalibrasi wajib di setiap PDF |
| Unfold | Model ≤ 500 sisi selesai di-unfold < 5 detik di browser (Web Worker) |
| Perangkat | Desktop penuh (Chrome, Edge, Firefox, Safari 2 versi terakhir); tablet penuh; HP untuk lihat 3D, galeri, dan panduan rakit (edit ringan) |
| Offline | Proyek yang sedang dibuka tetap bisa diedit saat koneksi putus, sinkron saat kembali online |
| Bahasa | Bahasa Indonesia dan Inggris sejak MVP |
| Aksesibilitas | WCAG 2.1 AA untuk UI; jenis garis dibedakan pola + warna (aman buta warna) |
| Keamanan | HTTPS, autentikasi berbasis token, validasi & sanitasi file upload (SVG/OBJ/STL), batas ukuran upload 50 MB |
| Privasi | Proyek default privat; kepatuhan UU PDP; akun anak < 13 th memerlukan persetujuan orang tua |
| Ketersediaan | Uptime 99,5%; autosave tiap 10 detik |
| Skalabilitas | Siap 50.000 MAU tanpa perubahan arsitektur; aset statis lewat CDN |

## 8. Arsitektur Teknis

&#91;embedded content: arsitektur, 3 lapisan, 12 komponen\]

Mesin geometri (lipat, unfold, validasi, kompensasi ketebalan) ditulis sekali dalam TypeScript dan dipakai bersama oleh editor 2D dan viewer 3D, sehingga keduanya selalu sinkron. Model di atas 500 sisi dan render HD dikirim ke worker Python lewat antrean job.

- **Frontend:** Next.js + React, Zustand untuk state, react-three-fiber + drei untuk 3D, Paper.js atau SVG murni untuk kanvas 2D.
- **Algoritma unfold:** spanning tree dari graf dual mesh + deteksi tumpang tindih, dipecah menjadi beberapa bagian bila perlu; penyederhanaan mesh dengan quadric decimation.
- **Realisme 3D:** material PBR dengan tekstur kardus, tepi tebal yang memperlihatkan flute, ambient occlusion, bayangan lembut, pencahayaan HDRI studio.
- **Hosting:** Vercel untuk frontend, layanan kontainer (Railway, Fly.io, atau GCP Cloud Run) untuk API dan worker, Sentry + PostHog untuk error dan analitik.

## 9. Model Data

Inti datanya adalah satu struktur geometri yang sama untuk 2D dan 3D: panel (poligon) yang dihubungkan oleh tepi bertipe lipat, potong, atau tab. Dari struktur ini editor menggambar pola 2D dan viewer menghitung lipatan 3D.

| Entitas | Atribut utama |
| --- | --- |
| User | id, nama, email, peran (umum/guru/siswa/admin), paket (free/pro/edu), bahasa, tanggal lahir (untuk mode anak) |
| Project | id, owner\_id, judul, visibilitas (privat/link/publik), material\_id, unit, template\_id?, parent\_project\_id? (remix), dibuat/diubah |
| ProjectVersion | id, project\_id, nomor versi, snapshot geometri (JSON), thumbnail, catatan |
| Geometry (JSON) | panels\[\] (id, poligon titik 2D, warna/gambar), edges\[\] (id, panel\_a, panel\_b?, tipe: cut/mountain/valley/perforation/tab/slot, sudut lipat target), annotations\[\] |
| Material | id, nama, ketebalan mm, jenis flute, tekstur, warna |
| Template | id, judul, kategori, tingkat kesulitan, skrip parameter, parameter default, waktu rakit, usia |
| Model3D | id, project\_id, file asli (OBJ/STL/GLB), jumlah sisi, mesh tersederhanakan |
| Export | id, project\_id, format, ukuran kertas, file URL, dibuat |
| CommunityPost | id, project\_id, foto hasil\[\], deskripsi, tag\[\], like\_count, remix\_count |
| Comment | id, post\_id, user\_id, isi, dibuat |
| Classroom (P2) | id, guru\_id, nama, kode gabung, tugas\[\] |

## 10. UI/UX & Struktur Halaman

Prinsip desain: visual dulu, angka kemudian. Pemula cukup menggeser slider dan melihat 3D; pengguna mahir bisa membuka panel presisi.

| Halaman | Isi utama |
| --- | --- |
| Beranda | Hero dengan model 3D berputar yang sedang dilipat, CTA "Mulai dari template" dan "Bongkar model 3D", karya komunitas pilihan |
| Galeri Template | Grid kartu dengan pratinjau 3D, filter kategori/kesulitan/usia, pencarian |
| Editor (Studio) | Toolbar kiri (alat gambar & alat kardus), kanvas 2D tengah, viewer 3D kanan (bisa dibesarkan/diperkecil), panel properti (parameter, material, ukuran), slider lipat di bawah viewer |
| Unfold Studio | Viewer 3D model, panel penyederhanaan mesh, tombol "Bongkar", hasil jaring-jaring 2D berdampingan, pilihan mode shell/slice/waffle |
| Export | Pratinjau halaman cetak, pilihan kertas & format, daftar bahan, tombol unduh |
| Panduan Rakit | Langkah bergambar + animasi 3D, mode layar penuh untuk HP |
| Komunitas | Feed karya, halaman detail karya (3D + foto nyata + tombol remix), profil kreator |
| Dashboard | Proyek saya, folder, riwayat, status paket |

**Detail interaksi penting**

- Klik panel di 3D menyorot panel yang sama di 2D, dan sebaliknya.
- Mode Mudah (default untuk anak dan pemula) menyembunyikan alat bezier, layer, dan angka presisi.
- Onboarding 60 detik: pilih template kotak → ubah ukuran → lihat lipatan → export.
- Gaya visual hangat bernuansa kardus (krem, cokelat, aksen oranye), ikon tebal, mendukung mode gelap.

## 11. Monetisasi

Freemium: semua orang bisa merancang dan mencetak gratis; fitur produksi dan bisnis masuk paket berbayar. Harga di bawah adalah usulan awal yang perlu divalidasi.

| Paket | Harga usulan | Isi |
| --- | --- | --- |
| Gratis | Rp0 | 10 proyek tersimpan, semua template dasar, export PDF/PNG (dengan watermark kecil), unfold ≤ 200 sisi |
| Pro | Rp49.000/bulan | Proyek tanpa batas, tanpa watermark, export SVG/DXF, nesting, unfold ≤ 2.000 sisi, render HD & video 360° |
| Bisnis | Rp149.000/bulan | Semua Pro + template kemasan FEFCO, cetak desain di permukaan, kolaborasi tim 5 orang, lisensi komersial |
| Edukasi | Rp500.000/tahun per sekolah | Ruang kelas, akun siswa tanpa batas, modul bangun ruang sesuai kurikulum |

Pendapatan tambahan: marketplace template premium (bagi hasil 70% kreator / 30% Lipatin) dan komisi dari mitra jasa cetak/potong kardus.

## 12. Roadmap Rilis

&#91;embedded content: roadmap, 4 fase dalam 12 bulan, 3 gerbang\]

Setiap fase hanya dimulai bila gerbang sebelumnya terpenuhi. Asumsi tim inti: 1 PM, 1 desainer, 3 engineer frontend/3D, 1 engineer backend, 1 kreator template.

## 13. Risiko & Pertanyaan Terbuka

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Unfold model kompleks menghasilkan panel bertumpuk atau terlalu banyak bagian | Tinggi | Batasi jumlah sisi, penyederhanaan mesh otomatis, pemecahan bagian otomatis, edit tepi manual (D4) |
| Hasil cetak tidak presisi karena printer menskala halaman | Tinggi | Kotak kalibrasi 10 cm, instruksi "cetak 100% / ukuran asli", deteksi skala lewat foto (P2) |
| Ketebalan kardus membuat model tidak menutup rapat | Sedang | Kompensasi ketebalan otomatis (B6), profil material siap pakai, uji rakit tiap template |
| Preview 3D berat di HP murah | Sedang | Level detail adaptif, tekstur terkompresi, mode ringan tanpa bayangan |
| Pelanggaran hak cipta (karakter/merek di galeri komunitas) | Sedang | Tombol lapor, moderasi, kebijakan konten jelas |
| Keamanan anak saat memotong | Sedang | Tips keselamatan, mode anak, saran pendampingan orang tua |
| Retensi rendah setelah satu proyek | Sedang | Tantangan bulanan, koleksi template musiman, notifikasi karya remix |

**Pertanyaan terbuka**

- [x] Nama produk final dan domain ("Lipatin" masih nama kerja).
- [x] Pasar awal: hobi & edukasi dulu, atau langsung UMKM kemasan?
- [x] Unfold berjalan sepenuhnya di browser, atau di server untuk model besar?
- [x] Siapa yang membuat dan menguji 50 template awal (tim internal atau kreator mitra)?
- [x] Perlu aplikasi mobile native, atau PWA sudah cukup?
- [x] Mitra jasa potong/cetak kardus mana yang dijajaki untuk fase akhir?
