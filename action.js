// ── Configuration ──────────────────────────────────────────────
const API_BASE = 'https://backportfolio-six.vercel.app/api'; // ← changer en prod

// ── Avatar fallback ──
const avatarImg = document.querySelector('.about-avatar img');
const avatarPlaceholder = document.querySelector('.avatar-placeholder');

if (avatarImg && avatarPlaceholder) {
  avatarImg.addEventListener('error', () => { avatarPlaceholder.style.opacity = '1'; });
  avatarImg.addEventListener('load',  () => { avatarPlaceholder.style.opacity = '0'; });
}

// ── Hamburger menu ──
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('nav-links');
hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  navLinks.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', navLinks.classList.contains('open'));
});
navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    hamburger.classList.remove('open');
    navLinks.classList.remove('open');
  });
});

// ── Scroll reveal ──
const revealEls = document.querySelectorAll('.reveal');
const observer  = new IntersectionObserver(
  entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
  }),
  { threshold: 0.1 }
);
revealEls.forEach(el => observer.observe(el));

// ── Stagger project cards ──
document.querySelectorAll('.project-card.reveal').forEach((card, i) => {
  card.style.transitionDelay = `${i * 0.1}s`;
});

// ── Active nav link on scroll ──
const sections = document.querySelectorAll('section[id]');
window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(s => {
    if (window.scrollY >= s.offsetTop - 120) current = s.id;
  });
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.style.color = a.getAttribute('href') === '#' + current ? 'var(--peach-deep)' : '';
  });
}, { passive: true });

// ── Tracking des visites ──
async function enregistrerVisite() {
  try {
    await fetch(`${API_BASE}/visit`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        page:       window.location.pathname || '/',
        referrer:   document.referrer || null,
        user_agent: navigator.userAgent || null,
      })
    });
  } catch (err) {
    console.warn('Visit tracking error:', err);
  }
}

enregistrerVisite();

// ── Formulaire de contact ──
async function handleSubmit(e) {
  e.preventDefault();

  const btn = document.getElementById('submit-btn');
  btn.innerHTML = 'Envoi en cours… <i data-lucide="loader" style="width:15px;height:15px;margin-left:4px;"></i>';
  btn.disabled  = true;
  lucide.createIcons();

  const data = {
    nom:     document.getElementById('name').value.trim(),
    email:   document.getElementById('email').value.trim(),
    sujet:   document.getElementById('subject').value.trim(),
    message: document.getElementById('message').value.trim()
  };

  try {
    const response = await fetch(`${API_BASE}/contact`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      // result.errors = tableau de messages, result.error = message unique
      const msg = result.errors
        ? result.errors.join(' ')
        : (result.error || 'Erreur inconnue');
      throw new Error(msg);
    }

    btn.innerHTML        = 'Message envoyé ✓';
    btn.style.background = '#6BAA75';

    setTimeout(() => {
      btn.innerHTML        = 'Envoyer le message <i data-lucide="send" style="width:15px;height:15px;margin-left:4px;"></i>';
      btn.style.background = '';
      btn.disabled         = false;
      lucide.createIcons();
      e.target.reset();
    }, 3500);

  } catch (erreur) {
    console.error('Erreur :', erreur);
    btn.innerHTML        = `Échec — ${erreur.message}`;
    btn.style.background = '#e05252';
    btn.disabled         = false;

    setTimeout(() => {
      btn.innerHTML        = 'Envoyer le message <i data-lucide="send" style="width:15px;height:15px;margin-left:4px;"></i>';
      btn.style.background = '';
      lucide.createIcons();
    }, 3000);
  }
}