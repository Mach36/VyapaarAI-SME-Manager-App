window.VyapaarPages ??= {};
window.VyapaarPages.copilot = async function () {
  const data = await fetchPageData('copilot');
  window.copilotData = data;
  return VyapaarRenderers.copilot({
    title: 'AI Copilot', subtitle: 'Ask questions, generate records and take actions across your business.',
    chatTitle: 'VyapaarAI Copilot', status: '● Connected to business data',
    welcome: 'Good morning, Rajesh. I can help with records, inventory, leads, payments and business insights. What would you like to do?',
    placeholder: 'Ask: Which customers have not paid?', sendLabel: 'Send',
    promptTitle: 'Try asking', promptDescription: 'These prompts simulate common SME actions.',
    prompts: data.prompts, replies: data.replies, fallbackReply: data.fallbackReply
  });
};
