RCS.CBS HOPE — V102

PERUBAHAN UTAMA
1. Contoh nama diganti menjadi “Mang Odong”.
2. Syarat pendaftaran diperjelas: hanya keluarga/keturunan anggota Reichas Chelebes.
3. Kolom cek identitas menerima nama, nomor registrasi, kode kartu, dan QR.
4. Pencarian nama hanya menampilkan satu hasil aktif yang unik.
5. Hasil pencarian nama memakai mode lihat-saja: tanpa simpan, unduh, bagikan, atau QR.
6. Deret terakhir nomor kartu anggota aktif dimasking menjadi ••••••.
7. Nomor kartu juga dimasking pada tampilan, pratinjau, PDF, dan PNG.
8. Token publik tidak dikembalikan oleh server untuk pencarian nama.

WAJIB SAAT DEPLOY
1. Unggah seluruh isi folder ini.
2. Jalankan hotfix-v102-name-search.sql di Supabase SQL Editor setelah hotfix v100 dan v101.
3. Pastikan index.html memuat app-v102.js.
4. Bersihkan cache CDN/browser setelah deploy.

HASIL PENGUJIAN
- Sintaks JavaScript: lulus.
- Mode pencarian nama: tombol simpan/unduh/bagikan tidak dirender.
- QR tidak dirender pada pencarian nama.
- Pencarian dengan kredensial kartu tetap memiliki fitur unduh/simpan/bagikan.
- Masking deret terakhir nomor kartu: lulus.
- Visual desktop dan mobile: diperiksa, tanpa overflow horizontal atau tabrakan elemen pada state yang diuji.
