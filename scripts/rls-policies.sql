-- RLS Policies for collections, fan_tiers, messages
-- Defense-in-depth: protects against direct Supabase API access with anon key
-- The admin client (service role) bypasses RLS by default

-- ============================================
-- COLLECTIONS TABLE
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Performers read own collections" ON collections;
DROP POLICY IF EXISTS "Allow collection inserts" ON collections;

-- Performers can read collections for their claimed performer
CREATE POLICY "Performers read own collections" ON collections
  FOR SELECT USING (
    performer_id IN (SELECT id FROM performers WHERE claimed_by = auth.uid())
  );

-- Allow inserts on collections (needed for Phase 2 fan capture via anon key)
-- Phase 2 will tighten this with proper checks
CREATE POLICY "Allow collection inserts" ON collections
  FOR INSERT WITH CHECK (true);

-- ============================================
-- FAN_TIERS TABLE
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Performers read own fan_tiers" ON fan_tiers;
DROP POLICY IF EXISTS "Allow fan_tier inserts" ON fan_tiers;
DROP POLICY IF EXISTS "Allow fan_tier updates" ON fan_tiers;

-- Performers can read fan_tiers for their claimed performer
CREATE POLICY "Performers read own fan_tiers" ON fan_tiers
  FOR SELECT USING (
    performer_id IN (SELECT id FROM performers WHERE claimed_by = auth.uid())
  );

-- Allow inserts on fan_tiers (needed for Phase 2 fan capture)
CREATE POLICY "Allow fan_tier inserts" ON fan_tiers
  FOR INSERT WITH CHECK (true);

-- Allow updates on fan_tiers (needed for Phase 2 tier progression)
CREATE POLICY "Allow fan_tier updates" ON fan_tiers
  FOR UPDATE USING (true);

-- ============================================
-- MESSAGES TABLE
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Performers read own messages" ON messages;
DROP POLICY IF EXISTS "Performers insert own messages" ON messages;

-- Performers can read their own messages
CREATE POLICY "Performers read own messages" ON messages
  FOR SELECT USING (
    performer_id IN (SELECT id FROM performers WHERE claimed_by = auth.uid())
  );

-- Performers can insert messages for their claimed performer
CREATE POLICY "Performers insert own messages" ON messages
  FOR INSERT WITH CHECK (
    performer_id IN (SELECT id FROM performers WHERE claimed_by = auth.uid())
  );
