window.VyapaarPages ??= {};
window.VyapaarPages.home = String.raw`
    <section id="home" class="page active">
      <div class="hero">
        <div>
          <h1>Good morning, Rajesh.</h1>
          <p>Your business is healthy today. VyapaarAI found three actions worth your attention.</p>
          <div class="hero-actions">
            <button class="btn btn-primary" onclick="goTo('copilot')">Ask AI Copilot</button>
            <button class="btn btn-soft" onclick="openConnect()">Connect a data source</button>
          </div>
        </div>
        <div class="hero-insight">
          <small>Most important today</small>
          <h3>₹2.14L</h3>
          <p>Pending across 8 invoices. Two customers are likely to pay late.</p>
        </div>
      </div>

      <div class="section-head">
        <div><h2>Business snapshot</h2><p>Auto-synced from Tally, WhatsApp, UPI and Shopify</p></div>
        <span class="pill green">● Live sync</span>
      </div>
      <div class="grid-4">
        <div class="card">
          <div class="metric-label">Revenue today <span>↗</span></div>
          <div class="metric-value">₹82,450</div>
          <div class="trend">+12.8% vs last Wednesday</div>
        </div>
        <div class="card">
          <div class="metric-label">Inventory value <span>◫</span></div>
          <div class="metric-value">₹18.2L</div>
          <div class="trend down">4 SKUs need attention</div>
        </div>
        <div class="card">
          <div class="metric-label">Open leads <span>◎</span></div>
          <div class="metric-value">31</div>
          <div class="trend">11 new this week</div>
        </div>
        <div class="card">
          <div class="metric-label">Cash flow <span>₹</span></div>
          <div class="metric-value">Positive</div>
          <div class="trend">₹3.4L projected this month</div>
        </div>
      </div>

      <div class="grid-2 section-gap">
        <div class="card">
          <div class="section-head section-head-compact"><div><h2>AI recommendations</h2><p>Prioritised by business impact</p></div></div>
          <div class="insight-list">
            <div class="insight">
              <div class="insight-icon">◫</div>
              <div><strong>Reorder blue cotton shirts today</strong><p>At the current sales rate, this SKU will stock out in 6 days. Suggested reorder: 80 units.</p></div>
            </div>
            <div class="insight">
              <div class="insight-icon">₹</div>
              <div><strong>Follow up with Mehta Stores</strong><p>Invoice INV-1048 is overdue by 12 days. Payment probability improves if contacted before 4 PM.</p></div>
            </div>
            <div class="insight">
              <div class="insight-icon">◎</div>
              <div><strong>Prioritise Ahuja Retail</strong><p>High-intent WhatsApp enquiry. Estimated order value ₹76,000 with 88% conversion probability.</p></div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="section-head section-head-compact"><div><h2>Recent activity</h2><p>Captured automatically across platforms</p></div></div>
          <div class="insight-list">
            <div class="insight"><div class="insight-icon">W</div><div><strong>New WhatsApp enquiry</strong><p>Ahuja Retail asked for 120 formal shirts. Lead created automatically.</p></div></div>
            <div class="insight"><div class="insight-icon">₹</div><div><strong>UPI payment matched</strong><p>₹24,850 received from Ramesh Traders and linked to INV-1042.</p></div></div>
            <div class="insight"><div class="insight-icon">T</div><div><strong>Tally sync completed</strong><p>18 invoices, 6 purchases and 3 credit notes updated.</p></div></div>
          </div>
        </div>
      </div>
    </section>
`;
