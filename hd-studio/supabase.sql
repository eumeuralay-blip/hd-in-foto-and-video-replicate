-- Jalankan di Supabase: SQL Editor -> New query -> Run
create table generations(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('image','video','sticker')),
  prediction_id text unique, prompt text,
  status text not null default 'processing', output_url text,
  created_at timestamptz default now());
create index on generations(user_id, kind, created_at desc);

create table chat_messages(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null, created_at timestamptz default now());
create index on chat_messages(user_id, created_at desc);

alter table generations enable row level security;
alter table chat_messages enable row level security;
-- User cuma bisa BACA/HAPUS data sendiri. Tulis hanya lewat server (service role), jadi limit tidak bisa dicurangi.
create policy "gen read" on generations for select using (auth.uid() = user_id);
create policy "gen delete" on generations for delete using (auth.uid() = user_id);
create policy "chat read" on chat_messages for select using (auth.uid() = user_id);
create policy "chat delete" on chat_messages for delete using (auth.uid() = user_id);

insert into storage.buckets (id, name, public) values ('results','results',true) on conflict do nothing;
