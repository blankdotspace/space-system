-- Create the 'private' bucket
INSERT INTO storage.buckets 
  ("id", "name", "created_at", "updated_at", "public", "avif_autodetection")
VALUES
  ('explore', 'explore', '2024-05-21 23:43:16.762796+00', '2024-05-21 23:43:16.762796+00', false, false),
  ('private', 'private', '2024-05-21 23:43:16.762796+00', '2024-05-21 23:43:16.762796+00', true, false),
  ('spaces', 'spaces', '2024-05-21 23:43:16.762796+00', '2024-05-21 23:43:16.762796+00', true, false)
ON CONFLICT ("id") DO NOTHING;

-- Seed community configs (without themes/pages - those are in shared file and Spaces)
-- Note: Themes are in src/config/shared/themes.ts
-- Note: Pages (homePage/explorePage) are stored as Spaces with spaceType='navPage'
-- 
-- IMPORTANT: After running seed.sql, you must run the unified seed script to:
--   1. Upload Nouns assets to ImgBB
--   2. Seed community configs in the database
--   3. Upload navPage space configs to Supabase Storage
-- 
-- Run the unified seed script:
--   tsx scripts/seed.ts
-- 
-- Or check if already seeded:
--   tsx scripts/seed.ts --check

-- Create navPage spaces for each community (system-owned, fid=NULL)
-- These must be created BEFORE community_configs so they can be referenced

-- Nouns home page space
INSERT INTO "public"."spaceRegistrations" (
    "spaceId",
    "fid",
    "spaceName",
    "spaceType",
    "identityPublicKey",
    "signature",
    "timestamp"
) VALUES (
    gen_random_uuid(),
    NULL,
    'nouns-home',
    'navPage',
    'system',
    'system-seed',
    now()
) ON CONFLICT DO NOTHING;

-- Nouns explore page space
INSERT INTO "public"."spaceRegistrations" (
    "spaceId",
    "fid",
    "spaceName",
    "spaceType",
    "identityPublicKey",
    "signature",
    "timestamp"
) VALUES (
    gen_random_uuid(),
    NULL,
    'nouns-explore',
    'navPage',
    'system',
    'system-seed',
    now()
) ON CONFLICT DO NOTHING;

-- Clanker home page space
INSERT INTO "public"."spaceRegistrations" (
    "spaceId",
    "fid",
    "spaceName",
    "spaceType",
    "identityPublicKey",
    "signature",
    "timestamp"
) VALUES (
    gen_random_uuid(),
    NULL,
    'clanker-home',
    'navPage',
    'system',
    'system-seed',
    now()
) ON CONFLICT DO NOTHING;

