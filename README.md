# RCS.CBS HOPE — Portal Anggota

Website mandiri untuk pendaftaran anak, verifikasi QR, dashboard pengurus, dan kartu anggota siap cetak.

## Isi paket

- `index.html` — halaman website utama
- `styles.css` — desain responsive modern formal
- `app-v100.js` — form, verifikasi, dashboard, QR, peta jejak, countdown 100 tahun, dan cetak PDF
- `config.js` — isi URL dan anon key Supabase di sini
- `supabase/schema.sql` — tabel, trigger nomor registrasi, RLS, view verifikasi, dan storage foto
- `netlify.toml` — konfigurasi deploy Netlify
- `assets/logo.jpg` — logo RCS.CBS HOPE

## 1. Siapkan Supabase

1. Buat project di Supabase.
2. Buka **SQL Editor**.
3. Jalankan SQL berikut secara berurutan:
   - `supabase/schema.sql`
   - `hotfix-v97-competencies.sql`
   - `hotfix-v100-journey-map.sql`
   - `hotfix-v101-security.sql`
4. Di **Project Settings > API**, salin `Project URL` dan `anon public key`.
5. Tempel ke `config.js`:

```js
window.RCS_CONFIG = {
  supabaseUrl: "https://PROJECT_ID.supabase.co",
  supabaseAnonKey: "PASTE_ANON_PUBLIC_KEY",
  siteUrl: "https://NAMA-SITE.netlify.app"
};
```

Jangan memasukkan `service_role key` ke website.

## 2. Buat akun pengurus

1. Supabase → **Authentication → Users → Add user**.
2. Buat email dan password pengurus.
3. Salin UUID user tersebut.
4. Jalankan di SQL Editor:

```sql
insert into public.admin_users (user_id, display_name)
values ('UUID_USER_PENGURUS', 'Pengurus RCS.CBS HOPE');
```

## 3. Uji lokal

Buka folder ini melalui static server, misalnya:

```bash
python3 -m http.server 4173
```

Lalu buka `http://localhost:4173`.

Jika `config.js` belum diisi, website berjalan dalam **mode preview** menggunakan localStorage. Data mode preview bukan data produksi.

## 4. Upload ke GitHub

Buat repository baru, lalu dari folder proyek jalankan:

```bash
git init
git add .
git commit -m "Initial RCS.CBS HOPE member portal"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git push -u origin main
```

## 5. Deploy ke Netlify

1. Netlify → **Add new site → Import an existing project**.
2. Pilih repository GitHub.
3. Build command: kosongkan.
4. Publish directory: `.`
5. Deploy.
6. Setelah mendapat URL Netlify, update `siteUrl` di `config.js`, commit, dan push lagi.

Jika project Supabase sudah dibuat dari schema versi sebelumnya, jalankan
`hotfix-v101-security.sql` sekali. Hotfix ini mengunci status pendaftaran,
token publik, nomor registrasi, timestamp, serta upload foto dari request
manual yang tidak tepercaya.

## Catatan keamanan

- Website hanya menampilkan data dasar pada halaman verifikasi QR.
- Dashboard pengurus menggunakan Supabase Auth.
- Foto dibuat public agar kartu/QR dapat menampilkan foto. Jika ingin privasi lebih ketat, ubah bucket menjadi private dan gunakan signed URL.
- Karena data anak sensitif, bagikan akses dashboard hanya kepada pengurus yang berwenang.
