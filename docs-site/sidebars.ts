import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'doc',
      id: 'README',
      label: 'Introduction',
    },
    'GETTING_STARTED',
    'PROJECT_STRUCTURE',
    'CONTRIBUTING',
    {
      type: 'category',
      label: 'Architecture',
      collapsed: false,
      items: [
        'ARCHITECTURE/OVERVIEW',
        'ARCHITECTURE/AUTHENTICATION',
        'ARCHITECTURE/STATE_MANAGEMENT',
      ],
    },
    {
      type: 'category',
      label: 'Systems',
      collapsed: false,
      items: [
        {
          type: 'category',
          label: 'Spaces',
          items: [
            'SYSTEMS/SPACES/OVERVIEW',
            'SYSTEMS/SPACES/SPACE_ARCHITECTURE',
            'SYSTEMS/SPACES/PUBLIC_SPACES_PATTERN',
            'SYSTEMS/SPACES/MULTIPLE_LAYOUTS_OVERVIEW',
            'SYSTEMS/SPACES/LAYOUT_MIGRATION_GUIDE',
          ],
        },
        {
          type: 'category',
          label: 'Fidgets',
          items: [
            'SYSTEMS/FIDGETS/OVERVIEW',
            'SYSTEMS/FIDGETS/FIDGET_PICKER',
            'SYSTEMS/FIDGETS/DATA_FIELD_PATTERNS',
          ],
        },
        'SYSTEMS/CONFIGURATION/ARCHITECTURE_OVERVIEW',
        'SYSTEMS/NAVIGATION/OVERVIEW',
        'SYSTEMS/THEMES/OVERVIEW',
        'SYSTEMS/DISCOVERY/MINI_APP_DISCOVERY_SYSTEM',
      ],
    },
    {
      type: 'category',
      label: 'Integrations',
      items: [
        'INTEGRATIONS/SUPABASE',
        'INTEGRATIONS/FARCASTER',
      ],
    },
    {
      type: 'category',
      label: 'Development',
      items: [
        'DEVELOPMENT/DEVELOPMENT_GUIDE',
        'DEVELOPMENT/CODING_STANDARDS',
        'DEVELOPMENT/COMPONENT_ARCHITECTURE',
        'DEVELOPMENT/TESTING',
        'DEVELOPMENT/DEBUGGING',
        'DEVELOPMENT/AGENTS',
        'DEVELOPMENT/DEVELOPMENT_NOTES',
      ],
    },
  ],
};

export default sidebars;
