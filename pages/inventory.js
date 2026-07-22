window.VyapaarPages ??= {};
window.VyapaarPages.inventory = async function () {
  const data = await fetchPageData('inventory');
  return VyapaarRenderers.inventory({
    title: 'Inventory intelligence', subtitle: 'Live stock, forecasts and reorder recommendations across all channels.',
    actions: [{ label: 'Export', style: 'outline', toast: 'Inventory export prepared' }, { label: 'Create purchase order', style: 'brand', toast: 'Purchase order draft created' }],
    metrics: data.metrics,
    columns: ['Product', 'Available', 'Committed', 'Stock-out', 'Margin', 'AI recommendation'],
    products: data.products,
    panels: [{ title: 'Demand forecast', subtitle: 'Next 30 days', items: data.forecasts }, { title: 'Supplier intelligence', subtitle: 'Price and reliability', items: data.suppliers }]
  });
};
