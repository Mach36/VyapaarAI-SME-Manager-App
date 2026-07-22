window.VyapaarPages ??= {};
window.VyapaarPages.records = async function () {
  const data = await fetchPageData('records');
  window.VyapaarUpload?.setConfig(data.uploadWorkflow);
  return VyapaarRenderers.records({
    title: 'Record keeping', subtitle: 'One searchable source of truth for invoices, payments, expenses and documents.',
    actions: [{ label: 'Upload document', style: 'outline', action: 'upload-document' }, { label: 'Create invoice', style: 'brand', toast: 'New invoice draft created' }],
    metrics: data.metrics,
    // Keep button labels for compatibility with previously cached renderers.
    filters: { search: 'Search records...', buttons: ['All types ▾', 'All statuses ▾', 'This month ▾'] },
    records: data.records
  });
};

(function uploadDocumentWorkflow() {
  function createUploadModal() {
    const element = document.createElement('div');
    element.className = 'modal upload-modal';
    element.id = 'uploadDocumentModal';
    element.setAttribute('role', 'dialog');
    element.setAttribute('aria-modal', 'true');
    element.setAttribute('aria-labelledby', 'uploadModalTitle');
    element.setAttribute('aria-describedby', 'uploadModalDescription');
    element.innerHTML = `<div class="modal-card upload-modal-card" tabindex="-1">
      <div class="modal-head upload-modal-head">
        <div><h2 id="uploadModalTitle">Upload document</h2><p class="empty-small" id="uploadModalDescription">Turn a business document into an organised record.</p></div>
        <button class="close" id="uploadModalClose" type="button" aria-label="Close upload workflow">×</button>
      </div>
      <div class="upload-progress" id="uploadProgress" aria-label="Workflow progress"></div>
      <div class="upload-step-content" id="uploadStepContent"></div>
    </div>`;
    document.body.appendChild(element);
    return element;
  }

  const modal = createUploadModal();
  const modalCard = modal.querySelector('.upload-modal-card');
  const content = document.getElementById('uploadStepContent');
  const progress = document.getElementById('uploadProgress');
  const closeButton = document.getElementById('uploadModalClose');
  const stepNames = ['Upload document', 'AI processing', 'Review information', 'Business updates', 'Complete'];
  let workflowConfig = {};
  function setConfig(config) { workflowConfig = config || {}; }
  const allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'xlsx'];
  const maxFileSize = 10 * 1024 * 1024;
  let currentStep = 1;
  let selectedFile = null;
  let processingTimer = null;
  let savedRecord = false;
  let lastFocusedElement = null;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function renderProgress() {
    progress.innerHTML = stepNames.map((name, index) => {
      const step = index + 1;
      const state = step < currentStep ? 'done' : step === currentStep ? 'active' : '';
      return `<div class="upload-progress-item ${state}" data-short="${step}" aria-current="${step === currentStep ? 'step' : 'false'}"><span>${step}. ${name}</span></div>`;
    }).join('');
  }

  function setStep(step) {
    currentStep = step;
    renderProgress();
    content.style.animation = 'none';
    void content.offsetHeight;
    content.style.animation = '';
    if (step === 1) renderUploadStep();
    if (step === 2) renderProcessingStep();
    if (step === 3) renderReviewStep();
    if (step === 4) renderUpdatesStep();
    if (step === 5) renderSuccessStep();
    content.scrollTop = 0;
  }

  function openWorkflow() {
    lastFocusedElement = document.activeElement;
    modal.classList.add('show');
    document.body.classList.add('upload-modal-open');
    setStep(1);
    requestAnimationFrame(() => closeButton.focus());
  }

  function requestClose() {
    if (currentStep >= 3 && currentStep < 5 && !window.confirm('Your reviewed information has not been saved. Close this workflow and discard your progress?')) return;
    closeWorkflow();
  }

  function closeWorkflow() {
    clearInterval(processingTimer);
    modal.classList.remove('show');
    document.body.classList.remove('upload-modal-open');
    lastFocusedElement?.focus?.();
  }

  function resetWorkflow() {
    selectedFile = null;
    setStep(1);
  }

  function formatFileSize(bytes) {
    return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function renderUploadStep(error = '') {
    const fileMarkup = selectedFile ? `<div class="selected-file"><div class="selected-file-main"><div class="file-icon">${escapeHtml(selectedFile.name.split('.').pop().toUpperCase())}</div><div style="min-width:0"><div class="selected-file-name">${escapeHtml(selectedFile.name)}</div><div class="empty-small">${escapeHtml(selectedFile.type || 'Document')} · ${formatFileSize(selectedFile.size)}</div></div></div><button class="text-button" id="removeUploadFile" type="button">Remove file</button></div>` : '';
    content.innerHTML = `<p class="upload-copy">Upload invoices, receipts, purchase orders or bank statements. VyapaarAI will extract and organise the information automatically.</p>
      <div class="drop-zone" id="uploadDropZone"><div><div class="drop-icon">⇧</div><h3>Drag and drop documents here</h3><p>Upload one or multiple documents. One sample will be processed in this prototype.</p><div class="upload-options"><label class="btn btn-brand" for="documentFileInput">Browse files</label><label class="btn btn-outline camera-label" for="cameraFileInput">Use camera</label></div><input class="upload-file-input" id="documentFileInput" type="file" accept=".pdf,.png,.jpg,.jpeg,.xlsx,application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"><input class="upload-file-input" id="cameraFileInput" type="file" accept="image/*" capture="environment"></div></div>
      <div class="file-requirements">Supported: PDF, PNG, JPG, JPEG and XLSX · Maximum file size: 10 MB</div>${fileMarkup}<div class="file-error" role="alert">${escapeHtml(error)}</div>
      <div class="workflow-actions"><button class="btn btn-outline" id="cancelUpload" type="button">Cancel</button><button class="btn btn-brand" id="continueUpload" type="button" ${selectedFile ? '' : 'disabled'}>Continue</button></div>`;
    bindUploadStep();
  }

  function validateFile(file) {
    if (!file) return;
    const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
    if (!allowedExtensions.includes(extension)) { selectedFile = null; renderUploadStep('This file type is not supported. Choose a PDF, PNG, JPG, JPEG or XLSX file.'); return; }
    if (file.size > maxFileSize) { selectedFile = null; renderUploadStep('This file is larger than 10 MB. Choose a smaller file.'); return; }
    selectedFile = file;
    renderUploadStep();
  }

  function bindUploadStep() {
    const dropZone = document.getElementById('uploadDropZone');
    document.getElementById('documentFileInput').addEventListener('change', event => validateFile(event.target.files[0]));
    document.getElementById('cameraFileInput').addEventListener('change', event => validateFile(event.target.files[0]));
    ['dragenter', 'dragover'].forEach(type => dropZone.addEventListener(type, event => { event.preventDefault(); dropZone.classList.add('dragging'); }));
    ['dragleave', 'drop'].forEach(type => dropZone.addEventListener(type, event => { event.preventDefault(); dropZone.classList.remove('dragging'); }));
    dropZone.addEventListener('drop', event => validateFile(event.dataTransfer.files[0]));
    document.getElementById('removeUploadFile')?.addEventListener('click', () => { selectedFile = null; renderUploadStep(); });
    document.getElementById('cancelUpload').addEventListener('click', closeWorkflow);
    document.getElementById('continueUpload').addEventListener('click', () => selectedFile && setStep(2));
  }

  function renderProcessingStep() {
    const documentData = workflowConfig.document || {};
    content.innerHTML = `<div class="processing-wrap"><div class="ai-orb">✦</div><h3>VyapaarAI is reading your document</h3><p class="empty-small" id="processingStage">Preparing document…</p><div class="processing-track"><div class="processing-bar" id="processingBar"></div></div><div class="processing-meta"><span id="processingPercent">0%</span><span>Usually takes a few seconds</span></div><div class="processing-results"><span class="pill blue">Detected: ${escapeHtml(documentData.type || 'Sales invoice')}</span><span class="pill green">Extraction confidence: ${escapeHtml(documentData.confidence || 96)}%</span></div></div>`;
    const stages = workflowConfig.processingStages || ['Identifying document type', 'Extracting invoice information', 'Matching customer records', 'Checking for duplicate documents', 'Linking products and payments'];
    let progressValue = 0;
    processingTimer = setInterval(() => {
      progressValue = Math.min(100, progressValue + 5);
      document.getElementById('processingBar').style.width = `${progressValue}%`;
      document.getElementById('processingPercent').textContent = `${progressValue}%`;
      document.getElementById('processingStage').textContent = stages[Math.min(stages.length - 1, Math.floor(progressValue / 21))];
      if (progressValue === 100) { clearInterval(processingTimer); setTimeout(() => modal.classList.contains('show') && setStep(3), 180); }
    }, 95);
  }

  function field(label, value, confidence = 'high', type = 'text') {
    const confidenceText = confidence === 'review' ? '78% · Review' : confidence === 'missing' ? 'Missing' : '96%';
    return `<div class="field"><label>${label}<span class="confidence ${confidence}">${confidenceText}</span></label><input type="${type}" value="${escapeHtml(value)}" aria-label="${label}"></div>`;
  }

  function renderReviewStep() {
    content.innerHTML = `<div class="review-grid"><div class="invoice-preview" aria-label="Uploaded invoice preview"><div class="invoice-paper"><div class="invoice-brand"><div><h3>Sharma Garments</h3><p>Quality apparel & wholesale</p></div><div style="text-align:right"><strong>INVOICE</strong><p>INV-1055</p></div></div><div class="invoice-to"><div><p>BILL TO</p><strong>Ahuja Retail</strong><p>GSTIN: 27AAECA1234K1Z7</p></div><div style="text-align:right"><p>DATE</p><strong>22 July 2026</strong><p>Due 6 August 2026</p></div></div><table class="invoice-table"><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody><tr><td>Formal White Shirt · L</td><td>50</td><td>₹800</td><td>₹40,000</td></tr><tr><td>Blue Cotton Shirt · M</td><td>30</td><td>₹700</td><td>₹21,000</td></tr><tr><td>Packaging</td><td>1</td><td>₹3,407</td><td>₹3,407</td></tr></tbody></table><div class="invoice-total"><div><span>Subtotal</span><strong>₹64,407</strong></div><div><span>GST (18%)</span><strong>₹11,593</strong></div><div class="grand"><span>Total</span><span>₹76,000</span></div></div></div></div>
      <div><div class="notice">Only review fields marked for attention. High-confidence fields have been filled automatically.</div><div class="extracted-form">${field('Document type', 'Sales invoice')}${field('Invoice number', 'INV-1055')}${field('Customer', 'Ahuja Retail')}${field('Invoice date', '22 July 2026')}${field('Due date', '6 August 2026')}${field('Customer GST number', '27AAECA1234K1Z7', 'review')}${field('Subtotal', '₹64,407')}${field('GST', '₹11,593')}${field('Total amount', '₹76,000')}<div class="field"><label>Payment status<span class="confidence high">96%</span></label><select aria-label="Payment status"><option selected>Unpaid</option><option>Paid</option><option>Partially paid</option></select></div>${field('Source', 'Uploaded document')}</div>
      <div class="review-section"><h3>Duplicate check</h3><div class="duplicate-result"><strong>✓ No exact duplicate found.</strong><div class="duplicate-warning">A similar quotation for Ahuja Retail was found and will be linked to this invoice. <button class="text-button" id="viewQuotation" type="button" aria-expanded="false">View quotation</button><div class="quotation-popover is-hidden" id="quotationPopover"><strong>Quotation QUO-2088</strong><br>Created 18 July 2026 · Ahuja Retail · ₹76,000<br>This quotation matches the customer and invoice amount.</div></div></div></div>
      <div class="review-section"><h3>Line items</h3><div class="line-items-wrap"><table class="line-items-table"><thead><tr><th>Product</th><th>Quantity</th><th>Unit price</th><th>GST</th><th>Total</th></tr></thead><tbody><tr><td>Formal White Shirt · L</td><td><input class="line-input line-qty" type="number" min="0" value="50" aria-label="Formal White Shirt quantity"></td><td><input class="line-input line-price" type="number" min="0" value="800" aria-label="Formal White Shirt unit price"></td><td>18%</td><td class="line-total">₹40,000</td></tr><tr><td>Blue Cotton Shirt · M</td><td><input class="line-input line-qty" type="number" min="0" value="30" aria-label="Blue Cotton Shirt quantity"></td><td><input class="line-input line-price" type="number" min="0" value="700" aria-label="Blue Cotton Shirt unit price"></td><td>18%</td><td class="line-total">₹21,000</td></tr><tr><td>Packaging</td><td><input class="line-input line-qty" type="number" min="0" value="1" aria-label="Packaging quantity"></td><td><input class="line-input line-price" type="number" min="0" value="3407" aria-label="Packaging unit price"></td><td>18%</td><td class="line-total">₹3,407</td></tr></tbody></table></div></div>
      <div class="workflow-actions"><button class="btn btn-outline" id="reviewBack" type="button">Back</button><button class="btn btn-brand" id="reviewContinue" type="button">Continue</button></div></div></div>`;
    document.getElementById('viewQuotation').addEventListener('click', event => { const popover = document.getElementById('quotationPopover'); const open = popover.classList.toggle('is-hidden') === false; event.currentTarget.setAttribute('aria-expanded', String(open)); });
    document.querySelectorAll('.line-qty, .line-price').forEach(input => input.addEventListener('input', updateLineTotals));
    document.getElementById('reviewBack').addEventListener('click', () => setStep(1));
    document.getElementById('reviewContinue').addEventListener('click', () => setStep(4));
  }

  function updateLineTotals() {
    document.querySelectorAll('.line-items-table tbody tr').forEach(row => {
      const total = Number(row.querySelector('.line-qty').value || 0) * Number(row.querySelector('.line-price').value || 0);
      row.querySelector('.line-total').textContent = `₹${total.toLocaleString('en-IN')}`;
    });
  }

  function renderUpdatesStep() {
    const icons = ['▤', '◎', '◫', '↗'];
    const updates = workflowConfig.businessUpdates || [];
    const documentData = workflowConfig.document || {};
    content.innerHTML = `<h2 class="update-heading">This document will update the following areas.</h2><p class="empty-small">Review every change before VyapaarAI applies it to your business.</p><div class="updates-grid">${updates.map((update, index) => `<div class="update-card"><div class="update-card-icon">${icons[index] || '✓'}</div><h3>${escapeHtml(update.area)}</h3><ul>${update.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>`).join('')}</div><div class="impact-summary"><span>Output GST added: ${escapeHtml(documentData.gst || '₹11,593')}</span><span>One low-stock alert will be created</span></div><div class="workflow-actions"><button class="btn btn-outline" id="updatesBack" type="button">Back</button><button class="btn btn-outline" id="saveDraft" type="button">Save as draft</button><button class="btn btn-brand" id="saveBusiness" type="button">Save and update business</button></div>`;
    document.getElementById('updatesBack').addEventListener('click', () => setStep(3));
    document.getElementById('saveDraft').addEventListener('click', () => showToast('Invoice INV-1055 saved as a draft.'));
    document.getElementById('saveBusiness').addEventListener('click', () => { savedRecord = true; addSavedRecordToList(); setStep(5); });
  }

  function renderSuccessStep() {
    content.innerHTML = `<div class="success-state"><div class="success-icon">✓</div><h2>Invoice INV-1055 saved successfully</h2><p>Four business areas were updated automatically.</p><div class="completed-actions"><div>Invoice record created</div><div>Ahuja Retail customer updated</div><div>Inventory quantities adjusted</div><div>Lead marked as won</div><div>Payment tracking started</div><div>Low-stock warning created</div></div><div class="workflow-actions"><button class="btn btn-brand" id="viewSavedRecord" type="button">View record</button><button class="btn btn-outline" id="uploadAnother" type="button">Upload another document</button><button class="btn btn-outline" id="closeSuccess" type="button">Close</button></div></div>`;
    document.getElementById('viewSavedRecord').addEventListener('click', viewSavedRecord);
    document.getElementById('uploadAnother').addEventListener('click', resetWorkflow);
    document.getElementById('closeSuccess').addEventListener('click', closeWorkflow);
  }

  function addSavedRecordToList() {
    if (!savedRecord) return;
    const list = document.getElementById('recordList');
    if (!list || document.getElementById('uploadedRecordINV1055')) return;
    const card = document.createElement('div');
    card.className = 'record-card';
    card.id = 'uploadedRecordINV1055';
    card.dataset.search = 'inv sales invoices inv-1055 ahuja retail sales invoice 22 jul 2026 uploaded document ₹76,000 unpaid';
    card.dataset.type = 'INV'; card.dataset.status = 'Unpaid'; card.dataset.date = '2026-07-22';
    card.innerHTML = '<div class="record-meta"><div class="file-icon">INV</div><div><h4>INV-1055 · Ahuja Retail</h4><p>Sales invoice · 22 Jul 2026 · Uploaded document</p></div></div><div class="record-value"><strong>₹76,000</strong><br><span class="pill amber">Unpaid</span></div>';
    list.prepend(card);
    const count = document.getElementById('recordCount');
    if (count) count.textContent = `Showing ${list.querySelectorAll('.record-card').length} records`;
  }

  async function viewSavedRecord() {
    closeWorkflow();
    if (!document.getElementById('records')) await goTo('records');
    addSavedRecordToList();
    document.getElementById('uploadedRecordINV1055')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showToast('Invoice INV-1055 is now available in Record Keeping.');
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-action="upload-document"]');
    if (button) {
      event.preventDefault(); event.stopImmediatePropagation(); openWorkflow();
    }
  }, true);
  closeButton.addEventListener('click', requestClose);
  modal.addEventListener('click', event => { if (event.target === modal && currentStep === 1) closeWorkflow(); });
  document.addEventListener('keydown', event => {
    if (!modal.classList.contains('show')) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); requestClose(); }
    if (event.key === 'Tab') {
      const focusable = [...modal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(item => item.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }, true);
  new MutationObserver(() => { if (savedRecord && document.getElementById('records')) addSavedRecordToList(); }).observe(document.getElementById('pageContent'), { childList: true });
  window.VyapaarUpload = { open: openWorkflow, setConfig };
})();
