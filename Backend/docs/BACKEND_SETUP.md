# GUIDE DE PRISE EN MAIN & CONFIGURATION LOCALE (BACKEND) — EL BAHLI STORE

Ce guide est destiné aux développeurs intervenant sur le backend **El Bahli Store**.
Il décrit l'installation, la configuration locale, le cycle de vie des tests, les commandes d'administration et les exemples de requêtes API.

---

## 1. Prérequis Système

* **PHP** : 8.4 ou 8.5 (recommandé avec Laravel Herd sous Windows / macOS ou PHP-FPM sous Linux).
  * Extensions requises : `pdo_mysql`, `mbstring`, `openssl`, `curl`, `gd`, `xml`, `bcmath`.
* **Base de données** : MySQL 8.4 LTS (moteur InnoDB avec support des transactions et verrouillage de ligne).
* **Gestionnaire de dépendances** : Composer 2.x.
* **Node.js / NPM** : **NON REQUIS**. Le backend est 100% PHP / REST API, aucune dépendance npm ni compilation Vite n'est nécessaire.

---

## 2. Procédure d'Installation sur une Nouvelle Base de Données

Pour initialiser l'application sur un nouvel environnement de développement ou de test :

```bash
# 1. Cloner le dépôt
git clone <repository_url> el-bahli-store
cd el-bahli-store

# 2. Installer les dépendances Composer
composer install

# 3. Configurer l'environnement
cp .env.example .env
php artisan key:generate

# 4. Configurer les accès MySQL dans .env (DB_DATABASE, DB_USERNAME, DB_PASSWORD)

# 5. Exécuter l'ensemble des 19 migrations de schéma
php artisan migrate

# 6. Exécuter les Seeders essentiels (Catégories officielles et Paramètres boutique)
php artisan db:seed --class=CategorySeeder
php artisan db:seed --class=SettingSeeder

# 7. Créer de manière sécurisée le compte administrateur initial (saisie masquée)
php artisan admin:create --email=zakariaelbahli@store.com --name="Zakaria El Bahli"

# 8. Créer le lien symbolique pour le stockage public des images
php artisan storage:link
```

---

## 3. Structure de l'Architecture Backend

Le projet est conçu selon les principes de séparation des responsabilités et de clean architecture :

```
app/
├── Console/
│   └── Commands/
│       └── CreateAdminCommand.php # Commande CLI sécurisée pour créer/réinitialiser l'administrateur
├── Enums/
│   └── OrderStatus.php            # Énumération des 9 statuts de commande et transitions autorisées
├── Http/
│   ├── Controllers/
│   │   └── Api/
│   │       ├── ApiController.php  # Contrôleur abstrait définissant les enveloppes JSON (success, error, created)
│   │       └── V1/
│   │           ├── Public/        # Contrôleurs publics (Category, Product, Cart, Order)
│   │           └── Admin/         # Contrôleurs protégés (Auth, Dashboard, Product, Inventory, Order, Setting, AuditLog)
│   ├── Requests/                  # Form Requests (validation stricte des prix, variantes, statuts, retours)
│   └── Resources/                 # JSON API Resources standardisées (Category, Product, Order, OrderItem)
├── Models/                        # Modèles Eloquent (Product, ProductSize, Order, OrderItem, OrderReturn, OrderStatusHistory, StockMovement, Category, Setting, User)
└── Services/                      # Services métier isolés (OrderService, InventoryService, ImageService, SettingService, AuditService, CsvProductImportService)
```

---

## 4. Cycle de Vie du Stock, Commandes et Retours

### 4.1. Stock par Variante Indépendante
Le stock est stocké dans `product_sizes` selon la clé composite unique `(product_id, size, color)`.
Chaque variante possède un niveau de stock distinct. Les modifications de stock sont strictement isolées.

### 4.2. Workflow de Commande
1. **Création (`pending`)** : Vérification de disponibilité par `lockForUpdate()`. Aucun stock n'est décrémenté à cette étape (règle métier stricte : le stock n'est décrémenté qu'à la confirmation administrateur).
2. **Confirmation (`confirmed`)** : Décrémentation atomique de toutes les variantes de la commande. Journalisation dans `stock_movements` (`type = order_confirmation`).
3. **Préparation (`processing`), Expédition (`shipped`), Livraison (`delivered`)** : Transitions de statut avec horodatage, aucun impact supplémentaire sur les stocks.
4. **Annulation (`cancelled`)** :
   * Si la commande était en attente : aucun stock n'est restitué (évite les surstocks).
   * Si la commande avait été confirmée : restitution exacte et atomique du stock avec mouvement `order_cancellation`.
   * Idempotence : une commande annulée ne peut pas restituer deux fois le stock.

