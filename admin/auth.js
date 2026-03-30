// ══════════════════════════════════════════
// AUTHENTIFICATION ADMIN
// ══════════════════════════════════════════

let currentAdmin = null;

// ── Utilitaire fetch Supabase ──
async function sbFetch(path, opts = {}, useSecret = false) {
  const key = useSecret ? SUPABASE_SECRET : SUPABASE_ANON_KEY;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      ...opts.headers
    },
    ...opts
  });
  return res;
}

// ── Hash SHA-256 ──
async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// ── LOGIN ──
async function handleLogin() {
  const username = document.getElementById('inp-username').value.trim();
  const password = document.getElementById('inp-password').value;
  const btn      = document.getElementById('btn-login');
  const errEl    = document.getElementById('login-error');

  if (!username || !password) return;

  btn.disabled = true;
  btn.textContent = 'Connexion…';
  errEl.style.display = 'none';

  try {
    const hash = await sha256(password);
    const res  = await sbFetch(
      `admin_users?select=id,username&username=eq.${encodeURIComponent(username)}&password_hash=eq.${hash}`,
      {}, false
    );
    const data = await res.json();

    if (Array.isArray(data) && data.length > 0) {
      currentAdmin = data[0];
      
      // Sauvegarder la session
      sessionStorage.setItem('adminUser', JSON.stringify(currentAdmin));
      
      // Rediriger vers les messages
      window.location.href = 'messages.html';
    } else {
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Se connecter';
    }
  } catch (e) {
    errEl.textContent = 'Erreur réseau. Vérifiez votre connexion.';
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Se connecter';
  }
}

// ── LOGOUT ──
function handleLogout() {
  currentAdmin = null;
  
  // Supprimer la session
  sessionStorage.removeItem('adminUser');
  
  // Rediriger vers la page de login
  window.location.href = 'index.html';
}

// ── Charger le dashboard ──
function loadDashboard() {
  // Le script dashboard.js est déjà chargé dans le HTML
  // Initialiser le dashboard directement
  if (typeof initDashboard === 'function') {
    initDashboard();
  }
}

// ── Event listeners ──
document.addEventListener('DOMContentLoaded', () => {
  // Vérifier si l'utilisateur est déjà connecté
  checkAuthStatus();
  
  const btnLogin = document.getElementById('btn-login');
  const btnLogout = document.getElementById('btn-logout');
  const inpPassword = document.getElementById('inp-password');
  
  if (btnLogin) btnLogin.addEventListener('click', handleLogin);
  if (btnLogout) btnLogout.addEventListener('click', handleLogout);
  if (inpPassword) inpPassword.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
});

// ── Vérifier le statut d'authentification ──
function checkAuthStatus() {
  const savedAdmin = sessionStorage.getItem('adminUser');
  if (savedAdmin) {
    try {
      // Si la donnée est déjà un objet (cas rare), l'utiliser directement
      let adminData;
      if (typeof savedAdmin === 'object') {
        adminData = savedAdmin;
      } else {
        adminData = JSON.parse(savedAdmin);
      }
      
      currentAdmin = adminData;
      
      // Si on est sur la page de login et qu'on est déjà connecté, rediriger
      if (window.location.pathname.includes('index.html')) {
        window.location.href = 'messages.html';
      }
      
      // Si on est à la racine du site et qu'on est connecté, rediriger vers messages
      if (window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
        window.location.href = 'messages.html';
      }
    } catch (e) {
      console.error('Erreur lors de la récupération de la session:', e);
      sessionStorage.removeItem('adminUser');
    }
  }
}
