RCS.CBS HOPE — UX Refresh v101

Perubahan utama:
- Form pendaftaran menjadi wizard 3 langkah dengan validasi per langkah.
- Navigasi bawah mobile: Beranda, Daftar, Cek Kartu, dan Jejak.
- Hero mobile dipadatkan agar aksi utama lebih cepat terlihat.
- Status sukses diperjelas sebagai Menunggu Verifikasi.
- Aksesibilitas ditingkatkan: skip link, focus state, label/id, aria-current, aria-busy.
- Gambar base64 dikeluarkan dari index.html menjadi aset eksternal.
- index.html turun dari sekitar 1,95 MB menjadi sekitar 20 KB.
- app.js dan app-v99.js duplikat/tidak terpakai dihapus; app-v100.js tetap menjadi aplikasi utama.

File baru:
- styles-v101.css
- ux-v101.js

Deploy seperti paket sebelumnya. Pastikan semua file dan folder assets ikut terunggah.
