import bundlerAnalyzer from "@next/bundle-analyzer";
import packageInfo from "./package.json" with { type: "json" };
import { createRequire } from "node:module";
import { createClient } from '@supabase/supabase-js';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Download an asset from external URL and save to public folder
 * Returns the local path if successful, original URL if failed
 */
async function downloadAsset(url, localPath) {
  try {
    // Skip if already a local path (starts with /)
    if (url.startsWith('/')) {
      return url;
    }

    // Skip if not an HTTP(S) URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return url;
    }

    // Skip if file already exists (cache - avoids re-downloading on every build)
    if (existsSync(localPath)) {
      const publicPath = localPath.replace(join(__dirname, 'public'), '');
      console.log(`ℹ️  Using cached asset: ${publicPath}`);
      return publicPath;
    }

    // Download the file
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`⚠️  Failed to download ${url}: ${response.statusText}`);
      return url; // Return original URL as fallback
    }

    // Ensure directory exists
    const dir = dirname(localPath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    // Get file buffer
    const buffer = Buffer.from(await response.arrayBuffer());

    // Write to file
    await writeFile(localPath, buffer);

    // Return local path (relative to public folder)
    const publicPath = localPath.replace(join(__dirname, 'public'), '');
    console.log(`✅ Downloaded ${url} → ${publicPath}`);
    return publicPath;

  } catch (error) {
    console.warn(`⚠️  Error downloading ${url}:`, error.message);
    return url; // Return original URL as fallback
  }
}

/**
 * Download all external assets from config and update paths to local files
 */
async function downloadAndLocalizeAssets(config, community) {
  if (!config.assets || !config.assets.logos) {
    return config;
  }

  const assetsDir = join(__dirname, 'public', 'images', community);
  const updatedAssets = { ...config.assets };
  const logos = { ...config.assets.logos };

  // Download each logo asset
  const assetTypes = ['main', 'icon', 'favicon', 'appleTouch', 'og', 'splash'];
  
  console.log(`\n📥 Downloading assets for community: ${community}`);
  console.log(`📂 Target directory: public/images/${community}/\n`);
  
  let downloadedCount = 0;
  let cachedCount = 0;
  let skippedCount = 0;
  
  for (const assetType of assetTypes) {
    const url = logos[assetType];
    if (!url) continue;

    // Extract filename from URL or use default
    let filename = url.split('/').pop() || `${assetType}.${getExtensionFromUrl(url)}`;
    // Remove query params if any
    filename = filename.split('?')[0];
    
    // If no extension, try to infer from content-type or use common default
    if (!filename.includes('.')) {
      filename = `${filename}.${getExtensionFromUrl(url) || 'png'}`;
    }

    const localPath = join(assetsDir, filename);
    const originalUrl = logos[assetType];
    const localUrl = await downloadAsset(url, localPath);
    
    // Track statistics
    if (originalUrl.startsWith('http')) {
      if (localUrl !== originalUrl) {
        // Successfully downloaded and localized
        if (existsSync(localPath)) {
          downloadedCount++;
        } else {
          cachedCount++;
        }
      } else {
        skippedCount++;
      }
    }
    
    logos[assetType] = localUrl;
  }

  updatedAssets.logos = logos;
  
  console.log(`\n📊 Asset download summary:`);
  console.log(`   ✅ Downloaded: ${downloadedCount}`);
  console.log(`   📦 Cached: ${cachedCount}`);
  if (skippedCount > 0) {
    console.log(`   ⏭️  Skipped: ${skippedCount} (local paths)`);
  }
  console.log('');
  
  return { ...config, assets: updatedAssets };
}

/**
 * Infer file extension from URL or common image types
 */
