import type { MetadataRoute } from 'next'
import { loadSystemConfig } from '@/config'
import { resolveBaseUrl } from '@/common/lib/utils/resolveBaseUrl'
import { resolveAssetUrl } from '@/common/lib/utils/resolveAssetUrl'

// Force dynamic rendering so manifest is generated at request time (not build time)
// This ensures the PWA name and icons match the actual domain/community config
export const dynamic = 'force-dynamic'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const config = await loadSystemConfig()
  const baseUrl = await resolveBaseUrl({ systemConfig: config })

  // Resolve the community icon URL, falling back to default if not available
  const iconUrl = resolveAssetUrl(config.assets.logos.icon, baseUrl) ?? config.assets.logos.icon

  // Get theme color from UI config if available
  const themeColor = config.ui?.primaryColor ?? '#000000'
  const backgroundColor = config.ui?.backgroundColor ?? '#ffffff'

  return {
    name: config.brand.displayName,
    short_name: config.brand.displayName,
    description: config.brand.description,
    start_url: '/',
    display: 'standalone',
    background_color: backgroundColor,
    theme_color: themeColor,
    icons: [
      {
        src: iconUrl,
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: iconUrl,
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
