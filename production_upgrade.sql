-- Phase 2: Database Expansion

-- 1. Create History Table
create table if not exists history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  series_id uuid references series(id) on delete cascade not null,
  chapter_number numeric not null,
  read_at timestamp with time zone default now(),
  unique(user_id, series_id, chapter_number) -- Prevent duplicate entries for same chapter read
);

-- 2. Enable RLS for History
alter table history enable row level security;

-- 3. RLS Policies for History
-- Users can see their own history
create policy "Users can view their own history" on history
  for select using (auth.uid() = user_id);

-- Users can insert their own history
create policy "Users can insert their own history" on history
  for insert with check (auth.uid() = user_id);

-- Users can update their own history
create policy "Users can update their own history" on history
  for update using (auth.uid() = user_id);

-- 4. Enable RLS for Bookmarks (Ensure it's enabled)
alter table bookmarks enable row level security;

-- 5. RLS Policies for Bookmarks (Ensure strict ownership)
-- Drop existing potential loose policies to be safe, or just add "if not exists" logic
-- For simplicity in this script, we assume standard policies need to be asserted.

create policy "Users can view their own bookmarks" on bookmarks
  for select using (auth.uid() = user_id);

create policy "Users can insert their own bookmarks" on bookmarks
  for insert with check (auth.uid() = user_id);

create policy "Users can delete their own bookmarks" on bookmarks
  for delete using (auth.uid() = user_id);
