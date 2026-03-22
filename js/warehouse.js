// ============================================================
// WareNave — warehouse.js
// Generic grid: rows A–X (24 rows), cols 1–30 (720 cells)
// Removed all MAXSA-specific zones (offices, restrooms, temp).
// New_# staging area + SHIPPED drop zone kept.
// ============================================================

window.CELL_WIDTH  = 55;
window.CELL_HEIGHT = 46;

window.GRID_LEFT    = 60;
window.HEADER_TOP   = 0;
window.HEADER_HEIGHT = 72;
window.GRID_TOP     = 110;

window.pallets           = [];
window.palletsByLocation = {};
window.scale             = 1.0;
window.isDraggingPallet  = false;
window.editMode          = false;
window.warehouseAppInitialized = false;
window.undoStack         = [];
window.isUndoing         = false;

// ── Quantity helpers ──────────────────────────────────────────
window.roundQuantity = function (value) {
  return Math.round((Number(value) + Number.EPSILON) * 1000) / 1000;
};
window.isValidQuantity = function (value) {
  return Number.isFinite(value) && value > 0;
};
window.formatQuantity = function (value) {
  const r = window.roundQuantity(value);
  return Number.isInteger(r) ? String(r) : String(r).replace(/\.?0+$/, '');
};

// ── Grid definition — fully generic A-X × 1-30 ───────────────
window.GRID_ROWS = ['A','B','C','D','E','F','G','H','I','J','K','L','M',
                    'N','O','P','Q','R','S','T','U','V','W','X'];
window.GRID_COLS = 30;

// ── Build the grid ────────────────────────────────────────────
window.createGridLabels = function () {
  const container = document.querySelector('.grid-stack');
  container.innerHTML = '';

  // Main A–X × 1–30 grid
  window.GRID_ROWS.forEach((row, r) => {
    for (let c = 1; c <= window.GRID_COLS; c++) {
      const div = document.createElement('div');
      div.className        = 'label-cell';
      div.style.left       = `${c * window.CELL_WIDTH}px`;
      div.style.top        = `${r * window.CELL_HEIGHT}px`;
      div.style.width      = `${window.CELL_WIDTH}px`;
      div.style.height     = `${window.CELL_HEIGHT}px`;
      div.innerText        = `${row}${c}`;
      div.dataset.location = `${row}${c}`;
      container.appendChild(div);
    }
  });

  // New_# staging zone — position set by positionSidePanels()
  const stagingDiv = document.createElement('div');
  stagingDiv.className            = 'label-cell';
  stagingDiv.style.background     = '#ffffff';
  stagingDiv.style.border         = '2px dashed #aaa';
  stagingDiv.style.fontSize       = '11px';
  stagingDiv.style.display        = 'flex';
  stagingDiv.style.alignItems     = 'center';
  stagingDiv.style.justifyContent = 'center';
  stagingDiv.style.fontWeight     = 'bold';
  stagingDiv.style.color          = '#555';
  stagingDiv.innerText            = 'New_#';
  stagingDiv.dataset.location     = 'New_#';
  container.appendChild(stagingDiv);
  window._stagingDivEl = stagingDiv;

  // SHIPPED drop zone — position set by positionSidePanels()
  const shippedDiv = document.createElement('div');
  shippedDiv.className            = 'label-cell drop-zone';
  shippedDiv.id                   = 'SHIPPED';
  shippedDiv.style.backgroundColor = '#e74c3c';
  shippedDiv.style.fontWeight     = 'bold';
  shippedDiv.innerText            = 'SHIPPED';
  shippedDiv.dataset.location     = 'SHIPPED';
  container.appendChild(shippedDiv);
  window._shippedDivEl = shippedDiv;

  window.createAxisLabels();
  window.positionSidePanels();
};

