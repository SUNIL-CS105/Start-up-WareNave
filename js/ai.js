// ============================================================
// WareNave — ai.js  (NEW)
// AI Assistant powered by the Anthropic API (Claude Sonnet).
// Reads current pallets + history from Firebase, sends
// warehouse context + user question, returns human-readable answer.
//
// SETUP: Set your API key in the <head> of index.html or
// replace the placeholder below with your actual key:
//   window.ANTHROPIC_API_KEY = "sk-ant-...";
// ============================================================

// ── Open AI modal ─────────────────────────────────────────────
window.openAIAssistant = function () {
  const modal = document.getElementById('ai-modal');
  if (modal) modal.style.display = 'block';
  document.getElementById('ai-input')?.focus();
};

// ── Gather current warehouse context from live state ──────────
window.buildWarehouseContext = async function () {
  // Pallets
  const palletSummary = window.pallets
    .filter(p => p.location !== 'SHIPPED')
    .map(p => `  - ${p.itemId} | Qty: ${window.formatQuantity(p.quantity)} | Location: ${p.location}`)
    .join('\n') || '  (No active pallets)';

  // Inventory totals
  const totals = window.getInventorySummaryData()
    .map(r => `  - ${r.itemId}: ${window.formatQuantity(r.quantity)} total`)
    .join('\n') || '  (Empty)';

  // Recent history (last 30 entries)
  let recentHistory = '  (No history yet)';
  try {
    const ref = window.companyRef('history');
    if (ref) {
      const snap = await ref.orderByChild('timestamp').limitToLast(30).once('value');
      const data = snap.val();
      if (data) {
        recentHistory = Object.values(data)
          .sort((a, b) => b.timestamp - a.timestamp)
          .map(e => `  - [${new Date(e.timestamp).toLocaleString()}] ${e.action} | ${e.itemId} | ${e.fromLocation} → ${e.toLocation} | Qty: ${e.quantity}`)
          .join('\n');
      }
    }
  } catch (_) {}

  return `
CURRENT WAREHOUSE STATE
=======================
Active Pallets:
${palletSummary}

Inventory Totals by Product:
${totals}

Recent Movement History (last 30):
${recentHistory}
`.trim();
};

// ── Send question to Claude API ───────────────────────────────
window.askAI = async function (question) {
  if (!question.trim()) return 'Please enter a question.';

  const apiKey = window.ANTHROPIC_API_KEY || '';
  if (!apiKey) {
    return '⚠️ AI Assistant is not configured. Please set window.ANTHROPIC_API_KEY in your configuration.';
  }

  const context = await window.buildWarehouseContext();

  const systemPrompt = `You are WareNave AI, a helpful warehouse management assistant.
You have access to real-time warehouse data for the current company.
Answer questions about inventory, movements, and stock levels accurately and concisely.
Be helpful, direct, and practical. Format numbers clearly. If something cannot be determined from the data, say so honestly.`;

  const userMessage = `Here is the current warehouse data:\n\n${context}\n\n---\n\nUser question: ${question}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system:     systemPrompt,
        messages:   [{ role: 'user', content: userMessage }]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return `Error from AI: ${err.error?.message || response.statusText}`;
    }

    const data = await response.json();
    return data.content?.[0]?.text || 'No response from AI.';
  } catch (err) {
    return `Connection error: ${err.message}`;
  }
};

// ── UI wiring — called after DOM is ready ─────────────────────
window.initAIAssistant = function () {
  const sendBtn   = document.getElementById('ai-send-btn');
  const inputEl   = document.getElementById('ai-input');
  const outputEl  = document.getElementById('ai-output');

  if (!sendBtn || !inputEl || !outputEl) return;

  async function handleAsk() {
    const question = inputEl.value.trim();
    if (!question) return;

    outputEl.innerHTML = '<em>Thinking…</em>';
    sendBtn.disabled = true;

    const answer = await window.askAI(question);

    // Render answer with newlines preserved
    outputEl.innerHTML = answer
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\n/g,'<br>');

    sendBtn.disabled = false;
    inputEl.value = '';
    inputEl.focus();
  }

  sendBtn.addEventListener('click', handleAsk);
  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk(); }
  });

  // Suggested questions
  document.querySelectorAll('.ai-suggestion').forEach(btn => {
    btn.addEventListener('click', () => {
      inputEl.value = btn.textContent;
      handleAsk();
    });
  });
};

document.addEventListener('DOMContentLoaded', window.initAIAssistant);