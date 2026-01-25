-- Add domain authorization fields to community_configs
ALTER TABLE "public"."community_configs"
ADD COLUMN IF NOT EXISTS "custom_domain_authorized" BOOLEAN DEFAULT false;

ALTER TABLE "public"."community_configs"
ADD COLUMN IF NOT EXISTS "admin_email" TEXT;

-- Map domains to communities (blank subdomain + custom domain)
CREATE TABLE IF NOT EXISTS "public"."community_domains" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "community_id" VARCHAR(50) NOT NULL REFERENCES "public"."community_configs"("community_id") ON DELETE CASCADE,
    "domain" TEXT NOT NULL UNIQUE,
    "domain_type" TEXT NOT NULL CHECK ("domain_type" IN ('blank_subdomain', 'custom')),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_community_domains_community_id" ON "public"."community_domains"("community_id");
CREATE INDEX IF NOT EXISTS "idx_community_domains_domain_type" ON "public"."community_domains"("domain_type");
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_community_domains_type" ON "public"."community_domains"("community_id", "domain_type");

-- Enable Row Level Security for community_domains
ALTER TABLE "public"."community_domains" ENABLE ROW LEVEL SECURITY;

-- Backfill domain mappings for existing communities with domain-like IDs
INSERT INTO "public"."community_domains" ("community_id", "domain", "domain_type")
SELECT
    "community_id",
    "community_id",
    CASE
        WHEN "community_id" LIKE '%.blank.space' THEN 'blank_subdomain'
        ELSE 'custom'
    END
FROM "public"."community_configs"
WHERE "community_id" LIKE '%.%'
ON CONFLICT DO NOTHING;

-- Policy: Anyone can read domain mappings (needed for domain resolution)
DROP POLICY IF EXISTS "Allow public read of community domains" ON "public"."community_domains";
CREATE POLICY "Allow public read of community domains"
ON "public"."community_domains"
FOR SELECT
TO public
USING (true);

-- Policy: Service role can do anything (backend/admin operations)
DROP POLICY IF EXISTS "Service role has full access to community domains" ON "public"."community_domains";
CREATE POLICY "Service role has full access to community domains"
ON "public"."community_domains"
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Grant read access (RLS still applies)
GRANT SELECT ON "public"."community_domains" TO authenticated;
GRANT SELECT ON "public"."community_domains" TO anon;
