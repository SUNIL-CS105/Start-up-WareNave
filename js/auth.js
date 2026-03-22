// ============================================================
// WareNave — auth.js
// Multi-tenant authentication:
//   - Owner registers a NEW company (creates companies/{id})
//   - Employee joins an EXISTING company by exact name
//   - On login, resolves companyId and stores in localStorage
//   - All DB paths route through companies/{companyId}/warehouse/
// ============================================================

window.normalizeCompanyName = function (name) {
  return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
};

// ── Resolve which company a user belongs to ──────────────────
window.resolveUserCompany = async function (uid) {
  // 1. Check localStorage cache first (fast path)
  const cached = localStorage.getItem('wn_companyId');
  if (cached) {
    // Verify it still maps this uid
    const snap = await window.database.ref(`companies/${cached}/users/${uid}`).once('value');
    if (snap.val() === true) {
      window.companyId = cached;
      return cached;
    }
    localStorage.removeItem('wn_companyId');
  }

  // 2. Scan companies for this uid (fallback)
  const snap = await window.database.ref('companies').once('value');
  const all = snap.val() || {};
  for (const [cid, company] of Object.entries(all)) {
    if (company.users && company.users[uid] === true) {
      window.companyId = cid;
      localStorage.setItem('wn_companyId', cid);
      return cid;
    }
  }
  return null;
};

// ── Auth state observer ───────────────────────────────────────
window.initAuth = function () {
  firebase.auth().onAuthStateChanged(async user => {
    const loginContainer   = document.getElementById('login-container');
    const signupContainer  = document.getElementById('signup-container');
    const warehouseApp     = document.getElementById('warehouse-app');
    const headerBar        = document.getElementById('app-header');
    const loading          = document.getElementById('loading-indicator');

    // ── ALWAYS hide loading first ──────────────────────────
    if (loading) loading.style.display = 'none';

    if (user) {
      // Show loading only while we resolve the company
      if (loading) loading.style.display = 'flex';

      const companyId = await window.resolveUserCompany(user.uid);

      if (!companyId) {
        if (loading) loading.style.display = 'none';
        alert('Your account is not linked to any company. Please contact your administrator.');
        firebase.auth().signOut();
        return;
      }

      const compSnap = await window.database.ref(`companies/${companyId}/name`).once('value');
      const companyName = compSnap.val() || 'WareNave';
      const titleEl = document.querySelector('.app-title');
      if (titleEl) titleEl.textContent = companyName;

      if (loginContainer)  loginContainer.style.display  = 'none';
      if (signupContainer) signupContainer.style.display = 'none';
      if (warehouseApp)    warehouseApp.style.display    = 'block';
      if (headerBar)       headerBar.style.display       = 'flex';

      if (typeof window.initWarehouseApp  === 'function') window.initWarehouseApp();
      if (typeof window.loadWarehouseData === 'function') window.loadWarehouseData();
      if (typeof window.applyEditModeUI   === 'function') window.applyEditModeUI();

      if (loading) loading.style.display = 'none';

    } else {
      window.companyId = null;
      localStorage.removeItem('wn_companyId');

      if (loginContainer)  loginContainer.style.display  = 'flex';
      if (signupContainer) signupContainer.style.display = 'none';
      if (warehouseApp)    warehouseApp.style.display    = 'none';
      if (headerBar)       headerBar.style.display       = 'none';
    }
  });
};

// ── DOM event wiring ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  const loginBtn       = document.getElementById('login-btn');
  const signupBtn      = document.getElementById('signup-btn');
  const showSignup     = document.getElementById('show-signup');
  const showLogin      = document.getElementById('show-login');
  const logoutBtn      = document.getElementById('logout-btn');
  const roleOwner      = document.getElementById('role-owner');
  const roleEmployee   = document.getElementById('role-employee');
  const ownerFields    = document.getElementById('owner-fields');
  const employeeFields = document.getElementById('employee-fields');

  // Toggle signup role UI
  if (roleOwner && roleEmployee) {
    function updateRoleUI() {
      const isOwner = roleOwner.checked;
      if (ownerFields)    ownerFields.style.display    = isOwner ? 'block' : 'none';
      if (employeeFields) employeeFields.style.display = isOwner ? 'none'  : 'block';
    }
    roleOwner.addEventListener('change', updateRoleUI);
    roleEmployee.addEventListener('change', updateRoleUI);
    updateRoleUI();
  }

  // ── Login ─────────────────────────────────────────────────
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      const email    = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      if (!email || !password) { alert('Enter email and password.'); return; }
      firebase.auth().signInWithEmailAndPassword(email, password)
        .catch(err => alert(err.message));
    });
  }

  // ── Sign Up ───────────────────────────────────────────────
  if (signupBtn) {
    signupBtn.addEventListener('click', async () => {
      const email    = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;
      const isOwner  = document.getElementById('role-owner')?.checked ?? true;

      if (!email || !password) { alert('Enter email and password.'); return; }

      try {
        if (isOwner) {
          // ── OWNER: Register new company ──────────────────
          const companyName = document.getElementById('signup-company-name').value.trim();
          if (!companyName) { alert('Enter your company name.'); return; }

          const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
          const uid  = cred.user.uid;

          // Generate a safe companyId from name + timestamp
          const companyId = window.normalizeCompanyName(companyName)
            .replace(/[^a-z0-9]/g, '_')
            .slice(0, 30) + '_' + Date.now().toString(36);

          await window.database.ref(`companies/${companyId}`).set({
            name:            companyName,
            nameNormalized:  window.normalizeCompanyName(companyName),
            ownerUid:        uid,
            createdAt:       Date.now(),
            users:           { [uid]: true },
            warehouse:       { pallets: null, history: null }
          });

          localStorage.setItem('wn_companyId', companyId);
          window.companyId = companyId;
          alert(`Company "${companyName}" registered! You are now logged in as Owner.`);

        } else {
          // ── EMPLOYEE: Join existing company ──────────────
          const joinName = document.getElementById('signup-join-company').value.trim();
          if (!joinName) { alert('Enter the exact company name to join.'); return; }

          const normalized = window.normalizeCompanyName(joinName);

          // Find company by normalized name
          const snap = await window.database.ref('companies')
            .orderByChild('nameNormalized')
            .equalTo(normalized)
            .once('value');

          if (!snap.exists()) {
            alert('No company found with that name. Check spelling and try again.');
            return;
          }

          const companyId = Object.keys(snap.val())[0];

          const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
          const uid  = cred.user.uid;

          await window.database.ref(`companies/${companyId}/users/${uid}`).set(true);

          localStorage.setItem('wn_companyId', companyId);
          window.companyId = companyId;
          alert(`You have joined the company! You are now logged in.`);
        }
      } catch (err) {
        alert(err.message);
      }
    });
  }

  // ── Navigation ────────────────────────────────────────────
  if (showSignup) {
    showSignup.addEventListener('click', () => {
      document.getElementById('login-container').style.display  = 'none';
      document.getElementById('signup-container').style.display = 'flex';
    });
  }

  if (showLogin) {
    showLogin.addEventListener('click', () => {
      document.getElementById('signup-container').style.display = 'none';
      document.getElementById('login-container').style.display  = 'flex';
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('wn_companyId');
      firebase.auth().signOut();
    });
  }

  window.initAuth();
});
