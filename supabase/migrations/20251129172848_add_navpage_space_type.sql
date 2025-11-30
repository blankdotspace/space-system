-- Add navPage spaceType to spaceRegistrations
-- This allows navigation items to reference Spaces for pages like homePage/explorePage

-- Update the spaceType constraint to include 'navPage'
-- Note: The constraint is named 'valid_space_type' (created in earlier migrations)
ALTER TABLE "public"."spaceRegistrations"
    DROP CONSTRAINT IF EXISTS valid_space_type;

ALTER TABLE "public"."spaceRegistrations"
    ADD CONSTRAINT valid_space_type CHECK (
        "spaceType" IN ('profile', 'token', 'proposal', 'channel', 'navPage')
    );

-- Add comment explaining navPage usage
COMMENT ON COLUMN "public"."spaceRegistrations"."spaceType" IS 
'Type of space: profile (user profile), token (token page), proposal (governance proposal), channel (Farcaster channel), navPage (navigation page like homePage/explorePage)';

