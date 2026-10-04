RCS.CBS HOPE — HOTFIX V106 LOGO & STATUS

PERBAIKAN
- Logo kartu diubah menjadi data image sebelum SVG/PNG dibuat, sehingga tidak lagi tampil sebagai ikon gambar rusak.
- Jika logo gagal dimuat, kartu memakai fallback “RCS”, bukan broken-image.
- Trigger nomor registrasi dipastikan hanya berjalan saat pendaftaran baru (INSERT).
- Status Aktif tidak dapat kembali sendiri menjadi Menunggu Verifikasi.
- Admin tetap dapat mengubah status secara sengaja melalui dropdown panel.

LANGKAH
1. Push index.html dan app-v102.js ke GitHub.
2. Simpan hotfix-v106-logo-status-stability.sql di repo.
3. Jalankan hotfix-v106-logo-status-stability.sql satu kali di Supabase SQL Editor.
4. Deploy ulang Vercel dan lakukan hard refresh.
