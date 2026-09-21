RCS.CBS HOPE — v56 perbaikan lintas-perangkat

Replace/upload ONLY these files in the repository root:
- index.html
- app.js
- styles.css

Do NOT replace config.js; keep the existing Supabase configuration.
After commit, wait for Vercel to show Ready, then open:
https://rcscbshope.vercel.app/?v=56

Perbaikan:
- Tetap memakai insert publik tanpa .select() (fix RLS v54).
- Jika config Supabase gagal dimuat, aplikasi tidak lagi diam-diam menyimpan ke localStorage/demo.
- HP lama tanpa createImageBitmap sekarang memakai kompresi foto fallback.
- Ada fallback UUID untuk browser lama.
- Error koneksi tampil jelas agar pengguna tahu harus memuat ulang, bukan mengira data masuk.
- Tombol dan petunjuk grup WhatsApp tetap tersedia.
