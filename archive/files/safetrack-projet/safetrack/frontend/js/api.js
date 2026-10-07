// api.js — Couche d'accès à l'API SafeTrack (backend Express + SQLite).
// Tous les autres scripts passent par l'objet global `Api` pour lire ou
// écrire des données : aucune donnée simulée ici, tout vient de la base.

const Api = (() => {
  const BASE = '/api';

  async function request(path, options = {}) {
    const res = await fetch(BASE + path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Erreur API (${res.status})`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  return {
    // Trackers
    getTrackers: () => request('/trackers'),
    createTracker: (data) => request('/trackers', { method: 'POST', body: JSON.stringify(data) }),
    updateTracker: (id, data) => request(`/trackers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteTracker: (id) => request(`/trackers/${id}`, { method: 'DELETE' }),

    // Contacts de confiance
    getContacts: () => request('/contacts'),
    createContact: (data) => request('/contacts', { method: 'POST', body: JSON.stringify(data) }),
    updateContact: (id, data) => request(`/contacts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteContact: (id) => request(`/contacts/${id}`, { method: 'DELETE' }),

    // Alertes
    getAlerts: () => request('/alerts'),
    createAlert: (data) => request('/alerts', { method: 'POST', body: JSON.stringify(data) }),

    // Notifications
    getNotifications: () => request('/notifications'),

    // Positions / historique
    getPositions: (trackerId) => request(`/positions${trackerId ? `?trackerId=${trackerId}` : ''}`),
    createPosition: (data) => request('/positions', { method: 'POST', body: JSON.stringify(data) }),

    // Statistiques
    getStats: () => request('/stats'),
  };
})();
