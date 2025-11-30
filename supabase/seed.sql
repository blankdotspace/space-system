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

-- Nouns community config
INSERT INTO "public"."community_configs" (
    "community_id",
    "version",
    "is_active",
    "is_published",
    "brand_config",
    "assets_config",
    "community_config",
    "fidgets_config",
    "navigation_config",
    "ui_config"
) VALUES (
    'nouns',
    1,
    true,
    true,
    '{"name": "Nouns", "displayName": "Nouns", "tagline": "A space for Nouns", "description": "The social hub for Nouns", "miniAppTags": ["nouns", "client", "customizable", "social", "link"]}'::jsonb,
    '{"logos": {"main": "/images/nouns/logo.svg", "icon": "/images/nouns/noggles.svg", "favicon": "/images/favicon.ico", "appleTouch": "/images/apple-touch-icon.png", "og": "/images/nouns/og.svg", "splash": "/images/nouns/splash.svg"}}'::jsonb,
    '{"type": "nouns", "urls": {"website": "https://nouns.com", "discord": "https://discord.gg/nouns", "twitter": "https://twitter.com/nounsdao", "github": "https://github.com/nounsDAO", "forum": "https://discourse.nouns.wtf"}, "social": {"farcaster": "nouns", "discord": "nouns", "twitter": "nounsdao"}, "governance": {"proposals": "https://nouns.wtf/vote", "delegates": "https://nouns.wtf/delegates", "treasury": "https://nouns.wtf/treasury"}, "tokens": {"erc20Tokens": [{"address": "0x48C6740BcF807d6C47C864FaEEA15Ed4dA3910Ab", "symbol": "$SPACE", "decimals": 18, "network": "base"}], "nftTokens": [{"address": "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03", "symbol": "Nouns", "type": "erc721", "network": "eth"}]}, "contracts": {"nouns": "0x9c8ff314c9bc7f6e59a9d9225fb22946427edc03", "auctionHouse": "0x830bd73e4184cef73443c15111a1df14e495c706", "space": "0x48C6740BcF807d6C47C864FaEEA15Ed4dA3910Ab", "nogs": "0xD094D5D45c06c1581f5f429462eE7cCe72215616"}}'::jsonb,
    '{"enabled": ["nounsHome", "governance", "feed", "cast", "gallery", "text", "iframe", "links", "video", "channel", "profile", "snapshot", "swap", "rss", "market", "portfolio", "chat", "builderScore", "framesV2"], "disabled": ["example"]}'::jsonb,
    '{"logoTooltip": {"text": "wtf is nouns?", "href": "https://nouns.wtf"}, "items": [{"id": "home", "label": "Home", "href": "/home", "icon": "home"}, {"id": "explore", "label": "Explore", "href": "/explore", "icon": "explore"}, {"id": "notifications", "label": "Notifications", "href": "/notifications", "icon": "notifications", "requiresAuth": true}, {"id": "space-token", "label": "$SPACE", "href": "/t/base/0x48C6740BcF807d6C47C864FaEEA15Ed4dA3910Ab/Profile", "icon": "space"}], "showMusicPlayer": true, "showSocials": true}'::jsonb,
    '{"primaryColor": "rgb(37, 99, 235)", "primaryHoverColor": "rgb(29, 78, 216)", "primaryActiveColor": "rgb(30, 64, 175)", "castButton": {"backgroundColor": "rgb(37, 99, 235)", "hoverColor": "rgb(29, 78, 216)", "activeColor": "rgb(30, 64, 175)"}}'::jsonb
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
    "version",
    "is_active",
    "is_published",
    "brand_config",
    "assets_config",
    "community_config",
    "fidgets_config",
    "navigation_config",
    "ui_config"
) VALUES (
    'example',
    1,
    true,
    true,
    '{"name": "Example", "displayName": "Example Community", "tagline": "A space for Example Community", "description": "The social hub for Example Community", "miniAppTags": []}'::jsonb,
    '{"logos": {"main": "/images/example_logo.png", "icon": "/images/example_icon.png", "favicon": "/images/example_favicon.ico", "appleTouch": "/images/example_apple_touch.png", "og": "/images/example_og.png", "splash": "/images/example_splash.png"}}'::jsonb,
    '{"type": "example", "urls": {"website": "https://example.com", "discord": "https://discord.gg/example", "twitter": "https://twitter.com/example", "github": "https://github.com/example", "forum": "https://forum.example.com"}, "social": {"farcaster": "example", "discord": "example", "twitter": "example"}, "governance": {"proposals": "https://governance.example.com/proposals", "delegates": "https://governance.example.com/delegates", "treasury": "https://governance.example.com/treasury"}, "tokens": {"erc20Tokens": [{"address": "0x1234567890123456789012345678901234567890", "symbol": "$EXAMPLE", "decimals": 18, "network": "mainnet"}], "nftTokens": [{"address": "0x1234567890123456789012345678901234567890", "symbol": "Example NFT", "type": "erc721", "network": "eth"}]}, "contracts": {"nouns": "0x1234567890123456789012345678901234567890", "auctionHouse": "0x1234567890123456789012345678901234567890", "space": "0x1234567890123456789012345678901234567890", "nogs": "0x1234567890123456789012345678901234567890"}}'::jsonb,
    '{"enabled": ["feed", "cast", "gallery", "text", "iframe", "links", "video", "channel", "profile", "swap", "rss", "market", "portfolio", "chat", "framesV2"], "disabled": ["example", "nounsHome", "governance", "snapshot", "builderScore"]}'::jsonb,
    NULL,
    '{"primaryColor": "rgb(37, 99, 235)", "primaryHoverColor": "rgb(29, 78, 216)", "primaryActiveColor": "rgb(30, 64, 175)", "castButton": {"backgroundColor": "rgb(37, 99, 235)", "hoverColor": "rgb(29, 78, 216)", "activeColor": "rgb(30, 64, 175)"}}'::jsonb
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
    "version",
    "is_active",
    "is_published",
    "brand_config",
    "assets_config",
    "community_config",
    "fidgets_config",
    "navigation_config",
    "ui_config"
) VALUES (
    'clanker',
    1,
    true,
    true,
    '{"name": "clanker", "displayName": "Clanker", "tagline": "Clank Clank", "description": "Explore, launch and trade tokens in the Clanker ecosystem. Create your own tokens and discover trending projects in the community-driven token economy."}'::jsonb,
    '{"logos": {"main": "/images/clanker/logo.svg", "icon": "/images/clanker/logo.svg", "favicon": "/images/clanker/favicon.ico", "appleTouch": "/images/clanker/apple.png", "og": "/images/clanker/og.jpg", "splash": "/images/clanker/og.jpg"}}'::jsonb,
    '{"type": "token_platform", "urls": {"website": "https://clanker.world", "discord": "https://discord.gg/clanker", "twitter": "https://twitter.com/clankerworld", "github": "https://github.com/clanker", "forum": "https://forum.clanker.world"}, "social": {"farcaster": "clanker", "discord": "clanker", "twitter": "clankerworld"}, "governance": {"proposals": "https://proposals.clanker.world", "delegates": "https://delegates.clanker.world", "treasury": "https://treasury.clanker.world"}, "tokens": {"erc20Tokens": [{"address": "0x1bc0c42215582d5a085795f4badbac3ff36d1bcb", "symbol": "$CLANKER", "decimals": 18, "network": "base"}], "nftTokens": []}, "contracts": {"clanker": "0x1bc0c42215582d5a085795f4badbac3ff36d1bcb", "tokenFactory": "0x0000000000000000000000000000000000000000", "space": "0x0000000000000000000000000000000000000000", "trading": "0x0000000000000000000000000000000000000000", "nouns": "0x0000000000000000000000000000000000000000", "auctionHouse": "0x0000000000000000000000000000000000000000", "nogs": "0x0000000000000000000000000000000000000000"}}'::jsonb,
    '{"enabled": ["Market", "Portfolio", "Swap", "feed", "cast", "gallery", "text", "iframe", "links", "Video", "Chat", "BuilderScore", "FramesV2", "Rss", "SnapShot"], "disabled": ["nounsHome", "governance"]}'::jsonb,
    '{"logoTooltip": {"text": "clanker.world", "href": "https://www.clanker.world"}, "items": [{"id": "home", "label": "Home", "href": "/home", "icon": "home"}, {"id": "notifications", "label": "Notifications", "href": "/notifications", "icon": "notifications", "requiresAuth": true}, {"id": "clanker-token", "label": "$CLANKER", "href": "/t/base/0x1bc0c42215582d5a085795f4badbac3ff36d1bcb/Profile", "icon": "robot"}], "showMusicPlayer": false, "showSocials": false}'::jsonb,
    '{"primaryColor": "rgba(136, 131, 252, 1)", "primaryHoverColor": "rgba(116, 111, 232, 1)", "primaryActiveColor": "rgba(96, 91, 212, 1)", "castButton": {"backgroundColor": "rgba(136, 131, 252, 1)", "hoverColor": "rgba(116, 111, 232, 1)", "activeColor": "rgba(96, 91, 212, 1)"}}'::jsonb
) ON CONFLICT ("community_id") DO UPDATE SET
    "brand_config" = EXCLUDED."brand_config",
    "assets_config" = EXCLUDED."assets_config",
    "community_config" = EXCLUDED."community_config",
    "fidgets_config" = EXCLUDED."fidgets_config",
    "navigation_config" = EXCLUDED."navigation_config",
    "ui_config" = EXCLUDED."ui_config",
    "updated_at" = now();

