-- Create community_configs table (updated architecture: no themes/pages)
CREATE TABLE IF NOT EXISTS "public"."community_configs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "community_id" VARCHAR(50) NOT NULL UNIQUE,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    "brand_config" JSONB NOT NULL,
    "assets_config" JSONB NOT NULL,
    "community_config" JSONB NOT NULL,
    "fidgets_config" JSONB NOT NULL,
    "navigation_config" JSONB,
    "ui_config" JSONB,
    "is_published" BOOLEAN DEFAULT true
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_community_configs_community_id" ON "public"."community_configs"("community_id");
CREATE INDEX IF NOT EXISTS "idx_community_configs_published" ON "public"."community_configs"("is_published") WHERE "is_published" = true;

-- Create function to get active community config (excludes themes/pages)
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
        'ui', "ui_config"
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

-- Grant permissions
GRANT SELECT ON "public"."community_configs" TO authenticated;
GRANT SELECT ON "public"."community_configs" TO anon;
GRANT EXECUTE ON FUNCTION "public"."get_active_community_config" TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."get_active_community_config" TO anon;
