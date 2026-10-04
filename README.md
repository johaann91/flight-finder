# Vol Finder

Site de recherche de billets d'avion, toutes compagnies confondues : aller
simple ou aller-retour, nombre de passagers, filtres et tri, calendrier des
prix sur 12 mois, favoris avec alertes de prix. Aucun compte requis.

Design hybride : typographie et cartes épurées façon **apple.fr**, bandeau
navy/rouge avec widget de recherche flottant façon **airfrance.fr**.

> **Données simulées.** Les vols et les prix sont générés par le serveur de
> façon déterministe (même recherche = mêmes résultats) à partir de la
> distance réelle entre aéroports. Aucun billet réel n'est vendu. Le
> générateur (`server/flights.js`) est isolé : on peut le remplacer par un
> appel à une vraie API (Amadeus, Kiwi…) sans toucher au reste.

## Stack

- **Client** : React 19 + Vite, CSS pur, lint oxlint.
- **Serveur** : Node.js + Express 5, favoris persistés dans `server/data/favorites.json`.
- **Tests** : `node:test` sur la logique métier (génération, validation, filtres, calendrier, alertes).

## Démarrage

Deux terminaux, les deux doivent tourner en parallèle.

```bash
# Terminal 1 — API
cd server
npm install
npm start          # http://localhost:5070
npm test           # tests unitaires

# Terminal 2 — site
cd client
npm install
cp .env.example .env
npm run dev        # http://localhost:5173  <- à ouvrir dans le navigateur
```

> Le serveur utilise le port 5070 car sur macOS le port 5000 est souvent
> occupé par le récepteur AirPlay (erreur 403).

## Fonctionnalités

- Recherche avec autocomplétion des aéroports (36 aéroports, 16 compagnies dont low-cost).
- Aller simple / aller-retour, 1 à 9 passagers, choix du vol aller puis du vol retour, total calculé.
- Filtres : escales, prix max, heure de départ, compagnies. Tri : prix, durée, départ, meilleur compromis.
- Calendrier des prix : plus bas tarif de chaque jour, jours les moins chers en vert, clic = relance la recherche.
- Favoris : « Suivre ce trajet » avec un prix cible optionnel ; la page Favoris recalcule le meilleur prix actuel et signale les alertes atteintes.

## API

| Méthode | Route | Description |
| --- | --- | --- |
| GET | `/api/health` | État du serveur |
| GET | `/api/airports?q=` | Recherche d'aéroports |
| GET | `/api/flights/search?from&to&date&returnDate&passengers&sort&maxStops&maxPrice&airlines&departAfter&departBefore` | Vols aller (+ retour) |
| GET | `/api/flights/calendar?from&to&month=AAAA-MM` | Prix le plus bas par jour |
| GET | `/api/favorites` | Favoris avec prix actuel et état d'alerte |
| POST | `/api/favorites` | Ajoute un favori `{ from, to, date, returnDate?, passengers, targetPrice? }` |
| DELETE | `/api/favorites/:id` | Supprime un favori |
# flight-finder
