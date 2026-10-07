// app.js — Point d'entrée du frontend. Relie les actions de l'interface
// (boutons, formulaires) aux appels Api.* et déclenche le re-rendu des
// écrans concernés. Toutes les données affichées viennent de la base SQLite
// via le backend — il n'y a plus aucune donnée simulée en dur dans le JS.

let cachedTrackers = [];
let cachedContacts = [];

function showToast(title, sub) {
  const t = document.getElementById('toast');
  document.getElementById('toast-title').textContent = title;
  document.getElementById('toast-sub').textContent = sub;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

async function onEnterDashboard() {
  const [stats, trackers, contacts, alerts] = await Promise.all([
    Api.getStats(), Api.getTrackers(), Api.getContacts(), Api.getAlerts(),
  ]);
  cachedTrackers = trackers;
  cachedContacts = contacts;
  renderStats(stats);
  renderDashboardFeed({ trackers, contacts, alerts });
  updateRadarReadout(trackers[0]);
}

async function onEnterTrackers() {
  cachedTrackers = await Api.getTrackers();
  renderTrackers(cachedTrackers);
}

async function onEnterAlerts() {
  renderAlerts(await Api.getAlerts());
}

async function onEnterContacts() {
  cachedContacts = await Api.getContacts();
  renderContacts(cachedContacts);
  renderNotifications(await Api.getNotifications());
}

async function onEnterHistory() {
  renderHistory(await Api.getPositions());
}

// ---- Connexion ----
document.getElementById('login-btn').addEventListener('click', () => goTo('dashboard'));
document.getElementById('logout-btn').addEventListener('click', () => goTo('login'));

// ---- Trackers ----
document.getElementById('add-tracker-btn').addEventListener('click', async () => {
  const n = cachedTrackers.length + 1;
  await Api.createTracker({
    nom: `Nouvel objet ${n}`,
    typeSignal: 'GPS',
    lat: 6.13 + Math.random() * 0.01,
    lon: 1.22 + Math.random() * 0.01,
  });
  onEnterTrackers();
});

// ---- Alertes ----
document.querySelectorAll('#alert-type-chips .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#alert-type-chips .chip').forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected');
  });
});

document.getElementById('create-alert-btn').addEventListener('click', async () => {
  const type = document.querySelector('#alert-type-chips .chip.selected').dataset.type;
  const trackerId = cachedTrackers[0] ? cachedTrackers[0].id : null;
  await Api.createAlert({ type, mode: 'Manuel', trackerId });
  onEnterAlerts();
  showToast(`Alerte ${type} déclenchée`, 'Vos contacts de confiance ont été notifiés.');
});

document.getElementById('sos-btn').addEventListener('click', async () => {
  const trackerId = cachedTrackers[0] ? cachedTrackers[0].id : null;
  await Api.createAlert({ type: 'SOS', mode: 'Manuel', trackerId });
  const stats = await Api.getStats();
  renderStats(stats);
  showToast('Alerte SOS déclenchée', 'Vos contacts de confiance ont été notifiés.');
});

// ---- Contacts ----
document.getElementById('add-contact-btn').addEventListener('click', async () => {
  await Api.createContact({ nom: 'Nouveau contact', telephone: '+228 9_ __ __ __' });
  onEnterContacts();
});

// ---- Horloge de la barre du haut (mobile) ----
function tickClock() {
  const now = new Date();
  document.getElementById('clock').textContent = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
setInterval(tickClock, 15000);
tickClock();

// ---- Rafraîchit doucement les coordonnées affichées sur le radar ----
setInterval(() => {
  if (document.getElementById('screen-dashboard').classList.contains('active')) {
    updateRadarReadout(cachedTrackers[0]);
  }
}, 2600);

// ---- État initial ----
document.getElementById('bottomnav').style.display = 'none';
document.querySelector('.sidebar').style.visibility = 'hidden';
