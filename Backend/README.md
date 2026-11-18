# El Bahli Store — Backend REST API

Backend e-commerce autonome haute performance développé avec Laravel 13, PHP 8.4+, MySQL 8.4 et Laravel Sanctum.
Ce backend expose une API REST JSON versionnée (`/api/v1`) destinée à alimenter une application frontend moderne indépendante (React, Vite, TypeScript).

---

## 🚀 Fonctionnalités Métier

- **Catalogue & Variantes** :
  - 12 catégories officielles marocaines pré-configurées.
  - Produits avec variantes complètes (taille et couleur) et gestion indépendante du stock par variante `(product_id, size, color)`.
  - Galerie d'images WebP optimisée avec conversions automatiques (900px fiche produit, 300px miniature) et protection contre les suppressions orphelines.
  - Importation par lot via fichier CSV transactionnel avec prévisualisation.
- **Règles Commerciales Essentielles** :
  - **Livraison TOUJOURS gratuite (0.00 MAD)** : aucune majoration sur le panier ou la commande (`total = subtotal`).
  - **Paiement à la réception (`cash_on_delivery`)** : gestion autonome du statut d'encaissement physique (`pending`, `paid`, `refunded`), complètement découplé du statut logistique.
- **Cycle de Vie du Stock & Idempotence** :
  - Création de commande avec vérification de disponibilité via verrou transactionnel (`lockForUpdate`).
  - **Décrémentation atomique uniquement à la confirmation administrateur** (zéro décrémentation en attente).
  - Restitution atomique unique lors d'une annulation de commande confirmée.
  - Gestion experte des retours : réintégration en stock des articles revendables, exclusion stricte des articles endommagés.
- **Sécurité & Résilience** :
  - Authentification API sécurisée via jetons d'accès Laravel Sanctum.
  - Protection contre les injections SQL, attaques XSS, altération des prix côté client et dépassements d'IDOR.
  - Rate limiting strict sur l'estimation de panier (60 req/min), la création de commandes (5 req/min) et la connexion administrateur (5 essais max).
  - Traçabilité et journal d'audit complet (`audit_logs` & `stock_movements`).
- **Dashboard & KPIs Administrateur** :
  - Chiffre d'affaires calculé sur les commandes éligibles (exclusion formelle des commandes annulées et retournées).
  - Suivi en temps réel des montants à collecter sur le terrain (`amount_to_collect`) et des montants effectivement encaissés (`collected_revenue`).
  - Alertes de stock faible, graphiques d'évolution et top ventes.

---

## 🛠️ Stack Technique

- **Framework** : Laravel 13 (sans Inertia, sans Node.js, sans frontend monolithique)
- **Langage** : PHP 8.4+ / PHP 8.5
- **Base de données** : MySQL 8.4 LTS (moteur InnoDB avec transactions et verrous de ligne)
- **Authentification** : Laravel Sanctum v4
- **Optimisation d'images** : Intervention Image v3 (pilote GD/Imagick)
- **Qualité de code** : Laravel Pint (PSR-12) & Suite de tests PHPUnit/Pest (114 tests, 753 assertions)

---

## 📦 Installation Locale

### 1. Prérequis
- PHP 8.4 ou 8.5 avec extensions `pdo_mysql`, `mbstring`, `openssl`, `curl`, `gd`, `bcmath`.
- MySQL 8.4 opérationnel sur `127.0.0.1:3306`.
- Composer 2.x.

### 2. Cloner et Installer les Dépendances
```bash
git clone <repository_url> el-bahli-store
cd el-bahli-store
composer install
```

### 3. Configurer l'Environnement
```bash
cp .env.example .env
php artisan key:generate
```
Renseignez vos accès MySQL dans `.env` (`DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`).

### 4. Migrations et Données Initiales
```bash
# Appliquer les migrations de schéma
php artisan migrate

# Amorcer les 12 catégories officielles et les paramètres de base
php artisan db:seed --class=CategorySeeder
php artisan db:seed --class=SettingSeeder

# Créer l'administrateur initial de manière interactive sécurisée
php artisan admin:create --email=admin@example.com --name="Administrateur"

# Lier le répertoire public pour les médias
php artisan storage:link
```

### 5. Démarrer le Serveur Local
```bash
php artisan serve
```
L'API REST est accessible sur `http://localhost:8000/api/v1`.

---

## 🧪 Tests Automatisés

La suite de tests couvre 100% des cas d'usage critiques, de la sécurité aux règles de commande :

```bash
# Exécuter l'ensemble de la suite de tests
php artisan test

# Exécuter les tests spécifiques aux règles de livraison et paiement
php artisan test tests/Feature/LivraisonGratuiteEtPaiementTest.php

# Exécuter les tests de sécurité et protection contre la fraude
php artisan test tests/Feature/SecuriteBackendTest.php
```

---

## 📚 Documentation Technique

- [Contrat d'API REST (docs/API_CONTRACT.md)](docs/API_CONTRACT.md) : documentation complète de tous les endpoints publics et administrateurs, structures des requêtes et réponses JSON standardisées.
- [Guide de Configuration Backend (docs/BACKEND_SETUP.md)](docs/BACKEND_SETUP.md) : guide pas à pas pour l'installation, les commandes d'administration et les exemples cURL.
