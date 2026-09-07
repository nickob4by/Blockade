-- Supabase Schema for Blockade / Quoridor
-- Run this in your Supabase Project's SQL Editor (optional, for persistent game rooms & leaderboard)

-- 1. Create game_rooms table
CREATE TABLE IF NOT EXISTS public.game_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code VARCHAR(10) UNIQUE NOT NULL,
  host_id TEXT NOT NULL,
  guest_id TEXT,
  game_state JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  winner_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;

-- 3. Open RLS policy for anonymous room play
CREATE POLICY "Allow public read and write access for game rooms"
  ON public.game_rooms
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Enable Supabase Realtime for game_rooms
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;

-- 5. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_game_rooms_modtime
    BEFORE UPDATE ON public.game_rooms
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();
