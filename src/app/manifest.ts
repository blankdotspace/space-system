import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nounspace',
    short_name: 'Nounspace',
    description: 'The customizable web3 social app built on Farcaster',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: '/app/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/app/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
