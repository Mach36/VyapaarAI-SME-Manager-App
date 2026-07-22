const pageIds = ['home', 'records', 'inventory', 'leads', 'copilot', 'integrations'];
const pageContent = document.getElementById('pageContent');
const dataCache = new Map();
const RECORD_FILTERS_KEY = 'vyapaar-record-filters';

async function getJson(path) {
  if (!dataCache.has(path)) {
    dataCache.set(path, fetch(path).then(response => {
      if (!response.ok) throw new Error(`Could not load ${path}`);
      return response.json();
    }));
  }
  return dataCache.get(path);
}

function fetchPageData(page) { return getJson(`data/${page}.json`); }

async function loadPage(id) {
  try {
    const renderPage = window.VyapaarPages?.[id];
    if (!renderPage) throw new Error(`Missing page module: ${id}`);
    pageContent.innerHTML = await renderPage();
    if (id === 'records') restoreRecordFilters();
  } catch (error) {
    pageContent.innerHTML = `<section class="page active page-error"><h1>This section could not be loaded</h1><p>The ${id} page data is missing.</p></section>`;
    console.error(error);
  }
}

async function goTo(id, updateHistory = true) {
  const nextPage = pageIds.includes(id) ? id : 'home';
  document.querySelectorAll('#nav button').forEach(button => {
    const isActive = button.dataset.page === nextPage;
    button.classList.toggle('active', isActive);
    if (isActive) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  document.getElementById('sidebar').classList.remove('open');
  document.querySelector('.mobile-menu').setAttribute('aria-expanded', 'false');
  if (updateHistory && window.location.hash !== `#${nextPage}`) history.pushState({ page: nextPage }, '', `#${nextPage}`);
  await loadPage(nextPage);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMenu() {
  const isOpen = document.getElementById('sidebar').classList.toggle('open');
  document.querySelector('.mobile-menu').setAttribute('aria-expanded', String(isOpen));
}
function openConnect() { document.getElementById('connectModal').classList.add('show'); document.querySelector('#connectModal .close').focus(); }
function closeConnect() { document.getElementById('connectModal').classList.remove('show'); }
function finishConnect() { closeConnect(); showToast('Selected apps connected. Initial sync started.'); }
function showToast(message) { const toast = document.getElementById('toast'); toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2600); }

function syncIntegrations(button) {
  if (button.disabled) return;
  const label = button.querySelector('.sync-button-label');
  button.disabled = true;
  button.classList.add('is-syncing');
  button.setAttribute('aria-label', 'Syncing connected integrations');
  if (label) label.textContent = 'Syncing...';

  const delay = 1200 + Math.floor(Math.random() * 601);
  window.setTimeout(() => {
    document.getElementById('lastSyncValue')?.replaceChildren('Just now');
    document.querySelectorAll('[data-integration-last-sync]').forEach(syncTime => {
      syncTime.textContent = 'Last sync: Just now';
    });

    const recordsMetric = [...document.querySelectorAll('.metrics-grid .card')].find(card =>
      card.querySelector('.metric-label')?.textContent.trim() === 'Records synced today'
    );
    const recordsValue = recordsMetric?.querySelector('.metric-value');
    if (recordsValue) {
      const currentCount = Number(recordsValue.textContent.replace(/,/g, '')) || 0;
      const addedRecords = 8 + Math.floor(Math.random() * 8);
      recordsValue.textContent = (currentCount + addedRecords).toLocaleString();
    }

    button.disabled = false;
    button.classList.remove('is-syncing');
    button.setAttribute('aria-label', 'Sync all connected integrations');
    if (label) label.textContent = 'Sync now';
    showToast('All connected integrations synced successfully.');
  }, delay);
}

function filterRecords() {
  const search = document.getElementById('recordSearch');
  if (!search) return;
  const query = search.value.trim().toLowerCase();
  const type = document.getElementById('recordType')?.value || '';
  const statusSelect = document.getElementById('recordStatus');
  const status = statusSelect?.value || '';
  const period = document.getElementById('recordPeriod')?.value || 'all';
  const cards = [...document.querySelectorAll('#recordList .record-card')];
  const dates = cards.map(card => card.dataset.date).filter(Boolean).sort();
  const latestDate = dates.length ? new Date(`${dates[dates.length - 1]}T00:00:00`) : null;
  let visibleCount = 0;

  cards.forEach(card => {
    const recordDate = new Date(`${card.dataset.date}T00:00:00`);
    let matchesPeriod = true;
    if (period === 'month' && latestDate) {
      matchesPeriod = recordDate.getFullYear() === latestDate.getFullYear() && recordDate.getMonth() === latestDate.getMonth();
    } else if ((period === '7' || period === '14') && latestDate) {
      const cutoff = new Date(latestDate);
      cutoff.setDate(cutoff.getDate() - Number(period) + 1);
      matchesPeriod = recordDate >= cutoff && recordDate <= latestDate;
    }
    const matchesStatus = status === 'pending-payments'
      ? ['Pending', 'Overdue'].includes(card.dataset.status)
      : (!status || card.dataset.status === status);
    const matches = card.dataset.search.includes(query)
      && (!type || card.dataset.type === type)
      && matchesStatus
      && matchesPeriod;
    card.classList.toggle('is-hidden', !matches);
    if (matches) visibleCount += 1;
  });

  const countLabel = visibleCount === 1 ? 'record' : 'records';
  const count = document.getElementById('recordCount');
  if (count) count.textContent = `Showing ${visibleCount} ${countLabel}`;
  document.getElementById('recordEmpty')?.classList.toggle('is-hidden', visibleCount > 0);
  const pendingActive = status === 'pending-payments';
  statusSelect?.classList.toggle('filter-active', pendingActive);
  document.getElementById('pendingPaymentsSummary')?.classList.toggle('is-hidden', !pendingActive);
  const pendingCard = document.querySelector('[data-action="pending-payments"]');
  pendingCard?.classList.toggle('active', pendingActive);
  pendingCard?.setAttribute('aria-pressed', String(pendingActive));
  sessionStorage.setItem(RECORD_FILTERS_KEY, JSON.stringify({ query: search.value, type, status, period }));
}

function restoreRecordFilters() {
  let state = {};
  try { state = JSON.parse(sessionStorage.getItem(RECORD_FILTERS_KEY)) || {}; } catch (_) {}
  const search = document.getElementById('recordSearch');
  const type = document.getElementById('recordType');
  const status = document.getElementById('recordStatus');
  const period = document.getElementById('recordPeriod');
  if (search) search.value = state.query || '';
  if (type && [...type.options].some(option => option.value === state.type)) type.value = state.type;
  if (status && [...status.options].some(option => option.value === state.status)) status.value = state.status;
  if (period && [...period.options].some(option => option.value === state.period)) period.value = state.period;
  filterRecords();
}

function showPendingPayments() {
  const status = document.getElementById('recordStatus');
  if (!status) return;
  status.value = 'pending-payments';
  filterRecords();
  requestAnimationFrame(() => document.getElementById('recordList')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

function clearPendingPayments() {
  const status = document.getElementById('recordStatus');
  if (!status) return;
  status.value = '';
  filterRecords();
}

function getReply(text) {
  const query = text.toLowerCase();
  return window.copilotData.replies.find(reply => reply.keywords.some(keyword => query.includes(keyword)))?.text || window.copilotData.fallbackReply;
}
function sendChat() { const input = document.getElementById('chatInput'); if (!input) return; const text = input.value.trim(); if (!text) return; addMessage(text, 'user'); input.value = ''; setTimeout(() => addMessage(getReply(text), 'ai'), 350); }
function quickPrompt(button) { const input = document.getElementById('chatInput'); if (!input) return; input.value = button.textContent; sendChat(); }
function addMessage(text, type) { const messages = document.getElementById('messages'); if (!messages) return; const message = document.createElement('div'); message.className = `message ${type}`; message.textContent = text; messages.appendChild(message); requestAnimationFrame(() => message.scrollIntoView({ behavior: 'smooth', block: 'nearest' })); }

document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  if (button.dataset.action === 'pending-payments') showPendingPayments();
  else if (button.dataset.action === 'clear-pending-payments') clearPendingPayments();
  else if (button.dataset.action === 'export-inventory') openInventoryExport();
  else if (button.dataset.action === 'copilot') goTo('copilot');
  else if (button.dataset.action === 'connect') openConnect();
  else if (button.dataset.action === 'sync-integrations') syncIntegrations(button);
  else if (button.dataset.action === 'review-high-priority') openHighPriorityReview(button);
  else if (button.dataset.action === 'toast') showToast(button.dataset.toast);
});
document.getElementById('connectModal').addEventListener('click', event => { if (event.target.id === 'connectModal') closeConnect(); });
document.getElementById('globalSearch').addEventListener('keydown', async event => { const query = event.target.value.trim(); if (event.key !== 'Enter' || !query) return; event.target.value = ''; await goTo('copilot'); const input = document.getElementById('chatInput'); if (input) { input.value = query; sendChat(); } });
document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeConnect(); document.getElementById('sidebar').classList.remove('open'); document.querySelector('.mobile-menu').setAttribute('aria-expanded', 'false'); } });
window.addEventListener('popstate', () => goTo(window.location.hash.slice(1), false));

async function start() {
  document.querySelectorAll('#nav button').forEach(button => button.addEventListener('click', () => goTo(button.dataset.page)));
  document.querySelectorAll('.connect-option').forEach(option => option.addEventListener('click', () => option.classList.toggle('selected')));
  await goTo(window.location.hash.slice(1), false);
}
start();
