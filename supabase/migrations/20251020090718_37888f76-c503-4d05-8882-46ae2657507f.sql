-- 移除造成無限遞迴的 RLS 政策
DROP POLICY IF EXISTS "Email is only visible to profile owner" ON public.profiles;

-- 這個政策已經足夠保護資料，因為 "Users can view their own profile" 政策
-- 會確保使用者只能看到自己的 profile（包含 email 欄位）