-- Nouns community config
INSERT INTO "public"."community_configs" (
    "community_id",
    "is_published",
    "brand_config",
    "assets_config",
    "community_config",
    "fidgets_config",
    "navigation_config",
    "ui_config"
) VALUES (
    'nouns',
    true,
    '{"displayName": "Nouns", "description": "The social hub for Nouns", "miniAppTags": ["nouns", "client", "customizable", "social", "link"]}'::jsonb,
    '{"logos": {"main": "/images/nouns/logo.svg", "icon": "/images/nouns/noggles.svg", "favicon": "/images/favicon.ico", "appleTouch": "/images/apple-touch-icon.png", "og": "/images/nouns/og.svg", "splash": "/images/nouns/splash.svg"}}'::jsonb,
    '{"type": "nouns", "urls": {"website": "https://nouns.com", "discord": "https://discord.gg/nouns"}, "social": {"farcaster": "nouns"}, "governance": {}, "tokens": {"erc20Tokens": [{"address": "0x48C6740BcF807d6C47C864FaEEA15Ed4dA3910Ab", "symbol": "$SPACE", "decimals": 18, "network": "base"}], "nftTokens": [{"address": "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03", "symbol": "Nouns", "type": "erc721", "network": "eth"}]}}'::jsonb,
    '{"enabled": ["nounsHome", "governance", "feed", "cast", "gallery", "text", "iframe", "links", "Video", "channel", "profile", "SnapShot", "Swap", "Rss", "Market", "Portfolio", "Chat", "BuilderScore", "FramesV2"], "disabled": ["example"]}'::jsonb,
    -- Navigation config with spaceId references
    (SELECT jsonb_build_object(
        'logoTooltip', jsonb_build_object('text', 'wtf is nouns?', 'href', 'https://nouns.wtf'),
        'items', jsonb_build_array(
            jsonb_build_object('id', 'home', 'label', 'Home', 'href', '/home', 'icon', 'home', 'spaceId', (SELECT "spaceId"::text FROM "public"."spaceRegistrations" WHERE "spaceName" = 'nouns-home' AND "spaceType" = 'navPage' LIMIT 1)),
            jsonb_build_object('id', 'explore', 'label', 'Explore', 'href', '/explore', 'icon', 'explore', 'spaceId', (SELECT "spaceId"::text FROM "public"."spaceRegistrations" WHERE "spaceName" = 'nouns-explore' AND "spaceType" = 'navPage' LIMIT 1)),
            jsonb_build_object('id', 'notifications', 'label', 'Notifications', 'href', '/notifications', 'icon', 'notifications', 'requiresAuth', true),
            jsonb_build_object('id', 'space-token', 'label', '$SPACE', 'href', '/t/base/0x48C6740BcF807d6C47C864FaEEA15Ed4dA3910Ab/Profile', 'icon', 'space')
        ),
        'showMusicPlayer', true,
        'showSocials', true
    ))::jsonb,
    '{"primaryColor": "rgb(37, 99, 235)", "primaryHoverColor": "rgb(29, 78, 216)", "primaryActiveColor": "rgb(30, 64, 175)", "fontColor": "rgb(15, 23, 42)", "castButtonFontColor": "#ffffff", "url": "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap", "backgroundColor": "rgb(255, 255, 255)", "castButton": {"backgroundColor": "rgb(37, 99, 235)", "hoverColor": "rgb(29, 78, 216)", "activeColor": "rgb(30, 64, 175)"}}'::jsonb
) ON CONFLICT ("community_id") DO UPDATE SET
    "brand_config" = EXCLUDED."brand_config",
    "assets_config" = EXCLUDED."assets_config",
    "community_config" = EXCLUDED."community_config",
    "fidgets_config" = EXCLUDED."fidgets_config",
    "navigation_config" = EXCLUDED."navigation_config",
    "ui_config" = EXCLUDED."ui_config",
    "updated_at" = now();

-- Example community config
INSERT INTO "public"."community_configs" (
    "community_id",
    "is_published",
    "brand_config",
    "assets_config",
    "community_config",
    "fidgets_config",
    "navigation_config",
    "ui_config"
) VALUES (
    'example',
    true,
    '{"displayName": "Example Community", "description": "The social hub for Example Community", "miniAppTags": []}'::jsonb,
    '{"logos": {"main": "/images/example_logo.png", "icon": "/images/example_icon.png", "favicon": "/images/example_favicon.ico", "appleTouch": "/images/example_apple_touch.png", "og": "/images/example_og.png", "splash": "/images/example_splash.png"}}'::jsonb,
    '{"type": "example", "urls": {"website": "https://example.com", "discord": "https://discord.gg/example"}, "social": {"farcaster": "example"}, "governance": {}, "tokens": {"erc20Tokens": [{"address": "0x1234567890123456789012345678901234567890", "symbol": "$EXAMPLE", "decimals": 18, "network": "mainnet"}], "nftTokens": [{"address": "0x1234567890123456789012345678901234567890", "symbol": "Example NFT", "type": "erc721", "network": "eth"}]}}'::jsonb,
    '{"enabled": ["feed", "cast", "gallery", "text", "iframe", "links", "Video", "channel", "profile", "Swap", "Rss", "Market", "Portfolio", "Chat", "FramesV2"], "disabled": ["example", "nounsHome", "governance", "SnapShot", "BuilderScore"]}'::jsonb,
    NULL,
    '{"primaryColor": "rgb(37, 99, 235)", "primaryHoverColor": "rgb(29, 78, 216)", "primaryActiveColor": "rgb(30, 64, 175)", "fontColor": "rgb(15, 23, 42)", "castButtonFontColor": "#ffffff", "url": "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap", "backgroundColor": "rgb(255, 255, 255)", "castButton": {"backgroundColor": "rgb(37, 99, 235)", "hoverColor": "rgb(29, 78, 216)", "activeColor": "rgb(30, 64, 175)"}}'::jsonb
) ON CONFLICT ("community_id") DO UPDATE SET
    "brand_config" = EXCLUDED."brand_config",
    "assets_config" = EXCLUDED."assets_config",
    "community_config" = EXCLUDED."community_config",
    "fidgets_config" = EXCLUDED."fidgets_config",
    "navigation_config" = EXCLUDED."navigation_config",
    "ui_config" = EXCLUDED."ui_config",
    "updated_at" = now();

