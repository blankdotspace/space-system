import { CuratedFidgetOption } from "@/common/types/fidgetOptions";

// Curated iframe-friendly sites and fidgets
// These are sites that work well when embedded in iframes or have specific fidget implementations
export const CURATED_SITES: Omit<CuratedFidgetOption, 'id'>[] = [
  // Social Impact
  {
    type: 'curated',
    name: 'Giveth',
    description: 'Donate to verified projects and get rewarded',
    icon: '❤️',
    tags: ['social-impact', 'donation', 'giveth'],
    category: 'social',
    url: 'https://giveth.io/project/giveth-matching-pool-0',
    popularity: 85
  },
  {
    type: 'curated',
    name: 'Public Nouns',
    description: 'Public Nouns community and governance',
    icon: '🏛️',
    tags: ['social-impact', 'nouns', 'governance', 'public-nouns'],
    category: 'social',
    url: 'https://publicnouns.wtf/',
    popularity: 80
  },
  {
    type: 'curated',
    name: 'Flows',
    description: 'Social impact and community building',
    icon: '🌊',
    tags: ['social-impact', 'community', 'flows'],
    category: 'social',
    url: 'https://flows.wtf',
    popularity: 75
  },
  {
    type: 'curated',
    name: 'Octant',
    description: 'Community governance and impact measurement',
    icon: '📊',
    tags: ['social-impact', 'governance', 'octant'],
    category: 'social',
    url: 'https://octant.app/',
    popularity: 70
  },

  // Social
  {
    type: 'curated',
    name: 'Instagram',
    description: 'View Instagram reels and posts',
    icon: '📷',
    tags: ['social', 'instagram', 'media'],
    category: 'social',
    url: 'https://www.instagram.com/reel/CuPPNVYgawy/',
    popularity: 90
  },
  {
    type: 'curated',
    name: 'TikTok',
    description: 'Watch TikTok videos',
    icon: '🎵',
    tags: ['social', 'tiktok', 'video'],
    category: 'social',
    url: 'https://www.tiktok.com/@zerorightsmedia/video/7179128037638671618',
    popularity: 85
  },
  {
    type: 'curated',
    name: 'SkateHive',
    description: 'Skateboarding community on Farcaster',
    icon: '🛹',
    tags: ['social', 'skateboarding', 'skatehive'],
    category: 'social',
    url: 'https://skatehive.app',
    popularity: 75
  },

  // DeFi
  {
    type: 'curated',
    name: 'Aave',
    description: 'Decentralized lending protocol',
    icon: '👻',
    tags: ['defi', 'lending', 'borrowing', 'aave'],
    category: 'defi',
    url: 'https://app.aave.com/',
    popularity: 95
  },
  {
    type: 'curated',
    name: 'Uniswap',
    description: 'Decentralized exchange',
    icon: '🦄',
    tags: ['defi', 'swap', 'trading', 'dex', 'uniswap'],
    category: 'defi',
    url: 'https://app.uniswap.org/',
    popularity: 100,
    iframeSettings: {
      allowScripts: true,
      allowPopups: true
    }
  },
  {
    type: 'curated',
    name: 'Aerodrome',
    description: 'DeFi protocol on Base',
    icon: '✈️',
    tags: ['defi', 'swap', 'aerodrome'],
    category: 'defi',
    url: 'https://aerodrome.finance/dash?',
    popularity: 80
  },

  // Governance
  {
    type: 'curated',
    name: 'SnapShot',
    description: 'Decentralized governance platform',
    icon: '📸',
    tags: ['governance', 'voting', 'dao', 'snapshot'],
    category: 'governance',
    url: 'https://snapshot.org',
    popularity: 90
  },

  // Content
  {
    type: 'curated',
    name: 'Paragraph',
    description: 'Decentralized publishing platform',
    icon: '📝',
    tags: ['content', 'writing', 'publishing', 'paragraph'],
    category: 'content',
    url: 'https://paragraph.xyz/@nounspace/',
    popularity: 85
  },
  {
    type: 'curated',
    name: 'Mirror',
    description: 'Web3 publishing platform',
    icon: '🪞',
    tags: ['content', 'writing', 'publishing', 'mirror'],
    category: 'content',
    url: 'https://mirror.xyz/',
    popularity: 80
  },

  // Tools
  {
    type: 'curated',
    name: 'Calendly',
    description: 'Schedule meetings and appointments',
    icon: '📅',
    tags: ['tools', 'scheduling', 'calendly'],
    category: 'tools',
    url: 'https://calendly.com',
    popularity: 85
  },
  {
    type: 'curated',
    name: 'Slideshare',
    description: 'View presentations and slides',
    icon: '📊',
    tags: ['tools', 'presentations', 'slideshare'],
    category: 'tools',
    url: 'https://www.slideshare.net/slideshow/web3-development-report-q3-2022-alchemy-253552086/253552086',
    popularity: 70
  },
  {
    type: 'curated',
    name: 'Notion',
    description: 'All-in-one workspace',
    icon: '📝',
    tags: ['tools', 'productivity', 'notion'],
    category: 'tools',
    url: 'https://www.notion.so/7122caa21e3f4be3bb6d837689555f3a?pvs=21',
    popularity: 90,
    iframeSettings: {
      allowScripts: true,
      allowPopups: true
    }
  },
  {
    type: 'curated',
    name: 'Talent Protocol',
    description: 'Professional networking and talent discovery',
    icon: '👥',
    tags: ['tools', 'networking', 'talent'],
    category: 'tools',
    url: 'https://app.talentprotocol.com/80c7d1cd-d37d-4523-82e4-e26f2548abc0',
    popularity: 75
  },

  // Games
  {
    type: 'curated',
    name: 'Blackhole',
    description: 'Interactive game on Remix',
    icon: '🕳️',
    tags: ['games', 'interactive', 'blackhole'],
    category: 'games',
    url: 'https://blackhole.remix.gg/',
    popularity: 80
  },
  {
    type: 'curated',
    name: 'Betr',
    description: 'Gaming and betting platform',
    icon: '🎲',
    tags: ['games', 'betting', 'betr'],
    category: 'games',
    url: 'https://betrmint.fun/',
    popularity: 75
  },
  {
    type: 'curated',
    name: 'Ponder',
    description: 'Interactive gaming platform',
    icon: '🤔',
    tags: ['games', 'interactive', 'ponder'],
    category: 'games',
    url: 'https://www.weponder.io/',
    popularity: 70
  },
  {
    type: 'curated',
    name: 'Cat Town',
    description: 'Fishing game with cats',
    icon: '🐱',
    tags: ['games', 'fishing', 'cat-town'],
    category: 'games',
    url: 'https://cat.town/fishing',
    popularity: 75
  },
  {
    type: 'curated',
    name: '$EGGS',
    description: 'Egg-themed gaming platform',
    icon: '🥚',
    tags: ['games', 'eggs'],
    category: 'games',
    url: 'https://eggs.name',
    popularity: 70
  },
  {
    type: 'curated',
    name: 'Bracket',
    description: 'DeFi gaming with brackets',
    icon: '🏀',
    tags: ['games', 'defi', 'bracket'],
    category: 'games',
    url: 'https://f.bracket.game',
    popularity: 75
  },
  {
    type: 'curated',
    name: 'Framedl',
    description: 'Frame-based gaming platform',
    icon: '🖼️',
    tags: ['games', 'frames', 'framedl'],
    category: 'games',
    url: 'https://framedl.xyz/app/v2',
    popularity: 70
  },

  // Mini Apps
  {
    type: 'curated',
    name: 'Noice',
    description: 'Interactive mini app',
    icon: '🎯',
    tags: ['mini-apps', 'noice'],
    category: 'miniapp',
    url: 'https://app.noice.so',
    popularity: 80
  }
];

// Helper function to get sites by category
export function getSitesByCategory(category: string): Omit<CuratedFidgetOption, 'id'>[] {
  return CURATED_SITES.filter(site => site.category === category);
} 