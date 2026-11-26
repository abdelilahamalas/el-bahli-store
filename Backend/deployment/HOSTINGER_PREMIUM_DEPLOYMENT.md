# Guide Complet de Déploiement — Hostinger Premium Web Hosting
## El Bahli Store (Architecture Découplée React 19 + Laravel 13)

Ce guide décrit la procédure officielle, étape par étape, pour déployer la boutique **El Bahli Store** sur un hébergement mutualisé **Hostinger Premium Web Hosting** (serveur Web LiteSpeed, panneau hPanel).

---

## 1. Vue d'Ensemble de l'Architecture de Déploiement

L'application est architecturée en deux composantes indépendantes :

* **Frontend Vitrine & Administration** : Application React 19 SPA (Single Page Application) compilée localement en fichiers statiques (HTML, CSS, JS, images) et servie directement par LiteSpeed sur le domaine principal.
  * URL cible : `https://DOMAINE-MA` (ex: `https://elbahlistore.ma`)
  * Répertoire Hostinger : `/home/u123456789/domains/DOMAINE-MA/public_html/`

* **Backend API REST** : Application Laravel 13 sous PHP 8.4 avec base de données MySQL 8.4.
  * URL cible : `https://api.DOMAINE-MA` (ex: `https://api.elbahlistore.ma`)
  * Répertoire Hostinger : `/home/u123456789/backend/`
  * Racine Web du sous-domaine API : `/home/u123456789/backend/public/`

> [!IMPORTANT]
> **Règle absolue de sécurité** : L'arborescence complète de Laravel (`app/`, `bootstrap/`, `config/`, `storage/`, `vendor/`, ainsi que le fichier `.env`) doit impérativement être placée **EN DEHORS** du dossier `public_html/`. Le sous-domaine `api.` doit pointer **exclusivement** vers le sous-dossier `backend/public/`. De cette manière, aucun fichier source, configuration ou journal d'erreurs ne peut être téléchargé par un visiteur.

---

## 2. Matrice de Compatibilité Hostinger Premium

