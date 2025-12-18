-- Enable Row Level Security on community_configs table
ALTER TABLE "public"."community_configs" ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read published configs
-- This allows the frontend to load community configurations
CREATE POLICY "Allow public read of published configs"
ON "public"."community_configs"
FOR SELECT
TO public
USING (is_published = true);

-- Policy: Service role can do anything (for backend/admin operations)
-- This allows seeding, admin management, and other backend operations
CREATE POLICY "Service role has full access"
ON "public"."community_configs"
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Note: INSERT, UPDATE, DELETE are implicitly denied for anon/authenticated roles
-- because there are no policies granting those operations.
-- 
-- The get_active_community_config function uses SECURITY DEFINER, which means
-- it runs with the privileges of the function owner (bypassing RLS), ensuring
-- it can always read configs regardless of the calling user's role.
--
-- To modify community_configs (add admins, update nav items, etc.):
-- 1. Use direct database access with service role key
-- 2. Create an admin API endpoint that uses service role
-- 3. Or create RPC functions with SECURITY DEFINER for specific admin operations

-- Future: If we want authenticated admins to modify configs via the client,
-- we can create an RPC function like this:
--
-- CREATE OR REPLACE FUNCTION "public"."update_community_config_as_admin"(
--     p_community_id VARCHAR(50),
--     p_identity_public_key TEXT,
--     p_updates JSONB
-- )
-- RETURNS JSONB
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- AS $$
-- DECLARE
--     v_is_admin BOOLEAN;
--     v_result JSONB;
-- BEGIN
--     -- Check if the identity is an admin for this community
--     SELECT p_identity_public_key = ANY(admin_identity_public_keys)
--     INTO v_is_admin
--     FROM "public"."community_configs"
--     WHERE community_id = p_community_id;
--     
--     IF NOT v_is_admin THEN
--         RAISE EXCEPTION 'Not authorized: identity is not an admin for this community';
--     END IF;
--     
--     -- Apply updates (implement specific update logic here)
--     -- ...
--     
--     RETURN v_result;
-- END;
-- $$;
