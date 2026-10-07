// nav.js — Routage par hash et gestion de la navigation (Phase 1)
// Permet d'utiliser les boutons Précédent/Suivant du navigateur.

const titles = {
  login: 'SafeTrack - Connexion',
  dashboard: 'SafeTrack - Carte',
  trackers: 'SafeTrack - Trackers',
  alerts: 'SafeTrack - Alertes',
  contacts: 'SafeTrack - Contacts',
  history: 'SafeTrack - Historique',
  profile: 'SafeTrack - Profil',
};

function switchScreen(name) {
  // Retire l'écran actif
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
  });
  
  // Trouve le nouvel écran et l'active
  const screen = document.getElementById('screen-' + name) || document.getElementById('screen-dashboard');
  const actualName = screen.id.replace('screen-', '');
  screen.classList.add('active');

  // Met à jour la navigation
  document.querySelectorAll('.navbtn[data-screen]').forEach(b =>
    b.classList.toggle('active', b.dataset.screen === actualName)
  );

  const showNav = actualName !== 'login';
  document.getElementById('bottomnav').style.display = showNav ? '' : 'none';
  document.querySelector('.sidebar').style.visibility = showNav ? 'visible' : 'hidden';

  // Mise à jour du document.title
  document.title = titles[actualName] || 'SafeTrack';

  // Déplace le focus sur le h1 (accessibilité)
  const h1 = screen.querySelector('h1');
  if (h1) {
    h1.setAttribute('tabindex', '-1');
    h1.focus();
  }

  // Appels de hooks
  if (actualName === 'dashboard' && typeof onEnterDashboard === 'function') onEnterDashboard();
  if (actualName === 'trackers' && typeof onEnterTrackers === 'function') onEnterTrackers();
  if (actualName === 'alerts' && typeof onEnterAlerts === 'function') onEnterAlerts();
  if (actualName === 'contacts' && typeof onEnterContacts === 'function') onEnterContacts();
  if (actualName === 'history' && typeof onEnterHistory === 'function') onEnterHistory();
}

function goTo(name) {
  window.location.hash = name;
}

window.addEventListener('hashchange', () => {
  const hash = window.location.hash.replace('#', '') || 'login';
  switchScreen(hash);
});

// Au chargement initial
window.addEventListener('DOMContentLoaded', () => {
  const hash = window.location.hash.replace('#', '') || 'login';
  switchScreen(hash);
});

// Mise à jour des boutons nav existants (fallback au cas où pas de a href)
document.querySelectorAll('.navbtn[data-screen]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    goTo(btn.dataset.screen);
  });
});
