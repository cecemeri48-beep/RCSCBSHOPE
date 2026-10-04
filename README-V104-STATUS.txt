RCS.CBS HOPE — HOTFIX V104 STATUS ADMIN

FILE YANG PERLU DI-PUSH KE GITHUB
- index.html
- app-v102.js

LANGKAH WAJIB DI SUPABASE
1. Buka Supabase Dashboard → SQL Editor.
2. Jalankan seluruh isi hotfix-v104-admin-status.sql satu kali.
3. Pastikan akun login admin tercatat di tabel public.admin_users.
4. Deploy ulang Vercel, lalu hard refresh browser.

HASIL PERBAIKAN
- index.html sekarang benar-benar memuat app-v102.js (sebelumnya masih app-v100.js).
- Perubahan status memakai RPC admin khusus dan memverifikasi hasil penyimpanan.
- Jika fungsi SQL belum dipasang atau akun bukan admin, panel menampilkan pesan yang jelas.
- Dropdown kembali ke status sebelumnya bila penyimpanan gagal.
