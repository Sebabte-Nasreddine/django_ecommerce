# SEFA — Documentation Technique Complète

> **SEFA** est une plateforme e-commerce de mode luxe ("Maison de Mode") full-stack, avec gestion de catalogue, panier, commandes, et panel d'administration.

---

## Table des matières

1. [Stack technique](#1-stack-technique)
2. [Architecture globale](#2-architecture-globale)
3. [Structure des fichiers](#3-structure-des-fichiers)
4. [Lancer le projet en local](#4-lancer-le-projet-en-local)
5. [Variables d'environnement](#5-variables-denvironnement)
6. [Backend Django — Modules & API](#6-backend-django--modules--api)
   - [Authentification & Utilisateurs](#61-authentification--utilisateurs)
   - [Catalogue Produits](#62-catalogue-produits)
   - [Panier](#63-panier)
   - [Commandes & Checkout](#64-commandes--checkout)
   - [Panel Admin](#65-panel-admin)
7. [Modèles de données](#7-modèles-de-données)
8. [Frontend Next.js — Pages & Composants](#8-frontend-nextjs--pages--composants)
9. [Authentification JWT](#9-authentification-jwt)
10. [Cache Redis](#10-cache-redis)
11. [Points d'accès](#11-points-daccès)
12. [Considérations de production](#12-considérations-de-production)

---

## 1. Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Backend framework | Django + DRF | 4.2 / 3.15 |
| Auth backend | SimpleJWT | — |
| Docs API | drf-spectacular (OpenAPI) | — |
| Base de données | PostgreSQL | 16 |
| Cache | Redis + django-redis | 7 |
| Serveur WSGI | Gunicorn (4 workers) | — |
| Frontend framework | Next.js + React | 14 / 18 |
| Auth frontend | next-auth (JWT) | — |
| État global | Zustand (cart, auth) | — |
| HTTP client | Axios (intercepteurs JWT) | — |
| Styles | Tailwind CSS | — |
| Formulaires | React Hook Form + Zod | — |
| Animations | Framer Motion | — |
| Icônes | Lucide React | — |
| Conteneurisation | Docker + Docker Compose | — |
| Langage backend | Python | 3.12 |
| Langage frontend | TypeScript / Node.js | 20 |

---

## 2. Architecture globale

```
┌─────────────────────────────────────────────────────┐
│              Next.js Frontend  :3000                 │
│  App Router · Zustand · Axios · Tailwind             │
└──────────────────────┬──────────────────────────────┘
                       │ /api → proxy vers backend
                       ▼
┌─────────────────────────────────────────────────────┐
│              Django Backend  :8080                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │  users   │ │ products │ │   cart   │ │ orders │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
│  ┌──────────────────────────────────────────────┐   │
│  │              admin_panel                     │   │
│  └──────────────────────────────────────────────┘   │
└──────────┬──────────────────────────┬───────────────┘
           │                          │
  ┌────────▼────────┐       ┌─────────▼────────┐
  │ PostgreSQL :5432│       │    Redis  :6379   │
  │ users           │       │ cache produits    │
  │ products        │       │ sessions          │
  │ categories      │       └──────────────────┘
  │ cart / items    │
  │ orders / items  │
  │ addresses       │
  │ promotions      │
  └─────────────────┘
```

Le frontend Next.js rewrite toutes les requêtes `/api/*` vers le backend Django via `next.config.js`, ce qui évite les problèmes CORS en développement.

---

## 3. Structure des fichiers

```
sefa/
├── backend/
│   ├── apps/
│   │   ├── users/          # Auth, profils, adresses
│   │   ├── products/       # Catalogue, catégories, tailles
│   │   ├── cart/           # Panier d'achat
│   │   ├── orders/         # Checkout, commandes, promotions
│   │   └── admin_panel/    # Dashboard, gestion, upload images
│   ├── config/
│   │   ├── settings.py     # Configuration Django centrale
│   │   ├── urls.py         # Routage racine
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── core/
│   │   ├── permissions.py  # IsAdmin, IsAdminOrReadOnly
│   │   ├── exceptions.py   # Gestion erreurs globale
│   │   └── pagination.py   # Pagination standard
│   ├── Dockerfile
│   ├── entrypoint.sh       # Init DB, migrations, superuser, gunicorn
│   └── requirements.txt
├── frontend/
│   └── frontend/
│       ├── app/            # Next.js App Router (pages)
│       ├── components/     # Composants React réutilisables
│       ├── store/          # Zustand: authStore, cartStore
│       ├── lib/
│       │   └── api.ts      # Client Axios configuré
│       ├── Dockerfile
│       ├── package.json
│       └── next.config.js  # Rewrite /api → backend
├── docker-compose.yml
├── .env
└── .gitignore
```

---

## 4. Lancer le projet en local

### Prérequis

- Docker ≥ 24
- Docker Compose ≥ 2

### Démarrage

```bash
# 1. Copier le fichier d'environnement
cp .env.example .env   # Remplir les variables si nécessaire

# 2. Lancer tous les services
docker-compose up -d

# 3. Suivre les logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Ce que fait `entrypoint.sh` automatiquement

1. Attend que PostgreSQL soit prêt
2. Applique les migrations Django
3. Collecte les fichiers statiques
4. Crée le superuser admin si absent
5. Démarre Gunicorn avec 4 workers

### Accès

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API backend | http://localhost:8080/api |
| Swagger UI | http://localhost:8080/api/docs/ |
| ReDoc | http://localhost:8080/api/redoc/ |
| Django Admin | http://localhost:8080/django-admin/ |

### Compte admin par défaut

| Champ | Valeur par défaut |
|-------|-------------------|
| Email | `admin@sefa.com` |
| Mot de passe | `Admin1234!` |

> Configurable via `DJANGO_SUPERUSER_EMAIL` / `DJANGO_SUPERUSER_PASSWORD` dans `.env`.

---

## 5. Variables d'environnement

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Clé secrète Django |
| `DEBUG` | `True` en dev, `False` en prod |
| `ALLOWED_HOSTS` | Domaines autorisés |
| `CORS_ALLOWED_ORIGINS` | Origines CORS autorisées |
| `DB_NAME` | Nom de la base PostgreSQL |
| `DB_USER` | Utilisateur PostgreSQL |
| `DB_PASSWORD` | Mot de passe PostgreSQL |
| `DB_HOST` | Hôte PostgreSQL (ex: `db`) |
| `DB_PORT` | Port PostgreSQL (défaut `5432`) |
| `REDIS_URL` | URL Redis (ex: `redis://redis:6379/1`) |
| `DJANGO_SUPERUSER_EMAIL` | Email admin initial |
| `DJANGO_SUPERUSER_PASSWORD` | Mot de passe admin initial |
| `TELEGRAM_BOT_TOKEN` | Token bot Telegram (optionnel) |
| `TELEGRAM_CHAT_ID` | Chat ID Telegram (optionnel) |

---

## 6. Backend Django — Modules & API

### 6.1 Authentification & Utilisateurs

**App** : `apps/users/`

Modèle `User` personnalisé basé sur l'email (pas le username). Deux rôles : `ROLE_USER` et `ROLE_ADMIN`.

| Méthode | Endpoint | Description | Auth requise |
|---------|----------|-------------|--------------|
| POST | `/api/auth/register` | Inscription | Non |
| POST | `/api/auth/login` | Connexion → retourne access + refresh | Non |
| POST | `/api/auth/admin/login` | Connexion admin | Non |
| GET | `/api/auth/me` | Profil utilisateur courant | Oui |
| PUT/PATCH | `/api/users/` | Mise à jour profil | Oui |
| GET/POST | `/api/users/addresses/` | Lister / créer adresses | Oui |
| PUT/DELETE | `/api/users/addresses/<id>/` | Modifier / supprimer adresse | Oui |

**Réponse login :**
```json
{
  "access": "<JWT access token>",
  "refresh": "<JWT refresh token>",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "Jean",
    "last_name": "Dupont",
    "role": "ROLE_USER"
  }
}
```

---

### 6.2 Catalogue Produits

**App** : `apps/products/`

Entités : `Category`, `Product`, `Size`, `ProductSize` (stock par taille).

| Méthode | Endpoint | Description | Auth requise |
|---------|----------|-------------|--------------|
| GET | `/api/products` | Liste produits (filtres, recherche) | Non |
| POST | `/api/products` | Créer produit | Admin |
| GET | `/api/products/<id>` | Détail produit par ID | Non |
| GET | `/api/products/slug/<slug>` | Détail produit par slug | Non |
| GET | `/api/products/slug/<slug>/related` | Produits similaires | Non |
| PUT/PATCH/DELETE | `/api/products/<id>` | Modifier / supprimer | Admin |
| GET | `/api/categories` | Liste catégories | Non |
| GET | `/api/categories/featured` | Catégories mises en avant | Non |
| GET | `/api/sizes` | Liste des tailles | Non |

**Paramètres de filtrage sur `/api/products` :**
- `?category=<id>` — filtrer par catégorie
- `?search=<terme>` — recherche textuelle
- `?featured=true` — produits mis en avant

**Cache Redis :** Les listes de produits sont mises en cache 5 minutes (préfixe `sefah`).

---

### 6.3 Panier

**App** : `apps/cart/`

Un panier par utilisateur (OneToOne). Les prix sont capturés au moment de l'ajout (`unit_price` snapshot).

| Méthode | Endpoint | Description | Auth requise |
|---------|----------|-------------|--------------|
| GET | `/api/cart` | Récupérer le panier | Oui |
| POST | `/api/cart/items` | Ajouter un article | Oui |
| PUT | `/api/cart/items/<item_id>` | Modifier la quantité | Oui |
| DELETE | `/api/cart` | Vider le panier | Oui |

**Corps POST `/api/cart/items` :**
```json
{
  "product_id": 5,
  "size_id": 2,
  "quantity": 1
}
```

Contrainte unique : `(cart, product, size)` — un article par combinaison produit+taille.

---

### 6.4 Commandes & Checkout

**App** : `apps/orders/`

Supporte à la fois les utilisateurs connectés et le checkout invité. Les items de commande sont des snapshots (nom, image, taille, prix conservés même si le produit change).

| Méthode | Endpoint | Description | Auth requise |
|---------|----------|-------------|--------------|
| POST | `/api/orders/checkout` | Checkout utilisateur connecté | Oui |
| POST | `/api/orders/guest-checkout` | Checkout invité | Non |
| GET | `/api/orders` | Mes commandes | Oui |
| GET | `/api/orders/<id>` | Détail commande | Oui |
| PATCH | `/api/orders/<id>/status` | Changer le statut | Admin |
| DELETE | `/api/orders/<id>/delete` | Supprimer commande | Admin |

**Statuts de commande :** `PENDING` → `CONFIRMED` → `PROCESSING` → `DELIVERED` / `CANCELLED`

**Modes de livraison :** `STANDARD`, `EXPRESS`

**Promotions :**
- Code promo avec remise en %, montant minimum, limite d'utilisation, date d'expiration
- Validation côté backend à chaque checkout

**Notifications Telegram :** Une notification est envoyée automatiquement sur chaque nouvelle commande si `TELEGRAM_BOT_TOKEN` est configuré.

---

### 6.5 Panel Admin

**App** : `apps/admin_panel/`

Endpoints réservés aux utilisateurs avec `role = ROLE_ADMIN`.

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/admin/stats` | Statistiques dashboard |
| GET | `/api/admin/users` | Liste utilisateurs (paginée) |
| DELETE | `/api/admin/users/<id>` | Supprimer utilisateur |
| GET | `/api/admin/orders` | Toutes les commandes |
| GET | `/api/admin/promotions` | Liste promotions |
| POST | `/api/admin/promotions` | Créer promotion |
| PUT | `/api/admin/promotions/<id>` | Modifier promotion |
| DELETE | `/api/admin/promotions/<id>` | Supprimer promotion |
| POST | `/api/admin/upload-image` | Upload image (5 MB max) |
| GET | `/api/admin/download-image/<filename>` | Télécharger image |

**Stats dashboard retournées :**
- Total commandes, revenus, utilisateurs, produits
- Distribution des statuts de commande
- Revenus mensuels

**Upload image :** Formats acceptés : JPEG, PNG, WebP, GIF. Taille max : 5 MB.

---

## 7. Modèles de données

### User
```
id            PK
email         unique, indexé
first_name    string
last_name     string
phone         string (optionnel)
role          ROLE_USER | ROLE_ADMIN
is_active     bool
is_staff      bool
date_joined   datetime
password      hashé
```

### Category
```
id            PK
name          string
slug          unique
description   text
image         URL
order         int (tri)
featured      bool
```

### Product
```
id              PK
name            string
slug            unique
description     text
price           decimal
compare_at_price decimal (optionnel, prix barré)
images          JSON array d'URLs
category        FK → Category
featured        bool
is_active       bool
created_at      datetime
updated_at      datetime
```

### Size
```
id    PK
name  string (S, M, L, XL, ...)
```

### ProductSize  *(stock par variante)*
```
product   FK → Product
size      FK → Size
stock     int
```

### Cart
```
id          PK
user        OneToOne → User
created_at  datetime
updated_at  datetime
```

### CartItem
```
id          PK
cart        FK → Cart
product     FK → Product
size        FK → Size (optionnel)
quantity    int
unit_price  decimal (snapshot au moment de l'ajout)
added_at    datetime
UNIQUE      (cart, product, size)
```

### Address
```
id           PK
user         FK → User
full_name    string
street       string
city         string
postal_code  string
country      string
phone        string
is_default   bool
created_at   datetime
```

### Order
```
id              PK
user            FK → User (null si invité)
address         FK → Address (null si invité)
guest_name      string (invité)
guest_phone     string (invité)
guest_address   string (invité)
guest_city      string (invité)
status          PENDING|CONFIRMED|PROCESSING|DELIVERED|CANCELLED
shipping_method STANDARD|EXPRESS
subtotal        decimal
shipping_cost   decimal
discount_amount decimal
total           decimal
promotion       FK → Promotion (optionnel)
promo_code_used string
notes           text
created_at      datetime
updated_at      datetime
```

### OrderItem
```
id             PK
order          FK → Order
product        FK → Product (nullable)
product_name   string (snapshot)
product_image  string (snapshot)
size_name      string (snapshot)
quantity       int
unit_price     decimal (snapshot)
subtotal       decimal (calculé)
```

### Promotion
```
id              PK
code            unique
discount_percent decimal
min_purchase    decimal
max_uses        int
used_count      int
is_active       bool
expires_at      datetime
```

---

## 8. Frontend Next.js — Pages & Composants

### Pages (App Router)

| Route | Description |
|-------|-------------|
| `/` | Accueil : hero + produits et catégories mis en avant |
| `/products` | Catalogue avec filtres par catégorie et recherche |
| `/products/[slug]` | Fiche produit (images, tailles, stock, prix) |
| `/categorie` | Navigation par catégorie |
| `/cart` | Panier d'achat |
| `/checkout` | Formulaire de commande + code promo |
| `/orders` | Historique des commandes (utilisateur) |
| `/orders/[id]` | Détail d'une commande |
| `/login` | Connexion |
| `/register` | Inscription |
| `/profile` | Profil utilisateur + gestion adresses |
| `/admin` | Dashboard admin (stats, users, orders, promos, images) |

### État global (Zustand)

- **`authStore`** : utilisateur courant, token JWT, actions login/logout
- **`cartStore`** : items du panier, total, actions add/remove/update

### Client API (`lib/api.ts`)

Axios configuré avec :
- Base URL vers le backend
- Intercepteur de requête : injecte le token JWT dans `Authorization: Bearer`
- Intercepteur de réponse : gestion des erreurs 401 (refresh automatique ou logout)

---

## 9. Authentification JWT

| Paramètre | Valeur |
|-----------|--------|
| Type | Bearer Token |
| Durée access token | 60 minutes |
| Durée refresh token | 7 jours |
| Header HTTP | `Authorization: Bearer <token>` |
| Rotation refresh | Activée (blacklist) |

**Flux :**
1. `POST /api/auth/login` → reçoit `access` + `refresh`
2. Chaque requête protégée inclut `Authorization: Bearer <access>`
3. À expiration → utiliser `POST /api/auth/token/refresh` avec le `refresh`
4. Logout → le refresh token est blacklisté

---

## 10. Cache Redis

| Paramètre | Valeur |
|-----------|--------|
| TTL | 5 minutes |
| Préfixe clé | `sefah` |
| Cible | Listes de produits |
| Backend Django | `django-redis` |

Le cache est invalidé automatiquement lors de la modification d'un produit (signal Django ou invalidation manuelle dans les vues admin).

---

## 11. Points d'accès

| Service | URL locale |
|---------|-----------|
| Application web | http://localhost:3000 |
| API REST | http://localhost:8080/api |
| Documentation Swagger | http://localhost:8080/api/docs/ |
| Documentation ReDoc | http://localhost:8080/api/redoc/ |
| Interface Django Admin | http://localhost:8080/django-admin/ |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

---

## 12. Considérations de production

| Point | Action recommandée |
|-------|-------------------|
| `SECRET_KEY` | Générer une clé forte et unique |
| `DEBUG` | Mettre à `False` |
| `ALLOWED_HOSTS` | Renseigner le domaine réel |
| `CORS_ALLOWED_ORIGINS` | Restreindre au domaine frontend |
| Médias / Images | Migrer vers S3 ou stockage cloud (actuellement local) |
| HTTPS | Mettre un reverse proxy (nginx + Let's Encrypt) |
| Gunicorn | Ajuster le nombre de workers selon les CPUs |
| Sauvegardes | Planifier des dumps PostgreSQL réguliers |
| Monitoring | Ajouter Sentry ou équivalent pour les erreurs backend |
| Notifications | Configurer `TELEGRAM_BOT_TOKEN` pour les alertes commandes |
