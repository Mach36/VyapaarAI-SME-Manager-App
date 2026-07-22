window.VyapaarPages ??= {};
window.inventoryIncomingStock = {};
window.inventoryPurchaseActivity = [];
window.VyapaarPages.inventory = async function () {
  const data = await fetchPageData('inventory');
  window.inventoryData = data.products;
  return VyapaarRenderers.inventory({
    title: 'Inventory intelligence', subtitle: 'Live stock, forecasts and reorder recommendations across all channels.',
    actions: [{ label: 'Export', style: 'outline', action: 'export-inventory' }, { label: 'Create purchase order', style: 'brand', action: 'create-purchase-order' }],
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

const purchaseOrderDefaults = {
  number: 'PO-2026-018',
  location: 'Mumbai Warehouse',
  paymentTerms: 'Net 30 days'
};
let purchaseOrderLastFocus;
let purchaseOrderState = null;

function poEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function poIsoDate(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function poAddDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + Number(days || 0));
  return poIsoDate(date);
}

function poCurrency(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function poRecommendedProducts() {
  return (window.inventoryData || []).filter(product => typeof product.recommendation === 'object' && product.recommendation.action === 'create-purchase-order');
}

function poLineFromProduct(product) {
  const recommendation = product.recommendation || {};
  return {
    sku: product.sku,
    name: product.name,
    available: Number(product.available),
    committed: Number(product.committed),
    recommended: Number(recommendation.reorderQuantity || 1),
    quantity: Number(recommendation.reorderQuantity || 1),
    price: Number(recommendation.unitPrice || 1),
    gst: 18,
    stockout: product.stockout,
    supplier: recommendation.supplier || ''
  };
}

function createPurchaseOrderModal() {
  let modal = document.getElementById('purchaseOrderModal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'purchaseOrderModal';
  modal.className = 'modal purchase-order-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'purchaseOrderTitle');
  modal.innerHTML = `<div class="modal-card purchase-order-card" tabindex="-1">
    <div class="modal-head purchase-order-head"><div><h2 id="purchaseOrderTitle">Create purchase order</h2><p class="empty-small">Review VyapaarAI's recommendation and confirm the supplier order.</p></div><button class="close" type="button" data-po-action="close" aria-label="Close purchase order">×</button></div>
    <div class="purchase-order-content" id="purchaseOrderContent"></div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', handlePurchaseOrderClick);
  modal.addEventListener('input', handlePurchaseOrderInput);
  modal.addEventListener('change', handlePurchaseOrderChange);
  return modal;
}

function resetPurchaseOrderState(sku) {
  const products = poRecommendedProducts();
  const selected = products.find(product => product.sku === sku) || products.find(product => product.sku === 'SH-BLU-M') || products[0];
  const orderDate = poIsoDate();
  purchaseOrderState = {
    number: purchaseOrderDefaults.number,
    supplier: selected?.recommendation?.supplier || '',
    orderDate,
    deliveryDate: poAddDays(orderDate, selected?.recommendation?.leadTimeDays || 5),
    location: purchaseOrderDefaults.location,
    paymentTerms: purchaseOrderDefaults.paymentTerms,
    notes: '',
    lines: selected ? [poLineFromProduct(selected)] : [],
    focusSku: selected?.sku || '',
    errors: {}
  };
}

function purchaseOrderRecommendation() {
  const line = purchaseOrderState.lines.find(item => item.sku === purchaseOrderState.focusSku) || purchaseOrderState.lines[0];
  if (!line) return 'Add a product to receive a stock recommendation.';
  if (line.sku === 'SH-BLU-M') return 'VyapaarAI recommends ordering 80 units from Sharma Textiles because this product is expected to stock out in six days.';
  const days = String(line.stockout).replace(/\s*days?$/i, '');
  const dayText = days === '6' ? 'six days' : `${days} ${days === '1' ? 'day' : 'days'}`;
  return `VyapaarAI recommends ordering ${line.recommended} units from ${line.supplier || purchaseOrderState.supplier} because ${line.name.toLowerCase()} is expected to stock out in ${dayText}.`;
}

function purchaseOrderTotals() {
  return purchaseOrderState.lines.reduce((totals, line) => {
    const base = Number(line.quantity) * Number(line.price);
    totals.subtotal += base;
    totals.gst += base * Number(line.gst) / 100;
    return totals;
  }, { subtotal: 0, gst: 0 });
}

function poField(label, name, value, type = 'text', options = '') {
  const error = purchaseOrderState.errors[name] || '';
  return `<label class="po-field"><span>${label}</span>${options || `<input type="${type}" name="${name}" value="${poEscape(value)}" ${type === 'date' ? 'required' : ''}>`}<small class="po-error">${poEscape(error)}</small></label>`;
}

function renderPurchaseOrderForm() {
  const content = document.getElementById('purchaseOrderContent');
  if (!content || !purchaseOrderState) return;
  const totals = purchaseOrderTotals();
  const choices = (window.inventoryData || []).map(product => `<option value="${poEscape(product.sku)}">${poEscape(product.name)} · ${poEscape(product.sku)}</option>`).join('');
  const lines = purchaseOrderState.lines.map((line, index) => {
    const base = Number(line.quantity) * Number(line.price);
    const total = base + base * Number(line.gst) / 100;
    return `<tr data-line-index="${index}"><td><strong>${poEscape(line.name)}</strong><small>${poEscape(line.sku)}</small></td><td>${line.available}</td><td>${line.committed}</td><td>${line.recommended}</td><td><input aria-label="Order quantity for ${poEscape(line.name)}" data-line-field="quantity" type="number" min="1" step="1" value="${line.quantity}"><small class="po-error">${poEscape(purchaseOrderState.errors[`line-${index}-quantity`] || '')}</small></td><td><input aria-label="Unit price for ${poEscape(line.name)}" data-line-field="price" type="number" min="0.01" step="0.01" value="${line.price}"><small class="po-error">${poEscape(purchaseOrderState.errors[`line-${index}-price`] || '')}</small></td><td><input aria-label="GST for ${poEscape(line.name)}" data-line-field="gst" type="number" min="0" max="100" step="0.1" value="${line.gst}"></td><td class="po-line-total">${poCurrency(total)}</td><td><button class="po-remove" type="button" data-po-action="remove-line" data-index="${index}" aria-label="Remove ${poEscape(line.name)}">×</button></td></tr>`;
  }).join('');
  content.innerHTML = `<form id="purchaseOrderForm" novalidate>
    <div class="po-ai-notice"><span>✦</span><p>${poEscape(purchaseOrderRecommendation())}</p></div>
    <section class="po-section"><h3>Order details</h3><div class="po-fields">
      ${poField('Purchase order number', 'number', purchaseOrderState.number)}
      ${poField('Supplier', 'supplier', purchaseOrderState.supplier)}
      ${poField('Order date', 'orderDate', purchaseOrderState.orderDate, 'date')}
      ${poField('Expected delivery date', 'deliveryDate', purchaseOrderState.deliveryDate, 'date')}
      ${poField('Delivery location', 'location', purchaseOrderState.location)}
      ${poField('Payment terms', 'paymentTerms', purchaseOrderState.paymentTerms, 'text', `<select name="paymentTerms"><option${purchaseOrderState.paymentTerms === 'Net 15 days' ? ' selected' : ''}>Net 15 days</option><option${purchaseOrderState.paymentTerms === 'Net 30 days' ? ' selected' : ''}>Net 30 days</option><option${purchaseOrderState.paymentTerms === 'Due on receipt' ? ' selected' : ''}>Due on receipt</option></select>`)}
      <label class="po-field po-notes"><span>Internal notes</span><textarea name="notes" rows="3" placeholder="Notes for your team">${poEscape(purchaseOrderState.notes)}</textarea></label>
    </div></section>
    <section class="po-section po-items"><div class="po-section-head"><div><h3>Products</h3><p>Add inventory products to this supplier order.</p></div><div class="po-add"><select id="poProductPicker" aria-label="Select inventory product"><option value="">Choose a product</option>${choices}</select><button class="btn btn-outline" type="button" data-po-action="add-line">Add product</button></div></div>
      <div class="po-table-scroll"><table><thead><tr><th>Product</th><th>Current</th><th>Committed</th><th>AI qty</th><th>Order qty</th><th>Unit price</th><th>GST %</th><th>Line total</th><th></th></tr></thead><tbody>${lines || '<tr><td colspan="9" class="po-empty">No products added.</td></tr>'}</tbody></table></div><p class="po-error po-products-error">${poEscape(purchaseOrderState.errors.products || '')}</p>
      <div class="po-totals"><div><span>Subtotal</span><strong id="poSubtotal">${poCurrency(totals.subtotal)}</strong></div><div><span>GST</span><strong id="poGst">${poCurrency(totals.gst)}</strong></div><div class="grand"><span>Grand total</span><strong id="poGrandTotal">${poCurrency(totals.subtotal + totals.gst)}</strong></div></div>
    </section>
    <section class="po-review"><h3>Review before creation</h3><p>Creating this purchase order will:</p><ul><li>Create the purchase order</li><li>Record incoming stock</li><li>Update supplier activity</li><li>Recalculate expected stock availability</li><li>Schedule an expected-delivery reminder</li></ul><p class="po-form-error" role="alert">${poEscape(purchaseOrderState.errors.form || '')}</p></section>
    <div class="modal-footer po-footer"><button class="btn btn-outline" type="button" data-po-action="close">Cancel</button><button class="btn btn-outline" type="button" data-po-action="save-draft">Save as draft</button><button class="btn btn-brand" type="button" data-po-action="create">Create purchase order</button></div>
  </form>`;
}

function syncPurchaseOrderFields() {
  const form = document.getElementById('purchaseOrderForm');
  if (!form || !purchaseOrderState) return;
  ['number', 'supplier', 'orderDate', 'deliveryDate', 'location', 'paymentTerms', 'notes'].forEach(name => {
    if (form.elements[name]) purchaseOrderState[name] = form.elements[name].value.trim();
  });
  form.querySelectorAll('[data-line-index]').forEach(row => {
    const line = purchaseOrderState.lines[Number(row.dataset.lineIndex)];
    row.querySelectorAll('[data-line-field]').forEach(input => { line[input.dataset.lineField] = Number(input.value); });
  });
}

function updatePurchaseOrderTotals() {
  const totals = purchaseOrderTotals();
  document.getElementById('poSubtotal').textContent = poCurrency(totals.subtotal);
  document.getElementById('poGst').textContent = poCurrency(totals.gst);
  document.getElementById('poGrandTotal').textContent = poCurrency(totals.subtotal + totals.gst);
  document.querySelectorAll('#purchaseOrderForm [data-line-index]').forEach(row => {
    const line = purchaseOrderState.lines[Number(row.dataset.lineIndex)];
    const base = line.quantity * line.price;
    row.querySelector('.po-line-total').textContent = poCurrency(base + base * line.gst / 100);
  });
}

function validatePurchaseOrder() {
  syncPurchaseOrderFields();
  const errors = {};
  if (!purchaseOrderState.number) errors.number = 'Enter a purchase order number.';
  if (!purchaseOrderState.supplier) errors.supplier = 'Enter a supplier.';
  if (!purchaseOrderState.orderDate) errors.orderDate = 'Choose an order date.';
  if (!purchaseOrderState.deliveryDate) errors.deliveryDate = 'Choose an expected delivery date.';
  else if (purchaseOrderState.orderDate && purchaseOrderState.deliveryDate < purchaseOrderState.orderDate) errors.deliveryDate = 'Delivery cannot be earlier than the order date.';
  if (!purchaseOrderState.location) errors.location = 'Enter a delivery location.';
  if (!purchaseOrderState.lines.length) errors.products = 'Add at least one product.';
  purchaseOrderState.lines.forEach((line, index) => {
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) errors[`line-${index}-quantity`] = 'Must be at least 1.';
    if (!Number.isFinite(line.price) || line.price <= 0) errors[`line-${index}-price`] = 'Enter a valid price.';
    if (!Number.isFinite(line.gst) || line.gst < 0 || line.gst > 100) errors.form = 'GST must be between 0% and 100%.';
  });
  purchaseOrderState.errors = errors;
  return !Object.keys(errors).length;
}

function openPurchaseOrder(sku) {
  purchaseOrderLastFocus = document.activeElement;
  resetPurchaseOrderState(sku);
  const modal = createPurchaseOrderModal();
  renderPurchaseOrderForm();
  modal.classList.add('show');
  document.body.classList.add('purchase-order-open');
  requestAnimationFrame(() => modal.querySelector('.close').focus());
}

function closePurchaseOrder() {
  const modal = document.getElementById('purchaseOrderModal');
  if (!modal?.classList.contains('show')) return;
  modal.classList.remove('show');
  document.body.classList.remove('purchase-order-open');
  purchaseOrderState = null;
  purchaseOrderLastFocus?.focus?.();
}

function renderPurchaseOrderSuccess(status) {
  const totals = purchaseOrderTotals();
  const grandTotal = totals.subtotal + totals.gst;
  const isDraft = status === 'Draft';
  if (!isDraft) {
    const incoming = window.inventoryIncomingStock;
    purchaseOrderState.lines.forEach(line => { incoming[line.sku] = (Number(incoming[line.sku]) || 0) + line.quantity; });
    const activity = window.inventoryPurchaseActivity;
    activity.unshift({ icon: 'PO', title: `${purchaseOrderState.number} created`, text: `${purchaseOrderState.lines.length} product${purchaseOrderState.lines.length === 1 ? '' : 's'} ordered from ${purchaseOrderState.supplier} · ${poCurrency(grandTotal)}` });
    window.inventoryPurchaseActivity = activity.slice(0, 5);
    const inventory = document.getElementById('inventory');
    if (inventory) {
      let panel = inventory.querySelector('.inventory-activity');
      if (!panel) {
        panel = document.createElement('div');
        panel.className = 'card inventory-activity';
        panel.innerHTML = '<div class="section-head section-head-compact"><div><h2>Recent purchase activity</h2><p>Updates created in this session</p></div></div><div class="insight-list"></div>';
        inventory.querySelector('.inventory-table-wrap')?.after(panel);
      }
      const entry = document.createElement('div');
      entry.className = 'insight';
      entry.innerHTML = `<div class="insight-icon">PO</div><div><strong>${poEscape(purchaseOrderState.number)} created</strong><p>${purchaseOrderState.lines.length} product${purchaseOrderState.lines.length === 1 ? '' : 's'} ordered from ${poEscape(purchaseOrderState.supplier)} · ${poCurrency(grandTotal)}</p></div>`;
      panel.querySelector('.insight-list')?.prepend(entry);
    }
    purchaseOrderState.lines.forEach(line => {
      const row = document.querySelector(`#inventory tr[data-sku="${CSS.escape(line.sku)}"] td:first-child`);
      if (row) { const badge = document.createElement('span'); badge.className = 'pill blue incoming-pill'; badge.textContent = `Incoming ${incoming[line.sku]}`; row.querySelector('.incoming-pill')?.remove(); row.appendChild(badge); }
    });
  }
  document.getElementById('purchaseOrderContent').innerHTML = `<div class="po-success"><div class="po-success-icon">✓</div><span class="pill ${isDraft ? 'amber' : 'green'}">${status}</span><h3>${isDraft ? 'Purchase order saved as draft' : 'Purchase order created'}</h3><p class="po-success-number">${poEscape(purchaseOrderState.number)}</p><div class="po-success-grid"><div><span>Supplier</span><strong>${poEscape(purchaseOrderState.supplier)}</strong></div><div><span>Products</span><strong>${purchaseOrderState.lines.length}</strong></div><div><span>Total value</span><strong>${poCurrency(grandTotal)}</strong></div><div><span>Expected delivery</span><strong>${new Date(`${purchaseOrderState.deliveryDate}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></div></div><div class="po-success-products">${purchaseOrderState.lines.map(line => `<div><span>${poEscape(line.name)} · ${poEscape(line.sku)}</span><strong>${line.quantity} units</strong></div>`).join('')}</div><p>${isDraft ? 'Incoming stock has not been updated. You can complete this order later.' : 'Incoming stock, supplier activity, availability forecasts and the delivery reminder have been updated.'}</p><button class="btn btn-brand" type="button" data-po-action="close">Done</button></div>`;
  showToast(isDraft ? `${purchaseOrderState.number} saved as draft.` : `${purchaseOrderState.number} created successfully.`);
}

function submitPurchaseOrder(status) {
  if (!validatePurchaseOrder()) { renderPurchaseOrderForm(); document.querySelector('.po-error:not(:empty), .po-form-error:not(:empty)')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  renderPurchaseOrderSuccess(status);
}

function handlePurchaseOrderClick(event) {
  const modal = event.currentTarget;
  if (event.target === modal) { closePurchaseOrder(); return; }
  const button = event.target.closest('[data-po-action]');
  if (!button) return;
  const action = button.dataset.poAction;
  if (action === 'close') closePurchaseOrder();
  else if (action === 'add-line') {
    syncPurchaseOrderFields();
    const sku = document.getElementById('poProductPicker').value;
    const product = (window.inventoryData || []).find(item => item.sku === sku);
    if (!product) { showToast('Choose an inventory product first.'); return; }
    if (purchaseOrderState.lines.some(line => line.sku === sku)) { showToast('This product is already in the purchase order.'); return; }
    purchaseOrderState.lines.push(poLineFromProduct(product));
    purchaseOrderState.errors = {};
    renderPurchaseOrderForm();
  } else if (action === 'remove-line') {
    syncPurchaseOrderFields();
    purchaseOrderState.lines.splice(Number(button.dataset.index), 1);
    purchaseOrderState.errors = {};
    renderPurchaseOrderForm();
  } else if (action === 'save-draft') submitPurchaseOrder('Draft');
  else if (action === 'create') submitPurchaseOrder('Created');
}

function handlePurchaseOrderInput(event) {
  if (!purchaseOrderState) return;
  if (event.target.matches('[data-line-field]')) {
    const row = event.target.closest('[data-line-index]');
    purchaseOrderState.lines[Number(row.dataset.lineIndex)][event.target.dataset.lineField] = Number(event.target.value);
    updatePurchaseOrderTotals();
  } else if (event.target.name && Object.hasOwn(purchaseOrderState, event.target.name)) purchaseOrderState[event.target.name] = event.target.value;
}

function handlePurchaseOrderChange(event) {
  handlePurchaseOrderInput(event);
  if (event.target.dataset.lineField === 'quantity' && Number(event.target.value) <= 0) {
    event.target.value = 1;
    const row = event.target.closest('[data-line-index]');
    purchaseOrderState.lines[Number(row.dataset.lineIndex)].quantity = 1;
    updatePurchaseOrderTotals();
  }
  if (event.target.name === 'orderDate' && purchaseOrderState.deliveryDate < event.target.value) {
    purchaseOrderState.deliveryDate = event.target.value;
    document.querySelector('[name="deliveryDate"]').value = event.target.value;
  }
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-action="create-purchase-order"]');
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  openPurchaseOrder(button.dataset.sku);
}, true);

document.addEventListener('keydown', event => {
  const modal = document.getElementById('purchaseOrderModal');
  if (!modal?.classList.contains('show')) return;
  if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); closePurchaseOrder(); return; }
  if (event.key !== 'Tab') return;
  const focusable = [...modal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(element => element.offsetParent !== null);
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}, true);
