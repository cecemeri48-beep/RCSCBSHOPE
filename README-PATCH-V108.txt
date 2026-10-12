PATCH V108 — UPLOAD FOTO BISA DICUBIT / DIGESER
=============================================
Lanjutan dari patch v107. ZIP hanya berisi 5 file yang berubah/baru kali ini.
Tidak menyertakan ulang foto/aset, config.js, worker atau SQL dari v107.

ISI
- index.html              : timpa file lama
- app-v102.js             : timpa file lama; isinya sudah v108
- photo-editor-v108.js    : file baru
- photo-editor-v108.css   : file baru
- README-PATCH-V108.txt   : panduan ini

PRASYARAT PENTING
Pasang patch v107 dari paket sebelumnya, termasuk menjalankan
hotfix-v107-registration-delete.sql di Supabase SQL Editor, sebelum v108.
Jika v107 sudah terpasang, tidak ada SQL baru dan tidak perlu mengulang SQL.
app-v102.js di paket ini tetap menggunakan RPC pendaftaran/hapus dari v107.
Jangan memasang v108 sendiri di proyek awal yang belum memakai v107.

CARA PASANG
1. Backup/commit repository yang sudah memakai v107.
2. Ekstrak 5 file ke root repository lama (sejajar config.js), lalu overwrite.
   Jangan hapus file proyek lainnya. Kedua file photo-editor harus ikut di-push.
3. Commit dan push:
   git add index.html app-v102.js photo-editor-v108.js photo-editor-v108.css README-PATCH-V108.txt
   git commit -m "Add pinch zoom, pan and crop to member photo uploads"
   git push
4. Setelah deploy selesai, tutup tab lama dan buka situs dengan ?v=108.
   Lakukan hard refresh jika perlu.

CARA MEMAKAI
- Pilih foto JPG/PNG/WebP (maksimal 5 MB) pada form pendaftaran.
- Editor muncul di bawah input foto.
- Cubit dengan 2 jari: buka jari untuk memperbesar, rapatkan untuk memperkecil.
- Geser dengan 1 jari untuk mengatur posisi wajah dalam bingkai.
- Bisa juga memakai slider Zoom foto dan tombol + / - (100% sampai 400%).
- Reset posisi mengembalikan posisi tengah dan zoom awal.
- Ganti foto membuka pemilih file kembali.
- Tidak ada tombol crop tambahan: hasil bingkai otomatis dipakai saat
  "Kirim data anggota" atau "Simpan perubahan".
- Foto baru pada Edit anggota di panel admin memakai editor yang sama.
  Foto lama tidak diubah otomatis. Pilih ulang file jika ingin mengatur ulang.

HASIL YANG DISIMPAN
Hasil crop benar-benar dibuat di browser sebagai JPEG 1200 x 1440 piksel
(rasio 5:6 sesuai foto kartu), lalu hasil itulah yang diunggah ke Storage.
Bukan hanya pembesaran CSS/pratinjau. Batas zoom minimum mengisi bingkai
sehingga tidak ada pinggir kosong. Slider dan keyboard tersedia di desktop:
klik bingkai, gunakan panah untuk geser; + / - untuk zoom; Shift+panah
untuk langkah geser lebih besar. Scroll mouse di atas foto juga mengubah zoom.
Foto sumber di perangkat pengguna tidak ditimpa atau diubah.

PERAPIHAN LAIN
- Pesan kesalahan foto dibersihkan setelah foto pengganti berhasil dibuka.
- Foto rusak/format tidak sesuai/lebih dari 5 MB ditolak.
- Bingkai direset saat formulir direset atau foto diganti.
- Editor memenuhi lebar form pada desktop.
- Modal edit admin dinaikkan di atas navigasi ponsel agar tombol simpan
  tidak tertutup saat editor foto membuat formulir lebih panjang.
- Perbaikan pendaftaran/hapus/cache dari v107 tetap dipertahankan.

VERIFIKASI LOKAL
13 uji foto lolos di Chromium, termasuk simulasi sentuhan dua jari membesar/
mengecil, satu jari menggeser, slider/batas zoom, reset, keyboard, crop JPEG,
foto rusak/besar, penggantian portrait, submit pendaftaran dan edit foto admin.
13 uji regresi pendaftaran/hapus/cache/admin juga tetap lolos menggunakan
backend simulasi. JavaScript lolos node --check dan pratinjau mobile/desktop
sudah diperiksa. Hasil crop diverifikasi berdimensi 1200 x 1440 piksel.
Belum diuji pada Supabase/situs produksi Anda atau semua perangkat fisik.
Setelah deploy, uji di HP Anda: pilih foto, cubit, geser, kirim dan cek foto
hasilnya di panel admin/kartu; lalu uji Ganti foto melalui Edit anggota.
