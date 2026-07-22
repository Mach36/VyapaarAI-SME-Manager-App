window.VyapaarPages ??= {};
window.VyapaarPages.home = async function () {
  const data = await fetchPageData('home');
  return VyapaarRenderers.home({
    hero: {
      title: 'Good morning, Rajesh.',
      text: 'Your business is healthy today. VyapaarAI found three actions worth your attention.',
      actions: [{ label: 'Ask AI Copilot', style: 'primary', action: 'copilot' }, { label: 'Connect a data source', style: 'soft', action: 'connect' }],
      insight: data.heroInsight
    },
    snapshot: { title: 'Business snapshot', subtitle: 'Auto-synced from Tally, WhatsApp, UPI and Shopify', badge: '● Live sync' },
    metrics: data.metrics,
    panels: [
      { title: 'AI recommendations', subtitle: 'Prioritised by business impact', items: data.recommendations },
      { title: 'Recent activity', subtitle: 'Captured automatically across platforms', items: data.activity }
    ]
  });
};
