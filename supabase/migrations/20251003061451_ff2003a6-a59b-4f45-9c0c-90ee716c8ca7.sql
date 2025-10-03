-- Insert new challenges for tracking and exploration types
INSERT INTO public.challenges (title, description, challenge_type, category, target_amount, duration_days, icon, color, is_active) VALUES
-- Tracking challenges
('連續記帳 7 天', '養成每日記帳好習慣，連續 7 天不間斷記錄你的消費', 'logging', 'streak', 7, 7, 'Calendar', 'blue', true),
('本週記帳達人', '本週內累積記錄 20 筆消費，掌握每一筆支出', 'logging', 'count', 20, 7, 'ListChecks', 'purple', true),
('完整記帳月', '連續 30 天每日記帳，成為記帳達人！', 'logging', 'streak', 30, 30, 'Trophy', 'amber', true),

-- Exploration challenges
('探索 5 個地點', '到訪並記錄 5 個不同消費地點，探索你的生活圈', 'exploration', 'locations', 5, 30, 'MapPin', 'green', true),
('地圖冒險家', '探索 10 個不同消費地點，拓展你的消費版圖', 'exploration', 'locations', 10, 60, 'Map', 'emerald', true),
('跨縣市消費王', '在 3 個不同縣市留下消費足跡，成為真正的冒險家', 'exploration', 'cities', 3, 90, 'Compass', 'teal', true);

-- Add progress_data column to user_challenges for detailed tracking
ALTER TABLE public.user_challenges ADD COLUMN IF NOT EXISTS progress_data JSONB DEFAULT '{}'::jsonb;

-- Add comment to explain progress_data structure
COMMENT ON COLUMN public.user_challenges.progress_data IS 'Stores detailed progress information like visited locations, streak dates, etc.';

-- Create index on progress_data for faster queries
CREATE INDEX IF NOT EXISTS idx_user_challenges_progress_data ON public.user_challenges USING GIN (progress_data);