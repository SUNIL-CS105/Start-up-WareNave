// ============================================================
// WareNave — training.js
// Updated steps for WareNave multi-tenant platform.
// Removed MAXSA/office-specific steps.
// Added AI Assistant step.
// ============================================================

window.trainingSteps = [
  {
    title: "Welcome to WareNave",
    text:  "This training walks you through all major features of your warehouse map. Watch the highlights!",
    tip:   "Tip: The guide stays in the corner so you can see the map behind it.",
    target: null
  },
  {
    title: "Understanding Locations",
    text:  "The grid uses labels like A1, B4 — read the row letter and column number together. Rows go A–X, columns 1–30.",
    tip:   "Your warehouse has up to 720 storage locations on the grid.",
    target: "A1"
  },
  {
    title: "Edit Mode: ON / OFF",
    text:  "Edit mode controls whether the map can be changed. Turn it ON to move pallets, OFF for view-only.",
    tip:   "Safety first: Keep it OFF when just viewing inventory.",
    target: "Edit"
  },
  {
    title: "Add Product",
    text:  "Enter a Product ID and Quantity, then click Add New Product. Pallets appear in New_# staging first.",
    tip:   "You can use decimals like 10.5 for quantities (e.g. partial cases).",
    target: "Add New Product"
  },
  {
    title: "Dragging and Stacking",
    text:  "When Edit is ON, drag a pallet to any grid location. Multiple pallets can stack in one cell.",
    tip:   "Stacking keeps pallets separate but in the same physical spot.",
    target: "New_"
  },
  {
    title: "Split Feature",
    text:  "Use the ◮ split icon on a pallet to divide it into two. Useful for partial shipments or moves.",
    tip:   "The split amount must be less than the total quantity.",
    target: "Split"
  },
  {
    title: "Merge / Add More",
    text:  "The + merge icon lets you add quantity to a pallet. Product IDs must match exactly.",
    tip:   "The system will block merges if IDs don't match — data integrity is protected.",
    target: "Merge"
  },
  {
    title: "Shipped Area",
    text:  "Drag pallets to SHIPPED to remove them from active inventory. This records them as dispatched.",
    tip:   "Once dropped here, the pallet is removed and logged in history.",
    target: "SHIPPED"
  },
  {
    title: "Movement History",
    text:  "Track every movement: see who moved what, where, and when. History is kept for 60 days.",
    tip:   "Check this if a pallet disappears — it will show who moved it.",
    target: "History"
  },
  {
    title: "Inventory Summary",
    text:  "See total stock levels by Product ID across your whole warehouse in one glance.",
    tip:   "Perfect for a quick count without scanning the full map.",
    target: "Inventory Summary"
  },
  {
    title: "Download Excel",
    text:  "Export your current inventory to a CSV spreadsheet for reporting or sharing with your team.",
    tip:   "Great for weekly backups and team reports.",
    target: "Download Excel"
  },
  {
    title: "Undo Button",
    text:  "Accidentally moved a pallet? Click Undo to put it back instantly. Works on the last move.",
    tip:   "Use this immediately after the mistake for best results.",
    target: "Undo"
  },
  {
    title: "AI Assistant (New!)",
    text:  "Ask natural language questions like \"Where is item 123?\" or \"Which items moved the most?\"",
    tip:   "The AI reads your live warehouse data to give you instant answers.",
    target: "AI Assistant"
  },
  {
    title: "Multi-Company Accounts",
    text:  "WareNave supports multiple companies. Owners register a new company; employees join by company name.",
    tip:   "Each company's data is completely isolated from others.",
    target: "Log Out"
  },
  {
    title: "You're Ready!",
    text:  "You've seen the full WareNave workflow: Add → Move → Split → Merge → Ship → Export → Ask AI.",
    tip:   "You can restart this training anytime from the header button.",
    target: null
  }
];

window.currentTrainingStep = 0;

// ── Self-contained styles ─────────────────────────────────────
const trainingStyle = document.createElement('style');
trainingStyle.innerHTML = `
  #training-modal {
    position: fixed !important;
    bottom: 25px !important;
    right: 25px !important;
    top: auto !important;
    left: auto !important;
    width: 380px !important;
    height: auto !important;
    background: #f0f7ff !important;
    padding: 0 !important;
    z-index: 10002 !important;
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    border: 1px solid #cce3ff;
    overflow: hidden;
  }
  #training-body {
    background: transparent !important;
    border: none !important;
    min-height: auto !important;
    padding: 24px !important;
  }
  .training-step-title { color: #003366 !important; font-size: 22px !important; }
  .training-step-text  { color: #1a4a75 !important; font-size: 15px !important; }
  .training-step-tip   {
    background: #ffffff !important;
    border-left: 5px solid #ffcc00 !important;
    color: #444 !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }
  .training-target-highlight {
    outline: 5px solid #ffcc00 !important;
    box-shadow: 0 0 20px rgba(255,204,0,0.6) !important;
    z-index: 10001 !important;
  }
  #training-next-btn { background-color: #007bff !important; }
  #training-prev-btn {
    background: white !important;
    color: #007bff !important;
    border: 1px solid #007bff !important;
  }
`;
document.head.appendChild(trainingStyle);

