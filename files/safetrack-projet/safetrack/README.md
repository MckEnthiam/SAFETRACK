# SafeTrack

Application de localisation et de sécurité des personnes et des objets —
prototype fonctionnel réalisé à partir du dossier d'analyse fonctionnelle du
projet SafeTrack.

Ce dépôt contient une application **full-stack fonctionnelle** : une vraie
base de données, une API REST, et une interface web adaptable (web + mobile)
qui consomme cette API. Ce n'est plus une simple maquette — les trackers, les
alertes, les contacts et l'historique sont réellement enregistrés et
persistent d'une session à l'autre.

## Aperçu

- 🔴 Interface au thème rouge, responsive (sidebar sur desktop, barre de
  navigation en bas sur mobile)
- 📍 Tableau de bord avec vue radar animée et bouton SOS
- 🛰️ Gestion des trackers (objets et personnes suivis)
- 🚨 Déclenchement d'alertes (SOS, chute détectée, sortie de zone) avec
  notification automatique des contacts de confiance
- 👥 Gestion des contacts de confiance
- 🕓 Historique des positions

## Stack technique

| Couche         | Technologie                                   |
|----------------|------------------------------------------------|
| Frontend       | HTML / CSS / JavaScript (statique, sans framework) |
| Backend        | Node.js + Express                              |
| Base de données| SQLite via le module natif `node:sqlite` (aucune dépendance native à compiler) |

> Le dossier d'analyse fonctionnelle d'origine prévoyait Flutter (mobile) et
> PostgreSQL/PostGIS. Ce dépôt propose une implémentation web légère et
> portable, pensée pour tourner immédiatement avec une seule commande. La
> structure de la base (voir `backend/db.js`) reste proche du dictionnaire de
> données du dossier, ce qui facilite une migration ultérieure vers
> PostgreSQL si le passage à Flutter/mobile est fait plus tard.

## Structure du projet

```
safetrack/
├── backend/
│   ├── server.js          # Point d'entrée : API + fichiers statiques
│   ├── db.js               # Connexion SQLite, schéma, données de démo
│   ├── package.json
│   └── routes/
│       ├── trackers.js       # /api/trackers
│       ├── contacts.js       # /api/contacts
│       ├── alerts.js         # /api/alerts
│       ├── notifications.js  # /api/notifications
│       └── positions.js      # /api/positions
└── frontend/
    ├── index.html
    ├── css/
    │   └── style.css
    ├── js/
    │   ├── api.js           # Appels fetch vers l'API
    │   ├── render.js         # Génération du HTML des listes
    │   ├── nav.js             # Navigation entre écrans
    │   └── app.js              # Orchestration / événements
    └── assets/
        └── logo.png
```

## Installation et démarrage

Prérequis : **Node.js 22.5 ou supérieur** (pour le module `node:sqlite`).

```bash
cd backend
npm install
npm start
```

L'application est alors disponible sur **http://localhost:3000** — le
serveur Express sert à la fois l'API (`/api/...`) et les fichiers du
frontend, donc une seule commande suffit.

Au premier démarrage, le fichier `backend/safetrack.db` est créé
automatiquement et pré-rempli avec des données de démonstration (un compte,
quatre trackers, trois contacts...). Vous pouvez supprimer ce fichier à tout
moment pour repartir d'une base vierge — il sera régénéré au redémarrage.

Pour le développement, `npm run dev` relance le serveur automatiquement à
chaque modification d'un fichier backend.

## Accès à la base de données

La base est un simple fichier SQLite (`backend/safetrack.db`), consultable
avec n'importe quel client SQLite, par exemple :

```bash
sqlite3 backend/safetrack.db
.tables
SELECT * FROM trackers;
```

Le schéma complet (tables `concernes`, `trackers`, `contacts_confiance`,
`alertes`, `notifications`, `positions`) est défini dans `backend/db.js`.

## API REST

| Méthode | Route                    | Description                              |
|---------|---------------------------|-------------------------------------------|
| GET     | `/api/trackers`           | Liste des trackers                        |
| POST    | `/api/trackers`           | Créer un tracker                          |
| PUT     | `/api/trackers/:id`       | Modifier un tracker                       |
| DELETE  | `/api/trackers/:id`       | Supprimer un tracker                      |
| GET     | `/api/contacts`           | Liste des contacts de confiance           |
| POST    | `/api/contacts`           | Ajouter un contact                        |
| PUT     | `/api/contacts/:id`       | Modifier un contact                       |
| DELETE  | `/api/contacts/:id`       | Supprimer un contact                      |
| GET     | `/api/alerts`             | Historique des alertes                    |
| POST    | `/api/alerts`              | Déclencher une alerte (notifie un contact) |
| GET     | `/api/notifications`      | Journal des notifications envoyées        |
| GET     | `/api/positions`          | Historique des positions                  |
| POST    | `/api/positions`          | Enregistrer une nouvelle position         |
| GET     | `/api/stats`              | Statistiques du tableau de bord           |

## Pistes d'évolution

- Authentification réelle (hachage de mot de passe, sessions/JWT, 2FA)
- Passage à PostgreSQL + PostGIS pour les requêtes géospatiales avancées
- Application mobile Flutter consommant la même API
- WebSocket (Socket.io) pour la mise à jour des positions en temps réel

## Auteur

Gaël Blimpo — Étudiant en Génie Logiciel, IPNET Institute of Technology,
Lomé, Togo.
