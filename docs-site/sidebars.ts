import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'doc',
      id: 'README',
      label: 'Introduction',
    },
    'getting-started',
    'project-structure',
    'contributing',
    {
      type: 'category',
      label: 'Architecture',
      collapsed: false,
      items: [
        'architecture/overview',
        'architecture/authentication',
        'architecture/state-management',
      ],
    },
    {
      type: 'category',
      label: 'Systems',
      collapsed: false,
      items: [
        'systems/spaces',
        'systems/spaces-public',
        'systems/fidgets',
        'systems/configuration',
        'systems/navigation',
        'systems/themes',
        'systems/discovery',
      ],
    },
    {
      type: 'category',
      label: 'Integrations',
      items: [
        'integrations/supabase',
        'integrations/farcaster',
      ],
    },
    {
      type: 'category',
      label: 'Development',
      items: [
        'development/guide',
        'development/coding-standards',
        'development/testing',
      ],
    },
  ],
};

export default sidebars;
