# JoBingo

Le bingo des supporters : pendant le match de hand, chacun coche les actions qu'il voit.

Monorepo npm workspaces :

| Dossier           | Rôle                                                              |
| ----------------- | ----------------------------------------------------------------- |
| `apps/api`        | Fastify 5 + TypeScript exécuté par tsx, SQL à la main via `pg`     |
| `apps/web`        | React 18 + Vite + MUI + TanStack Query + React Router, PWA         |
| `packages/shared` | Schémas Zod et types partagés : la seule définition des échanges   |

Tout tourne en Docker (`db`, `api`, `web`). Il n'y a rien à installer sur la machine hôte
en dehors de Docker (et de Node si l'on veut utiliser les raccourcis `npm run …`).

## Démarrage local

```sh
cp .env.example .env      # puis remplir JWT_SECRET et POSTGRES_PASSWORD
npm run up                # = docker compose up -d --build
```

- App : http://localhost:6013. Chacun crée son compte ; tous les comptes sont égaux.
- API : http://localhost:4013/api/health
- Postgres : localhost:5013

| Commande            | Effet                                                              |
| ------------------- | ------------------------------------------------------------------ |
| `npm run up`        | construit et démarre la stack                                      |
| `npm run down`      | arrête la stack (les données restent)                              |
| `npm run logs`      | suit les journaux                                                  |
| `npm run migrate`   | applique les migrations en attente (déjà fait à chaque démarrage)  |
| `npm run psql`      | console SQL                                                        |
| `npm run backup`    | sauvegarde manuelle dans `./backups`                               |
| `npm run typecheck` | vérifie les types des trois workspaces, dans un conteneur          |
| `npm run reset`     | **DÉTRUIT la base** (supprime le volume), après confirmation       |

Pour ajouter une dépendance sans npm sur l'hôte :
`npm run outils -- npm install <paquet> -w apps/api`.
Pour avoir l'autocomplétion dans l'éditeur, un `npm install` local reste possible : il ne
gêne pas Docker.

## Déploiement sur le Raspberry Pi

La première fois :

```sh
git clone <dépôt> jobingo && cd jobingo
cp .env.example .env      # NODE_ENV=production, APP_URL=https://…, vrais secrets
docker compose up -d --build
```

Les mises à jour :

```sh
git pull && docker compose up -d --build
```

- Le proxy existant doit pointer vers le port **6013**, qui sert le front et `/api`. Il doit
  servir l'app en HTTPS : en production, le cookie de session est `Secure`, et une connexion
  en http simple échoue.
- Le Pi 4 est en 32 bits (armv7). Le premier build prend plusieurs minutes.
- **Vite reste en version 7** : Vite 8 dépend de `rolldown`, qui n'a pas de binaire
  armv7/musl, et le build échouerait sur le Pi. **React Router reste en version 7** : la
  version 8 exige React 19.

## Installer l'app sur un téléphone

L'app doit être servie en HTTPS (celle du Pi, derrière le proxy).

**iPhone (Safari uniquement)**
1. Ouvrir l'adresse de JoBingo dans **Safari**.
2. Toucher le bouton **Partager** (le carré avec une flèche vers le haut).
3. Choisir **« Sur l'écran d'accueil »**, puis **Ajouter**.
4. Lancer JoBingo depuis l'icône : l'app s'ouvre en plein écran.

Sur iPhone, les notifications ne fonctionnent **que** dans l'app installée de cette façon,
jamais dans Safari.

**Android (Chrome)**
1. Ouvrir l'adresse dans Chrome.
2. Menu **⋮** → **Installer l'application** (ou **Ajouter à l'écran d'accueil**).

Les mises à jour s'appliquent seules : au lancement suivant, ou au retour dans l'app si
elle était restée ouverte. Il n'y a jamais de cache à vider.

## Mot de passe oublié

Si `SMTP_*` est renseigné dans `.env`, le lien de réinitialisation part par e-mail. Sinon,
il est écrit dans les journaux de l'API (`npm run logs`), et la personne qui gère le Pi le
transmet à la main. Le lien est valable une heure. L'utiliser déconnecte tous les appareils du
compte.

## Notifications push

Elles sont inactives tant que les clés VAPID sont vides. Pour les activer :

```sh
docker compose exec api npx web-push generate-vapid-keys
```

Recopier les deux clés dans `.env`, puis relancer `docker compose up -d`. **Sauvegarder
ces clés avec les autres secrets** : les regénérer invalide tous les abonnements existants.

## Sauvegarde et restauration

- Avant chaque migration, un `pg_dump` est déposé automatiquement dans `./backups`
  (fichiers `*_auto_avant_*.dump`). Seuls les 10 derniers sont conservés.
- `npm run backup` crée une sauvegarde manuelle (`*_manuel.dump`), jamais supprimée
  automatiquement.
- À copier régulièrement hors du Pi : le dossier `./backups` **et le fichier `.env`**
  (secret JWT, clés VAPID, mot de passe Postgres).

Restaurer une sauvegarde (elle remplace le contenu actuel de la base) :

```sh
docker compose exec api sh -c 'pg_restore --clean --if-exists --no-owner -d "$PGDATABASE" /app/backups/FICHIER.dump'
docker compose restart api
```

## Migrations

Les fichiers `apps/api/migrations/NNN_nom.sql` sont appliqués dans l'ordre, une seule fois,
chacun dans sa propre transaction. Ils sont tracés dans la table `_migrations`.
**Un fichier déjà appliqué ne se modifie jamais** : on en ajoute un nouveau. L'API refuse de
démarrer si elle détecte qu'une migration appliquée a été modifiée.