### 4.3. Workflow des Retours (`POST /api/v1/admin/orders/{id}/returns`)
Lorsqu'un client retourne des articles après livraison :
* Les articles déclarés **revendables** (`quantity_resellable`) sont réintégrés atomiquement au stock disponible avec un mouvement `return_restock`.
* Les articles déclarés **endommagés** (`quantity_damaged`) sont consignés dans la table `order_returns` pour traçabilité comptable mais **ne sont jamais réintégrés au stock disponible**.
* L'ensemble des changements d'état est historisé dans `order_status_histories`.

### 4.4. Livraison Gratuite & Paiement à la Réception
* **Livraison 0.00 MAD** : Toute commande enregistrée applique strictement `delivery_fee = '0.00'`. Le total est toujours égal au sous-total (`total = subtotal`).
* **Paiement à la réception (`cash_on_delivery`)** :
  * Le statut initial est `payment_status = 'pending'`.
  * Le changement de statut logistique de la commande (`confirmed`, `shipped`, `delivered`) n'altère pas automatiquement le statut du paiement.
  * L'administrateur confirme manuellement la réception physique de l'argent via `PATCH /api/v1/admin/orders/{id}/payment`, qui horodate `paid_at`.

---

## 5. Exemples de Requêtes API (cURL)

### 5.1. Consultation des Catégories Actives (Public)
```bash
curl -X GET http://localhost:8000/api/v1/categories \
  -H "Accept: application/json"
```

### 5.2. Consultation du Catalogue Produits avec Filtres (Public)
```bash
curl -X GET "http://localhost:8000/api/v1/products?category=sweat-shirt&sort=latest" \
  -H "Accept: application/json"
```

### 5.3. Connexion Administrateur (Sanctum)
```bash
curl -X POST http://localhost:8000/api/v1/admin/login \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "zakariaelbahli@store.com",
    "password": "VOTRE_MOT_DE_PASSE"
  }'
```
Réponse (HTTP 200) :
```json
{
  "success": true,
  "message": "Connexion administrateur réussie.",
  "data": {
    "token": "1|sanctum_token_a_conserver...",
    "token_type": "Bearer",
    "user": {
      "id": 2,
      "name": "Zakaria El Bahli",
      "email": "zakariaelbahli@store.com",
      "is_admin": true
    }
  }
}
```

### 5.4. Consultation du Dashboard KPIs (Admin)
```bash
curl -X GET "http://localhost:8000/api/v1/admin/dashboard?period=month" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer 1|sanctum_token_ici..."
```

### 5.5. Traitement d'un Retour de Marchandise (Admin)
```bash
curl -X POST http://localhost:8000/api/v1/admin/orders/1/returns \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 1|sanctum_token_ici..." \
  -d '{
    "reason": "Retour client problème de coupe",
    "returns": [
      {
        "order_item_id": 1,
        "quantity_returned": 2,
        "quantity_resellable": 2,
        "quantity_damaged": 0,
        "reason": "Articles neufs non portés"
      }
    ]
  }'
```

### 5.6. Validation de l'Encaissement du Paiement à la Réception (Admin)
```bash
curl -X PATCH http://localhost:8000/api/v1/admin/orders/1/payment \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 1|sanctum_token_ici..." \
  -d '{
    "payment_status": "paid"
  }'
```

---

## 6. Exécution des Tests Automatisés

Le backend dispose d'une suite complète de **114 tests automatisés** et **753 assertions** :
```bash
php artisan test
```

Exécuter uniquement les tests de livraison gratuite et paiement à la réception :
```bash
php artisan test tests/Feature/LivraisonGratuiteEtPaiementTest.php
```

Exécuter les tests du cycle de vie des commandes et des retours :
```bash
php artisan test tests/Feature/CycleVieCommandesEtRetoursTest.php
```

---

## 7. Formatage du Code (Laravel Pint)

Vérification de la conformité PSR-12 / Laravel :
```bash
php vendor/bin/pint --test
```
Correction automatique du style :
```bash
php vendor/bin/pint
```
