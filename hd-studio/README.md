# HD Studio
HD foto/video + sticker (Replicate) + Chat AI (Groq -> fallback OpenRouter) + login/limit/riwayat (Supabase). Deploy di Vercel.

## Setup
1. **Supabase**: buat project -> SQL Editor -> jalankan isi `supabase.sql`.
   Authentication -> URL Configuration: isi Site URL & Redirect URL dengan domain Vercel kamu.
   (Opsional Google login: Authentication -> Providers -> Google.)
2. **Vercel**: upload ke GitHub -> Import project (framework: Other) -> isi env dari `.env.example` -> Deploy.
3. Set **spending limit** di dashboard Replicate.

## Limit per akun (ubah di `LIMITS` pada api/_lib.js)
Foto 8/hari - Video 2/hari - Sticker 10/hari - Chat 30/jam

## Keamanan
Semua endpoint wajib login (token diverifikasi ke Supabase). Tulis data hanya lewat server (service role), user hanya bisa baca/hapus data sendiri (RLS). `SUPABASE_SERVICE_ROLE_KEY` JANGAN dibagikan. Ada CSP, HSTS, validasi input, cek origin.
