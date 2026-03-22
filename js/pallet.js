// ============================================================
// WareNave — pallet.js
// Pallet class: drag/drop, split, merge, move.
// All functionality preserved from MAXSA original.
// Removed TO-8412-OFFICE specific reference (now only SHIPPED).
// ============================================================

window.Pallet = class Pallet {
  constructor(id, itemId, quantity, location) {
    this.id       = id;
    this.itemId   = itemId;
    this.quantity = Number(quantity);
    this.location = location || 'New_#';

    this.el = document.createElement('div');
    this.el.className = 'pallet';
    this.el.setAttribute('draggable', 'false');
    this.el.dataset.id       = id;
    this.el.dataset.itemId   = itemId;
    this.el.dataset.quantity = this.quantity;
    this.el.dataset.location = this.location;

    this.mergeArrow = document.createElement('div');
    this.mergeArrow.className = 'merge-arrow';
    this.mergeArrow.innerHTML = '+';

    this.splitArrow = document.createElement('div');
    this.splitArrow.className = 'split-arrow';
    this.splitArrow.innerHTML = '◮';

    this.el.appendChild(this.mergeArrow);
    this.el.appendChild(this.splitArrow);

    this.updateText();
    this.addEventListeners();
  }

  updateText() {
    this.el.innerHTML = `${this.itemId}<br>Q: ${window.formatQuantity(this.quantity)}`;
    this.el.appendChild(this.mergeArrow);
    this.el.appendChild(this.splitArrow);
    this.el.dataset.quantity = this.quantity;
    this.el.dataset.location = this.location;

    if (!window.editMode) {
      this.el.classList.add('view-only');
      this.splitArrow.classList.add('disabled');
      this.mergeArrow.classList.add('disabled');
    } else {
      this.el.classList.remove('view-only');
      this.splitArrow.classList.remove('disabled');
      this.mergeArrow.classList.remove('disabled');
    }
  }

  addEventListeners() {
    // ── Drag: pointerdown ────────────────────────────────────
    this.el.addEventListener('pointerdown', e => {
      if (!window.editMode) return;
      if (e.target === this.splitArrow || e.target === this.mergeArrow) return;
      e.preventDefault();

      const container     = document.querySelector('.grid-stack');
      const containerRect = container.getBoundingClientRect();
      const pointerX = (e.clientX - containerRect.left) / window.scale;
      const pointerY = (e.clientY - containerRect.top)  / window.scale;

      this.dragOffsetX = pointerX - parseFloat(this.el.style.left || '0');
      this.dragOffsetY = pointerY - parseFloat(this.el.style.top  || '0');

      this.el.classList.add('dragging');
      window.isDraggingPallet = true;
      this.el.setPointerCapture(e.pointerId);
    });

    // ── Drag: pointermove ────────────────────────────────────
    this.el.addEventListener('pointermove', e => {
      if (!window.editMode) return;
      if (!window.isDraggingPallet || !this.el.classList.contains('dragging')) return;
      e.preventDefault();

      const container     = document.querySelector('.grid-stack');
      const containerRect = container.getBoundingClientRect();
      const pointerX = (e.clientX - containerRect.left) / window.scale;
      const pointerY = (e.clientY - containerRect.top)  / window.scale;

      this.el.style.left = `${pointerX - this.dragOffsetX}px`;
      this.el.style.top  = `${pointerY - this.dragOffsetY}px`;
    });

    // ── Drag: pointerup ──────────────────────────────────────
    this.el.addEventListener('pointerup', e => {
      if (!window.editMode) return;
      if (!this.el.classList.contains('dragging')) return;
      e.preventDefault();

      try { this.el.releasePointerCapture(e.pointerId); } catch (_) {}

      this.el.classList.remove('dragging');
      window.isDraggingPallet = false;

      const loc = window.getLocationAtClientPoint(e.clientX, e.clientY);
      if (loc) {
        this.moveToLocation(loc);
      } else {
        window.adjustPalletSizesAtLocation(this.location);
      }
    });

    // ── Drag: pointercancel ──────────────────────────────────
    this.el.addEventListener('pointercancel', () => {
      this.el.classList.remove('dragging');
      window.isDraggingPallet = false;
      window.adjustPalletSizesAtLocation(this.location);
    });

    // ── Split ────────────────────────────────────────────────
    this.splitArrow.addEventListener('click', e => {
      e.stopPropagation();
      if (!window.editMode) { alert('Edit mode is OFF. Turn it ON to split pallets.'); return; }

      const maxSplit = this.quantity - 0.01;
      if (maxSplit <= 0) { alert('Cannot split this pallet.'); return; }

      const splitQ = prompt(
        `Enter quantity to split from "${this.itemId}" (max ${window.formatQuantity(maxSplit)}):`,
        window.formatQuantity(this.quantity / 2)
      );
      const num = parseFloat(splitQ);

      if (!window.isValidQuantity(num) || num >= this.quantity) {
        alert('Enter a valid split quantity.'); return;
      }

      this.quantity = window.roundQuantity(this.quantity - num);
      this.updateText();

      window.createNewPallet(this.itemId, num, this.location, false);
      window.recordHistory({ action: 'split', itemId: this.itemId, quantity: num,
                             fromLocation: this.location, toLocation: this.location });
      window.saveWarehouseData();
      window.adjustPalletSizesAtLocation(this.location);
      window.updateInventorySummary();
    });

    // ── Merge ────────────────────────────────────────────────
    this.mergeArrow.addEventListener('click', e => {
      e.stopPropagation();
      if (!window.editMode) { alert('Edit mode is OFF. Turn it ON to merge pallets.'); return; }

      const enteredItemId = prompt(
        `Enter Product ID to merge into this pallet (${this.itemId}):`,
        this.itemId
      );
      if (enteredItemId === null) return;

      const normalized = String(enteredItemId).trim();
      if (!normalized) { alert('Product ID is required.'); return; }
      if (normalized.toLowerCase() !== String(this.itemId).trim().toLowerCase()) {
        alert('Error: Product ID does not match this pallet.'); return;
      }

      const addQtyInput = prompt(`Enter quantity to add to "${this.itemId}":`, '1');
      if (addQtyInput === null) return;

      const addQty = parseFloat(addQtyInput);
      if (!window.isValidQuantity(addQty)) { alert('Enter a valid quantity.'); return; }

      this.quantity = window.roundQuantity(this.quantity + addQty);
      this.updateText();

      window.recordHistory({ action: 'merge', itemId: this.itemId, quantity: addQty,
                             fromLocation: this.location, toLocation: this.location });
      window.saveWarehouseData();
      window.adjustPalletSizesAtLocation(this.location);
      window.updateInventorySummary();
    });
  }

  // ── Move to a new location ───────────────────────────────────
  moveToLocation(newLoc, options = {}) {
    const { recordHistory = true, pushUndo = true } = options;
    const oldLoc = this.location;
    if (!newLoc || newLoc === oldLoc) {
      window.adjustPalletSizesAtLocation(this.location);
      return;
    }

    if (pushUndo && typeof window.registerUndoAction === 'function') {
      window.registerUndoAction({
        type: 'move', palletId: this.id, itemId: this.itemId,
        quantity: this.quantity, fromLocation: oldLoc, toLocation: newLoc
      });
    }

    // Remove from old location index
    if (window.palletsByLocation[oldLoc]) {
      window.palletsByLocation[oldLoc] = window.palletsByLocation[oldLoc].filter(p => p !== this);
      if (window.palletsByLocation[oldLoc].length === 0) delete window.palletsByLocation[oldLoc];
    }

    // SHIPPED = terminal, remove pallet entirely
    if (newLoc === 'SHIPPED') {
      if (recordHistory) {
        window.recordHistory({ action: 'move', itemId: this.itemId, quantity: this.quantity,
                               fromLocation: oldLoc, toLocation: newLoc });
      }
      this.location = newLoc;
      this.el.dataset.location = newLoc;
      this.remove();
      window.pallets = window.pallets.filter(p => p !== this);
      window.adjustPalletSizesAtLocation(oldLoc);
      window.saveWarehouseData();
      window.updateInventorySummary();
      return;
    }

    // Regular move
    if (!window.palletsByLocation[newLoc]) window.palletsByLocation[newLoc] = [];
    window.palletsByLocation[newLoc].push(this);
    this.location = newLoc;
    this.el.dataset.location = newLoc;

    if (recordHistory) {
      window.recordHistory({ action: 'move', itemId: this.itemId, quantity: this.quantity,
                             fromLocation: oldLoc, toLocation: newLoc });
    }

    window.adjustPalletSizesAtLocation(oldLoc);
    window.adjustPalletSizesAtLocation(newLoc);
    window.saveWarehouseData();
    window.updateInventorySummary();
    this.updateText();
  }

  remove() {
    if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
  }
};