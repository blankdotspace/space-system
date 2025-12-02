-- Add support for channel spaces
ALTER TABLE "public"."spaceRegistrations"
    ADD COLUMN IF NOT EXISTS "channelId" text;

-- Ensure we only store valid space types, including channels
-- Note: If navPage rows exist (from seed.sql), temporarily convert them to 'profile'
-- The navPage migration will handle converting them back properly
ALTER TABLE "public"."spaceRegistrations"
    DROP CONSTRAINT IF EXISTS valid_space_type;

-- Temporarily handle navPage rows (in case seed.sql ran before migrations)
-- Also handle any other unexpected values by converting them to 'profile'
UPDATE "public"."spaceRegistrations"
SET "spaceType" = 'profile'
WHERE "spaceType" IS NULL 
   OR "spaceType" NOT IN ('profile', 'token', 'proposal', 'channel');

-- Now add the constraint for the current allowed types
-- This will succeed because all invalid values have been converted
ALTER TABLE "public"."spaceRegistrations"
    ADD CONSTRAINT valid_space_type CHECK (
        "spaceType" IN ('profile', 'token', 'proposal', 'channel')
    );

-- Prevent duplicate registrations for the same channel
-- Using a partial unique index allows NULLs while ensuring uniqueness for non-NULL values
CREATE UNIQUE INDEX IF NOT EXISTS "spaceRegistrations_channelId_key"
    ON public."spaceRegistrations" ("channelId")
    WHERE "channelId" IS NOT NULL;
