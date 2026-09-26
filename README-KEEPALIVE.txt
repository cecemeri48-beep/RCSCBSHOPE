RCS.CBS HOPE — Supabase Health Check via Vercel Cron

TUJUAN
- Menjalankan satu query ringan ke database setiap hari.
- Mendeteksi Supabase bermasalah melalui Vercel Function Logs.
- Tidak membaca/menulis tabel anggota dan tidak mengekspos data pribadi.

LANGKAH 1 — SUPABASE
1. Buka Supabase Dashboard → SQL Editor.
2. Jalankan isi file: supabase/keepalive.sql
3. Pastikan fungsi public.keep_alive berhasil dibuat.

LANGKAH 2 — VERCEL ENVIRONMENT VARIABLES
Tambahkan di Project Settings → Environment Variables (Production):
- SUPABASE_URL       = URL proyek Supabase, contoh https://xxxx.supabase.co
- SUPABASE_ANON_KEY  = anon/public key proyek Supabase
- CRON_SECRET        = string acak panjang (disarankan 32+ karakter)

Jangan menaruh service_role key di file proyek atau browser.

LANGKAH 3 — DEPLOY
Push seluruh paket ini. File vercel.json akan mendaftarkan cron:
- Endpoint: /api/keep-alive
- Jadwal: setiap hari sekitar 03:17 UTC

Pada Vercel Hobby, cron harian bisa dijalankan pada waktu mana pun di dalam jam tersebut.

LANGKAH 4 — CEK
- Vercel Dashboard → Project → Cron Jobs: pastikan /api/keep-alive terdaftar.
- Setelah cron berjalan, buka Functions/Runtime Logs dan cari respons status 200.
- Jika 401: cek CRON_SECRET.
- Jika 500: cek SUPABASE_URL dan SUPABASE_ANON_KEY.
- Jika 502/404 RPC: jalankan kembali supabase/keepalive.sql.

CATATAN
Ini adalah health check ringan dan masuk akal, bukan traffic palsu berulang-ulang.
Supabase Free tetap tidak memberi jaminan anti-pause. Solusi resmi yang menjamin proyek
tidak dipause adalah memakai paket berbayar Supabase.
