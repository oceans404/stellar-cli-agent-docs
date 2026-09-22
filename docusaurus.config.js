// @ts-check

const GITHUB_REPO = 'https://github.com/oceans404/stellar-cli-agent-docs'

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Stellar CLI for Agents',
  tagline: 'Docs for driving the stellar binary from an AI agent',
  url: 'https://stellar-cli-agent-docs.vercel.app',
  baseUrl: '/',
  favicon: undefined,
  organizationName: 'oceans404',
  projectName: 'stellar-cli-agent-docs',
  onBrokenLinks: 'throw',
  markdown: { hooks: { onBrokenMarkdownLinks: 'throw' } },
  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: './agent-cli',
          routeBasePath: '/',
          sidebarPath: require.resolve('./agent-cli-sidebar.js'),
          editUrl: `${GITHUB_REPO}/edit/main/`,
        },
        blog: false,
        theme: { customCss: require.resolve('./src/css/custom.css') },
      }),
    ],
  ],
  themeConfig: {
    navbar: {
      title: 'Stellar CLI for Agents',
      items: [
        { type: 'docSidebar', sidebarId: 'agentCliSidebar', position: 'left', label: 'Docs' },
        { type: 'doc', docId: 'skills', label: 'Skills', position: 'right' },
        { href: GITHUB_REPO, label: 'GitHub', position: 'right' },
      ],
    },
    footer: {
      style: 'dark',
      copyright:
        'A proposal, not published Stellar documentation. Nothing here has been reviewed by SDF docs.',
    },
  },
}

module.exports = config
