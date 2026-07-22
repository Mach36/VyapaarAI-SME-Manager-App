(function invoiceWorkflow() {
  const STORAGE_KEY = 'vyapaar-created-invoice';
  const steps = ['Start', 'Invoice details', 'Review & send', 'Complete'];
  let config = {};
  let state = {};
  let step = 1;
  let lastFocus = null;
  let processingTimer = null;
  let saved = false;
  let messageVariant = 0;

  const e = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const money = value => `₹${Math.round(Number(value) || 0).toLocaleString('en-IN')}`;
  const prettyDate = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const shortDate = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  const productBySku = sku => (config.products || []).find(item => item.sku === sku) || {};

  const modal = document.createElement('div');
  modal.className = 'modal invoice-create-modal';
  modal.id = 'invoiceCreateModal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'invoiceCreateTitle');
  modal.setAttribute('aria-describedby', 'invoiceCreateDescription');
  modal.innerHTML = `<div class="modal-card invoice-create-card" tabindex="-1"><div class="modal-head invoice-create-head"><div><h2 id="invoiceCreateTitle">Create invoice</h2><p class="empty-small" id="invoiceCreateDescription">Generate a professional invoice using existing business data.</p></div><button class="close" data-invoice-action="close" type="button" aria-label="Close create invoice workflow">×</button></div><div class="upload-progress invoice-progress" aria-label="Invoice creation progress"></div><div class="invoice-create-content"></div></div>`;
  document.body.appendChild(modal);
  const content = modal.querySelector('.invoice-create-content');

  function setConfig(next) { config = next || {}; }

  function emptyItem() { return { sku: '', quantity: 1, unitPrice: 0, discount: 0, gst: 18 }; }
  function resetState(increment = false) {
    const base = config.invoice || {};
    const previous = state.invoice?.number || base.number || 'INV-1060';
    const number = increment ? previous.replace(/\d+$/, n => String(Number(n) + 1)) : base.number;
    state = { method: 'quotation', customer: {}, invoice: { ...base, number }, items: [], gstTreatment: 'intra', deliveries: { WhatsApp: true, Email: true, PDF: true, 'UPI payment link': true }, message: '' };
    saved = false; messageVariant = 0; clearTimeout(processingTimer); applyStartingPoint();
  }

  function applyStartingPoint() {
    const base = config.invoice || {};
    state.invoice = { ...base, number: state.invoice?.number || base.number };
    if (state.method === 'quotation') {
      state.customer = { ...(config.customers || [])[0] };
      state.invoice.linkedQuotation = config.linkedQuotation?.number || '';
      state.items = (config.quotationItems || []).map(item => { const p = productBySku(item.sku); return { ...item, unitPrice: p.unitPrice, gst: p.gst }; });
    } else if (state.method === 'customer') {
      state.customer = { ...((config.customers || []).find(c => c.name === state.selectedCustomer) || {}) };
      state.invoice.linkedQuotation = '';
      state.items = [emptyItem()];
    } else { state.customer = {}; state.invoice.linkedQuotation = ''; state.items = [emptyItem()]; }
  }

  function renderProgress() {
    modal.querySelector('.invoice-progress').innerHTML = steps.map((name, i) => `<div class="upload-progress-item ${i + 1 < step ? 'done' : i + 1 === step ? 'active' : ''}" data-short="${i + 1}" ${i + 1 === step ? 'aria-current="step"' : ''}><span>${i + 1}. ${e(name)}</span></div>`).join('');
  }
  function setStep(next) {
    step = next; renderProgress(); content.classList.remove('invoice-step-enter'); void content.offsetWidth; content.classList.add('invoice-step-enter');
    if (step === 1) renderStart(); else if (step === 2) renderBuilder(); else if (step === 3) renderReview(); else renderSuccess();
    content.scrollTop = 0;
  }
  function open() { lastFocus = document.activeElement; resetState(false); modal.classList.add('show'); document.body.classList.add('invoice-modal-open'); setStep(1); requestAnimationFrame(() => modal.querySelector('.close').focus()); }
  function close(force = false) { if (!force && step >= 2 && step < 4 && !saved && !window.confirm('This invoice has unsaved changes. Close and discard your progress?')) return; clearTimeout(processingTimer); modal.classList.remove('show'); document.body.classList.remove('invoice-modal-open'); lastFocus?.focus?.(); }

  function renderStart() {
    const q = config.linkedQuotation || {};
    const methods = [
      ['quotation','From quotation','Recommended','Convert an existing quotation or high-intent lead into an invoice.'],
      ['customer','Existing customer','', 'Select a customer from your existing customer records.'],
      ['blank','Blank invoice','', 'Start with an empty invoice and enter the details manually.']
    ];
    content.innerHTML = `<h3>How would you like to create this invoice?</h3><p class="invoice-main-message">VyapaarAI reuses customer, quotation and product information already available across your connected business systems.</p><div class="invoice-source-grid">${methods.map(([key,title,badge,desc]) => `<button type="button" class="invoice-source-card ${state.method === key ? 'selected' : ''}" data-method="${key}" aria-pressed="${state.method === key}"><span><strong>${title}</strong>${badge ? '<span class="pill blue">Recommended</span>' : ''}</span><small>${desc}</small></button>`).join('')}</div><div class="invoice-source-detail">${state.method === 'quotation' ? `<div class="invoice-suggestion"><div><span class="pill blue">Suggested quotation</span><h3>Royal Menswear</h3><p>Source: ${e(q.source)} · Current stage: ${e(q.stage)} · AI lead score: ${e(q.leadScore)}%</p><p><strong>${e(q.number)}</strong> · ${money(q.value)} · ${e(q.products)}</p><p><strong>Recommended action:</strong> ${e(q.recommendedAction)}</p></div><div class="notice">✦ Royal Menswear has viewed the quotation and is ready for invoicing. Most invoice details can be filled automatically.</div></div>` : state.method === 'customer' ? `<div class="field invoice-customer-picker"><label for="invoiceStartCustomer">Choose customer</label><select id="invoiceStartCustomer"><option value="">Select a customer</option>${(config.customers || []).filter(c => c.name !== 'Royal Menswear').map(c => `<option ${state.selectedCustomer === c.name ? 'selected' : ''}>${e(c.name)}</option>`).join('')}</select></div>` : '<div class="notice">A blank invoice starts with default dates, GST settings and one empty line item.</div>'}</div><div class="workflow-actions"><button class="btn btn-outline" data-invoice-action="cancel" type="button">Cancel</button><button class="btn btn-brand" data-invoice-action="start-continue" type="button" ${state.method === 'customer' && !state.selectedCustomer ? 'disabled' : ''}>Continue</button></div>`;
  }

  function field(label, key, value, type = 'text', hint = '') {
    return `<div class="field"><label for="inv-${key}">${e(label)} ${hint ? `<span class="invoice-autofill">${e(hint)}</span>` : ''}</label><input id="inv-${key}" data-field="${key}" type="${type}" value="${e(value)}"><div class="invoice-field-error" data-error="${key}" role="alert"></div></div>`;
  }
  function selectField(label, key, value, values, hint = '') { return `<div class="field"><label for="inv-${key}">${e(label)} ${hint ? `<span class="invoice-autofill">${e(hint)}</span>` : ''}</label><select id="inv-${key}" data-field="${key}">${values.map(v => `<option ${v === value ? 'selected' : ''}>${e(v)}</option>`).join('')}</select><div class="invoice-field-error" data-error="${key}" role="alert"></div></div>`; }

  function itemRow(item, index) {
    const p = productBySku(item.sku); const tracked = Number.isFinite(p.stock); const remaining = tracked ? p.stock - item.quantity : null;
    let stock = tracked ? `${p.stock}` : 'Not tracked'; let note = '';
    if (tracked && remaining < 0) note = `<span class="invoice-stock-status error">Exceeds stock by ${Math.abs(remaining)} units.</span>`;
    else if (p.sku === 'SH-BLU-M' && remaining === 4) note = '<span class="invoice-stock-status warning">Only 4 units will remain after this invoice. A low-stock alert will be created.</span>';
    else if (tracked) note = `<span class="invoice-stock-status">${remaining} units will remain.</span>`;
    const taxable = item.quantity * item.unitPrice * (1 - item.discount / 100);
    return `<tr data-item="${index}"><td><label class="sr-only" for="item-product-${index}">Product</label><select id="item-product-${index}" data-item-field="sku"><option value="">Select a product</option>${(config.products || []).map(prod => `<option value="${e(prod.sku)}" ${prod.sku === item.sku ? 'selected' : ''}>${e(prod.name)} · ${e(prod.sku)}</option>`).join('')}</select>${note}</td><td class="invoice-stock-cell">${e(stock)}</td><td><label class="sr-only" for="item-qty-${index}">Quantity</label><input id="item-qty-${index}" data-item-field="quantity" type="number" min="0" step="1" value="${e(item.quantity)}"></td><td><label class="sr-only" for="item-price-${index}">Unit price</label><input id="item-price-${index}" data-item-field="unitPrice" type="number" min="0" value="${e(item.unitPrice)}"></td><td><label class="sr-only" for="item-discount-${index}">Discount percentage</label><input id="item-discount-${index}" data-item-field="discount" type="number" min="0" max="100" value="${e(item.discount)}"></td><td><label class="sr-only" for="item-gst-${index}">GST percentage</label><select id="item-gst-${index}" data-item-field="gst">${[0,5,12,18,28].map(rate => `<option value="${rate}" ${rate === Number(item.gst) ? 'selected' : ''}>${rate}%</option>`).join('')}</select></td><td class="invoice-taxable">${money(taxable)}</td><td><button class="invoice-remove" type="button" data-remove-item="${index}" aria-label="Remove ${e(p.name || 'line item')}" ${state.items.length === 1 ? 'disabled' : ''}>×</button></td></tr>`;
  }
  function totals() {
    const subtotal = state.items.reduce((sum, x) => sum + x.quantity * x.unitPrice, 0);
    const discount = state.items.reduce((sum, x) => sum + x.quantity * x.unitPrice * x.discount / 100, 0);
    const taxable = subtotal - discount;
    const gst = state.gstTreatment === 'exempt' ? 0 : state.items.reduce((sum, x) => sum + x.quantity * x.unitPrice * (1 - x.discount / 100) * x.gst / 100, 0);
    return { subtotal, discount, taxable, gst: Math.round(gst), grand: Math.round(taxable + gst) };
  }
  function totalsMarkup() { const t = totals(); return `<div><span>Subtotal</span><strong>${money(t.subtotal)}</strong></div><div><span>Discount total</span><strong>− ${money(t.discount)}</strong></div>${state.gstTreatment === 'intra' ? `<div><span>CGST</span><strong>${money(t.gst / 2)}</strong></div><div><span>SGST</span><strong>${money(t.gst / 2)}</strong></div>` : state.gstTreatment === 'inter' ? `<div><span>IGST</span><strong>${money(t.gst)}</strong></div>` : '<div><span>GST</span><strong>Exempt</strong></div>'}<div class="grand"><span>Grand total</span><span>${money(t.grand)}</span></div>`; }

  function renderBuilder(errors = {}) {
    const c = state.customer, i = state.invoice; const sourceHint = state.method === 'quotation' ? 'From customer record' : state.method === 'customer' ? 'From customer record' : '';
    const gstLabel = state.gstTreatment === 'inter' ? 'Inter-state: IGST' : state.gstTreatment === 'exempt' ? 'GST exempt' : 'Intra-state: CGST + SGST';
    content.innerHTML = `<div class="notice invoice-ai-notice">✦ VyapaarAI filled these details from the quotation, customer record and inventory catalogue. Review only what has changed.</div><div class="invoice-builder-grid"><section class="invoice-form-section invoice-customer-section"><h3>Customer details</h3><div class="invoice-fields-grid">${field('Customer name','customerName',c.name, 'text', sourceHint)}${field('Contact person','contact',c.contact,'text',sourceHint)}${field('Phone number','phone',c.phone,'tel',sourceHint)}${field('Email address','email',c.email,'email',sourceHint)}${field('GSTIN','gstin',c.gstin,'text',sourceHint)}${field('Billing address','address',c.address,'text',sourceHint)}${field('Place of supply','placeOfSupply',c.placeOfSupply,'text',sourceHint)}</div></section><section class="invoice-form-section invoice-details-section"><h3>Invoice details</h3><div class="invoice-fields-grid">${field('Invoice number','number',i.number,'text','Auto-filled')}${field('Invoice date','date',i.date,'date','Auto-filled')}${field('Due date','dueDate',i.dueDate,'date','Auto-filled')}${selectField('Payment terms','paymentTerms',i.paymentTerms,['Due on receipt','Net 7 days','Net 15 days','Net 30 days'])}${selectField('Currency','currency',i.currency,['INR'])}${field('Purchase order reference','purchaseOrder',i.purchaseOrder)}${field('Linked quotation','linkedQuotation',i.linkedQuotation,'text',state.method === 'quotation' ? `From ${i.linkedQuotation}` : '')}${selectField('GST treatment','gstTreatment',gstLabel,['Intra-state: CGST + SGST','Inter-state: IGST','GST exempt'])}</div></section></div><section class="invoice-items-editor"><div class="invoice-section-head"><div><h3>Line items</h3><p>Stock levels come from the connected inventory catalogue.</p></div><button class="btn btn-outline" data-invoice-action="add-item" type="button">+ Add line item</button></div><div class="invoice-items-scroll"><table><thead><tr><th>Product</th><th>Available stock</th><th>Quantity</th><th>Unit price</th><th>Discount</th><th>GST</th><th>Taxable amount</th><th>Remove</th></tr></thead><tbody>${state.items.map(itemRow).join('')}</tbody></table></div><div class="invoice-line-error" role="alert">${e(errors.items || '')}</div><div class="invoice-totals">${totalsMarkup()}</div></section><section class="invoice-form-section invoice-additional"><h3>Additional information</h3><div class="invoice-fields-grid">${field('Customer notes','customerNote',i.customerNote)}${field('Internal notes','internalNote',i.internalNote)}${field('Terms and conditions','terms',i.terms)}${selectField('Bank account or UPI payment method','paymentMethod',i.paymentMethod,config.paymentMethods || [])}${selectField('Payment reminder preference','reminder',i.reminder,['3 days before due date','On due date','No reminder'])}</div></section><div class="invoice-form-error" role="alert">${e(errors.form || '')}</div><div class="workflow-actions"><button class="btn btn-outline" data-invoice-action="back-start" type="button">Back</button><button class="btn btn-outline" data-invoice-action="save-draft" type="button">Save as draft</button><button class="btn btn-brand" data-invoice-action="builder-continue" type="button">Continue</button></div>`;
    Object.entries(errors).forEach(([key,value]) => content.querySelector(`[data-error="${key}"]`) && (content.querySelector(`[data-error="${key}"]`).textContent = value));
  }

  function syncBuilder() {
    content.querySelectorAll('[data-field]').forEach(input => {
      const key = input.dataset.field; const customerKeys = ['customerName','contact','phone','email','gstin','address','placeOfSupply'];
      if (customerKeys.includes(key)) state.customer[key === 'customerName' ? 'name' : key] = input.value;
      else if (key === 'gstTreatment') state.gstTreatment = input.value.startsWith('Intra') ? 'intra' : input.value.startsWith('Inter') ? 'inter' : 'exempt';
      else state.invoice[key] = input.value;
    });
    content.querySelectorAll('[data-item]').forEach(row => { const item = state.items[Number(row.dataset.item)]; row.querySelectorAll('[data-item-field]').forEach(input => { const key = input.dataset.itemField; item[key] = key === 'sku' ? input.value : Math.max(0, Number(input.value) || 0); }); });
  }
  function validate() {
    syncBuilder(); const errors = {}; const c = state.customer, i = state.invoice;
    if (!c.name?.trim()) errors.customerName = 'Enter a customer name.';
    if (!i.number?.trim()) errors.number = 'Enter an invoice number.';
    if (!i.date || Number.isNaN(new Date(i.date).getTime())) errors.date = 'Enter a valid invoice date.';
    if (!i.dueDate || (i.date && i.dueDate < i.date)) errors.dueDate = 'Due date cannot be earlier than invoice date.';
    if (c.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/i.test(c.gstin.trim())) errors.gstin = 'Enter a plausible 15-character GSTIN or leave it blank.';
    if (!state.items.length || state.items.some(x => x.quantity <= 0 || x.unitPrice < 0 || !x.sku)) errors.items = 'Every line item needs a product, quantity above zero and a non-negative unit price.';
    const over = state.items.find(x => Number.isFinite(productBySku(x.sku).stock) && x.quantity > productBySku(x.sku).stock);
    if (over) errors.items = `Quantity for ${productBySku(over.sku).name} exceeds available stock.`;
    if (totals().grand <= 0) errors.form = 'Grand total must be greater than zero.';
    return errors;
  }

  function preview() { const t = totals(), c = state.customer, i = state.invoice; return `<div class="invoice-paper"><div class="invoice-brand"><div><h3>Sharma Garments</h3><p>Quality apparel & wholesale</p></div><div class="invoice-preview-number"><strong>TAX INVOICE</strong><p>${e(i.number)}</p></div></div><div class="invoice-to"><div><p>BILL TO</p><strong>${e(c.name)}</strong><p>${e(c.address)}</p><p>GSTIN: ${e(c.gstin || 'Not provided')}</p></div><div><p>INVOICE DATE</p><strong>${e(prettyDate(i.date))}</strong><p>Due ${e(prettyDate(i.dueDate))}</p></div></div><div class="invoice-preview-table"><table class="invoice-table"><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${state.items.map(x => `<tr><td>${e(productBySku(x.sku).name)}<small>${e(x.sku)}</small></td><td>${e(x.quantity)}</td><td>${money(x.unitPrice)}</td><td>${money(x.quantity*x.unitPrice*(1-x.discount/100))}</td></tr>`).join('')}</tbody></table></div><div class="invoice-total">${totalsMarkup()}</div><div class="invoice-preview-footer"><p><strong>Payment terms:</strong> ${e(i.paymentTerms)} · ${e(i.paymentMethod)}</p><p>${e(i.customerNote)}</p></div></div>`; }
  function generatedMessage() { const c = state.customer, i = state.invoice, t = totals(); return messageVariant % 2 ? `Hello ${c.contact?.split(' ')[0] || c.name}, invoice ${i.number} for ${money(t.grand)} is attached. It is due on ${prettyDate(i.dueDate)}. A secure UPI payment link is included for your convenience. Thank you — Sharma Garments.` : `Hi ${c.contact?.split(' ')[0] || c.name}, your invoice ${i.number} for ${money(t.grand)} is ready. Payment is due by ${prettyDate(i.dueDate)}. You can use the attached invoice or the included UPI payment link. Thank you for your business.`; }
  function dynamicUpdates() { const t = totals(), c = state.customer, i = state.invoice, q = i.linkedQuotation || 'the linked quotation'; return [
    {area:'Record keeping',items:[`Create sales invoice ${i.number}`,`Add ${money(t.grand)} to outstanding receivables`,'Begin payment tracking',`Set due date to ${prettyDate(i.dueDate)}`]},
    {area:'Customer and lead',items:[`Link the invoice to ${c.name}`,`Mark ${q} as converted`,`Move the ${c.name} lead to Won`,'Update customer lifetime value']},
    {area:'Inventory',items:state.items.filter(x=>Number.isFinite(productBySku(x.sku).stock)).map(x=>`Reduce ${productBySku(x.sku).name} by ${x.quantity}`).concat(state.items.some(x=>x.sku==='SH-BLU-M' && productBySku(x.sku).stock-x.quantity<=4)?['Create a low-stock alert for Blue Cotton Shirt · M']:[])},
    {area:'Tax and reminders',items:[`Add ${money(t.gst)} to output GST`,'Schedule a payment reminder three days before the due date','Schedule an overdue reminder one day after the due date']}
  ]; }
  function renderReview() {
    if (!state.message) state.message = generatedMessage();
    content.innerHTML = `<div class="invoice-send-grid"><div class="invoice-preview">${preview()}</div><div class="invoice-send-panel"><section><h3>Delivery methods</h3><div class="invoice-delivery-options">${(config.deliveryMethods || []).map(method => `<label><input type="checkbox" data-delivery="${e(method)}" ${state.deliveries[method] ? 'checked' : ''}> <span>${method === 'PDF' ? 'Create downloadable PDF' : method === 'UPI payment link' ? 'Include UPI payment link' : `Send through ${method}`}</span></label>`).join('')}</div><p class="invoice-recipient"><strong>WhatsApp:</strong> ${e(state.customer.phone || 'Not provided')}<br><strong>Email:</strong> ${e(state.customer.email || 'Not provided')}</p></section><section class="invoice-message-editor"><div class="invoice-section-head"><h3>AI-generated message</h3><button class="btn btn-outline" data-invoice-action="regenerate" type="button">Regenerate message</button></div><label for="invoiceMessage">Message to customer</label><textarea id="invoiceMessage" rows="6">${e(state.message)}</textarea></section><section><h3>Creating this invoice will update the following areas.</h3><div class="invoice-updates-grid">${dynamicUpdates().map((u,n) => `<div class="update-card"><div class="update-card-icon">${['▤','◎','◫','↗'][n]}</div><h3>${e(u.area)}</h3><ul>${u.items.map(x=>`<li>${e(x)}</li>`).join('')}</ul></div>`).join('')}</div></section></div></div><div class="workflow-actions"><button class="btn btn-outline" data-invoice-action="review-back" type="button">Back</button><button class="btn btn-outline" data-invoice-action="save-draft" type="button">Save as draft</button><button class="btn btn-brand" data-invoice-action="create-send" type="button">Create and send invoice</button></div>`;
  }

  function record(status = 'Pending') { const t = totals(), i = state.invoice, c = state.customer; return { id: `createdRecord${i.number.replace(/\W/g,'')}`, icon:'INV', date:i.date, title:`${i.number} · ${c.name}`, meta:`Sales invoice · ${shortDate(i.date)} · Created in VyapaarAI`, value:money(t.grand), status, tone:status === 'Draft' ? 'blue' : 'amber' }; }
  function persist(status) { const data = record(status); sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data)); saved = true; restoreRecord(); return data; }
  function restoreRecord() {
    let data; try { data = JSON.parse(sessionStorage.getItem(STORAGE_KEY)); } catch (_) { return; }
    const list = document.getElementById('recordList'); if (!data || !list || document.getElementById(data.id)) return;
    const card = document.createElement('div'); card.className='record-card'; card.id=data.id;
    card.dataset.search=[data.icon,'sales invoices',data.title,data.meta,data.value,data.status].join(' ').toLowerCase(); card.dataset.type=data.icon; card.dataset.status=data.status; card.dataset.date=data.date;
    card.innerHTML=`<div class="record-meta"><div class="file-icon">${e(data.icon)}</div><div><h4>${e(data.title)}</h4><p>${e(data.meta)}</p></div></div><div class="record-value"><strong>${e(data.value)}</strong><br><span class="pill ${e(data.tone)}">${e(data.status)}</span></div>`; list.prepend(card);
    const statusSelect=document.getElementById('recordStatus'); if(statusSelect && ![...statusSelect.options].some(o=>o.value===data.status)) statusSelect.add(new Option(data.status,data.status));
    if (typeof filterRecords === 'function') filterRecords();
  }
  function saveDraft() { if (step === 2) { const errors=validate(); if(Object.keys(errors).length){renderBuilder(errors);return;} } else { state.message=document.getElementById('invoiceMessage')?.value||state.message; }
    const data=persist('Draft'); content.innerHTML=`<div class="invoice-create-success"><div class="success-icon">✓</div><h2>${e(data.title)} saved as draft</h2><p>No inventory, quotation, lead, delivery or payment updates were applied.</p><div class="workflow-actions"><button class="btn btn-brand" data-invoice-action="view-record" type="button">View record</button><button class="btn btn-outline" data-invoice-action="close-force" type="button">Close</button></div></div>`; }
  function processInvoice() { state.message=document.getElementById('invoiceMessage')?.value||state.message; content.innerHTML=`<div class="invoice-processing"><div class="ai-orb">✦</div><h3>Creating invoice</h3><p id="invoiceProcessingText">Creating invoice…</p><div class="processing-track"><div class="processing-bar"></div></div></div>`; const messages=['Creating invoice','Updating customer records','Adjusting inventory','Generating PDF','Sending invoice','Scheduling payment reminders']; let n=0; const tick=()=>{ const label=document.getElementById('invoiceProcessingText'); if(label)label.textContent=`${messages[n]}…`; n++; if(n<messages.length) processingTimer=setTimeout(tick,170); else processingTimer=setTimeout(()=>{persist('Pending');setStep(4);},170);}; tick(); }
  function renderSuccess() { const data=record('Pending'); content.innerHTML=`<div class="invoice-create-success"><div class="success-icon">✓</div><h2>Invoice ${e(state.invoice.number)} created successfully</h2><p>${e(state.customer.name)} has been invoiced for ${e(data.value)}.</p><div class="completed-actions">${['Invoice record created',`Quotation ${state.invoice.linkedQuotation || 'record'} converted`,`${state.customer.name} lead marked as won`,'Inventory quantities updated','Low-stock alert created','PDF generated','WhatsApp message sent','Email sent','Payment tracking started','Reminders scheduled'].map(x=>`<div>✓ ${e(x)}</div>`).join('')}</div><div class="invoice-delivery-summary"><div>WhatsApp <strong>${state.deliveries.WhatsApp?'Sent':'Not selected'}</strong></div><div>Email <strong>${state.deliveries.Email?'Sent':'Not selected'}</strong></div><div>PDF <strong>${state.deliveries.PDF?'Generated':'Not selected'}</strong></div><div>UPI payment link <strong>${state.deliveries['UPI payment link']?'Included':'Not selected'}</strong></div></div><div class="workflow-actions"><button class="btn btn-brand" data-invoice-action="view-invoice" type="button">View invoice</button><button class="btn btn-outline" data-invoice-action="view-record" type="button">View record</button><button class="btn btn-outline" data-invoice-action="another" type="button">Create another invoice</button><button class="btn btn-outline" data-invoice-action="close-force" type="button">Close</button></div></div>`; }
  function renderFinalPreview() { content.innerHTML=`<div class="invoice-final-preview"><div class="invoice-preview">${preview()}</div><div class="workflow-actions"><button class="btn btn-outline" data-invoice-action="back-success" type="button">Back to success</button><button class="btn btn-brand" data-invoice-action="download" type="button">Simulate download PDF</button><button class="btn btn-outline" data-invoice-action="resend" type="button">Simulate resend</button><button class="btn btn-outline" data-invoice-action="close-force" type="button">Close</button></div></div>`; }
  async function viewRecord() { const data=persist(saved ? (JSON.parse(sessionStorage.getItem(STORAGE_KEY))?.status||'Pending') : 'Pending'); close(true); if(!document.getElementById('records')) await goTo('records'); restoreRecord(); document.getElementById(data.id)?.scrollIntoView({behavior:'smooth',block:'center'}); showToast(`${data.title} is now available in Record Keeping.`); }

  content.addEventListener('input', event => { if (step !== 2) return; syncBuilder(); if(event.target.matches('[data-item-field]')) { const row=event.target.closest('[data-item]'); const item=state.items[Number(row.dataset.item)]; row.querySelector('.invoice-taxable').textContent=money(item.quantity*item.unitPrice*(1-item.discount/100)); content.querySelector('.invoice-totals').innerHTML=totalsMarkup(); } });
  content.addEventListener('change', event => { if(event.target.id==='invoiceStartCustomer'){state.selectedCustomer=event.target.value;renderStart();return;} if(step===2){syncBuilder();if(event.target.dataset.itemField==='sku'){const item=state.items[Number(event.target.closest('[data-item]').dataset.item)], product=productBySku(item.sku);item.unitPrice=product.unitPrice||0;item.gst=product.gst??18;}renderBuilder();} if(event.target.dataset.delivery) state.deliveries[event.target.dataset.delivery]=event.target.checked; });
  content.addEventListener('click', event => {
    const method=event.target.closest('[data-method]'); if(method){state.method=method.dataset.method;if(state.method!=='customer')state.selectedCustomer='';renderStart();return;}
    const remove=event.target.closest('[data-remove-item]'); if(remove){syncBuilder();if(state.items.length>1)state.items.splice(Number(remove.dataset.removeItem),1);renderBuilder();return;}
    const button=event.target.closest('[data-invoice-action]'); if(!button)return; const a=button.dataset.invoiceAction;
    if(a==='cancel'||a==='close')close(); else if(a==='close-force')close(true); else if(a==='start-continue'){applyStartingPoint();setStep(2);} else if(a==='back-start')setStep(1); else if(a==='add-item'){syncBuilder();state.items.push(emptyItem());renderBuilder();} else if(a==='builder-continue'){const errors=validate();if(Object.keys(errors).length)renderBuilder(errors);else setStep(3);} else if(a==='save-draft')saveDraft(); else if(a==='review-back'){state.message=document.getElementById('invoiceMessage')?.value||state.message;setStep(2);} else if(a==='regenerate'){messageVariant++;state.message=generatedMessage();document.getElementById('invoiceMessage').value=state.message;} else if(a==='create-send')processInvoice(); else if(a==='view-invoice')renderFinalPreview(); else if(a==='back-success')renderSuccess(); else if(a==='view-record')viewRecord(); else if(a==='another'){resetState(true);setStep(1);} else if(a==='download')showToast('Invoice PDF prepared for download.'); else if(a==='resend')showToast('Invoice resent through the selected delivery methods.');
  });
  document.addEventListener('click', event => { const button=event.target.closest('[data-action="create-invoice"]'); if(button){event.preventDefault();event.stopImmediatePropagation();open();} }, true);
  modal.querySelector('.close').addEventListener('click', () => close());
  modal.addEventListener('click', event => { if(event.target===modal && step===1)close(true); });
  document.addEventListener('keydown', event => { if(!modal.classList.contains('show'))return; if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();return;} if(event.key==='Tab'){const focusable=[...modal.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(x=>x.offsetParent!==null);if(!focusable.length)return;const first=focusable[0],last=focusable[focusable.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}} }, true);
  window.VyapaarInvoice={open,setConfig,restoreRecord};
})();
