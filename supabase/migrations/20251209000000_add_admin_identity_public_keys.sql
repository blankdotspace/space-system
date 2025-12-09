-- Add admin_identity_public_keys column to community_configs table
-- This stores the identityPublicKey values of users who can edit navigation pages

ALTER TABLE "public"."community_configs"
ADD COLUMN IF NOT EXISTS "admin_identity_public_keys" TEXT[] DEFAULT '{}';

-- Update the get_active_community_config function to include the new field
CREATE OR REPLACE FUNCTION "public"."get_active_community_config"(
    p_community_id VARCHAR(50)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_config JSONB;
BEGIN
    SELECT jsonb_build_object(
        'brand', "brand_config",
        'assets', "assets_config",
        'community', "community_config",
        'fidgets', "fidgets_config",
        'navigation', "navigation_config",
        'ui', "ui_config",
        'adminIdentityPublicKeys', "admin_identity_public_keys"
    )
    INTO v_config
    FROM "public"."community_configs"
    WHERE "community_id" = p_community_id
    AND "is_published" = true
    ORDER BY "updated_at" DESC
    LIMIT 1;
    
    RETURN v_config;
END;
$$;

-- Add comment for documentation
COMMENT ON COLUMN "public"."community_configs"."admin_identity_public_keys" IS 
'Array of identityPublicKey values for users who can edit navigation pages for this community';
