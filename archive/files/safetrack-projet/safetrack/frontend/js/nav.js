// nav.js — Gère le passage d'un écran à l'autre. Les boutons de la sidebar
// (desktop) et de la barre du bas (mobile) partagent le même attribut
// data-screen et restent synchronisés.

function goTo(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  document.querySelectorAll('.navbtn[data-screen]').forEach(b =>
    b.classList.toggle('active', b.dataset.screen === name)
  );
  const showNav = name !== 'login';
  document.getElementById('bottomnav').style.display = showNav ? '' : 'none';
  document.querySelector('.sidebar').style.visibility = showNav ? 'visible' : 'hidden';

  if (name === 'dashboard' && typeof onEnterDashboard === 'function') onEnterDashboard();
  if (name === 'trackers' && typeof onEnterTrackers === 'function') onEnterTrackers();
  if (name === 'alerts' && typeof onEnterAlerts === 'function') onEnterAlerts();
  if (name === 'contacts' && typeof onEnterContacts === 'function') onEnterContacts();
  if (name === 'history' && typeof onEnterHistory === 'function') onEnterHistory();
}

document.querySelectorAll('.navbtn[data-screen]').forEach(btn => {
  btn.addEventListener('click', () => goTo(btn.dataset.screen));
});
