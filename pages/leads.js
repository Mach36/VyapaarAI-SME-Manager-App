(function () {
  const STATE_KEY = 'vyapaar-lead-state-v1';
  const REVIEW_KEY = 'vyapaar-high-priority-review-v1';
  const terminalStages = new Set(['Won', 'Lost']);
  let initialData;
  let review = null;
  let lastTrigger = null;

  // A browser reload starts a fresh demo, while in-app navigation keeps the
  // current review position and lead updates for the rest of the page session.
  const navigationEntry = performance.getEntriesByType?.('navigation')?.[0];
  if (navigationEntry?.type === 'reload') {
    sessionStorage.removeItem(STATE_KEY);
    sessionStorage.removeItem(REVIEW_KEY);
  }

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const read = (key, fallback) => { try { return JSON.parse(sessionStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; } };
  const moneyValue = value => Number(String(value || '').replace(/[^0-9.]/g, '')) * (String(value).includes('L') ? 100000 : 1);

  function loadLeads() {
    const saved = read(STATE_KEY, null);
    if (saved?.length) return saved;
    return initialData.columns.flatMap(column => column.leads.map((lead, index) => ({
      ...lead,
      id: lead.id || `${column.name.toLowerCase().replace(/\s+/g, '-')}-${index}`,
      stage: lead.stage || column.name,
      activities: lead.activities || []
    })));
  }

  function saveLeads(leads) { sessionStorage.setItem(STATE_KEY, JSON.stringify(leads)); }
  function eligible(lead) { return !terminalStages.has(lead.stage) && Number.parseInt(lead.score, 10) >= 75 && Boolean(lead.next); }
  function prioritySort(a, b) {
    return Number.parseInt(b.score, 10) - Number.parseInt(a.score, 10)
      || moneyValue(b.potential) - moneyValue(a.potential)
      || new Date(a.followUpAt || 0) - new Date(b.followUpAt || 0);
  }

  function loadReview(leads) {
    const saved = read(REVIEW_KEY, null);
    const validIds = new Set(leads.filter(eligible).map(lead => lead.id));
    const queue = (saved?.queue || []).filter(id => validIds.has(id));
    const reviewed = new Set(saved?.reviewedIds || []);
    leads.filter(eligible).sort(prioritySort).forEach(lead => {
      if (!queue.includes(lead.id) && !reviewed.has(lead.id)) queue.push(lead.id);
    });
    return {
      queue,
      reviewedIds: [...reviewed],
      skippedIds: (saved?.skippedIds || []).filter(id => validIds.has(id)),
      stats: saved?.stats || { reviewed: 0, actioned: 0, skipped: 0, quotations: 0, won: 0 },
      completion: saved?.completion || false
    };
  }

  function saveReview() { sessionStorage.setItem(REVIEW_KEY, JSON.stringify(review)); }

  function pageData(leads) {
    const stages = ['New', 'Contacted', 'Quotation sent', 'Negotiation', 'Won', 'Lost'];
    const existing = initialData.columns.map(column => column.name);
    const columns = [...new Set([...existing, ...stages])].filter(stage => leads.some(lead => lead.stage === stage)).map(name => {
      const stageLeads = leads.filter(lead => lead.stage === name);
      return { name, count: String(stageLeads.length), leads: stageLeads };
    });
    const waiting = review.queue.length;
    const metrics = initialData.metrics.map(metric => metric.label === 'Likely to convert'
      ? { ...metric, value: String(leads.filter(eligible).length) }
      : metric.label === 'Follow-ups due'
        ? { ...metric, value: String(leads.filter(lead => eligible(lead) && lead.next).length) }
        : metric);
    return {
      title: 'Lead generation',
      subtitle: 'Leads captured automatically from WhatsApp, Instagram, email and your website.',
      actions: [
        { label: `Review high-priority leads · ${waiting}`, style: 'brand', action: 'review-high-priority' },
        { label: 'Import', style: 'outline', toast: 'Leads imported from CSV' },
        { label: 'Add lead', style: 'outline', toast: 'New lead form opened' }
      ],
      metrics,
      columns
    };
  }

  function ensureModal() {
    let modal = document.getElementById('leadReviewModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'leadReviewModal';
    modal.className = 'modal lead-review-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'leadReviewTitle');
    modal.innerHTML = '<div class="modal-card lead-review-shell" tabindex="-1"><div class="modal-head"><div><h2 id="leadReviewTitle">High-priority lead review</h2><p class="empty-small">Work through your most valuable leads one at a time.</p></div><button class="close" type="button" data-review-action="close" aria-label="Close high-priority lead review">×</button></div><div id="leadReviewContent"></div></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', handleModalClick);
    modal.addEventListener('input', handleModalInput);
    return modal;
  }

  function actionLabel(lead) {
    if (lead.stage === 'New') return ['contacted', 'Mark as contacted'];
    if (lead.stage === 'Contacted') return ['quotation', 'Send quotation'];
    if (lead.stage === 'Quotation sent') return ['whatsapp', 'Follow up'];
    if (lead.stage === 'Negotiation') return ['won', 'Mark as won'];
    return ['whatsapp', 'Send WhatsApp follow-up'];
  }

  function renderReview(message = '') {
    const content = document.getElementById('leadReviewContent');
    if (!content) return;
    const leads = loadLeads();
    const activeQueue = review.queue.filter(id => leads.some(lead => lead.id === id && eligible(lead)));
    review.queue = activeQueue;
    const allSkipped = activeQueue.length > 0 && activeQueue.every(id => review.skippedIds.includes(id));
    if (review.completion || !activeQueue.length || allSkipped) {
      review.completion = true;
      saveReview();
      const s = review.stats;
      content.innerHTML = `<div class="review-complete"><div class="success-icon">✓</div><h3>High-priority review complete</h3><div class="review-stats"><div><strong>${s.reviewed}</strong><span>Leads reviewed</span></div><div><strong>${s.actioned}</strong><span>Leads actioned</span></div><div><strong>${s.skipped}</strong><span>Leads skipped</span></div><div><strong>${s.quotations}</strong><span>Quotations sent</span></div><div><strong>${s.won}</strong><span>Leads won</span></div></div><div class="review-actions completion-actions"><button class="btn btn-brand" type="button" data-review-action="return">Return to leads</button>${review.skippedIds.length ? '<button class="btn btn-outline" type="button" data-review-action="review-skipped">Review skipped leads</button>' : ''}</div></div>`;
      return;
    }
    const lead = leads.find(item => item.id === activeQueue[0]);
    const total = review.stats.reviewed + activeQueue.length;
    const position = review.stats.reviewed + 1;
    const [primaryAction, primaryLabel] = actionLabel(lead);
    const sourceParts = String(lead.source).split(' · ');
    content.innerHTML = `${message ? `<div class="review-notice" role="status">${escapeHtml(message)}</div>` : ''}<div class="review-progress-head"><strong>Lead ${position} of ${total}</strong><span>${Math.round(((position - 1) / Math.max(total, 1)) * 100)}% complete</span></div><div class="review-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${position - 1}"><span style="width:${((position - 1) / Math.max(total, 1)) * 100}%"></span></div><article class="review-lead-card"><div class="review-lead-head"><div><h3>${escapeHtml(lead.name)}</h3><p>${escapeHtml(sourceParts[0])} · ${escapeHtml(lead.stage)}</p></div><span class="pill green">AI score: ${escapeHtml(lead.score)}</span></div><div class="review-facts"><div><span>Potential value</span><strong>${escapeHtml(lead.potential)}</strong></div><div><span>Product interest</span><strong>${escapeHtml(lead.interest)}</strong></div><div><span>Current stage</span><strong>${escapeHtml(lead.stage)}</strong></div><div><span>Last interaction</span><strong>${escapeHtml(lead.lastInteraction || sourceParts.slice(1).join(' · '))}</strong></div></div><div class="review-insight"><strong>Why this is high priority</strong><p>${escapeHtml(lead.priorityReason)}</p></div><div class="review-insight recommended"><strong>AI-recommended next action</strong><p>${escapeHtml(lead.next)}</p></div></article><div class="review-actions"><button class="btn btn-outline" type="button" data-review-action="skip">Skip</button>${[['contacted','Mark as contacted'],['whatsapp','Send WhatsApp follow-up'],['quotation','Send quotation'],['won','Mark as won'],['lost','Mark as lost']].map(([action,label]) => `<button class="btn ${action === primaryAction ? 'btn-brand' : 'btn-outline'}" type="button" data-review-action="${action}">${action === primaryAction ? `✦ ${primaryLabel}` : label}</button>`).join('')}</div>`;
    saveReview();
  }

  async function refreshPage() {
    if (document.getElementById('leads')) await loadPage('leads');
  }

  function openReview(button) {
    const leads = loadLeads();
    review = loadReview(leads);
    if (review.completion && review.queue.some(id => !review.skippedIds.includes(id))) review.completion = false;
    lastTrigger = button || document.querySelector('[data-action="review-high-priority"]');
    const modal = ensureModal();
    renderReview();
    modal.classList.add('show');
    document.body.classList.add('lead-review-open');
    requestAnimationFrame(() => modal.querySelector('.close').focus());
  }

  function closeReview() {
    const modal = document.getElementById('leadReviewModal');
    if (!modal?.classList.contains('show')) return;
    saveReview();
    modal.classList.remove('show');
    document.body.classList.remove('lead-review-open');
    const currentButton = document.querySelector('[data-action="review-high-priority"]');
    (currentButton || lastTrigger)?.focus?.();
  }

  function updateLead(id, updates, activity) {
    const leads = loadLeads();
    const lead = leads.find(item => item.id === id);
    Object.assign(lead, updates);
    lead.activities ||= [];
    lead.activities.unshift({ text: activity, at: new Date().toISOString() });
    saveLeads(leads);
  }

  async function finishAction(action, updates, activity, message) {
    const id = review.queue.shift();
    updateLead(id, updates, activity);
    review.reviewedIds.push(id);
    review.skippedIds = review.skippedIds.filter(item => item !== id);
    review.stats.reviewed += 1;
    review.stats.actioned += 1;
    if (action === 'quotation') review.stats.quotations += 1;
    if (action === 'won') review.stats.won += 1;
    saveReview();
    await refreshPage();
    renderReview(message);
  }

  function whatsappEditor() {
    const lead = loadLeads().find(item => item.id === review.queue[0]);
    const message = lead.whatsappMessage || `Hi ${lead.name}, thank you for your interest in our ${String(lead.interest).toLowerCase()}. We can offer special pricing for your requested quantity. Please let us know a convenient time to discuss the order.`;
    document.getElementById('leadReviewContent').innerHTML = `<div class="review-subview"><button class="text-button" type="button" data-review-action="back">← Back to lead</button><h3>Send WhatsApp follow-up</h3><p>Review and edit the AI-generated message before sending.</p><label for="leadWhatsappMessage">Message</label><textarea id="leadWhatsappMessage" rows="7">${escapeHtml(message)}</textarea><div class="review-actions"><button class="btn btn-outline" type="button" data-review-action="back">Cancel</button><button class="btn btn-brand" type="button" data-review-action="send-message">Send message</button></div></div>`;
    requestAnimationFrame(() => document.getElementById('leadWhatsappMessage').focus());
  }

  function lostEditor() {
    document.getElementById('leadReviewContent').innerHTML = `<div class="review-subview"><button class="text-button" type="button" data-review-action="back">← Back to lead</button><h3>Mark lead as lost</h3><p>Select a reason to help improve future lead recommendations.</p><label for="leadLostReason">Reason</label><select id="leadLostReason"><option value="">Select a reason</option><option>Price too high</option><option>No longer interested</option><option>Chose a competitor</option><option>Could not reach customer</option><option>Other</option></select><p class="form-error" id="leadLostError" role="alert"></p><div class="review-actions"><button class="btn btn-outline" type="button" data-review-action="back">Cancel</button><button class="btn btn-brand" type="button" data-review-action="confirm-lost">Mark as lost</button></div></div>`;
    requestAnimationFrame(() => document.getElementById('leadLostReason').focus());
  }

  async function handleModalClick(event) {
    if (event.target === event.currentTarget) { closeReview(); return; }
    const button = event.target.closest('[data-review-action]');
    if (!button) return;
    const action = button.dataset.reviewAction;
    if (action === 'close' || action === 'return') return closeReview();
    if (action === 'back') return renderReview();
    if (action === 'skip') {
      const id = review.queue.shift();
      review.queue.push(id);
      if (!review.skippedIds.includes(id)) { review.skippedIds.push(id); review.stats.skipped += 1; }
      saveReview();
      await refreshPage();
      return renderReview('Lead skipped and moved to the end of the queue.');
    }
    if (action === 'review-skipped') {
      review.queue = [...review.skippedIds]; review.skippedIds = []; review.completion = false; saveReview(); return renderReview();
    }
    if (action === 'whatsapp') return whatsappEditor();
    if (action === 'lost') return lostEditor();
    if (action === 'contacted') return finishAction(action, { stage: 'Contacted', next: 'Send quotation', lastInteraction: 'Just now' }, 'Lead marked as contacted', 'Lead marked as contacted. Next action set to Send quotation.');
    if (action === 'quotation') return finishAction(action, { stage: 'Quotation sent', next: 'Follow up on quotation', lastInteraction: 'Just now' }, 'Quotation created and sent', 'Quotation sent successfully.');
    if (action === 'won') return finishAction(action, { stage: 'Won', next: '' }, 'Lead marked as won', 'Lead marked as won.');
    if (action === 'send-message') {
      const message = document.getElementById('leadWhatsappMessage').value.trim();
      if (!message) return document.getElementById('leadWhatsappMessage').focus();
      return finishAction('whatsapp', { lastInteraction: 'Just now', next: 'Review customer response' }, `WhatsApp: ${message}`, 'WhatsApp follow-up sent.');
    }
    if (action === 'confirm-lost') {
      const reason = document.getElementById('leadLostReason').value;
      if (!reason) { document.getElementById('leadLostError').textContent = 'Select a reason to continue.'; return; }
      return finishAction('lost', { stage: 'Lost', next: '', lostReason: reason }, `Lead marked as lost: ${reason}`, 'Lead marked as lost.');
    }
  }

  function handleModalInput(event) { if (event.target.id === 'leadLostReason') document.getElementById('leadLostError').textContent = ''; }

  document.addEventListener('keydown', event => {
    const modal = document.getElementById('leadReviewModal');
    if (!modal?.classList.contains('show')) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); closeReview(); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...modal.querySelectorAll('button:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(item => item.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }, true);

  window.openHighPriorityReview = openReview;
  window.VyapaarPages ??= {};
  window.VyapaarPages.leads = async function () {
    initialData ||= await fetchPageData('leads');
    const leads = loadLeads();
    review = loadReview(leads);
    saveReview();
    ensureModal();
    return VyapaarRenderers.leads(pageData(leads));
  };
})();