// ── Find element by text ──────────────────────────────────────
window.findTargetElement = function (text) {
  if (!text) return null;
  const selectors = ['button','div','span','th','td','label','h3'];
  for (const selector of selectors) {
    for (const el of document.querySelectorAll(selector)) {
      if (el.textContent.trim().includes(text) && el.offsetParent !== null) return el;
    }
  }
  return null;
};

// ── Render current step ───────────────────────────────────────
window.renderTrainingStep = function () {
  const body    = document.getElementById('training-body');
  const progress = document.getElementById('training-progress');
  const prevBtn  = document.getElementById('training-prev-btn');
  const nextBtn  = document.getElementById('training-next-btn');
  if (!body || !progress || !prevBtn || !nextBtn) return;

  document.querySelectorAll('.training-target-highlight').forEach(el =>
    el.classList.remove('training-target-highlight'));

  const step      = window.trainingSteps[window.currentTrainingStep];
  const stepNum   = window.currentTrainingStep + 1;
  const totalSteps = window.trainingSteps.length;

  const targetEl = window.findTargetElement(step.target);
  if (targetEl) {
    targetEl.classList.add('training-target-highlight');
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  body.innerHTML = `
    <div class="training-step-badge">Step ${stepNum} of ${totalSteps}</div>
    <div style="font-weight:bold;font-size:1.25em;margin-bottom:8px;color:#003366;">${step.title}</div>
    <div style="margin-bottom:15px;color:#1a4a75;line-height:1.4;">${step.text}</div>
    <div style="background:#fff9e6;padding:12px;border-radius:8px;border-left:4px solid #ffcc00;font-size:0.9em;color:#664d00;">
      ${step.tip}
    </div>
  `;

  progress.textContent = `${stepNum} / ${totalSteps}`;
  prevBtn.disabled = window.currentTrainingStep === 0;
  nextBtn.textContent = window.currentTrainingStep === totalSteps - 1 ? 'Finish' : 'Next ➡';
};

// ── Controls ─────────────────────────────────────────────────
window.openTrainingModal = function () {
  window.currentTrainingStep = 0;
  window.renderTrainingStep();
  document.getElementById('training-modal').style.display = 'block';
};

window.closeTrainingModal = function () {
  document.querySelectorAll('.training-target-highlight').forEach(el =>
    el.classList.remove('training-target-highlight'));
  document.getElementById('training-modal').style.display = 'none';
};

window.nextTrainingStep = function () {
  if (window.currentTrainingStep < window.trainingSteps.length - 1) {
    window.currentTrainingStep++;
    window.renderTrainingStep();
  } else {
    window.closeTrainingModal();
  }
};

window.prevTrainingStep = function () {
  if (window.currentTrainingStep > 0) {
    window.currentTrainingStep--;
    window.renderTrainingStep();
  }
};

window.initTrainingEvents = function () {
  const trainingBtn     = document.getElementById('training-btn');
  const trainingCloseBtn = document.getElementById('training-close-btn');
  const prevBtn         = document.getElementById('training-prev-btn');
  const nextBtn         = document.getElementById('training-next-btn');
  const modal           = document.getElementById('training-modal');

  if (trainingBtn)      trainingBtn.addEventListener('click',     window.openTrainingModal);
  if (trainingCloseBtn) trainingCloseBtn.addEventListener('click', window.closeTrainingModal);
  if (prevBtn)          prevBtn.addEventListener('click',          window.prevTrainingStep);
  if (nextBtn)          nextBtn.addEventListener('click',          window.nextTrainingStep);

  window.addEventListener('click', e => { if (e.target === modal) window.closeTrainingModal(); });
  window.addEventListener('keydown', e => {
    if (modal && modal.style.display === 'block') {
      if (e.key === 'Escape')      window.closeTrainingModal();
      else if (e.key === 'ArrowRight') window.nextTrainingStep();
      else if (e.key === 'ArrowLeft')  window.prevTrainingStep();
    }
  });
};

document.addEventListener('DOMContentLoaded', window.initTrainingEvents);