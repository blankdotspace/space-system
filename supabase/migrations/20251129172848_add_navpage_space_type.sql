-- Add navPage spaceType to spaceRegistrations
-- This allows navigation items to reference Spaces for pages like homePage/explorePage

-- First, drop the existing constraint (this allows us to modify data if needed)
ALTER TABLE "public"."spaceRegistrations"
    DROP CONSTRAINT IF EXISTS valid_space_type;

-- Restore navPage rows that were temporarily converted to 'profile' by the channel migration
-- This handles the case where seed.sql created navPage rows before migrations ran
-- We identify them by checking for system-owned spaces with specific names
UPDATE "public"."spaceRegistrations"
SET "spaceType" = 'navPage'
WHERE "spaceType" = 'profile'
  AND "identityPublicKey" = 'system'
  AND "spaceName" IN ('nouns-home', 'nouns-explore', 'clanker-home');

-- Fix any remaining invalid values (including NULLs)
UPDATE "public"."spaceRegistrations"
SET "spaceType" = 'profile'
WHERE "spaceType" IS NULL 
   OR "spaceType" NOT IN ('profile', 'token', 'proposal', 'channel', 'navPage');

-- Now add the new constraint that includes navPage
ALTER TABLE "public"."spaceRegistrations"
    ADD CONSTRAINT valid_space_type CHECK (
        "spaceType" IN ('profile', 'token', 'proposal', 'channel', 'navPage')
    );

-- Add comment explaining navPage usage
COMMENT ON COLUMN "public"."spaceRegistrations"."spaceType" IS 
'Type of space: profile (user profile), token (token page), proposal (governance proposal), channel (Farcaster channel), navPage (navigation page like homePage/explorePage)';