// ── Axis labels ───────────────────────────────────────────────
window.createAxisLabels = function () {
  const wrapper = document.getElementById('warehouse-container');
  wrapper.querySelectorAll('.axis-label').forEach(el => el.remove());

  const gridLeft = window.GRID_LEFT;
  const gridTop  = window.GRID_TOP;

  for (let c = 1; c <= window.GRID_COLS; c++) {
    const topLabel = document.createElement('div');
    topLabel.className   = 'axis-label axis-col-top';
    topLabel.style.left  = `${gridLeft + c * window.CELL_WIDTH}px`;
    topLabel.style.top   = `${gridTop - 30}px`;
    topLabel.style.width = `${window.CELL_WIDTH}px`;
    topLabel.textContent = c;
    wrapper.appendChild(topLabel);

    const botLabel = document.createElement('div');
    botLabel.className   = 'axis-label axis-col-bottom';
    botLabel.style.left  = `${gridLeft + c * window.CELL_WIDTH}px`;
    botLabel.style.top   = `${gridTop + window.GRID_ROWS.length * window.CELL_HEIGHT + 4}px`;
    botLabel.style.width = `${window.CELL_WIDTH}px`;
    botLabel.textContent = c;
    wrapper.appendChild(botLabel);
  }

  window.GRID_ROWS.forEach((row, r) => {
    const rowLabel = document.createElement('div');
    rowLabel.className    = 'axis-label axis-row-left';
    rowLabel.style.left   = `${gridLeft - 44}px`;
    rowLabel.style.top    = `${gridTop + r * window.CELL_HEIGHT}px`;
    rowLabel.style.height = `${window.CELL_HEIGHT}px`;
    rowLabel.textContent  = row;
    wrapper.appendChild(rowLabel);
  });
};

// ── Position all right-side panels cleanly ────────────────────
window.positionSidePanels = function () {
  const gridRight = window.GRID_LEFT + (window.GRID_COLS + 1) * window.CELL_WIDTH + 20;
  const panelTop  = window.GRID_TOP;
  const panelW    = 150;

  // 1. Add Product panel — top
  const addPanel = document.getElementById('add-product-panel');
  if (addPanel) {
    addPanel.style.left  = `${gridRight}px`;
    addPanel.style.top   = `${panelTop}px`;
    addPanel.style.width = `${panelW}px`;
  }

  // 2. New_# staging zone — below Add Product (add panel is ~170px tall)
  if (window._stagingDivEl) {
    window._stagingDivEl.style.left   = `${gridRight}px`;
    window._stagingDivEl.style.top    = `${panelTop + 185}px`;
    window._stagingDivEl.style.width  = `${panelW}px`;
    window._stagingDivEl.style.height = '50px';
  }

  // 3. SHIPPED drop zone — below New_#
  if (window._shippedDivEl) {
    window._shippedDivEl.style.left   = `${gridRight}px`;
    window._shippedDivEl.style.top    = `${panelTop + 250}px`;
    window._shippedDivEl.style.width  = `${panelW}px`;
    window._shippedDivEl.style.height = '50px';
  }

  // 4. Shipped info text panel — below SHIPPED
  const shippedInfo = document.getElementById('shipped-info-panel');
  if (shippedInfo) {
    shippedInfo.style.left  = `${gridRight}px`;
    shippedInfo.style.top   = `${panelTop + 315}px`;
    shippedInfo.style.width = `${panelW}px`;
  }

  // 5. Undo button — below info panel (info panel is ~50px tall)
  const undoBtn = document.getElementById('undo-btn');
  if (undoBtn) {
    undoBtn.style.left   = `${gridRight}px`;
    undoBtn.style.top    = `${panelTop + 380}px`;
    undoBtn.style.width  = `${panelW}px`;
    undoBtn.style.height = '54px';
  }

  // 6. AI Assistant button — below Undo
  const aiBtn = document.getElementById('ai-assistant-btn');
  if (aiBtn) {
    aiBtn.style.left   = `${gridRight}px`;
    aiBtn.style.top    = `${panelTop + 450}px`;
    aiBtn.style.width  = `${panelW}px`;
    aiBtn.style.height = '54px';
  }

  // Size the warehouse container to fit everything
  const naturalW = gridRight + panelW + 20;
  const naturalH = window.GRID_TOP + window.GRID_ROWS.length * window.CELL_HEIGHT + 80;
  const container = document.getElementById('warehouse-container');
  if (container) {
    container.style.width  = `${naturalW}px`;
    container.style.height = `${naturalH}px`;
  }

  // Size the grid-stack
  const gridStack = document.querySelector('.grid-stack');
  if (gridStack) {
    gridStack.style.width  = `${window.GRID_COLS * window.CELL_WIDTH + window.CELL_WIDTH}px`;
    gridStack.style.height = `${window.GRID_ROWS.length * window.CELL_HEIGHT}px`;
  }
};

