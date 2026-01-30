import bundlerAnalyzer from "@next/bundle-analyzer";
import packageInfo from "./package.json" with { type: "json" };
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

const withBundleAnalyzer = bundlerAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com https://www.youtube.com https://www.youtube.com/iframe_api https://auth.privy.nounspace.com https://cdn.mxpnl.com https://va.vercel-scripts.com;
    style-src 'self' 'unsafe-inline' https://i.ytimg.com https://mint.highlight.xyz https://fonts.googleapis.com;
    media-src 'self' blob: data: https://stream.warpcast.com https://stream.farcaster.xyz https://res.cloudinary.com/ https://*.cloudflarestream.com https://*.b-cdn.net https://zora.co https://*.zora.co https://media.tenor.com https://*.tenor.com https://*.b-cdn.net;
    img-src 'self' blob: data: https: https://ipfs.io https://rs.fullstory.com ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''};
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
      https://cdn.mxpnl.com
      https://api-js.mixpanel.com
      https://api.mixpanel.com
      https://decide.mixpanel.com
      https://replay.mixpanel.com
      https://api.imgbb.com
      https://api.goldsky.com
      https://api.reservoir.tools
      https://base-mainnet.g.alchemy.com
      https://eth-mainnet.g.alchemy.com
      https://cloudflare-eth.com
      https://api.coingecko.com
      https://auth.farcaster.xyz
      https://stream.warpcast.com
      https://stream.farcaster.xyz
      https://res.cloudinary.com/
      https://*.cloudflarestream.com
      https://customer-35w74jq9s1d58g1v.cloudflarestream.com
      https://*.b-cdn.net
      https://zora.co
      https://*.zora.co
      https://media.tenor.com
      https://*.tenor.com
      https://cca-lite.coinbase.com;

    upgrade-insecure-requests;
`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Outputs a Single-Page Application (SPA).
  // distDir: './dist', // Changes the build output directory to `./dist/`.
  compiler: {
    // Remove console.log in production builds (keep console.error and console.warn)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
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
    // Ignore React Native dependencies that @metamask/sdk tries to import
    // These are only needed for React Native, not web
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': path.resolve(process.cwd(), 'src/common/lib/react-native-stub.ts'),
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
