const pageIds = ['home', 'records', 'inventory', 'leads', 'copilot', 'integrations'];
const pageLabels = {
  home: 'overview',
  records: 'records',
  inventory: 'inventory',
  leads: 'leads',
  copilot: 'AI Copilot',
  integrations: 'integrations'
};

const pageContent = document.getElementById('pageContent');
const navButtons = document.querySelectorAll('#nav button');

navButtons.forEach(button => {
  button.addEventListener('click', () => goTo(button.dataset.page));
});

function loadPage(id) {
  const markup = window.VyapaarPages?.[id];

  if (!markup) {
    pageContent.innerHTML = `
      <section class="page active page-error">
        <h1>This section could not be loaded</h1>
        <p>The ${pageLabels[id]} page module is missing.</p>
      </section>
    `;
    return;
  }

  pageContent.innerHTML = markup;
}

async function goTo(id, updateHistory = true) {
  const nextPage = pageIds.includes(id) ? id : 'home';

  navButtons.forEach(button => {
    const isActive = button.dataset.page === nextPage;
    button.classList.toggle('active', isActive);

    if (isActive) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });

  document.getElementById('sidebar').classList.remove('open');
  document.querySelector('.mobile-menu').setAttribute('aria-expanded', 'false');

  if (updateHistory && window.location.hash !== `#${nextPage}`) {
    history.pushState({ page: nextPage }, '', `#${nextPage}`);
  }

  loadPage(nextPage);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMenu() {
  const isOpen = document.getElementById('sidebar').classList.toggle('open');
  document.querySelector('.mobile-menu').setAttribute('aria-expanded', String(isOpen));
}

function openConnect() {
  document.getElementById('connectModal').classList.add('show');
  document.querySelector('#connectModal .close').focus();
}

function closeConnect() {
  document.getElementById('connectModal').classList.remove('show');
}

function finishConnect() {
  closeConnect();
  showToast('Selected apps connected. Initial sync started.');
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2600);
}

function filterRecords() {
  const search = document.getElementById('recordSearch');
  if (!search) return;

  const query = search.value.toLowerCase();
  document.querySelectorAll('#recordList .record-card').forEach(card => {
    card.classList.toggle('is-hidden', !card.dataset.search.includes(query));
  });
}

const replies = {
  overdue: 'You have 8 overdue invoices worth ₹2.14L. The highest-risk invoices are Mehta Stores (₹38,400, 12 days overdue) and City Fashion (₹29,700, 9 days overdue). I can draft follow-up messages for both.',
  stock: 'Four SKUs may stock out within 14 days. Blue cotton shirt · M is most urgent: 34 units available, 12 committed, estimated stock-out in 6 days. Recommended reorder: 80 units from Sharma Textiles.',
  whatsapp: 'Draft: “Hi Mehta Stores, a gentle reminder that invoice INV-1048 for ₹38,400 is pending since 10 July. Please share an expected payment date. I can resend the invoice if helpful.”',
  gst: 'Your draft GST summary for July shows taxable sales of ₹8.72L, output GST of ₹1.57L, eligible input credit of ₹94,000, and estimated net GST payable of ₹63,000. Four transactions need review.',
  leads: 'Prioritise Ahuja Retail, Royal Menswear and Gupta Garments today. Their combined estimated value is ₹2.82L. Ahuja Retail has the strongest intent with an 88% conversion score.'
};

function getReply(text) {
  const query = text.toLowerCase();
  if (query.includes('overdue') || query.includes('not paid')) return replies.overdue;
  if (query.includes('stock') || query.includes('inventory')) return replies.stock;
  if (query.includes('whatsapp') || query.includes('follow-up')) return replies.whatsapp;
  if (query.includes('gst')) return replies.gst;
  if (query.includes('lead') || query.includes('call today')) return replies.leads;

  return 'I found relevant information across your connected systems. Based on your current records, I recommend reviewing the pending payment from Mehta Stores and the blue cotton shirt stock risk first.';
}

function sendChat() {
  const input = document.getElementById('chatInput');
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  addMessage(text, 'user');
  input.value = '';
  setTimeout(() => addMessage(getReply(text), 'ai'), 350);
}

function quickPrompt(button) {
  const input = document.getElementById('chatInput');
  if (!input) return;

  input.value = button.textContent;
  sendChat();
}

function addMessage(text, type) {
  const messages = document.getElementById('messages');
  if (!messages) return;

  const message = document.createElement('div');
  message.className = `message ${type}`;
  message.textContent = text;
  messages.appendChild(message);
  messages.scrollTop = messages.scrollHeight;
}

document.getElementById('connectModal').addEventListener('click', event => {
  if (event.target.id === 'connectModal') closeConnect();
});

document.querySelectorAll('.connect-option').forEach(option => {
  option.addEventListener('click', () => option.classList.toggle('selected'));
});

document.getElementById('globalSearch').addEventListener('keydown', async event => {
  const query = event.target.value.trim();
  if (event.key !== 'Enter' || !query) return;

  event.target.value = '';
  await goTo('copilot');

  const chatInput = document.getElementById('chatInput');
  if (!chatInput) return;
  chatInput.value = query;
  sendChat();
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;

  closeConnect();
  document.getElementById('sidebar').classList.remove('open');
  document.querySelector('.mobile-menu').setAttribute('aria-expanded', 'false');
});

window.addEventListener('popstate', () => {
  goTo(window.location.hash.slice(1), false);
});

const initialPage = window.location.hash.slice(1);
goTo(initialPage, false);
