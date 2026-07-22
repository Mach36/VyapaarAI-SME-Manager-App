window.VyapaarPages ??= {};
window.VyapaarPages.leads = async function () {
  const data = await fetchPageData('leads');
  return VyapaarRenderers.leads({
    title: 'Lead generation', subtitle: 'Leads captured automatically from WhatsApp, Instagram, email and your website.',
    actions: [{ label: 'Import', style: 'outline', toast: 'Leads imported from CSV' }, { label: 'Add lead', style: 'brand', toast: 'New lead form opened' }],
    metrics: data.metrics,
    columns: data.columns
  });
};
