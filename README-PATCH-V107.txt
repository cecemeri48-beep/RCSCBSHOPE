PATCH V107 — PENDAFTARAN + HAPUS ANGGOTA
=====================================
Paket ini hanya berisi file yang perlu ditambahkan/ditimpa, bukan seluruh proyek.

ISI (5 FILE)
1. index.html                            — timpa file lama
2. app-v102.js                           — timpa file lama (isi sudah v107)
3. jejak-sw.js                           — timpa file lama
4. hotfix-v107-registration-delete.sql   — file baru; jalankan di Supabase
5. README-PATCH-V107.txt                 — panduan ini

CARA PASANG — URUTAN PENTING
1. Simpan cadangan/commit proyek dan backup database sebelum memasang.
2. Buka proyek Supabase yang sama dengan supabaseUrl di config.js.
3. SQL Editor -> New query. Salin SELURUH isi
   hotfix-v107-registration-delete.sql lalu klik Run.
   Untuk database proyek yang sudah berjalan; tidak perlu menjalankan ulang
   schema.sql atau hotfix lama. Jika fungsi/tabel prasyarat belum ada,
   hentikan pemasangan frontend dan lengkapi setup schema proyek terlebih dulu.
   Skrip mempertahankan data anggota dan daftar admin yang sudah ada.
4. Ekstrak 5 file ke ROOT repository lama (sejajar config.js), lalu overwrite.
   Jangan mengganti repository dengan isi ZIP ini: aset/file lain tetap diperlukan.
5. Commit dan push, misalnya:
   git add index.html app-v102.js jejak-sw.js hotfix-v107-registration-delete.sql README-PATCH-V107.txt
   git commit -m "Fix member registration, delete confirmation and stale PWA cache"
   git push
6. Tunggu deploy selesai. Tutup tab lama, lalu buka alamat situs dengan
   ?v=107 (contoh: https://ALAMAT-SITUS/?v=107) dan lakukan hard refresh.
   Worker lama diperbarui dan cache API lama dibersihkan otomatis sebelum
   permintaan database. Koneksi internet diperlukan untuk pembaruan ini.

PENTING
- Hanya push SQL ke GitHub TIDAK menjalankan SQL di Supabase.
- Jangan deploy frontend sebelum SQL berhasil, karena frontend memakai
  dua RPC baru: submit_member_registration dan admin_delete_member.
- config.js, foto, CSS, album dan aset lain tidak perlu diubah/dipush ulang.
- Login Supabase saja belum cukup: UUID akun pengurus harus ada di admin_users.
  Jika login menampilkan "tidak memiliki izin admin", cek akun WEBSITE yang
  digunakan (bukan otomatis akun Notion).

CEK AKUN ADMIN (OPSIONAL, JALANKAN MANUAL OLEH PEMILIK SUPABASE)
Ganti EMAIL_ADMIN_WEBSITE dengan email akun pengurus yang memang dipercaya:

select u.id, u.email, (a.user_id is not null) as terdaftar_admin
from auth.users u
left join public.admin_users a on a.user_id = u.id
where lower(u.email) = lower('EMAIL_ADMIN_WEBSITE');

Hanya jika akun tersebut memang seharusnya menjadi admin dan belum terdaftar:

insert into public.admin_users (user_id, display_name)
select id, 'Pengurus RCS.CBS HOPE'
from auth.users
where lower(email) = lower('EMAIL_ADMIN_WEBSITE')
on conflict (user_id) do nothing;

APA YANG DIPERBAIKI
- Worker v28 menyimpan semua respons GET, termasuk respons Supabase berisi
  data anggota. Jika pernah membuka Jejak, worker scope root dapat ikut
  mengendalikan halaman pendaftaran/admin. Gejala ini berhasil direproduksi
  secara lokal: database berubah, tetapi browser tetap membaca data lama.
- Worker baru tidak meng-cache backend/API/auth atau permintaan cross-origin.
  Cache hanya untuk daftar file publik Jejak/Album. Cache versi lama dibuang.
- Pendaftaran menerima bukti INSERT dari server sebelum menampilkan sukses.
  Tidak menambahkan izin SELECT publik pada tabel anggota privat.
- RPC pendaftaran memvalidasi data dan keberadaan foto yang diunggah;
  status, token, kompetensi dan nomor registrasi tidak dipercaya dari browser.
- Hapus hanya dianggap berhasil jika server mengembalikan ID baris yang
  benar-benar dihapus; RPC mengecek izin admin. Tidak ada upsert/penulisan ulang.
- Login memeriksa is_admin. Data admin dikosongkan saat logout, dan sesi yang
  tersimpan dipulihkan setelah reload dengan pemeriksaan izin kembali.
- Refresh lama yang masih berjalan tidak boleh menimpa hasil hapus/refresh baru.
- Panel terbuka diperbarui tiap 30 detik dan saat tab kembali aktif; ada juga
  tombol refresh manual. Daftar dipaginasi agar tidak berhenti pada 1.000 data.
- Edit profil dan nomor registrasi memeriksa bahwa baris benar-benar diperbarui.

UJI LOKAL
13 skenario browser lolos menggunakan Chromium dan server backend simulasi:
reproduksi cache v28; upgrade/purge cache; login memuat data baru;
pendaftaran masuk panel; hapus baris; tetap hilang setelah refresh/reload/login;
DELETE tanpa bukti tidak sukses; pendaftaran ditolak tidak sukses;
pagination >1.000 anggota; refresh lama tidak menghidupkan ulang data;
perubahan tanpa bukti ditolak; API tidak di-cache; login non-admin ditolak.
JavaScript juga lolos node --check. Tidak ada error JavaScript tak tertangani.

BATASAN VERIFIKASI
SQL ditinjau dari schema dalam ZIP, tetapi belum dijalankan pada database
Supabase asli Anda. Kredensial/admin backend produksi tidak diakses dan
situs produksi belum diubah. Setelah SQL dan deploy, lakukan uji nyata:
- Daftarkan satu data uji dengan foto; cek di panel (semua status, tanpa filter).
- Refresh/logout/login untuk memastikan data baru tetap tersimpan.
- Hapus data uji; refresh/logout/login untuk memastikan tetap hilang.
Jika konfirmasi server timeout, data mungkin sudah tersimpan: minta admin
memeriksa dulu sebelum mengirim ulang. Tidak ada pengiriman ulang otomatis.
Hapus menghilangkan record anggota/relasi cascade; file foto di Storage tidak
ikut dihapus otomatis oleh patch ini.