-- Clanker community config
INSERT INTO "public"."community_configs" (
    "community_id",
    "is_published",
    "brand_config",
    "assets_config",
    "community_config",
    "fidgets_config",
    "navigation_config",
    "ui_config"
) VALUES (
    'clanker',
    true,
    '{"displayName": "Clanker", "description": "Explore, launch and trade tokens in the Clanker ecosystem. Create your own tokens and discover trending projects in the community-driven token economy."}'::jsonb,
    '{"logos": {"main": "/images/clanker/logo.svg", "icon": "/images/clanker/logo.svg", "favicon": "/images/clanker/favicon.ico", "appleTouch": "/images/clanker/apple.png", "og": "/images/clanker/og.jpg", "splash": "/images/clanker/og.jpg"}}'::jsonb,
    '{"type": "token_platform", "urls": {"website": "https://clanker.world", "discord": "https://discord.gg/clanker"}, "social": {"farcaster": "clanker"}, "governance": {}, "tokens": {"erc20Tokens": [{"address": "0x1bc0c42215582d5a085795f4badbac3ff36d1bcb", "symbol": "$CLANKER", "decimals": 18, "network": "base"}], "nftTokens": []}}'::jsonb,
    '{"enabled": ["Market", "Portfolio", "Swap", "feed", "cast", "gallery", "text", "iframe", "links", "Video", "Chat", "BuilderScore", "FramesV2", "Rss", "SnapShot"], "disabled": ["nounsHome", "governance"]}'::jsonb,
    -- Navigation config with spaceId reference
    (SELECT jsonb_build_object(
        'logoTooltip', jsonb_build_object('text', 'clanker.world', 'href', 'https://www.clanker.world'),
        'items', jsonb_build_array(
            jsonb_build_object('id', 'home', 'label', 'Home', 'href', '/home', 'icon', 'home', 'spaceId', (SELECT "spaceId"::text FROM "public"."spaceRegistrations" WHERE "spaceName" = 'clanker-home' AND "spaceType" = 'navPage' LIMIT 1)),
            jsonb_build_object('id', 'notifications', 'label', 'Notifications', 'href', '/notifications', 'icon', 'notifications', 'requiresAuth', true),
            jsonb_build_object('id', 'clanker-token', 'label', '$CLANKER', 'href', '/t/base/0x1bc0c42215582d5a085795f4badbac3ff36d1bcb/Profile', 'icon', 'robot')
        ),
        'showMusicPlayer', false,
        'showSocials', false
    ))::jsonb,
    '{"primaryColor": "rgba(136, 131, 252, 1)", "primaryHoverColor": "rgba(116, 111, 232, 1)", "primaryActiveColor": "rgba(96, 91, 212, 1)", "fontColor": "rgb(15, 23, 42)", "castButtonFontColor": "#ffffff", "url": "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap", "backgroundColor": "rgb(255, 255, 255)", "castButton": {"backgroundColor": "rgba(136, 131, 252, 1)", "hoverColor": "rgba(116, 111, 232, 1)", "activeColor": "rgba(96, 91, 212, 1)"}}'::jsonb
) ON CONFLICT ("community_id") DO UPDATE SET
    "brand_config" = EXCLUDED."brand_config",
    "assets_config" = EXCLUDED."assets_config",
    "community_config" = EXCLUDED."community_config",
    "fidgets_config" = EXCLUDED."fidgets_config",
    "navigation_config" = EXCLUDED."navigation_config",
    "ui_config" = EXCLUDED."ui_config",
    "updated_at" = now();
