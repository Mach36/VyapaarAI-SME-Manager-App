window.VyapaarPages ??= {};
window.VyapaarPages.records = String.raw`
    <section id="records" class="page active">
      <div class="page-title">
        <div><h1>Record keeping</h1><p>One searchable source of truth for invoices, payments, expenses and documents.</p></div>
        <div class="page-actions"><button class="btn btn-outline" onclick="showToast('Invoice uploaded and auto-categorised')">Upload document</button><button class="btn btn-brand" onclick="showToast('New invoice draft created')">Create invoice</button></div>
      </div>
      <div class="grid-4 metrics-grid">
        <div class="card"><div class="metric-label">Sales records</div><div class="metric-value">1,284</div><span class="pill blue">Synced</span></div>
        <div class="card"><div class="metric-label">Pending payments</div><div class="metric-value">₹2.14L</div><span class="pill amber">8 invoices</span></div>
        <div class="card"><div class="metric-label">Expenses this month</div><div class="metric-value">₹1.72L</div><span class="pill green">Categorised</span></div>
        <div class="card"><div class="metric-label">Data quality</div><div class="metric-value">96%</div><span class="pill green">4 issues resolved</span></div>
      </div>
      <div class="toolbar">
        <input class="filter" id="recordSearch" placeholder="Search records..." oninput="filterRecords()"/>
        <button class="filter">All types ▾</button>
        <button class="filter">All statuses ▾</button>
        <button class="filter">This month ▾</button>
      </div>
      <div id="recordList" class="insight-list">
        <div class="record-card" data-search="invoice mehta stores inv 1048 overdue">
          <div class="record-meta"><div class="file-icon">INV</div><div><h4>INV-1048 · Mehta Stores</h4><p>Sales invoice · 10 Jul 2026 · Imported from Tally</p></div></div>
          <div class="record-value"><strong>₹38,400</strong><br><span class="pill red">Overdue</span></div>
        </div>
        <div class="record-card" data-search="upi payment ramesh traders inv 1042 received">
          <div class="record-meta"><div class="file-icon">UPI</div><div><h4>Payment · Ramesh Traders</h4><p>Matched to INV-1042 · Received via UPI</p></div></div>
          <div class="record-value"><strong>₹24,850</strong><br><span class="pill green">Reconciled</span></div>
        </div>
        <div class="record-card" data-search="purchase invoice sharma textiles cotton shirts">
          <div class="record-meta"><div class="file-icon">PUR</div><div><h4>Purchase · Sharma Textiles</h4><p>Supplier invoice · OCR captured from PDF</p></div></div>
          <div class="record-value"><strong>₹61,200</strong><br><span class="pill blue">Verified</span></div>
        </div>
        <div class="record-card" data-search="expense packaging material cash">
          <div class="record-meta"><div class="file-icon">EXP</div><div><h4>Packaging material expense</h4><p>Automatically categorised · Cash entry from WhatsApp note</p></div></div>
          <div class="record-value"><strong>₹4,600</strong><br><span class="pill amber">Review</span></div>
        </div>
      </div>
    </section>
`;