function getExtensionFromUrl(url) {
  // Try to get from URL path
  const match = url.match(/\.([a-z0-9]+)(?:[?#]|$)/i);
  if (match) {
    return match[1].toLowerCase();
  }
  
  // Default based on common patterns
  if (url.includes('favicon')) return 'ico';
  if (url.includes('apple')) return 'png';
  if (url.includes('og')) return 'png';
  
  return null;
}

// Download assets for the community specified in NEXT_PUBLIC_TEST_COMMUNITY
// This runs during build to pre-download and localize external assets
async function downloadAssetsForBuild() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('ℹ️  Skipping asset download (no DB credentials)');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const community = process.env.NEXT_PUBLIC_TEST_COMMUNITY;
  
  if (!community) {
    console.log('ℹ️  Skipping asset download (NEXT_PUBLIC_TEST_COMMUNITY not set)');
    return;
  }
  
  try {
    const { data, error } = await supabase
      .rpc('get_active_community_config', { p_community_id: community })
      .single();
    
    if (error || !data) {
      console.log('ℹ️  Skipping asset download (no DB config found)');
      if (error) {
        console.log(`   Error: ${error.message}`);
      }
      return;
    }
    
    // Download external assets and localize paths
    await downloadAndLocalizeAssets(data, community);
    console.log('✅ Downloaded assets for community:', community);
  } catch (error) {
    console.warn('⚠️  Error downloading assets:', error.message);
  }
}

// Download assets before Next.js config is created
await downloadAssetsForBuild();

const withBundleAnalyzer = bundlerAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com https://www.youtube.com https://www.youtube.com/iframe_api https://auth.privy.nounspace.com https://cdn.segment.com https://edge.fullstory.com https://rs.fullstory.com;
    style-src 'self' 'unsafe-inline' https://i.ytimg.com https://mint.highlight.xyz;
    media-src 'self' blob: data: https://stream.warpcast.com https://stream.farcaster.xyz https://res.cloudinary.com/ https://*.cloudflarestream.com https://*.b-cdn.net;
    img-src 'self' blob: data: https: https://ipfs.io https://rs.fullstory.com;
    font-src 'self' https: data: blob: https://fonts.googleapis.com https://fonts.gstatic.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'self' https://farcaster.xyz https://*.farcaster.xyz https://wallet.coinbase.com https://*.coinbase.com https://base.org https://*.base.org https://nogglesboard.wtf https://*.nogglesboard.wtf;
    frame-src 'self' https://auth.privy.nounspace.com https://verify.walletconnect.com https://verify.walletconnect.org https://challenges.cloudflare.com https://www.youtube.com https://*;
    child-src 'self' https://auth.privy.nounspace.com https://verify.walletconnect.com https://verify.walletconnect.org https://www.youtube.com https://*;

    connect-src 'self'
      ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}
      https://hub.snapshot.org
      https://auth.privy.nounspace.com
      https://react-tweet.vercel.app
      https://privy.nounspace.com/api/v1/analytics_events
      https://privy.nounspace.com/api/v1/siwe/init
      https://privy.nounspace.com
      wss://relay.walletconnect.com
      wss://relay.walletconnect.org
      https://explorer-api.walletconnect.com
      wss://www.walletlink.org
      wss://space-builder-server.onrender.com
      https://*.rpc.privy.systems
      https://auth.privy.io
      https://auth.privy.io/api/v1/apps/clw9qpfkl01nnpox6rcsb5wy3
      https://auth.privy.io/api/v1/analytics_events
      https://cdn.segment.com
      https://api.segment.io
      https://edge.fullstory.com
      https://rs.fullstory.com
      https://api.imgbb.com
      https://api.goldsky.com
      https://api.reservoir.tools
      https://base-mainnet.g.alchemy.com
      https://eth-mainnet.g.alchemy.com
      https://cloudflare-eth.com
      https://api.coingecko.com
      https://stream.warpcast.com
      https://stream.farcaster.xyz
      https://res.cloudinary.com/
      https://*.cloudflarestream.com
      https://*.b-cdn.net
      https://cca-lite.coinbase.com;

    upgrade-insecure-requests;
`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Outputs a Single-Page Application (SPA).
  // distDir: './dist', // Changes the build output directory to `./dist`.
  transpilePackages: [
    "react-tweet", 
    "react-best-gradient-color-picker",
  ], // https://react-tweet.vercel.app/next,
  typescript: {
    ignoreBuildErrors: false,
  },
  env: {
    NEXT_PUBLIC_VERSION: packageInfo.version,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; object-src 'none';",
    formats: ['image/webp', 'image/avif'],
  },
  async redirects() {
    return [
      {
        source: "/signatures",
        destination:
          "https://docs.nounspace.com/nounspace-alpha/accounts/signatures",
        permanent: true,
      },
      {
        source: "/t/:network/:contractAddress",
        destination: "/t/:network/:contractAddress/Profile",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
    ];
  },
  webpack: (config) => {
    // Prevent webpack from attempting to bundle Node "os" module
    // which can cause erroneous imports of @walletconnect/types
    config.resolve.fallback = {
      ...config.resolve.fallback,
      os: false,
    };
    return config;
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\n/g, ''),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
