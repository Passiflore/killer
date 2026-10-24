# Killer

Web app mobile pour jouer au **Killer** en soirée, en temps réel, sur les téléphones des invités.
Une partie à la fois, pas de comptes, jusqu'à ~50 joueurs.

## Le jeu

Chaque joueur reçoit une **cible** et une **mission** secrètes (« Fais-lui prononcer le mot
« cornichon » dans une conversation sérieuse »). Quand il réussit la mission sur sa cible, il
déclare le kill : il hérite alors de la cible et de la mission de sa victime. Le dernier
survivant gagne. Si la partie a une heure de fin, les survivants sont départagés au nombre
de kills.

```
LOBBY ──(l'orga lance)──▶ EN_COURS ──(dernier survivant, heure de fin, ou l'orga)──▶ TERMINEE
```

Un kill déclaré passe par une validation :

```
EN_ATTENTE ──(la victime confirme, ou 10 min sans réponse)──▶ VALIDE
     │
     └──(la victime conteste)──▶ CONTESTE ──(l'orga tranche)──▶ VALIDE | REJETE
```

La validation automatique tourne **côté serveur** : elle a lieu même si le téléphone de la
victime est éteint.

## Fonctionnalités

**Joueur**

- Rejoindre avec le code de la partie (4 caractères), un nom et un selfie
- Lobby en direct, puis écran secret : cible et mission masquées, affichées d'un tap
- Déclarer un kill, confirmer ou contester celui dont on est victime
- Changer de mission une fois par partie
- Quitter la partie (le chasseur hérite de la cible, le cycle est réparé)
- Écran de fin : classement, tueurs en série, toutes les missions réalisées
- Installable sur l'écran d'accueil ; le téléphone vibre quand un kill est déclaré contre
  soi (Android)

**Organisateur** (`/orga`)

- Créer la partie : nom, heure de fin facultative, missions personnalisées, participer ou non
- Lancer la partie, trancher les contestations, retirer un joueur, modifier l'heure de fin
- Terminer la partie, puis tout effacer pour en relancer une
- L'orga peut aussi jouer ; dans ce cas le fil d'événements est masqué (il révélerait son
  chasseur)

**Règles garanties par le serveur**

- Le tirage forme un cycle unique : chaque joueur est la cible d'exactement un autre
- Après un kill ou un abandon, le cycle reste unique et sans trou
- Un joueur ne reçoit jamais que **ses** informations, jamais la cible ou la mission d'un autre
- Pas de kill déclaré si le joueur ou sa cible est déjà impliqué dans un kill en cours

## Stack

| Partie | Techno |
|---|---|
| Front | React 19, Vite, TypeScript, CSS Modules |
| Back | Node 25, Express 5, Socket.IO |
| Base | SQLite via `node:sqlite` (intégré à Node) |
| Types partagés | `packages/shared` |
| Monorepo | pnpm workspaces |

Le back tourne en TypeScript directement avec Node (sans étape de compilation).

```
apps/
  api/            serveur Express + Socket.IO
    src/index.ts    routes HTTP, sockets, timer de validation automatique
    src/kills.ts    logique des kills, abandons, changement de mission (testée)
    src/draw.ts     tirage du cycle et des missions (testé)
    src/schema.ts   schéma SQLite
    src/missions.ts missions par défaut
  web/            front React
    src/pages/      un dossier par écran
    src/components/ composants réutilisables
packages/
  shared/         types communs front/back (Game, Player, Kill…)
```

## Lancer en local

Prérequis : Node 25 et pnpm 9.

```bash
pnpm install

# terminal 1 : le serveur (http://localhost:3000)
pnpm --filter api dev

# terminal 2 : le front (http://localhost:5173)
pnpm dev
```

Ouvrir `http://localhost:5173/orga` pour créer une partie, puis `http://localhost:5173` sur
d'autres onglets (en navigation privée) pour rejoindre en tant que joueurs. En dev, Vite
redirige `/api` et `/socket.io` vers le serveur.

## Tests et vérifications

Avant de pousser sur `main` (chaque push redéploie), tout vérifier d'un coup :

```bash
pnpm check
```

Ou une vérification à la fois :

```bash
pnpm --filter api test        # tests du tirage et des kills
pnpm --filter api typecheck
pnpm --filter web lint
pnpm --filter web build
```

## Déploiement

L'app est déployée en **un seul service** : le serveur Express sert aussi le front buildé,
donc front et API sont sur le même domaine.

- `Dockerfile` : installe les dépendances, builde le front, lance `apps/api/src/index.ts`
- `railway.json` : impose le build par Dockerfile et le health check sur `/healthz`
- Hébergé sur [Railway](https://railway.com) ; chaque push sur `main` redéploie

| Variable | Rôle |
|---|---|
| `PORT` | Port d'écoute (fourni par l'hébergeur, 3000 par défaut) |
| `DB_PATH` | Chemin du fichier SQLite (`killer.db` par défaut) |

Sur Railway, un **volume** est monté sur `/data` et `DB_PATH` pointe dedans (par exemple
`/data/soiree.db`). Sans volume,
chaque redéploiement efface la partie.

Le code orga de la partie en cours est écrit dans les logs du serveur, à la création et à
chaque démarrage, pour pouvoir le retrouver s'il est perdu.

## Limites connues

- **Une seule instance** : les sockets et le timer de validation vivent en mémoire, il ne
  faut pas lancer plusieurs copies du serveur.
- **Un redéploiement coupe le jeu** ~30 s (la partie est conservée, les téléphones se
  reconnectent). À éviter pendant une partie.
- **iPhone** : l'app installée sur l'écran d'accueil ne partage pas le stockage de Safari.
  Installer avant de rejoindre, ou rester dans Safari.
- **Vibration** : Android uniquement, et seulement si l'app est ouverte.
- Pas de mode hors-ligne.
