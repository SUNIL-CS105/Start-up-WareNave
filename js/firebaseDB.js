// ============================================================
// WareNave — firebaseDB.js
// All reads/writes scoped to companies/{companyId}/warehouse/
// companyId is resolved by auth.js and stored in window.companyId
// ============================================================

window.warehouseRef = null;

// ── Helper: get the base DB ref for this company ─────────────
window.companyRef = function (path) {
  if (!window.companyId) {
    console.error('WareNave: companyId is not set — cannot build DB ref');
    return null;
  }
  const base = `companies/${window.companyId}/warehouse`;
  return path ? window.database.ref(`${base}/${path}`) : window.database.ref(base);
};

// ── Save all current pallets ──────────────────────────────────
window.saveWarehouseData = function () {
  const ref = window.companyRef('pallets');
  if (!ref) return;

  const data = {};
  window.pallets.forEach(p => {
    // SHIPPED is a terminal action — exclude from stored pallets
    if (p.location !== 'SHIPPED') {
      data[p.id] = {
        itemId:   p.itemId,
        quantity: p.quantity,
        location: p.location
      };
    }
  });

  ref.set(data);
};

// ── Live-listener: load pallets from Firebase ─────────────────
window.loadWarehouseData = function () {


  // Detach any existing listener
  if (window.warehouseRef) {
    window.warehouseRef.off();
    window.warehouseRef = null;
  }

  const ref = window.companyRef('pallets');
  if (!ref) {
    if (loading) loading.style.display = 'none';
    return;
  }

  window.warehouseRef = ref;

  window.warehouseRef.on('value', snapshot => {
    const data = snapshot.val();

    // Clear existing pallet DOM & state
    window.pallets.forEach(p => p.remove());
    window.pallets           = [];
    window.palletsByLocation = {};

    if (data) {
      Object.entries(data).forEach(([palletId, palletData]) => {
        window.createNewPallet(
          palletData.itemId,
          Number(palletData.quantity),
          palletData.location,
          false,   // don't record history on load
          palletId // preserve original pallet id
        );
      });
    }

    window.updateInventorySummary();
    window.applyEditModeUI();
    if (loading) loading.style.display = 'none';
  });
};

// ── Write a history entry ─────────────────────────────────────
window.recordHistory = function ({ action, itemId, quantity, fromLocation, toLocation }) {
  const user = firebase.auth().currentUser;
  if (!user) return;

  const ref = window.companyRef('history');
  if (!ref) return;

  const email       = user.email || 'unknown';
  const accountName = email.split('@')[0];

  ref.push().set({
    uid:          user.uid,
    email,
    accountName,
    action:       action        || 'move',
    itemId:       itemId        || '',
    quantity:     Number(quantity) || 0,
    fromLocation: fromLocation  || '',
    toLocation:   toLocation    || '',
    timestamp:    Date.now()
  });
};

// ── Delete history entries older than 60 days ─────────────────
window.purgeOldHistory = function () {
  const cutoff = Date.now() - (60 * 24 * 60 * 60 * 1000);
  const ref    = window.companyRef('history');
  if (!ref) return Promise.resolve();

  return ref.once('value').then(snapshot => {
    const data = snapshot.val();
    if (!data) return;

    const removals = Object.entries(data)
      .filter(([, entry]) => (entry.timestamp || 0) < cutoff)
      .map(([key]) => window.companyRef(`history/${key}`).remove());

    return Promise.all(removals);
  });
};

// ── Render movement history modal ─────────────────────────────
window.showHistory = function () {
  const modalTitle   = document.getElementById('history-modal-title');
  const historyOutput = document.getElementById('history-output');
  const modal        = document.getElementById('history-modal');

  modalTitle.innerText      = 'Warehouse Movement History';
  historyOutput.innerHTML   = 'Loading…';
  modal.style.display       = 'block';

  const ref = window.companyRef('history');
  if (!ref) {
    historyOutput.innerHTML = 'Company not loaded yet.';
    return;
  }

  window.purgeOldHistory()
    .then(() => ref.orderByChild('timestamp').once('value'))
    .then(snapshot => {
      const data = snapshot.val();

      if (!data) { historyOutput.innerHTML = 'No history found.'; return; }

      const entries = Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
      if (!entries.length) { historyOutput.innerHTML = 'No history found.'; return; }

      let html = `
        <table class="data-table">
          <thead>
            <tr>
              <th>Person</th>
              <th>Action</th>
              <th>Product ID</th>
              <th>From</th>
              <th>To</th>
              <th>Quantity</th>
              <th>Date / Time</th>
            </tr>
          </thead>
          <tbody>
      `;

      entries.forEach(entry => {
        html += `
          <tr>
            <td>${entry.accountName || '-'}</td>
            <td>${entry.action      || '-'}</td>
            <td>${entry.itemId      || '-'}</td>
            <td>${entry.fromLocation || '-'}</td>
            <td>${entry.toLocation   || '-'}</td>
            <td>${window.formatQuantity(entry.quantity || 0)}</td>
            <td>${new Date(entry.timestamp).toLocaleString()}</td>
          </tr>
        `;
      });

      html += `</tbody></table>`;
      historyOutput.innerHTML = html;
    })
    .catch(err => {
      historyOutput.innerHTML = `Error loading history: ${err.message}`;
    });
};