// ── Hit-test: which cell is at this client point? ─────────────
window.getLocationAtClientPoint = function (clientX, clientY) {
  const cells = document.querySelectorAll('.label-cell');
  for (const cell of cells) {
    const r = cell.getBoundingClientRect();
    if (clientX >= r.left && clientX <= r.right &&
        clientY >= r.top  && clientY <= r.bottom) {
      return cell.dataset.location || null;
    }
  }
  return null;
};

// ── Create a pallet ───────────────────────────────────────────
window.createNewPallet = function (itemId, quantity, location = 'New_#', record = true, forcedId = null) {
  const safeQ = window.roundQuantity(Number(quantity));
  if (!window.isValidQuantity(safeQ)) { alert('Invalid quantity.'); return null; }

  const id = forcedId || ('pallet-' + Date.now() + '-' + Math.floor(Math.random() * 1e6));
  const pallet = new window.Pallet(id, itemId, safeQ, location);

  document.querySelector('.grid-stack').appendChild(pallet.el);
  window.pallets.push(pallet);
  if (!window.palletsByLocation[location]) window.palletsByLocation[location] = [];
  window.palletsByLocation[location].push(pallet);

  window.adjustPalletSizesAtLocation(location);

  if (record) {
    window.recordHistory({ action: 'new-product', itemId, quantity: safeQ,
                           fromLocation: 'CREATED', toLocation: location });
    window.saveWarehouseData();
    window.updateInventorySummary();
  }

  pallet.updateText();
  return pallet;
};

window.findPalletById = function (palletId) {
  return window.pallets.find(p => p.id === palletId) || null;
};

// ── Undo ──────────────────────────────────────────────────────
window.registerUndoAction = function (action) {
  if (window.isUndoing) return;
  window.undoStack.push(action);
};

window.undoLastAction = function () {
  if (!window.undoStack.length) { alert('Nothing to undo.'); return; }
  const action = window.undoStack.pop();
  if (!action || action.type !== 'move') return;

  window.isUndoing = true;
  try {
    const pallet = window.findPalletById(action.palletId);
    if (pallet) {
      pallet.moveToLocation(action.fromLocation, { recordHistory: false, pushUndo: false });
    } else {
      window.createNewPallet(action.itemId, action.quantity, action.fromLocation,
                             false, action.palletId);
      window.saveWarehouseData();
      window.updateInventorySummary();
    }
  } finally {
    window.isUndoing = false;
  }
};

// ── Layout / positioning ──────────────────────────────────────
window.adjustPalletSizesAtLocation = function (location) {
  if (!location) return;
  const stack = window.palletsByLocation[location];
  if (!stack || stack.length === 0) return;
  stack.forEach((p, i) => {
    window.positionPalletInLocation(p);
    p.el.style.zIndex = 1000 + i;
  });
};

window.positionPalletInLocation = function (pallet) {
  const location = pallet.location;
  const locEl = Array.from(document.querySelectorAll('.label-cell'))
    .find(el => el.dataset.location === location);
  if (!locEl) return;

  const left   = parseInt(locEl.style.left,   10);
  const top    = parseInt(locEl.style.top,    10);
  const width  = parseInt(locEl.style.width,  10);
  const height = parseInt(locEl.style.height, 10);

  const stack  = window.palletsByLocation[location] || [];
  const idx    = stack.indexOf(pallet);
  const total  = stack.length;

  const palletHeight = Math.min(42, height);
  const REVEAL_PX    = 10;
  let offset         = REVEAL_PX;

  if (total > 1) {
    const maxOffset = Math.floor((height - palletHeight) / (total - 1));
    offset = Math.max(5, Math.min(offset, maxOffset));
  }

  pallet.el.style.left   = `${left}px`;
  pallet.el.style.top    = `${top + idx * offset}px`;
  pallet.el.style.width  = `${width}px`;
  pallet.el.style.height = `${palletHeight}px`;
};

// ── Inventory summary ─────────────────────────────────────────
window.getInventorySummaryData = function () {
  const totals = {};
  window.pallets
    .filter(p => p.location !== 'SHIPPED')
    .forEach(p => {
      totals[p.itemId] = window.roundQuantity((totals[p.itemId] || 0) + p.quantity);
    });
  return Object.keys(totals).sort((a, b) => a.localeCompare(b))
    .map(itemId => ({ itemId, quantity: totals[itemId] }));
};

