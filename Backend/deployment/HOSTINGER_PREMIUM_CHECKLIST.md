# Checklist de Déploiement & Validation — Hostinger Premium Web Hosting
## El Bahli Store

Cette checklist doit être suivie rigoureusement avant, pendant et après le déploiement sur l'hébergement mutualisé Hostinger Premium.

---

## 1. Phase Pré-Déploiement (Sur la machine locale)

- [ ] **Tests Unitaires et Fonctionnels** : Exécuter `php artisan test` (166 tests passés à 100%).
- [ ] **Typage TypeScript** : Exécuter `npx tsc -b` (0 erreur).
- [ ] **Linter Frontend** : Exécuter `npm run lint` (0 erreur).
- [ ] **Variable API de Production** : Vérifier que `.env.production` contient `VITE_API_BASE_URL=https://api.DOMAINE-MA/api/v1`.
- [ ] **Compilation Vite** : Exécuter `npm run build` et vérifier la présence de `dist/index.html` et `dist/.htaccess`.
- [ ] **Sauvegarde BDD Locale** : Sauvegarde exportée dans `backups/database/`.

---

## 2. Configuration hPanel Hostinger

- [ ] **Version PHP** : Sélectionnée sur **PHP 8.4** (ou 8.3) dans *Avancé -> Configuration PHP*.
- [ ] **Extensions PHP** : `pdo_mysql`, `mbstring`, `fileinfo`, `intl`, `gd`, `openssl`, `bcmath`, `curl` actives.
- [ ] **Options PHP** : `memory_limit` fixé à `256M` ou `512M`.
- [ ] **Accès SSH** : Activé dans *Avancé -> Accès SSH*.
- [ ] **Base MySQL** : Créée avec son utilisateur dédié et mot de passe complexe noté.
- [ ] **Sous-Domaine API** : Créé sous le nom `api`, avec le dossier personnalisé pointant sur `backend/public`.
- [ ] **SSL / HTTPS** : Certificat Let's Encrypt déployé sur `DOMAINE-MA` et `api.DOMAINE-MA` avec forçage HTTPS actif.

---

## 3. Déploiement Backend (Sur le serveur Hostinger)

- [ ] **Emplacement** : Dossier placé dans `/home/u123456789/backend` (hors de `public_html`).
- [ ] **Fichier `.env`** :
  - [ ] `APP_ENV=production`
  - [ ] `APP_DEBUG=false`
  - [ ] `APP_KEY` générée via `php artisan key:generate`
  - [ ] `APP_URL=https://api.DOMAINE-MA`
  - [ ] `FRONTEND_URL=https://DOMAINE-MA`
  - [ ] `CORS_ALLOWED_ORIGINS=https://DOMAINE-MA,https://www.DOMAINE-MA`
  - [ ] `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` renseignés
  - [ ] `FILESYSTEM_DISK=public`
  - [ ] `QUEUE_CONNECTION=sync`
- [ ] **Dépendances** : `composer install --no-dev --optimize-autoloader` exécuté avec succès.
- [ ] **Migrations** : `php artisan migrate --force` exécuté sans erreur.
- [ ] **Stockage Public** : `php artisan storage:link` exécuté (`backend/public/storage` pointe vers `backend/storage/app/public`).
- [ ] **Permissions** : `chmod -R 775 storage bootstrap/cache` appliqué.
- [ ] **Caches Laravel** : `php artisan config:cache`, `route:cache`, `view:cache` appliqués.

---

## 4. Déploiement Frontend (Sur le serveur Hostinger)

- [ ] **Destination** : Contenu de `Frontend/dist/` transféré dans `/home/u123456789/domains/DOMAINE-MA/public_html/`.
- [ ] **Présence du `.htaccess`** : Vérifier que `public_html/.htaccess` est bien présent et contient les règles de redirection SPA.
- [ ] **Droits des fichiers** : Fichiers en 644, répertoires en 755.

---

## 5. Recette et Validation Finale (Tests Navigateur Réels)

- [ ] **HTTPS forcé** : `http://DOMAINE-MA` redirige automatiquement vers `https://DOMAINE-MA`.
- [ ] **Page d'Accueil** : Affichage fluide, aucun warning ou erreur dans la console navigateur (`F12`).
- [ ] **Routage SPA** :
  - [ ] Accès direct à `/products` avec rechargement `F5` -> OK (pas de 404).
  - [ ] Accès direct à `/categories/jeans` avec rechargement `F5` -> OK.
  - [ ] Accès direct à `/zakaria/admin/login` -> OK.
- [ ] **Affichage des Images** : Les photos des produits et miniatures s'affichent correctement depuis `https://api.DOMAINE-MA/storage/...`.
- [ ] **Modal Guide des Tailles** : S'ouvre avec le titre fixé et sans débordement vertical.
- [ ] **Panier & Tunnel d'Achat** :
  - [ ] Ajout d'une taille au panier -> Badge mis à jour.
  - [ ] Page `/checkout` -> Livraison gratuite 0.00 MAD indiquée.
  - [ ] Commande passée avec numéro marocain -> Confirmation affichée avec numéro de référence.
- [ ] **Panel Admin** :
  - [ ] Connexion sur `/zakaria/admin/login` -> Authentification réussie.
  - [ ] Tableau de bord -> Statistiques chargées via l'API sans erreur CORS.
  - [ ] Commandes -> La commande de test apparaît avec le statut `En attente`.
  - [ ] Produits -> Possibilité de modifier un produit, les changements sont immédiatement visibles.
- [ ] **Sécurité des Fichiers** :
  - [ ] Tentative d'accès à `https://api.DOMAINE-MA/.env` -> `403` ou `404`.
  - [ ] Tentative d'accès à `https://DOMAINE-MA/.env` -> `403`.
  - [ ] Tentative d'accès à `https://api.DOMAINE-MA/app/` -> `403` ou `404`.
