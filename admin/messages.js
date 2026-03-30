// ══════════════════════════════════════════
// MESSAGES — Interface de gestion des messages
// ══════════════════════════════════════════

let allMessages = [];
let currentFilter = 'all';
let currentMsgId = null;

// ── Utilitaire fetch Supabase ──
async function sbFetch(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      ...opts.headers
    },
    ...opts
  });
  return res;
}

// ── Initialisation ──
document.addEventListener('DOMContentLoaded', () => {
  checkAuthStatus();
  initMessagesPage();
});

function initMessagesPage() {
  const savedAdmin = sessionStorage.getItem('adminUser');
  if (!savedAdmin) {
    window.location.href = 'index.html';
    return;
  }
  
  try {
    const adminData = JSON.parse(savedAdmin);
    document.getElementById('admin-name-badge').textContent = adminData.username;
  } catch (e) {
    console.error('Erreur session:', e);
    sessionStorage.removeItem('adminUser');
    window.location.href = 'index.html';
    return;
  }
  
  loadMessages();
  loadNavigationBadges();
  
  // Démarrer la surveillance en temps réel
  startRealTimeUpdates();
}

let updateInterval;

function startRealTimeUpdates() {
  // Mettre à jour toutes les 30 secondes
  updateInterval = setInterval(async () => {
    await loadNavigationBadges();
    await loadMessages();
  }, 30000);
}

// Nettoyer l'intervalle quand l'utilisateur quitte la page
window.addEventListener('beforeunload', () => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
});

// ── Charger les badges de navigation ──
async function loadNavigationBadges() {
  try {
    // Charger les messages non lus
    const msgRes = await sbFetch('messages?select=lu');
    const messages = await msgRes.json();
    const unreadCount = Array.isArray(messages) ? messages.filter(m => !m.lu).length : 0;
    
    const unreadBadge = document.getElementById('messages-unread-badge');
    if (unreadCount > 0) {
      const oldValue = parseInt(unreadBadge.textContent) || 0;
      unreadBadge.textContent = unreadCount;
      unreadBadge.style.display = 'inline-block';
      
      // Animation si augmentation
      if (unreadCount > oldValue && oldValue > 0) {
        unreadBadge.style.animation = 'pulse 0.6s ease-in-out';
        setTimeout(() => {
          unreadBadge.style.animation = '';
        }, 600);
      }
    } else {
      unreadBadge.style.display = 'none';
    }
    
    // Charger les visites d'aujourd'hui
    const visitsRes = await sbFetch('visits?select=visited_at');
    const visits = await visitsRes.json();
    const today = new Date().toDateString();
    const todayVisits = Array.isArray(visits) ? visits.filter(v => new Date(v.visited_at).toDateString() === today).length : 0;
    
    const todayBadge = document.getElementById('messages-today-badge');
    if (todayVisits > 0) {
      const oldValue = parseInt(todayBadge.textContent) || 0;
      todayBadge.textContent = todayVisits;
      todayBadge.style.display = 'inline-block';
      
      // Animation si augmentation
      if (todayVisits > oldValue && oldValue > 0) {
        todayBadge.style.animation = 'pulse 0.6s ease-in-out';
        setTimeout(() => {
          todayBadge.style.animation = '';
        }, 600);
      }
    } else {
      todayBadge.style.display = 'none';
    }
  } catch (e) {
    console.error('Erreur chargement badges navigation:', e);
  }
}

// ── Chargement des messages ──
async function loadMessages() {
  document.getElementById('messages-list').innerHTML = '<div class="loading-spinner"></div>';

  try {
    const res = await sbFetch('messages?select=*&order=created_at.desc');
    const data = await res.json();

    if (!Array.isArray(data)) throw new Error(data?.message || 'Réponse inattendue');

    allMessages = data;
    updateMessageStats();
    renderMessages();
  } catch (e) {
    document.getElementById('messages-list').innerHTML = `<div class="empty-state"><p>Erreur de chargement : ${e.message}</p></div>`;
  }
}