window.getInventoryExportData = function () {
  return window.pallets
    .filter(p => p.location !== 'SHIPPED')
    .map(p => ({
      itemId:   p.itemId,
      location: p.location,
      quantity: window.formatQuantity(p.quantity)
    }))
    .sort((a, b) => a.itemId !== b.itemId
      ? a.itemId.localeCompare(b.itemId)
      : a.location.localeCompare(b.location));
};

window.updateInventorySummary = function () {
  const out = document.getElementById('inventory-summary-modal-output');
  if (!out) return;
  const rows = window.getInventorySummaryData();
  if (!rows.length) { out.innerHTML = 'No inventory found.'; return; }

  let html = `<table class="data-table"><thead><tr><th>Product ID</th><th>Total Quantity</th></tr></thead><tbody>`;
  rows.forEach(row => {
    html += `<tr><td>${row.itemId}</td><td>${window.formatQuantity(row.quantity)}</td></tr>`;
  });
  html += `</tbody></table>`;
  out.innerHTML = html;
};

window.showInventorySummaryModal = function () {
  window.updateInventorySummary();
  document.getElementById('inventory-summary-modal').style.display = 'block';
};

// ── Excel export ──────────────────────────────────────────────
window.downloadInventoryExcel = function () {
  const rows = window.getInventoryExportData();
  if (!rows.length) { alert('No inventory data to export.'); return; }

  const left   = rows.filter((_, i) => i % 2 === 0);
  const right  = rows.filter((_, i) => i % 2 !== 0);
  const maxLen = Math.max(left.length, right.length);

  const csvRows = [['Product ID','Location','Quantity','|','Product ID','Location','Quantity']];
  for (let i = 0; i < maxLen; i++) {
    const l = left[i]  || { itemId:'', location:'', quantity:'' };
    const r = right[i] || { itemId:'', location:'', quantity:'' };
    csvRows.push([l.itemId, l.location, l.quantity, '|', r.itemId, r.location, r.quantity]);
  }

  const csvContent = csvRows
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  const companyName = (document.querySelector('.app-title')?.textContent || 'WareNave')
    .replace(/[^a-z0-9]/gi, '_');

  link.href     = url;
  link.download = `${companyName}_Inventory_${today}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ── Edit mode ─────────────────────────────────────────────────
window.applyEditModeUI = function () {
  const editBtn  = document.getElementById('edit-mode-btn');
  const addPanel = document.getElementById('add-product-panel');
  if (!editBtn || !addPanel) return;

  if (window.editMode) {
    editBtn.textContent = 'Edit: ON';
    editBtn.classList.remove('off');
    addPanel.classList.remove('disabled');
  } else {
    editBtn.textContent = 'Edit: OFF';
    editBtn.classList.add('off');
    addPanel.classList.add('disabled');
  }

  window.pallets.forEach(p => p.updateText());
};

// ── Scale grid to viewport ────────────────────────────────────
window.scaleGrid = function () {
  const container = document.getElementById('warehouse-container');
  const stage     = document.getElementById('app-stage');
  if (!container || !stage) return;

  const availW = stage.clientWidth  - 12;
  const availH = stage.clientHeight - 12;

  const naturalW = parseFloat(container.style.width)
    || (window.GRID_LEFT + (window.GRID_COLS + 1) * window.CELL_WIDTH + 190);
  const naturalH = parseFloat(container.style.height)
    || (window.GRID_TOP + window.GRID_ROWS.length * window.CELL_HEIGHT + 80);

  window.scale = Math.min(availW / naturalW, availH / naturalH, 1);

  container.style.transform = `scale(${window.scale})`;
  container.style.position  = 'absolute';
  container.style.left = `${Math.max((availW - naturalW * window.scale) / 2, 4)}px`;
  container.style.top  = `${Math.max((availH - naturalH * window.scale) / 2, 4)}px`;
};

// ── Initialize ────────────────────────────────────────────────
window.initWarehouseApp = function () {
  if (window.warehouseAppInitialized) {
    window.scaleGrid();
    window.applyEditModeUI();
    return;
  }

  window.warehouseAppInitialized = true;
  window.createGridLabels();   // also calls positionSidePanels
  window.setupEventListeners();
  window.scaleGrid();
  window.applyEditModeUI();

  // Auto-save every 30s
  setInterval(() => {
    if (firebase.auth().currentUser && window.companyId) {
      window.saveWarehouseData();
    }
  }, 30000);
};
