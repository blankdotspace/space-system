import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Blankspace Docs',
  tagline: 'Customizable spaces for communities on Farcaster',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  // GitHub Pages deployment
  url: 'https://blankdotspace.github.io',
  baseUrl: '/space-system/',

  organizationName: 'blankdotspace',
  projectName: 'space-system',

  onBrokenLinks: 'warn',

  markdown: {
    format: 'md', // Use regular markdown, not MDX (avoids JSX parsing issues)
    mermaid: true, // Enable Mermaid diagrams
  },

  themes: ['@docusaurus/theme-mermaid'],

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          path: '../docs',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/blankdotspace/space-system/tree/main/',
        },
        blog: false, // Disable blog
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Blankspace',
      logo: {
        alt: 'Blankspace Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://github.com/blankdotspace/space-system',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://blankspace.com',
          label: 'App',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting Started', to: '/docs/GETTING_STARTED' },
            { label: 'Architecture', to: '/docs/ARCHITECTURE/OVERVIEW' },
            { label: 'Contributing', to: '/docs/CONTRIBUTING' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'Discord', href: 'https://discord.gg/eYQeXU2WuH' },
            { label: 'Farcaster', href: 'https://warpcast.com/blankspace' },
            { label: 'GitHub', href: 'https://github.com/blankdotspace' },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'Blankspace App', href: 'https://blankspace.com' },
            { label: 'Scout Game', href: 'https://scoutgame.xyz' },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} Blankspace. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'typescript', 'sql', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
