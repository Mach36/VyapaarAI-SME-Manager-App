window.VyapaarPages ??= {};
window.VyapaarPages.inventory = String.raw`
    <section id="inventory" class="page active">
      <div class="page-title">
        <div><h1>Inventory intelligence</h1><p>Live stock, forecasts and reorder recommendations across all channels.</p></div>
        <div class="page-actions"><button class="btn btn-outline" onclick="showToast('Inventory export prepared')">Export</button><button class="btn btn-brand" onclick="showToast('Purchase order draft created')">Create purchase order</button></div>
      </div>
      <div class="grid-4 metrics-grid">
        <div class="card"><div class="metric-label">Total SKUs</div><div class="metric-value">428</div><span class="pill green">412 in stock</span></div>
        <div class="card"><div class="metric-label">Stock value</div><div class="metric-value">₹18.2L</div><span class="pill blue">Across 2 locations</span></div>
        <div class="card"><div class="metric-label">At risk</div><div class="metric-value">4</div><span class="pill red">Likely stock-outs</span></div>
        <div class="card"><div class="metric-label">Dead stock</div><div class="metric-value">₹72K</div><span class="pill amber">12 slow SKUs</span></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Product</th><th>Available</th><th>Committed</th><th>Stock-out</th><th>Margin</th><th>AI recommendation</th></tr></thead>
          <tbody>
            <tr><td><strong>Blue cotton shirt · M</strong><br><span class="empty-small">SKU SH-BLU-M</span></td><td>34</td><td>12</td><td><span class="pill red">6 days</span></td><td>28%</td><td><button class="btn btn-brand" onclick="showToast('Reorder draft for 80 units created')">Reorder 80</button></td></tr>
            <tr><td><strong>Formal white shirt · L</strong><br><span class="empty-small">SKU SH-WHT-L</span></td><td>118</td><td>30</td><td><span class="pill green">32 days</span></td><td>32%</td><td>Maintain current level</td></tr>
            <tr><td><strong>Slim-fit jeans · 32</strong><br><span class="empty-small">SKU JN-SLM-32</span></td><td>64</td><td>8</td><td><span class="pill amber">14 days</span></td><td>24%</td><td>Reorder next week</td></tr>
            <tr><td><strong>Winter jacket · XL</strong><br><span class="empty-small">SKU JK-WIN-XL</span></td><td>79</td><td>2</td><td><span class="pill blue">Seasonal</span></td><td>18%</td><td>Discount 10% to clear</td></tr>
          </tbody>
        </table>
      </div>
      <div class="grid-2 section-gap">
        <div class="card">
          <div class="section-head section-head-compact"><div><h2>Demand forecast</h2><p>Next 30 days</p></div></div>
          <div class="insight-list">
            <div class="insight"><div class="insight-icon">↗</div><div><strong>Formal shirts demand +22%</strong><p>Driven by two repeat wholesale customers and upcoming school orders.</p></div></div>
            <div class="insight"><div class="insight-icon">↘</div><div><strong>Winter jackets demand -36%</strong><p>Seasonal slowdown detected. Consider bundling with clearance offers.</p></div></div>
          </div>
        </div>
        <div class="card">
          <div class="section-head section-head-compact"><div><h2>Supplier intelligence</h2><p>Price and reliability</p></div></div>
          <div class="insight-list">
            <div class="insight"><div class="insight-icon">S</div><div><strong>Sharma Textiles</strong><p>Lowest cost for cotton shirts. Average delay: 1.2 days.</p></div></div>
            <div class="insight"><div class="insight-icon">A</div><div><strong>Agarwal Fabrics</strong><p>4% higher price, but best delivery consistency.</p></div></div>
          </div>
        </div>
      </div>
    </section>
`;
