window.VyapaarPages ??= {};
window.VyapaarPages.integrations = async function () {
  const data = await fetchPageData('integrations');
  return VyapaarRenderers.integrations({
    title: 'Integrations', subtitle: 'Bring every business signal into one place with minimal setup.',
    actions: [{ label: 'Connect app', style: 'brand', action: 'connect' }],
    metrics: data.metrics.map(metric => metric.label === 'Last sync'
      ? { ...metric, syncAction: true }
      : metric),
    integrations: data.integrations.map(integration => integration.connected
      ? { ...integration, lastSync: integration.lastSync || '2 min ago' }
      : integration),
    connectedLabel: '● Connected', connectLabel: 'Connect'
  });
};
