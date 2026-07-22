window.VyapaarPages ??= {};
window.VyapaarPages.copilot = String.raw`
    <section id="copilot" class="page active">
      <div class="page-title">
        <div><h1>AI Copilot</h1><p>Ask questions, generate records and take actions across your business.</p></div>
      </div>
      <div class="copilot-layout">
        <div class="chat-panel">
          <div class="chat-head"><strong>VyapaarAI Copilot</strong><span class="pill green">● Connected to business data</span></div>
          <div class="messages" id="messages">
            <div class="message ai">Good morning, Rajesh. I can help with records, inventory, leads, payments and business insights. What would you like to do?</div>
          </div>
          <div class="chat-input">
            <input id="chatInput" placeholder="Ask: Which customers have not paid?" onkeydown="if(event.key==='Enter') sendChat()"/>
            <button class="btn btn-brand" onclick="sendChat()">Send</button>
          </div>
        </div>
        <div class="side-panel">
          <strong class="prompt-title">Try asking</strong>
          <p class="empty-small">These prompts simulate common SME actions.</p>
          <button class="quick-prompt" onclick="quickPrompt(this)">Show all overdue invoices</button>
          <button class="quick-prompt" onclick="quickPrompt(this)">Which products may stock out?</button>
          <button class="quick-prompt" onclick="quickPrompt(this)">Draft a WhatsApp follow-up</button>
          <button class="quick-prompt" onclick="quickPrompt(this)">Create this month's GST summary</button>
          <button class="quick-prompt" onclick="quickPrompt(this)">Which leads should I call today?</button>
        </div>
      </div>
    </section>
`;
