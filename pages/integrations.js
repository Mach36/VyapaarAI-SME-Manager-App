window.VyapaarPages ??= {};
window.VyapaarPages.integrations = String.raw`
    <section id="integrations" class="page active">
      <div class="page-title">
        <div><h1>Integrations</h1><p>Bring every business signal into one place with minimal setup.</p></div>
        <button class="btn btn-brand" onclick="openConnect()">Connect app</button>
      </div>
      <div class="grid-4 metrics-grid">
        <div class="card"><div class="metric-label">Connected sources</div><div class="metric-value">6</div><span class="pill green">All healthy</span></div>
        <div class="card"><div class="metric-label">Records synced today</div><div class="metric-value">142</div><span class="pill blue">Automatic</span></div>
        <div class="card"><div class="metric-label">Last sync</div><div class="metric-value">2 min</div><span class="pill green">Real-time</span></div>
        <div class="card"><div class="metric-label">Manual entries avoided</div><div class="metric-value">89%</div><span class="pill green">This month</span></div>
      </div>
      <div class="integration-grid">
        <div class="integration-card"><div class="integration-logo">W</div><h4>WhatsApp Business</h4><p>Capture enquiries, orders and payment follow-ups.</p><div class="connected">● Connected</div></div>
        <div class="integration-card"><div class="integration-logo">T</div><h4>Tally</h4><p>Sync ledgers, invoices, customers and tax records.</p><div class="connected">● Connected</div></div>
        <div class="integration-card"><div class="integration-logo">₹</div><h4>UPI & Bank</h4><p>Match payments and reconcile invoices automatically.</p><div class="connected">● Connected</div></div>
        <div class="integration-card"><div class="integration-logo">S</div><h4>Shopify</h4><p>Sync products, orders, returns and customers.</p><div class="connected">● Connected</div></div>
        <div class="integration-card"><div class="integration-logo">I</div><h4>Instagram</h4><p>Turn DMs and comments into qualified leads.</p><button class="btn btn-outline" onclick="showToast('Instagram connected')">Connect</button></div>
        <div class="integration-card"><div class="integration-logo">Z</div><h4>Zoho</h4><p>Import CRM contacts and sales pipeline records.</p><button class="btn btn-outline" onclick="showToast('Zoho connection started')">Connect</button></div>
        <div class="integration-card"><div class="integration-logo">G</div><h4>Gmail</h4><p>Capture enquiries, quotations and supplier documents.</p><div class="connected">● Connected</div></div>
        <div class="integration-card"><div class="integration-logo">X</div><h4>Excel / Sheets</h4><p>Upload or continuously sync operational trackers.</p><button class="btn btn-outline" onclick="showToast('Spreadsheet upload opened')">Connect</button></div>
      </div>
    </section>
`;
