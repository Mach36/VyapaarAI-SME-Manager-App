const pageIds = ['home', 'records', 'inventory', 'leads', 'copilot', 'integrations'];
const pageContent = document.getElementById('pageContent');
const dataCache = new Map();

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

function filterRecords() {
  const search = document.getElementById('recordSearch');
  if (!search) return;
  const query = search.value.toLowerCase();
  document.querySelectorAll('#recordList .record-card').forEach(card => card.classList.toggle('is-hidden', !card.dataset.search.includes(query)));
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
  if (button.dataset.action === 'copilot') goTo('copilot');
  else if (button.dataset.action === 'connect') openConnect();
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
