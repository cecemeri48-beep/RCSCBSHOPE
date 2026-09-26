RCS.CBS HOPE — v16 daily database health check

Replace/upload ONLY:
- index.html
- app-v100.js
- styles.css
- jejak.html
- album.html
- album.css
- album.js
- album-data.js
- logo-album-transparent.png
- memory-cover.jpg
- jejak.css
- jejak.js
- jejak.webmanifest
- jejak-sw.js
- vercel.json
- api/keep-alive.js
- supabase/keepalive.sql
- README-KEEPALIVE.txt
- thumbnail-jejak.jpg
- jejak-universe.jpg

Do NOT replace config.js.
After commit and Vercel Ready, open the production URL with a fresh query parameter.

Perubahan v16:
- Vercel Cron memanggil /api/keep-alive sekali setiap hari.
- Endpoint menjalankan satu RPC Supabase yang sangat ringan.
- Tidak membaca/menulis tabel anggota dan tidak mengekspos data pribadi.
- Mendukung CRON_SECRET serta timeout 12 detik.
- Ditambahkan panduan lengkap README-KEEPALIVE.txt.
- Visual dan suara mini app v15 tetap dipertahankan.

WAJIB setelah push:
1. Jalankan supabase/keepalive.sql di Supabase SQL Editor.
2. Isi SUPABASE_URL, SUPABASE_ANON_KEY, dan CRON_SECRET di Vercel.
3. Redeploy lalu cek Cron Jobs dan Function Logs.
