// ============================================================
// WareNave — events.js
// All original event listeners preserved.
// Added: AI Assistant button handler.
// ============================================================

window.eventsBound = false;

window.setupEventListeners = function () {
  if (window.eventsBound) return;
  window.eventsBound = true;

  // ── Add Product ─────────────────────────────────────────────
  document.getElementById('add-product-btn').addEventListener('click', () => {
    if (!window.editMode) {
      alert('Edit mode is OFF. Turn it ON to add products.');
      return;
    }
    const itemId = document.getElementById('new-item').value.trim();
    const q      = parseFloat(document.getElementById('new-q').value);

    if (!itemId || !window.isValidQuantity(q)) {
      alert('Enter valid Item ID and Quantity.');
      return;
    }

    window.createNewPallet(itemId, q, 'New_#');
    document.getElementById('new-item').value = '';
    document.getElementById('new-q').value    = '';
  });

  // ── Edit Mode ───────────────────────────────────────────────
  document.getElementById('edit-mode-btn').addEventListener('click', () => {
    window.editMode = !window.editMode;
    window.applyEditModeUI();
  });

  // ── Inventory Summary ────────────────────────────────────────
  document.getElementById('inventory-summary-btn').addEventListener('click', () => {
    window.showInventorySummaryModal();
  });

  // ── History ──────────────────────────────────────────────────
  document.getElementById('history-btn').addEventListener('click', () => {
    window.showHistory();
  });

  // ── Excel Export ─────────────────────────────────────────────
  document.getElementById('excel-export-btn').addEventListener('click', () => {
    window.downloadInventoryExcel();
  });

  // ── Undo ─────────────────────────────────────────────────────
  document.getElementById('undo-btn').addEventListener('click', () => {
    window.undoLastAction();
  });

  // ── AI Assistant ─────────────────────────────────────────────
  const aiBtn = document.getElementById('ai-assistant-btn');
  if (aiBtn) {
    aiBtn.addEventListener('click', () => {
      if (typeof window.openAIAssistant === 'function') {
        window.openAIAssistant();
      }
    });
  }

  // ── Modal close buttons ──────────────────────────────────────
  document.querySelector('#history-modal .close-btn').addEventListener('click', () => {
    document.getElementById('history-modal').style.display = 'none';
  });

  document.querySelector('#inventory-summary-modal .close-btn').addEventListener('click', () => {
    document.getElementById('inventory-summary-modal').style.display = 'none';
  });

  const aiModalClose = document.querySelector('#ai-modal .close-btn');
  if (aiModalClose) {
    aiModalClose.addEventListener('click', () => {
      document.getElementById('ai-modal').style.display = 'none';
    });
  }

  // ── Click outside to close modals ───────────────────────────
  window.addEventListener('click', e => {
    const historyModal = document.getElementById('history-modal');
    const summaryModal = document.getElementById('inventory-summary-modal');
    const aiModal      = document.getElementById('ai-modal');

    if (e.target === historyModal) historyModal.style.display = 'none';
    if (e.target === summaryModal) summaryModal.style.display = 'none';
    if (e.target === aiModal)      aiModal.style.display      = 'none';
  });

  window.addEventListener('resize', window.scaleGrid);
};