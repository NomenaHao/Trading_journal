# Trading Journal

Application web pour suivre et analyser vos performances de trading (forex et autres paires). Chaque utilisateur dispose de son propre journal, de ses paramètres de compte et de ses statistiques.

---

## Fonctionnalités

### Authentification & profil
- Inscription et connexion par **nom d'utilisateur**
- Session sécurisée par **JWT** (validité 7 jours)
- Page profil : photo, nom, email, changement de mot de passe
- Avatar personnalisé ou image générée automatiquement (DiceBear)

### Paramètres de compte trading
- Capital de départ et risque par trade (%)
- Paires de devises configurables
- Objectifs journalier et mensuel (USD)
- ID de compte et broker
- Type de compte : **démo** ou **réel** (avec badge visuel)

### Saisie & journal
- Ajout de trades : entrée, TP, SL, nombre de positions, P&L, issue (TP / SL / BE)
- Historique complet avec filtre par paire
- Modification et suppression des trades

### Tableau de bord
- Performances par période : jour, semaine, mois, année
- Graphique d'évolution du P&L
- Statistiques par paire (gagnants, perdants, break-even)
- Badge du type de compte (démo / réel)

### Interface
- Design responsive (sidebar desktop, navigation mobile en bas)
- Thème **sombre** ou **clair** avec sélecteur dans la navbar
- Préférence de thème mémorisée localement

---

## Stack technique

| Couche | Technologies |
|--------|--------------|
| **Frontend** | Vue 3, Vite, Vue Router, Pinia, Tailwind CSS v4, Axios |
| **Backend** | Node.js, Express |
| **Base de données** | SQLite via `better-sqlite3` (mode WAL) |
| **Auth** | `bcryptjs`, `jsonwebtoken` |

---

## Structure du projet

```
TRADING_JOURNAL/
├── backend/
│   ├── src/
│   │   ├── index.js          # Point d'entrée API
│   │   ├── db.js             # Schéma, migrations SQLite
│   │   ├── middleware/       # Authentification JWT
│   │   └── routes/           # auth, profile, settings, trades, stats
│   └── data/
│       ├── journal.db        # Base SQLite (générée au démarrage)
│       └── avatars/          # Photos de profil uploadées
│
└── frontend/
    ├── src/
    │   ├── views/            # Pages (dashboard, journal, etc.)
    │   ├── components/       # Composants réutilisables
    │   ├── stores/           # État global Pinia
    │   ├── layouts/          # Mise en page principale
    │   └── api/              # Client HTTP Axios
    └── vite.config.js        # Proxy /api → backend
```

---

## Prérequis

- **Node.js** 18 ou supérieur
- **npm**

> Sur Windows, `better-sqlite3` nécessite parfois les outils de build natifs (Visual Studio Build Tools). Si l'installation échoue, installez [windows-build-tools](https://github.com/felixrieseberg/windows-build-tools) ou les Build Tools de Visual Studio.

---

## Installation & démarrage

### 1. Backend (port 3001)

```bash
cd backend
npm install
npm run dev
```

L'API est disponible sur `http://localhost:3001`.

### 2. Frontend (port 5173)

Dans un second terminal :

```bash
cd frontend
npm install
npm run dev
```

Ouvrez l'application : **[http://localhost:5173](http://localhost:5173)**

Le frontend proxifie automatiquement les requêtes `/api` vers le backend via Vite.

---

## Variables d'environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `PORT` | `3001` | Port du serveur backend |
| `JWT_SECRET` | *(secret de dev)* | Clé de signature des tokens JWT — **à changer en production** |

Exemple (PowerShell) :

```powershell
$env:JWT_SECRET = "votre-secret-tres-long"
cd backend
npm run dev
```

---

## Pages de l'application

| Route | Description |
|-------|-------------|
| `/login` | Connexion / inscription |
| `/` | Tableau de bord |
| `/journal` | Historique des trades |
| `/ajouter` | Saisie d'un nouveau trade |
| `/parametres` | Paramètres du compte trading |
| `/profil` | Profil utilisateur |

---

## API REST

Toutes les routes protégées nécessitent l'en-tête :

```
Authorization: Bearer <token>
```

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/health` | Santé de l'API |
| `POST` | `/api/auth/register` | Inscription |
| `POST` | `/api/auth/login` | Connexion |
| `GET` | `/api/auth/me` | Utilisateur connecté |
| `GET/PUT` | `/api/profile` | Profil |
| `PUT` | `/api/profile/password` | Mot de passe |
| `POST/DELETE` | `/api/profile/avatar` | Avatar |
| `GET/PUT` | `/api/settings` | Paramètres trading |
| `GET/POST/PUT/DELETE` | `/api/trades` | Gestion des trades |
| `GET` | `/api/stats` | Statistiques agrégées |

---

## Base de données

- Fichier : `backend/data/journal.db`
- Les **migrations** s'exécutent automatiquement au démarrage du backend
- Les prix (entrée, TP, SL) sont stockés en **TEXT** pour conserver la précision
- Données isolées par utilisateur (`user_id` sur `settings` et `trades`)

Tables principales :

- `users` — comptes utilisateurs
- `settings` — paramètres de trading par utilisateur
- `trades` — historique des positions

---

## Build production

### Frontend

```bash
cd frontend
npm run build
```

Les fichiers statiques sont générés dans `frontend/dist/`.

### Backend

```bash
cd backend
npm start
```

En production, servez le build frontend (nginx, etc.) et configurez le proxy vers l'API backend. Définissez impérativement `JWT_SECRET`.

---

## Scripts disponibles

### Backend

| Commande | Action |
|----------|--------|
| `npm run dev` | Démarre l'API avec rechargement automatique |
| `npm start` | Démarre l'API en mode production |

### Frontend

| Commande | Action |
|----------|--------|
| `npm run dev` | Serveur de développement Vite |
| `npm run build` | Build de production |
| `npm run preview` | Prévisualisation du build |

---

## Licence

© ChirurgicalFx — 2026
