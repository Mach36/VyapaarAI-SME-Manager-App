window.VyapaarPages ??= {};
window.VyapaarPages.records = async function () {
  const data = await fetchPageData('records');
  return VyapaarRenderers.records({
    title: 'Record keeping', subtitle: 'One searchable source of truth for invoices, payments, expenses and documents.',
    actions: [{ label: 'Upload document', style: 'outline', toast: 'Invoice uploaded and auto-categorised' }, { label: 'Create invoice', style: 'brand', toast: 'New invoice draft created' }],
    metrics: data.metrics,
    // Keep button labels for compatibility with previously cached renderers.
    filters: { search: 'Search records...', buttons: ['All types ▾', 'All statuses ▾', 'This month ▾'] },
    records: data.records
  });
};
