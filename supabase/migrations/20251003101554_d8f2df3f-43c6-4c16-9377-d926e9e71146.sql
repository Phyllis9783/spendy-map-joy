-- Fix RLS policies to allow viewing shared content

-- Allow users to view expenses that have been publicly shared
CREATE POLICY "Users can view shared expenses"
  ON expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shares 
      WHERE shares.expense_id = expenses.id 
      AND shares.is_public = true
    )
  );

-- Allow users to view public profile info (name and avatar) for users who have shared
CREATE POLICY "Users can view public profile info"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shares 
      WHERE shares.user_id = profiles.id 
      AND shares.is_public = true
    )
  );

-- Fix date issue: Update 2024 expenses to 2025
UPDATE expenses 
SET expense_date = expense_date + INTERVAL '1 year'
WHERE EXTRACT(YEAR FROM expense_date) = 2024;