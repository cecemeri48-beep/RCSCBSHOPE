RCS.CBS HOPE — v18 mobile cache refresh

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
- supabase/keepalive.sql
- README-KEEPALIVE.txt
- thumbnail-jejak.jpg
- jejak-universe.jpg

Do NOT replace config.js.
After commit and Vercel Ready, open the production URL with a fresh query parameter.

Perubahan v18:
- Teks dan tautan Google Drive tetap dihapus sepenuhnya.
- Semua tautan album/mini app diberi versi v18 untuk melewati cache lama di mobile.
- Service Worker memakai cache baru rcs-jejak-v18.
- Navigasi HTML sekarang network-first agar perubahan berikutnya tidak tertahan cache lama.
- Aset statis tetap cache-first agar mini app cepat dan hemat data.
