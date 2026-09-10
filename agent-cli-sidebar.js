// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebar = {
  agentCliSidebar: [
    {
      type: 'doc',
      label: 'Overview',
      id: 'index',
    },
    {
      type: 'doc',
      label: 'Quickstart',
      id: 'quickstart',
    },
    {
      type: 'doc',
      label: 'Skills',
      id: 'skills',
    },
    {
      type: 'category',
      label: 'Guides',
      collapsed: false,
      items: [
        'guides/send-tokens',
        'guides/check-balances-and-metadata',
        'guides/delegate-spending',
        'guides/sign-messages',
        'guides/build-and-submit-transactions',
        'guides/pay-for-apis-x402',
        'guides/usdt0-on-mainnet',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      collapsed: false,
      items: [
        'reference/architecture',
        'reference/authority-model',
        'reference/commands',
        'reference/output-and-errors',
        'reference/supported-networks',
      ],
    },
    {
      type: 'doc',
      id: 'troubleshooting',
      label: 'Troubleshooting',
    },
  ],
}

module.exports = sidebar
