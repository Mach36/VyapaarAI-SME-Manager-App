window.VyapaarPages ??= {};
window.VyapaarPages.integrations = async function () {
  const data = await fetchPageData('integrations');
  return VyapaarRenderers.integrations({
    title: 'Integrations', subtitle: 'Bring every business signal into one place with minimal setup.',
    actions: [{ label: 'Connect app', style: 'brand', action: 'connect' }],
    metrics: data.metrics, integrations: data.integrations,
    connectedLabel: '● Connected', connectLabel: 'Connect'
  });
};