| Composant | Exigence El Bahli Store | Support Hostinger Premium | Action / Statut |
| :--- | :--- | :--- | :--- |
| **Serveur Web** | LiteSpeed / Apache compatible | LiteSpeed natif | **Compatible** (règles `.htaccess` lues nativement) |
| **Version PHP** | `^8.3` (requise dans composer.json) | PHP 8.1, 8.2, 8.3, 8.4 LTS | **Compatible** (sélectionner **PHP 8.4** dans hPanel) |
| **Extensions PHP** | PDO MySQL, Mbstring, Fileinfo, Intl, OpenSSL, BCMath, GD/Imagick (WebP) | Disponibles via le sélecteur d'extensions hPanel | **Compatible** (cocher GD/Imagick et WebP dans hPanel) |
| **Base de Données** | MySQL 8.x / MariaDB | MySQL 8.0+ / MariaDB 10.x | **Compatible** (création en 1 clic dans hPanel) |
| **Accès SSH & CLI** | Exécution Composer, Artisan, Git | Inclus dans l'offre Premium | **Compatible** (à activer dans hPanel -> Avancé -> SSH) |
| **Liens Symboliques** | `storage:link` pour les photos WebP | Supporté par le système Linux Hostinger | **Compatible** (via commande SSH ou script PHP d'appoint) |
| **Tâches Planifiées** | `schedule:run` (optionnel) | Cron hPanel configurable | **Compatible** (tâche cron à la minute) |
| **Queue Workers** | Files d'attente asynchrones | Non disponible (pas de Supervisor) | **Compatible** (`QUEUE_CONNECTION=sync`, 0 job asynchrone) |

---

## 3. Étape 1 : Préparation dans hPanel Hostinger

### 1.1 Activation de l'accès SSH
1. Connectez-vous à votre compte Hostinger -> **hPanel**.
2. Dans le menu de gauche, rendez-vous dans **Avancé** -> **Accès SSH**.
3. Cliquez sur **Activer** et notez les informations de connexion :
   - Adresse IP du serveur
   - Port SSH (généralement `65002`)
   - Nom d'utilisateur (ex: `u123456789`)
   - Mot de passe SSH (identique au mot de passe de votre compte d'hébergement).

### 1.2 Configuration de la version et des extensions PHP
1. Rendez-vous dans **Avancé** -> **Configuration PHP** (PHP Configuration).
2. Sélectionnez la version **PHP 8.4** (ou PHP 8.3) et cliquez sur **Enregistrer**.
3. Dans l'onglet **Extensions PHP**, vérifiez que les extensions suivantes sont cochées :
   - `pdo_mysql`
   - `mbstring`
   - `fileinfo`
   - `intl`
   - `gd` ou `imagick`
   - `curl`
   - `bcmath`
   - `openssl`
4. Dans l'onglet **Options PHP**, assurez-vous des valeurs recommandées :
   - `memory_limit` : `256M` ou `512M`
   - `upload_max_filesize` : `16M`
   - `post_max_size` : `16M`
   - `max_execution_time` : `60` ou `120`

### 1.3 Création de la Base de Données MySQL
1. Rendez-vous dans **Bases de données** -> **Gestion des bases de données**.
2. Créez une nouvelle base :
   - Nom de la base : `elbahli_store` (Hostinger préfixe automatiquement : ex. `u123456789_elbahli`).
   - Nom d'utilisateur : `elbahli_user` (préfixé : ex. `u123456789_admin`).
   - Mot de passe : *générez un mot de passe robuste et conservez-le précieusement*.
3. Cliquez sur **Créer**.

### 1.4 Création du Sous-Domaine API
1. Rendez-vous dans **Domaines** -> **Sous-domaines**.
2. Créez le sous-domaine :
   - Nom : `api` (URL résultante : `api.DOMAINE-MA`).
   - Cochez impérativement la case **Dossier personnalisé pour le sous-domaine** (Custom folder).
   - Indiquez le chemin : `backend/public`.
3. Cliquez sur **Créer**.
   *(Le sous-domaine pointera ainsi directement sur `/home/u123456789/backend/public` sans exposer le code source).*

### 1.5 Activation des Certificats SSL HTTPS
1. Rendez-vous dans **Sécurité** -> **SSL**.
2. Installez le certificat gratuit Let's Encrypt pour le domaine principal `DOMAINE-MA` et pour le sous-domaine `api.DOMAINE-MA`.
3. Activez l'option **Forcer HTTPS**.

---

## 4. Étape 2 : Déploiement du Backend Laravel

### 2.1 Connexion SSH et transfert des fichiers
Connectez-vous à votre hébergement via votre terminal :
```bash
ssh -p 65002 u123456789@IP_DU_SERVEUR
```

Positionnez-vous dans la racine de votre hébergement :
```bash
cd ~
# Cloner le dépôt ou transférer les fichiers Backend dans le dossier ~/backend
git clone <VOTRE_DEPOT_GIT> backend
# OU si vous déployez via archive zip/SFTP : décompressez dans ~/backend
```

### 2.2 Configuration du fichier `.env` de production
Dans le dossier `~/backend`, créez le fichier `.env` à partir du modèle fourni :
```bash
cd ~/backend
cp deployment/.env.production.example .env
nano .env
```
Renseignez les valeurs réelles :
```env
APP_NAME="El Bahli Store"
APP_ENV=production
APP_KEY= # Laisser vide pour l'instant, on va la générer
APP_DEBUG=false
APP_URL=https://api.DOMAINE-MA
FRONTEND_URL=https://DOMAINE-MA

LOG_CHANNEL=daily
LOG_LEVEL=warning

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=u123456789_nom_de_base
DB_USERNAME=u123456789_utilisateur
DB_PASSWORD=mot_de_passe_de_la_base

SESSION_DRIVER=database
SESSION_SECURE_COOKIE=true

SANCTUM_EXPIRATION=1440
SANCTUM_STATEFUL_DOMAINS=DOMAINE-MA

CORS_ALLOWED_ORIGINS=https://DOMAINE-MA,https://www.DOMAINE-MA

FILESYSTEM_DISK=public
QUEUE_CONNECTION=sync
CACHE_STORE=database
```
Enregistrez avec `Ctrl + O` puis quittez avec `Ctrl + X`.

### 2.3 Installation des Dépendances Composer
```bash
composer install --no-dev --optimize-autoloader --no-interaction
```

### 2.4 Génération de la Clé Applicative et Migrations
```bash
# 1. Générer la clé de chiffrement Laravel
php artisan key:generate

# 2. Exécuter les migrations de base de données
php artisan migrate --force

# 3. Créer le compte administrateur initial (si base vierge)
php artisan db:seed --force
```

### 2.5 Création du Lien Symbolique pour les Photos (Storage)
```bash
php artisan storage:link
```
*Vérification : Le lien symbolique `backend/public/storage` pointe désormais vers `backend/storage/app/public`.*

### 2.6 Permissions des Dossiers
```bash
chmod -R 775 storage bootstrap/cache
```

### 2.7 Optimisation des Caches Laravel
```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
```

---

## 5. Étape 3 : Compilation et Déploiement du Frontend React

Le Frontend doit être compilé **localement sur votre machine** pour une optimisation maximale des ressources.

### 3.1 Définir la variable API de production
Sur votre machine locale, dans le dossier `Frontend/` :
Créez ou modifiez le fichier `.env.production` :
```env
VITE_API_BASE_URL=https://api.DOMAINE-MA/api/v1
```
*(Remplacez `DOMAINE-MA` par votre domaine réel, par exemple `https://api.elbahlistore.ma/api/v1`)*.

### 3.2 Compiler l'application pour la production
```bash
# Dans le terminal local, dossier Frontend/
npm run build
```
Vite génère l'ensemble des fichiers statiques optimisés dans le dossier `Frontend/dist/` (y compris le fichier `.htaccess` automatiquement copié depuis `Frontend/public/.htaccess`).

### 3.3 Transférer le contenu de `dist/` sur Hostinger
Transférez l'intégralité du contenu de `Frontend/dist/` vers le dossier racine du domaine principal sur Hostinger :
`/home/u123456789/domains/DOMAINE-MA/public_html/`

Vous pouvez effectuer ce transfert par :
* **File Manager hPanel** : Compressez le contenu de `dist/` en `.zip`, uploadez-le dans `public_html/` puis cliquez sur "Extraire".
* **SFTP / FileZilla** : Glissez-déposez les fichiers de `Frontend/dist/` dans `public_html/`.
* **SCP / Rsync** (en ligne de commande) :
  ```bash
  scp -P 65002 -r Frontend/dist/* u123456789@IP_SERVEUR:domains/DOMAINE-MA/public_html/
  ```

---

## 6. Étape 4 : Tâches Cron hPanel (Optionnel)

Pour exécuter le planificateur Laravel (nettoyage automatique des tokens expirés, etc.) :
1. Dans hPanel, rendez-vous dans **Avancé** -> **Tâches Cron**.
2. Créez une tâche cron personnalisée :
   - Intervalle : Toutes les heures ou tous les jours (ou à la minute : `* * * * *`).
   - Commande :
     ```bash
     /usr/bin/php /home/u123456789/backend/artisan schedule:run >> /dev/null 2>&1
     ```
3. Cliquez sur **Enregistrer**.

---

## 7. Étape 5 : Validation et Tests Post-Déploiement

Vérifiez immédiatement les points suivants sur votre navigateur :

1. **Vitrine publique** : Rendez-vous sur `https://DOMAINE-MA`. La page d'accueil doit s'afficher rapidement, avec les catégories et les images.
2. **Routage SPA** : Naviguez vers `https://DOMAINE-MA/products` et actualisez la page (`F5`). La page doit se recharger sans erreur 404 (grâce au fichier `.htaccess`).
3. **Modal Tailles** : Ouvrez la fiche d'un produit et cliquez sur « Guide des tailles ». L'en-tête doit rester fixe sans débordement.
4. **Panier et Commande** : Ajoutez un article au panier, allez sur `/checkout`, renseignez un nom et un numéro marocain (`06...`), validez la commande : la confirmation doit s'afficher sans frais de livraison (0.00 MAD).
5. **Connexion Administrateur** : Rendez-vous sur `https://DOMAINE-MA/zakaria/admin/login`. Connectez-vous avec vos identifiants d'administrateur. Le tableau de bord doit charger les statistiques sans blocage CORS.
6. **Sécurité des Fichiers Sensibles** :
   - Tentez d'accéder à `https://api.DOMAINE-MA/.env` -> Doit renvoyer une erreur `403 Forbidden` ou `404 Not Found`.
   - Tentez d'accéder à `https://DOMAINE-MA/.env` -> Doit renvoyer `403 Forbidden`.
