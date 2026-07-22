(function () {
  const e = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const pill = (text, tone = 'green') => `<span class="pill ${e(tone)}">${e(text)}</span>`;
  const actions = items => items?.length ? `<div class="page-actions">${items.map(item => `<button class="btn btn-${e(item.style)}" data-action="${e(item.action || 'toast')}" data-toast="${e(item.toast)}">${e(item.label)}</button>`).join('')}</div>` : '';
  const title = data => `<div class="page-title"><div><h1>${e(data.title)}</h1><p>${e(data.subtitle)}</p></div>${actions(data.actions)}</div>`;
  const metrics = items => `<div class="grid-4 metrics-grid">${items.map(item => {
    const content = `<div class="metric-label">${e(item.label)}${item.icon ? ` <span>${e(item.icon)}</span>` : ''}</div><div class="metric-value">${e(item.value)}</div>${item.badge ? pill(item.badge, item.tone) : `<div class="trend ${e(item.tone)}">${e(item.detail)}</div>`}`;
    return item.action ? `<button class="card metric-card-action" type="button" data-action="${e(item.action)}" aria-pressed="false">${content}</button>` : `<div class="card">${content}</div>`;
  }).join('')}</div>`;
  const insightItems = items => `<div class="insight-list">${items.map(item => `<div class="insight"><div class="insight-icon">${e(item.icon)}</div><div><strong>${e(item.title)}</strong><p>${e(item.text)}</p></div></div>`).join('')}</div>`;
  const panels = items => `<div class="grid-2 section-gap">${items.map(panel => `<div class="card"><div class="section-head section-head-compact"><div><h2>${e(panel.title)}</h2><p>${e(panel.subtitle)}</p></div></div>${insightItems(panel.items)}</div>`).join('')}</div>`;

  function home(data) {
    const heroActions = data.hero.actions.map(item => `<button class="btn btn-${e(item.style)}" data-action="${e(item.action)}">${e(item.label)}</button>`).join('');
    return `<section id="home" class="page active"><div class="hero"><div><h1>${e(data.hero.title)}</h1><p>${e(data.hero.text)}</p><div class="hero-actions">${heroActions}</div></div><div class="hero-insight"><small>${e(data.hero.insight.label)}</small><h3>${e(data.hero.insight.value)}</h3><p>${e(data.hero.insight.text)}</p></div></div><div class="section-head"><div><h2>${e(data.snapshot.title)}</h2><p>${e(data.snapshot.subtitle)}</p></div>${pill(data.snapshot.badge)}</div>${metrics(data.metrics)}${panels(data.panels)}</section>`;
  }

  function records(data) {
    const typeNames = { INV: 'Sales invoices', UPI: 'Payments', PUR: 'Purchases', EXP: 'Expenses' };
    const types = [...new Set(data.records.map(record => record.icon))];
    const statuses = [...new Set(data.records.map(record => record.status))].sort();
    const options = (items, labels = {}) => items.map(item => `<option value="${e(item)}">${e(labels[item] || item)}</option>`).join('');
    const cards = data.records.map(record => { const search = [record.icon, typeNames[record.icon], record.title, record.meta, record.value, record.status].join(' ').toLowerCase(); return `<div class="record-card" data-search="${e(search)}" data-type="${e(record.icon)}" data-status="${e(record.status)}" data-date="${e(record.date)}"><div class="record-meta"><div class="file-icon">${e(record.icon)}</div><div><h4>${e(record.title)}</h4><p>${e(record.meta)}</p></div></div><div class="record-value"><strong>${e(record.value)}</strong><br>${pill(record.status, record.tone)}</div></div>`; }).join('');
    return `<section id="records" class="page active">${title(data)}${metrics(data.metrics)}<div class="toolbar"><input class="filter" id="recordSearch" placeholder="${e(data.filters.search)}" oninput="filterRecords()"><select class="filter" id="recordType" aria-label="Filter by record type" onchange="filterRecords()"><option value="">All types</option>${options(types, typeNames)}</select><select class="filter" id="recordStatus" aria-label="Filter by status" onchange="filterRecords()"><option value="">All statuses</option><option value="pending-payments">Pending &amp; overdue</option>${options(statuses)}</select><select class="filter" id="recordPeriod" aria-label="Filter by date" onchange="filterRecords()"><option value="month">This month</option><option value="7">Last 7 days</option><option value="14">Last 14 days</option><option value="all">All dates</option></select></div><div id="pendingPaymentsSummary" class="record-filter-summary is-hidden"><strong>Pending payments — showing all unpaid invoices</strong><button class="text-button" type="button" data-action="clear-pending-payments">Clear filter</button></div><p id="recordCount" class="record-count" aria-live="polite">Showing ${data.records.length} records</p><div id="recordList" class="insight-list">${cards}</div><p id="recordEmpty" class="empty-small record-empty is-hidden">No records match these filters.</p></section>`;
  }

  function inventory(data) {
    const rows = data.products.map((product, index) => { const recommendation = typeof product.recommendation === 'string' ? e(product.recommendation) : `<button class="btn btn-brand" data-action="toast" data-toast="${e(product.recommendation.toast)}">${e(product.recommendation.label)}</button>`; return `<tr data-product-index="${index}"><td><strong>${e(product.name)}</strong><br><span class="empty-small">${e(product.sku)}</span></td><td>${e(product.available)}</td><td>${e(product.committed)}</td><td>${pill(product.stockout, product.tone)}</td><td>${e(product.margin)}</td><td>${recommendation}</td></tr>`; }).join('');
    return `<section id="inventory" class="page active">${title(data)}${metrics(data.metrics)}<div class="table-wrap inventory-table-wrap" tabindex="0" aria-label="Scrollable inventory table"><table><thead><tr>${data.columns.map(column => `<th>${e(column)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>${panels(data.panels)}</section>`;
  }

  function leads(data) {
    const board = data.columns.map(column => `<div class="lead-column"><div class="lead-column-head"><span>${e(column.name)}</span><span>${e(column.count)}</span></div>${column.leads.map(lead => `<div class="lead-card"><div class="lead-top"><div><h4>${e(lead.name)}</h4><p>${e(lead.source)}</p></div>${pill(lead.score, lead.tone)}</div><div class="lead-details">${lead.details.map(detail => `<div><span>${e(detail.label)}</span><strong>${e(detail.value)}</strong></div>`).join('')}</div><div class="next-action">${e(lead.next)}</div></div>`).join('')}</div>`).join('');
    return `<section id="leads" class="page active">${title(data)}${metrics(data.metrics)}<div class="lead-board">${board}</div></section>`;
  }

  function integrations(data) {
    const cards = data.integrations.map(item => `<div class="integration-card"><div class="integration-logo">${e(item.icon)}</div><h4>${e(item.name)}</h4><p>${e(item.description)}</p>${item.connected ? `<div class="connected">${e(data.connectedLabel)}</div>` : `<button class="btn btn-outline" data-action="toast" data-toast="${e(item.toast)}">${e(data.connectLabel)}</button>`}</div>`).join('');
    return `<section id="integrations" class="page active">${title(data)}${metrics(data.metrics)}<div class="integration-grid">${cards}</div></section>`;
  }

  function copilot(data) {
    return `<section id="copilot" class="page active">${title(data)}<div class="copilot-layout"><div class="chat-panel"><div class="chat-head"><strong>${e(data.chatTitle)}</strong>${pill(data.status)}</div><div class="messages" id="messages"><div class="message ai">${e(data.welcome)}</div></div><div class="chat-input"><input id="chatInput" placeholder="${e(data.placeholder)}" onkeydown="if(event.key==='Enter') sendChat()"><button class="btn btn-brand" onclick="sendChat()">${e(data.sendLabel)}</button></div></div><div class="side-panel"><strong class="prompt-title">${e(data.promptTitle)}</strong><p class="empty-small">${e(data.promptDescription)}</p>${data.prompts.map(prompt => `<button class="quick-prompt" onclick="quickPrompt(this)">${e(prompt)}</button>`).join('')}</div></div></section>`;
  }

  window.VyapaarRenderers = { home, records, inventory, leads, copilot, integrations };
})();
