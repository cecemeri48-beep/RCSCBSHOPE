RCS.CBS HOPE — v22 optimized audio bundle

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
- README-MUSIC.txt
- lingkaran-aku-cinta-padamu.mp3
- wish-you-were-here.mp3
- my-way.mp3
- thumbnail-jejak.jpg
- jejak-universe.jpg

Do NOT replace config.js.
After commit and Vercel Ready, open the production URL with a fresh query parameter.

Perubahan v22:
- Ketiga lagu pengguna sudah disertakan di root proyek.
- Semua audio dikonversi ke MP3 96 kbps dan dinormalkan untuk mobile.
- Audio tetap preload none dan hanya dimuat setelah foto diketuk.
- Audio tidak disimpan di Service Worker cache agar penyimpanan ponsel tetap ringan.
- Cache halaman dinaikkan ke v22.
