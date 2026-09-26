RCS.CBS HOPE — Supabase Keep Alive via cron-job.org

STATUS
Metode ini langsung memanggil Supabase dan tidak membutuhkan Vercel Function,
Vercel Cron, atau CRON_SECRET.

SUPABASE
1. Buka Supabase Dashboard → SQL Editor.
2. Jalankan isi file: supabase/keepalive.sql

CRON-JOB.ORG
- URL: https://PROJECT_ID.supabase.co/rest/v1/rpc/keep_alive
- Method: POST
- Schedule: Every 1 hour
- Request body: {}

Request headers:
- apikey: ANON_KEY_SUPABASE
- Authorization: Bearer ANON_KEY_SUPABASE
- Content-Type: application/json

Gunakan anon/public key, jangan service_role key.
Test yang berhasil memberikan status 200 OK dan respons JSON kecil.
