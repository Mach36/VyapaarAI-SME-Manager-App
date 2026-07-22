window.VyapaarPages ??= {};
window.VyapaarPages.inventory = async function () {
  const data = await fetchPageData('inventory');
  window.inventoryData = data.products;
  return VyapaarRenderers.inventory({
    title: 'Inventory intelligence', subtitle: 'Live stock, forecasts and reorder recommendations across all channels.',
    actions: [{ label: 'Export', style: 'outline', action: 'export-inventory' }, { label: 'Create purchase order', style: 'brand', toast: 'Purchase order draft created' }],
    metrics: data.metrics,
    columns: ['Product', 'Available', 'Committed', 'Stock-out', 'Margin', 'AI recommendation'],
    products: data.products,
    panels: [{ title: 'Demand forecast', subtitle: 'Next 30 days', items: data.forecasts }, { title: 'Supplier intelligence', subtitle: 'Price and reliability', items: data.suppliers }]
  });
};

const inventoryExportFields = [
  { key: 'sku', label: 'SKU' },
  { key: 'name', label: 'Product name' },
  { key: 'available', label: 'Available stock' },
  { key: 'committed', label: 'Committed stock' },
  { key: 'stockout', label: 'Stock-out prediction' },
  { key: 'margin', label: 'Margin' },
  { key: 'recommendation', label: 'AI recommendation' }
];

function createInventoryExportModal() {
  let modal = document.getElementById('inventoryExportModal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.className = 'modal inventory-export-modal';
  modal.id = 'inventoryExportModal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'inventoryExportTitle');
  modal.innerHTML = `<div class="modal-card inventory-export-card" tabindex="-1">
    <div class="modal-head"><div><h2 id="inventoryExportTitle">Export inventory</h2><p class="empty-small">Choose the file, products and fields to include.</p></div><button class="close" type="button" data-export-action="close" aria-label="Close export dialog">×</button></div>
    <form id="inventoryExportForm">
      <fieldset class="export-group"><legend>Export format</legend><div class="export-choice-row">
        <label class="export-choice"><input type="radio" name="exportFormat" value="csv" checked><span><strong>CSV</strong><small>Works with any spreadsheet app</small></span></label>
        <label class="export-choice"><input type="radio" name="exportFormat" value="xls"><span><strong>Excel</strong><small>Formatted Excel workbook</small></span></label>
      </div></fieldset>
      <fieldset class="export-group"><legend>Export scope</legend><div class="export-options">
        <label><input type="radio" name="exportScope" value="all" checked> All inventory</label>
        <label><input type="radio" name="exportScope" value="filtered"> Currently filtered inventory</label>
        <label><input type="radio" name="exportScope" value="low-stock"> Low-stock products only</label>
        <label><input type="radio" name="exportScope" value="slow-moving"> Slow-moving products only</label>
      </div></fieldset>
      <fieldset class="export-group"><legend>Include fields</legend><div class="export-field-grid">${inventoryExportFields.map(field => `<label><input type="checkbox" name="exportField" value="${field.key}" checked> ${field.label}</label>`).join('')}</div><p class="export-error" id="inventoryExportError" role="alert"></p></fieldset>
      <div class="modal-footer"><button class="btn btn-outline" type="button" data-export-action="close">Cancel</button><button class="btn btn-brand" type="submit">Export inventory</button></div>
    </form>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', event => { if (event.target === modal || event.target.closest('[data-export-action="close"]')) closeInventoryExport(); });
  modal.querySelector('form').addEventListener('submit', exportInventory);
  return modal;
}

let inventoryExportLastFocus;
function openInventoryExport() {
  inventoryExportLastFocus = document.activeElement;
  const modal = createInventoryExportModal();
  modal.querySelector('#inventoryExportError').textContent = '';
  modal.classList.add('show');
  document.body.classList.add('inventory-export-open');
  requestAnimationFrame(() => modal.querySelector('input').focus());
}

function closeInventoryExport() {
  const modal = document.getElementById('inventoryExportModal');
  if (!modal?.classList.contains('show')) return;
  modal.classList.remove('show');
  document.body.classList.remove('inventory-export-open');
  inventoryExportLastFocus?.focus?.();
}

function inventoryRecommendation(product) {
  return typeof product.recommendation === 'string' ? product.recommendation : product.recommendation?.label || '';
}

function inventoryRowsForScope(scope) {
  const products = window.inventoryData || [];
  if (scope === 'low-stock') return products.filter(product => product.tone === 'red' && /\d+\s+days?/i.test(product.stockout));
  if (scope === 'slow-moving') return products.filter(product => product.stockout === 'Slow-moving');
  if (scope === 'filtered') {
    const visibleIndexes = [...document.querySelectorAll('#inventory tbody tr')]
      .filter(row => !row.hidden && !row.classList.contains('is-hidden') && getComputedStyle(row).display !== 'none')
      .map(row => Number(row.dataset.productIndex));
    return visibleIndexes.map(index => products[index]).filter(Boolean);
  }
  return products;
}

function inventoryExportValue(product, key) {
  if (key === 'recommendation') return inventoryRecommendation(product);
  const value = product[key] ?? '';
  if ((key === 'available' || key === 'committed') && value !== '' && !Number.isNaN(Number(value))) return new Intl.NumberFormat('en-IN').format(Number(value));
  return String(value);
}

function csvCell(value) { return `"${String(value).replace(/"/g, '""')}"`; }
function xmlCell(value) { return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]); }

function downloadInventoryFile(content, extension, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const date = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()).replace(/ /g, '-');
  link.href = url;
  link.download = `VyapaarAI_Inventory_${date}.${extension}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportInventory(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const fields = [...form.querySelectorAll('[name="exportField"]:checked')].map(input => inventoryExportFields.find(field => field.key === input.value));
  const error = form.querySelector('#inventoryExportError');
  if (!fields.length) { error.textContent = 'Select at least one field to export.'; return; }
  error.textContent = '';
  const scope = form.elements.exportScope.value;
  const products = inventoryRowsForScope(scope);
  const rows = products.map(product => fields.map(field => inventoryExportValue(product, field.key)));
  if (form.elements.exportFormat.value === 'csv') {
    const csv = [fields.map(field => field.label), ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
    downloadInventoryFile(`\uFEFF${csv}`, 'csv', 'text/csv;charset=utf-8');
  } else {
    const xmlRows = [fields.map(field => field.label), ...rows].map(row => `<Row>${row.map(value => `<Cell><Data ss:Type="String">${xmlCell(value)}</Data></Cell>`).join('')}</Row>`).join('');
    const workbook = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Inventory"><Table>${xmlRows}</Table></Worksheet></Workbook>`;
    downloadInventoryFile(workbook, 'xls', 'application/vnd.ms-excel');
  }
  closeInventoryExport();
  showToast(`${products.length} inventory ${products.length === 1 ? 'item' : 'items'} exported successfully.`);
}

document.addEventListener('keydown', event => {
  const modal = document.getElementById('inventoryExportModal');
  if (!modal?.classList.contains('show')) return;
  if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); closeInventoryExport(); return; }
  if (event.key !== 'Tab') return;
  const focusable = [...modal.querySelectorAll('button, input')].filter(element => !element.disabled && element.offsetParent !== null);
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}, true);