function updateMessageStats() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const total = allMessages.length;
  const unread = allMessages.filter(m => !m.lu).length;
  const thisMonth = allMessages.filter(m => {
    const d = new Date(m.created_at);
    return d.getMonth() === month && d.getFullYear() === year;
  }).length;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-unread').innerHTML = `${unread} <span>nouveau</span>`;
  document.getElementById('stat-month').textContent = thisMonth;
}

function setFilter(f, btn) {
  currentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderMessages();
}

function renderMessages() {
  const q = (document.getElementById('search-input').value || '').toLowerCase();

  const list = allMessages.filter(m => {
    if (currentFilter === 'unread' && m.lu) return false;
    if (currentFilter === 'read' && !m.lu) return false;
    if (q && !`${m.nom} ${m.email} ${m.sujet} ${m.message}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const container = document.getElementById('messages-list');

  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>Aucun message trouvé.</p></div>`;
    return;
  }

  container.innerHTML = list.map((m, i) => `
    <div class="msg-row ${m.lu ? '' : 'unread'}" style="animation-delay:${i * 0.04}s" onclick="openModal(${m.id})">
      <div>${m.lu ? '' : '<div class="msg-unread-dot"></div>'}</div>
      <div class="msg-name">${escHtml(m.nom)}</div>
      <div class="msg-email">${escHtml(m.email)}</div>
      <div class="msg-sujet">${escHtml(m.sujet || '—')}</div>
      <div class="msg-date">${fmtDate(m.created_at)}</div>
      <div>
        <span class="badge-lu ${m.lu ? 'read' : 'unread'}">
          ${m.lu ? 'Lu' : 'Nouveau'}
        </span>
      </div>
    </div>
  `).join('');
}

// ── Modal message ──
function openModal(id) {
  const m = allMessages.find(x => x.id === id);
  if (!m) return;

  currentMsgId = id;

  document.getElementById('modal-avatar').textContent = (m.nom || '?')[0].toUpperCase();
  document.getElementById('modal-name').textContent = m.nom;
  document.getElementById('modal-email-modal').textContent = m.email;
  document.getElementById('modal-sujet').textContent = m.sujet || '(sans sujet)';
  document.getElementById('modal-date').textContent = fmtDateLong(m.created_at);
  document.getElementById('modal-message').textContent = m.message;

  const btnMark = document.getElementById('btn-mark');
  btnMark.textContent = m.lu ? '↩ Marquer non lu' : '✓ Marquer comme lu';

  document.getElementById('modal-overlay').classList.add('open');

  // Marquer automatiquement comme lu à l'ouverture si non lu
  if (!m.lu) markLu(id, true);
}

function closeModal(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModalDirect();
}

function closeModalDirect() {
  document.getElementById('modal-overlay').classList.remove('open');
  currentMsgId = null;
}

async function toggleLu() {
  if (!currentMsgId) return;
  const m = allMessages.find(x => x.id === currentMsgId);
  if (!m) return;
  await markLu(currentMsgId, !m.lu);
  closeModalDirect();
}

async function markLu(id, lu) {
  try {
    await sbFetch(`messages?id=eq.${id}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify({ lu })
    });
    const m = allMessages.find(x => x.id === id);
    if (m) m.lu = lu;
    updateMessageStats();
    renderMessages();
  } catch (e) {
    console.error('Erreur markLu :', e);
  }
}

async function deleteMessage() {
  if (!currentMsgId) return;
  if (!confirm('Supprimer ce message définitivement ?')) return;

  try {
    await sbFetch(`messages?id=eq.${currentMsgId}`, { method: 'DELETE' });
    allMessages = allMessages.filter(m => m.id !== currentMsgId);
    closeModalDirect();
    updateMessageStats();
    renderMessages();
  } catch (e) {
    console.error('Erreur deleteMessage :', e);
  }
}

// ── Utilitaires ──
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: '2-digit'
  });
}

function fmtDateLong(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    weekday: 'short', day: '2-digit', month: 'long', year: 'numeric'
  }) + ' à ' + d.toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit'
  });
}
