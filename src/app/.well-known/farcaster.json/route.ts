import { getMetadata } from '../../../constants/metadata';

function withValidProperties(properties: Record<string, undefined | string | string[]>) {
  return Object.fromEntries(
    Object.entries(properties).filter(([_, value]) => (Array.isArray(value) ? value.length > 0 : !!value))
  );
}

export async function GET() {
  const metadata = await getMetadata();
  const URL = process.env.NEXT_PUBLIC_URL as string;
  const envTags = process.env.NEXT_PUBLIC_APP_TAGS
    ?.split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
  return Response.json({
    accountAssociation: {
      header: process.env.FARCASTER_HEADER,
      payload: process.env.FARCASTER_PAYLOAD,
      signature: process.env.FARCASTER_SIGNATURE,
    },
    miniapp: withValidProperties({
      version: '1',
      imageUrl: metadata.APP_OG_IMAGE || process.env.NEXT_PUBLIC_APP_OG_IMAGE,
      buttonTitle: metadata.APP_NAME || process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
      name: metadata.APP_NAME || process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
      subtitle: metadata.APP_SUBTITLE || process.env.NEXT_PUBLIC_APP_SUBTITLE,
      description: metadata.APP_DESCRIPTION || process.env.NEXT_PUBLIC_APP_DESCRIPTION,
      screenshotUrls: [],
      iconUrl: metadata.APP_ICON || process.env.NEXT_PUBLIC_APP_ICON,
      splashImageUrl: metadata.APP_SPLASH_IMAGE || process.env.NEXT_PUBLIC_APP_SPLASH_IMAGE,
      splashBackgroundColor: metadata.SPLASH_BACKGROUND_COLOR || process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR,
      homeUrl: URL,
      webhookUrl: `${URL}/api/webhook`,
      primaryCategory: metadata.APP_PRIMARY_CATEGORY || process.env.NEXT_PUBLIC_APP_PRIMARY_CATEGORY,
      tags: metadata.APP_TAGS && metadata.APP_TAGS.length > 0 ? metadata.APP_TAGS : envTags,
      heroImageUrl: metadata.APP_HERO_IMAGE || process.env.NEXT_PUBLIC_APP_HERO_IMAGE,
      tagline: metadata.APP_TAGLINE || process.env.NEXT_PUBLIC_APP_TAGLINE,
      ogTitle: metadata.APP_OG_TITLE || process.env.NEXT_PUBLIC_APP_OG_TITLE,
      ogDescription: metadata.APP_OG_DESCRIPTION || process.env.NEXT_PUBLIC_APP_OG_DESCRIPTION,
      ogImageUrl: metadata.APP_OG_IMAGE || process.env.NEXT_PUBLIC_APP_OG_IMAGE,
      // use only while testing
      // noindex: 'true',
    }),
    baseBuilder: {
      allowedAddresses: ["0x857Ba87e094BF962D0B933bBf2C706893e14d3bE"]
    }
  });
}