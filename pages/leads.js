window.VyapaarPages ??= {};
window.VyapaarPages.leads = String.raw`
    <section id="leads" class="page active">
      <div class="page-title">
        <div><h1>Lead generation</h1><p>Leads captured automatically from WhatsApp, Instagram, email and your website.</p></div>
        <div class="page-actions"><button class="btn btn-outline" onclick="showToast('Leads imported from CSV')">Import</button><button class="btn btn-brand" onclick="showToast('New lead form opened')">Add lead</button></div>
      </div>
      <div class="grid-4 metrics-grid">
        <div class="card"><div class="metric-label">New this week</div><div class="metric-value">11</div><span class="pill green">+37%</span></div>
        <div class="card"><div class="metric-label">Pipeline value</div><div class="metric-value">₹6.8L</div><span class="pill blue">31 leads</span></div>
        <div class="card"><div class="metric-label">Likely to convert</div><div class="metric-value">9</div><span class="pill green">AI score ≥ 75</span></div>
        <div class="card"><div class="metric-label">Follow-ups due</div><div class="metric-value">6</div><span class="pill amber">Today</span></div>
      </div>
      <div class="lead-board">
        <div class="lead-column">
          <div class="lead-column-head"><span>New</span><span>8</span></div>
          <div class="lead-card">
            <div class="lead-top"><div><h4>Ahuja Retail</h4><p>WhatsApp · 18 min ago</p></div><span class="pill green">88%</span></div>
            <div class="lead-details"><div><span>Interest</span><strong>Formal shirts</strong></div><div><span>Potential</span><strong>₹76,000</strong></div></div>
            <div class="next-action">Call today; mention bulk discount</div>
          </div>
          <div class="lead-card">
            <div class="lead-top"><div><h4>Fashion Hub</h4><p>Instagram · 2h ago</p></div><span class="pill amber">63%</span></div>
            <div class="lead-details"><div><span>Interest</span><strong>Jeans</strong></div><div><span>Potential</span><strong>₹42,000</strong></div></div>
            <div class="next-action">Send catalogue and MOQ</div>
          </div>
        </div>
        <div class="lead-column">
          <div class="lead-column-head"><span>Contacted</span><span>10</span></div>
          <div class="lead-card">
            <div class="lead-top"><div><h4>Gupta Garments</h4><p>Email · Yesterday</p></div><span class="pill green">79%</span></div>
            <div class="lead-details"><div><span>Interest</span><strong>Mixed stock</strong></div><div><span>Potential</span><strong>₹1.12L</strong></div></div>
            <div class="next-action">Share revised quotation</div>
          </div>
        </div>
        <div class="lead-column">
          <div class="lead-column-head"><span>Quotation sent</span><span>7</span></div>
          <div class="lead-card">
            <div class="lead-top"><div><h4>Royal Menswear</h4><p>Website · 3 days ago</p></div><span class="pill green">84%</span></div>
            <div class="lead-details"><div><span>Interest</span><strong>Shirts</strong></div><div><span>Potential</span><strong>₹94,000</strong></div></div>
            <div class="next-action">Follow up before 5 PM</div>
          </div>
        </div>
        <div class="lead-column">
          <div class="lead-column-head"><span>Won</span><span>6</span></div>
          <div class="lead-card">
            <div class="lead-top"><div><h4>Modern Retailers</h4><p>WhatsApp · Won today</p></div><span class="pill blue">Converted</span></div>
            <div class="lead-details"><div><span>Order</span><strong>ORD-2091</strong></div><div><span>Value</span><strong>₹68,500</strong></div></div>
            <div class="next-action">Inventory reserved; invoice drafted</div>
          </div>
        </div>
      </div>
    </section>
`;
