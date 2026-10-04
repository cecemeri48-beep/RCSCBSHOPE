RCS.CBS HOPE — HOTFIX V105 NOMOR KARTU

ISI PAKET PATCH GITHUB
- index.html
- app-v102.js
- hotfix-v104-admin-status.sql
- hotfix-v105-card-number-visibility.sql

LANGKAH WAJIB
1. Timpa/push file di atas ke GitHub.
2. Jalankan hotfix-v104-admin-status.sql jika belum pernah dijalankan.
3. Jalankan hotfix-v105-card-number-visibility.sql di Supabase SQL Editor.
4. Tunggu deploy Vercel selesai, lalu hard refresh browser.

LOGIKA SETELAH DIPERBAIKI
- Verifikasi memakai nama: kode terakhir tetap menjadi •••••• dan fitur download tidak tersedia.
- Verifikasi memakai kode kartu, nomor lengkap, atau QR: nomor tampil lengkap di sisi depan dan belakang, termasuk PDF/PNG yang diunduh.
- Pratinjau kartu dari panel admin: nomor tampil lengkap.
