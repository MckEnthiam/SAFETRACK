// render.js — Fonctions d'affichage : transforment les données renvoyées par
// l'API en HTML pour chaque écran. Aucune donnée n'est stockée ici, tout est
// recalculé à partir de ce que Api.* renvoie.

const icoTracker = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/></svg>';
const icoAlert = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01M10.29 3.86L2.11 18a1.5 1.5 0 001.4 2h17a1.5 1.5 0 001.4-2L13.71 3.86a1.5 1.5 0 00-2.42 0z"/></svg>';
const icoContact = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0112 0v1"/></svg>';
const icoBell = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>';

function statusBadge(statut) {
  const s = (statut || '').toLowerCase();
  if (s.includes('actif') && !s.includes('inactif')) return `<span class="badge badge-safe">${statut}</span>`;
  if (s.includes('inactif') || s.includes('révoqué')) return `<span class="badge badge-dim">${statut}</span>`;
  if (s.includes('attente')) return `<span class="badge badge-amber">${statut}</span>`;
  return `<span class="badge badge-track">${statut}</span>`;
}

function renderTrackers(trackers) {
  const el = document.getElementById('trackers-list');
  el.innerHTML = trackers.map(t => `
    <div class="card">
      <div class="card-icon ${t.statut === 'actif' ? 'icon-track' : 'icon-dim'}">${icoTracker}</div>
      <div class="card-body">
        <div class="card-title-row">
          <span class="card-title">${t.nom}</span>
          ${statusBadge(t.statut)}
        </div>
        <div class="card-sub">Signal ${t.typeSignal} · TRK-${String(t.id).padStart(2, '0')}</div>
        <div class="card-meta">LAT ${t.lat.toFixed(4)} · LON ${t.lon.toFixed(4)}</div>
      </div>
    </div>`).join('') || '<div class="empty-hint">Aucun tracker enregistré.</div>';
}

function renderAlerts(alerts) {
  const el = document.getElementById('alerts-list');
  el.innerHTML = alerts.map(a => `
    <div class="card">
      <div class="card-icon icon-alert">${icoAlert}</div>
      <div class="card-body">
        <div class="card-title-row">
          <span class="card-title">${a.type}</span>
          <span class="badge badge-${a.mode === 'Automatique' ? 'track' : 'alert'}">${a.mode}</span>
        </div>
        <div class="card-sub">${a.trackerNom ? 'Déclenchée sur ' + a.trackerNom : 'Position actuelle'}</div>
        <div class="card-meta">${a.dateDebut}</div>
      </div>
    </div>`).join('') || '<div class="empty-hint">Aucune alerte enregistrée. Le système surveille en continu.</div>';
}

function renderContacts(contacts) {
  const el = document.getElementById('contacts-list');
  el.innerHTML = contacts.map(c => `
    <div class="card">
      <div class="card-icon icon-safe">${icoContact}</div>
      <div class="card-body">
        <div class="card-title-row">
          <span class="card-title">${c.nom}</span>
          ${statusBadge(c.statut)}
        </div>
        <div class="card-sub">${c.telephone}</div>
      </div>
    </div>`).join('') || '<div class="empty-hint">Aucun contact de confiance.</div>';
}

function renderNotifications(notifications) {
  const el = document.getElementById('notifications-list');
  el.innerHTML = notifications.map(n => `
    <div class="card">
      <div class="card-icon icon-amber">${icoBell}</div>
      <div class="card-body">
        <div class="card-title-row">
          <span class="card-title">${n.type} → ${n.contactNom || '—'}</span>
          ${statusBadge(n.statut)}
        </div>
        <div class="card-sub">Canal : ${n.canal}</div>
      </div>
    </div>`).join('') || '<div class="empty-hint">Aucune notification envoyée.</div>';
}

function renderHistory(positions) {
  const el = document.getElementById('history-timeline');
  el.innerHTML = positions.map(h => `
    <div class="tl-item">
      <div class="tl-time">${h.horodatage}</div>
      <div class="tl-coords">${h.lat.toFixed(4)}, ${h.lon.toFixed(4)}</div>
      <div class="tl-precision">précision ±${h.precisionM} m</div>
    </div>`).join('') || '<div class="empty-hint">Aucune position enregistrée.</div>';
}

function renderStats(stats) {
  document.getElementById('stat-trackers').textContent = stats.trackersActifs;
  document.getElementById('stat-contacts').textContent = stats.contactsActifs;
  document.getElementById('stat-alerts').textContent = stats.alertes24h;
}

function renderDashboardFeed({ trackers, contacts, alerts }) {
  const feed = document.getElementById('dashboard-feed');
  const items = [];
  if (alerts.length) {
    const a = alerts[0];
    items.push(`<div class="card"><div class="card-icon icon-alert">${icoAlert}</div><div class="card-body"><div class="card-title">Alerte ${a.type}</div><div class="card-sub">${a.dateDebut}</div></div></div>`);
  }
  if (trackers.length) {
    items.push(`<div class="card"><div class="card-icon icon-track">${icoTracker}</div><div class="card-body"><div class="card-title">Position mise à jour</div><div class="card-sub">${trackers[0].nom} · ${trackers[0].majLe}</div></div></div>`);
  }
  if (contacts.length) {
    items.push(`<div class="card"><div class="card-icon icon-safe">${icoContact}</div><div class="card-body"><div class="card-title">Contact confirmé</div><div class="card-sub">${contacts[0].nom}</div></div></div>`);
  }
  feed.innerHTML = items.join('') || '<div class="empty-hint">Pas encore d\'activité.</div>';
}

function updateRadarReadout(tracker) {
  if (!tracker) return;
  const jitterLat = (tracker.lat + (Math.random() - 0.5) * 0.0006).toFixed(4);
  const jitterLon = (tracker.lon + (Math.random() - 0.5) * 0.0006).toFixed(4);
  const prec = (3 + Math.random() * 3).toFixed(1);
  document.getElementById('radar-readout').innerHTML =
    `<span class="rlabel">LAT</span> ${jitterLat} &nbsp; <span class="rlabel">LON</span> ${jitterLon}<br><span class="rlabel">PRÉCISION</span> ±${prec} m`;
}
