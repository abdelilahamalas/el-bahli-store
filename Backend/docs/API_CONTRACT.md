# CONTRAT OFFICIEL D'API REST (V1) — EL BAHLI STORE

Ce document constitue le contrat technique officiel entre le frontend React (SPA autonome) et le backend Laravel 13 (API REST JSON) d'**El Bahli Store**.

---

## 1. Architecture Générale & Hébergement

* **Modèle architectural** : Découplage complet Frontend / Backend.
* **Backend** : Laravel 13, PHP 8.4+, MySQL 8.4, Laravel Sanctum v4.
* **Frontend** : React, Vite, TypeScript, Tailwind CSS, shadcn/ui, React Router, Axios.
* **Connexion Frontend / Backend** : Configurable via variables d'environnement (`APP_URL`, `FRONTEND_URL`, `SANCTUM_STATEFUL_DOMAINS`).
* **Environnement Local** :
  * Frontend SPA : `http://localhost:5173` ou `http://localhost:3000`
  * Backend API REST : `http://localhost:8000` ou `http://el-bahli-store.test`
* **Préfixe des routes API** : `/api/v1`
* **Règles Commerciales Essentielles** :
  * **Livraison TOUJOURS gratuite** : `delivery_fee` fixé à `"0.00"` MAD pour toutes les commandes sans condition.
  * **Paiement à la réception** : `payment_method` fixé à `"cash_on_delivery"`. Le statut du paiement (`payment_status`) est géré indépendamment du cycle de commande (`pending`, `paid`, `refunded`).

---

## 2. Structure Standardisée des Réponses JSON

Toutes les réponses de l'API suivent une enveloppe JSON stricte et prévisible.

### 2.1. Réponse de Succès (HTTP 200, 201)

```json
{
  "success": true,
  "message": "Description lisible de l'opération réussie.",
  "data": {}
}
```

### 2.2. Réponse d'Erreur (HTTP 400, 401, 403, 404, 409, 422, 429, 500)

```json
{
  "success": false,
  "message": "Description claire de l'erreur survenue en français.",
  "errors": {
    "champ": [
      "Message d'erreur de validation pour ce champ."
    ]
  }
}
```

### 2.3. Codes d'État HTTP Utilisés

| Code HTTP | Signification | Contexte d'utilisation |
|---|---|---|
| **200 OK** | Succès | Requêtes en lecture (`GET`), mises à jour (`PUT`, `PATCH`), suppressions avec message. |
| **201 Created** | Ressource créée | Création de commande (`POST /orders`), de produit, import CSV. |
| **204 No Content** | Succès sans contenu | Suppressions directes ou opérations silencieuses. |
| **400 Bad Request** | Requête malformée | Paramètres incohérents ou action impossible. |
| **401 Unauthorized** | Non authentifié | Jeton Sanctum manquant, invalide ou expiré. |
| **403 Forbidden** | Accès refusé | Utilisateur non administrateur tentant d'accéder à `/api/v1/admin/*`. |
| **404 Not Found** | Introuvable | Produit, catégorie ou commande inexistante ou inactive. |
| **409 Conflict** | Conflit / Idempotence | Commande déjà soumise avec le même `idempotency_token`. |
| **422 Unprocessable** | Erreur de validation | Formulaire invalide, prix promo >= prix normal, stock négatif, etc. |
| **429 Too Many Req.** | Limite de débit atteinte | Trop de tentatives de connexion (5/min) ou commandes abusives. |
| **500 Server Error** | Erreur serveur | Exception non interceptée (journalisée côté serveur). |

---

## 3. Authentification & Sécurité

### 3.1. Mode d'Authentification Principal (Sanctum Bearer Token)
* Entête HTTP obligatoire sur tous les appels admin : `Authorization: Bearer <TOKEN>`
* Entête HTTP obligatoire sur toutes les requêtes : `Accept: application/json`

---

## 4. Endpoints Publics (`/api/v1`)

### 4.1. Catégories Actives
* **Route** : `GET /api/v1/categories`
* **Réponse (200)** : Liste des 12 catégories officielles ordonnées (`sort_order`).

### 4.2. Produits par Catégorie
* **Route** : `GET /api/v1/categories/{slug}/products`
* **Paramètres de requête** : `page` (int), `per_page` (int, default 12).

### 4.3. Catalogue Produits Public
* **Route** : `GET /api/v1/products`
* **Filtres optionnels** : `category` (slug), `search` (texte), `sort` (`price_asc`, `price_desc`, `latest`).

### 4.4. Fiche Produit Détaillée
* **Route** : `GET /api/v1/products/{slug}`
* **Données incluses** : Galerie d'images ordonnée (WebP), liste des variantes de taille et couleur avec stock indépendant, indicateur de disponibilité (`is_in_stock: true/false`), statut actif (`is_active: true/false`), prix promotionnel si applicable.

### 4.5. Estimation du Panier (Quotation)
* **Route** : `POST /api/v1/cart/estimate`
* **Limitation** : 60 requêtes/minute/IP (`throttle:cart-estimate`).
* **Corps de requête** :
```json
{
  "items": [
    {
      "product_id": 1,
      "size": "M",
      "color": "Noir",
      "quantity": 2
    }
  ]
}
```
* **Réponse (200 OK)** :
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "product_id": 1,
        "product_name": "Jean Slim Confort",
        "size": "M",
        "color": "Noir",
        "quantity": 2,
        "unit_price": "250.00",
        "line_total": "500.00",
        "available_stock": 10,
        "is_available": true,
        "error_message": null
      }
    ],
    "subtotal": "500.00",
    "delivery_fee": "0.00",
    "total": "500.00",
    "payment_method": "cash_on_delivery",
    "payment_method_label": "Paiement à la réception",
    "is_delivery_free": true,
    "is_valid": true
  }
}
```
* **Note** : Si une variante demandée est en rupture (`stock: 0`) ou insuffisante (`stock < quantity`), `is_valid` passe à `false`, `is_available` passe à `false` et un message explicite en français est fourni dans `error_message` pour informer immédiatement l'acheteur sans effacer le reste du panier.

### 4.6. Soumission de Commande
* **Route** : `POST /api/v1/orders`
* **Limitation** : 5 requêtes/minute/IP (`throttle:order-submission`).
* **Corps de requête** :
```json
{
  "customer_name": "Mehdi Alami",
  "customer_phone": "0661234567",
  "city": "Casablanca",
  "address": "25 Rue de France, Maarif",
  "note": "Livraison après 17h SVP",
  "idempotency_token": "client-uuid-v4-unique",
  "website": null,
  "items": [
    {
      "product_id": 1,
      "size": "M",
      "color": "Noir",
      "quantity": 2
    }
  ]
}
```
* **Règles Commerciales & Sécurité** :
  * Les prix et totaux envoyés par le client sont strictement ignorés et recalculés côté serveur.
  * `delivery_fee` est toujours fixé à `"0.00"` MAD (`is_delivery_free: true`).
  * `payment_method` est fixé à `"cash_on_delivery"`.
  * `payment_status` est initialisé à `"pending"` (`paid_at: null`).
  * À la soumission (`pending`), le stock n'est **PAS décrémenté**. La décrémentation intervient uniquement lors de la confirmation par l'administrateur.
* **Réponse (201 Created)** : Contient `reference`, `confirmation_token`, `confirmation_url` (URL temporaire signée cryptographiquement), et l'objet `order`.

### 4.7. Confirmation de Commande Sécurisée
* **Route** : `GET /api/v1/orders/confirmation/{token}`
* **Protection** : Middleware `signed` obligatoire (accès refusé 403 sans signature valide).

---

## 5. Endpoints d'Administration (`/api/v1/admin`)

Toutes les routes ci-dessous exigent l'entête `Authorization: Bearer <TOKEN>` (utilisateur `is_admin = true`).

### 5.1. Authentification Admin
* `POST /api/v1/admin/login` : Authentification (`email`, `password`) avec rate limiting (5 essais max/5 min).
* `POST /api/v1/admin/logout` : Révocation du token Sanctum actif.
* `GET /api/v1/admin/me` : Données de l'administrateur connecté.

### 5.2. Dashboard & Statistiques Avancées
* **Route** : `GET /api/v1/admin/dashboard`
* **Paramètres de période** :
  * `period=today` : Statistiques de la journée.
  * `period=week` : Statistiques de la semaine en cours.
  * `period=month` : Statistiques du mois en cours.
  * `period=year` : Statistiques de l'année.
  * `period=custom&from=YYYY-MM-DD&to=YYYY-MM-DD` : Période personnalisée.
  * `period=all` : Toutes les données historiques (défaut).
* **Données retournées** :
  * `kpis` :
    * `total_orders`, `pending_orders`, `confirmed_orders`, `processing_orders`, `shipped_orders`, `delivered_orders`, `cancelled_orders`, `return_requested_orders`, `return_received_orders`, `returned_orders`.
    * `revenue` : Chiffre d'affaires global éligible.
    * `amount_to_collect` : Montant total en attente d'encaissement physique (commandes avec `payment_status = pending`).
    * `collected_revenue` : Montant total effectivement encaissé à la réception (commandes avec `payment_status = paid`).
    * `payment_method` : `"cash_on_delivery"`.
    * `is_delivery_free` : `true`.
    * `total_products`, `active_products`, `active_categories`.
    * `total_variants`, `available_variants`, `total_stock`, `out_of_stock_variants`, `low_stock_variants`, `low_stock_threshold`.
  * `charts` :
    * `activity_evolution` : Évolution journalière des commandes et du chiffre d'affaires.
    * `status_distribution` : Répartition par statut.
    * `top_products` : Top 5 des produits les plus vendus (quantité et CA).
    * `top_categories` : Top 5 des catégories les plus performantes.
  * `stock_by_size` : Répartition agrégée du stock disponible par taille (ex : S, M, L, XL, XXL).
  * `stock_by_color` : Répartition agrégée du stock par couleur.
  * `recent_movements` : 10 derniers mouvements de stock tracés avec motif et administrateur.
  * `stock_alerts` : Liste des 10 variantes prioritaires en rupture ou stock faible.
  * `recent_orders` : 5 dernières commandes passées.

### 5.3. Gestion des Commandes, Paiements & Workflow des Retours
* `GET /api/v1/admin/orders` : Liste paginée avec recherche (`search`), filtres de statut (`status`), plage de dates (`date_from`, `date_to`), montants (`min_total`, `max_total`) et tri (`sort_by`, `sort_order`).
* `GET /api/v1/admin/orders/{id}` : Détail complet de la commande avec items, snapshot des prix historiques, coordonnées, informations de paiement (`payment_method`, `payment_status`, `paid_at`), historique des statuts (`status_history`), retours éventuels (`returns`) et notes internes.
* `PATCH /api/v1/admin/orders/{id}/transition` (alias : `PATCH /api/v1/admin/orders/{id}/status`) : Transition de statut de commande sécurisée et idempotente.
  * Corps de requête : `{ "status": "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "return_requested" | "return_received" | "returned" }`
  * Statuts autorisés : `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`, `return_requested`, `return_received`, `returned`.
  * Décrémentation atomique du stock à la `confirmation`.
  * Restitution atomique unique du stock à l'`annulation` (si préalablement confirmée).
* `PATCH /api/v1/admin/orders/{id}/payment` : Gestion indépendante du statut de paiement à la réception :
  * Corps de requête : `{ "payment_status": "pending" | "paid" | "refunded" }`
  * Horodatage automatique `paid_at` lors du passage à `paid`.
  * Journalisation dans l'audit de sécurité.
* `POST /api/v1/admin/orders/{id}/returns` : Traitement des retours de marchandise avec inspection qualité :
  * `returns.*.order_item_id` : Ligne de commande concernée.
  * `returns.*.quantity_returned` : Quantité totale retournée.
  * `returns.*.quantity_resellable` : Articles en parfait état (réintégrés atomiquement au stock avec mouvement `return_restock`).
  * `returns.*.quantity_damaged` : Articles endommagés (enregistrés pour traçabilité mais **JAMAIS réintégrés au stock disponible**).
* `PATCH /api/v1/admin/orders/{id}/notes` : Enregistrement de notes administratives internes (`admin_notes`).

### 5.4. Inventaire & Traçabilité des Mouvements
* `GET /api/v1/admin/inventory` : Tableau de bord des stocks par produit et variante, avec filtres par catégorie, statut de stock (`in_stock`, `low_stock`, `out_of_stock`) et recherche.
* `GET /api/v1/admin/inventory/movements` : Journal d'audit paginé de tous les mouvements de stock (`initial_stock`, `manual_adjustment`, `order_confirmation`, `order_cancellation`, `return_restock`) avec administrateur responsable, quantité avant, variation, quantité après et motif.
* `PATCH /api/v1/admin/inventory/variants/{id}` (alias : `POST /api/v1/admin/inventory/variants/{id}/adjust`) : Ajustement manuel de stock avec motif obligatoire et prévention des valeurs négatives.
  * Corps de requête : `{ "new_stock": 25, "reason": "Réassort fournisseur" }`
  * Validation : `new_stock` (entier >= 0 obligatoire), `reason` (texte min 3 max 255 caractères obligatoire).
  * Réponse : Contient le stock actualisé et l'objet mouvement (`quantity_before`, `quantity_delta`, `quantity_after`, `reason`).
* `PATCH /api/v1/admin/inventory/variants/{id}/toggle` : Activation / désactivation immédiate d'une variante individuelle taille/couleur.

### 5.5. Gestion des Produits & Galerie d'Images
* `GET /api/v1/admin/products` : Liste des produits avec filtres.
* `POST /api/v1/admin/products` : Création de produit avec variantes (taille + couleur) et stocks initiaux journalisés.
* `GET /api/v1/admin/products/{id}` : Consultation détaillée.
* `PUT /api/v1/admin/products/{id}` : Mise à jour des informations, prix et variantes.
* `POST /api/v1/admin/products/{id}/variants` : Ajout direct d'une variante (taille, couleur, stock) à un produit existant.
* `PATCH /api/v1/admin/products/{id}/toggle` : Activation / désactivation du produit.
* `DELETE /api/v1/admin/products/{id}` : Suppression physique ou désactivation automatique si un historique de commande existe.
* `POST /api/v1/admin/products/{id}/images` : Ajout d'image avec conversion WebP automatique (900px fiche produit, 300px miniature) et compression 85%.
* `POST /api/v1/admin/products/{id}/images/{imageId}/main` : Définition de l'image principale.
* `POST /api/v1/admin/products/{id}/images/reorder` : Réordonnancement de la galerie.
* `DELETE /api/v1/admin/products/{id}/images/{imageId}` : Suppression d'image avec protection IDOR et désignation déterministe de la nouvelle image principale.

### 5.6. Import CSV Produits
* `GET /api/v1/admin/products/import/template` : Téléchargement du modèle CSV.
* `POST /api/v1/admin/products/import/preview` : Validation et prévisualisation sans persistance.
* `POST /api/v1/admin/products/import/confirm` : Ingestion transactionnelle avec création des catégories manquantes et journalisation des stocks initiaux.
* `POST /api/v1/admin/products/import/cancel` : Annulation du fichier temporaire.

### 5.7. Catégories
* `GET /api/v1/admin/categories` : Liste complète.
* `POST /api/v1/admin/categories` : Création.
* `PUT /api/v1/admin/categories/{id}` : Modification.
* `PATCH /api/v1/admin/categories/{id}/toggle` : Activation / désactivation.
* `POST /api/v1/admin/categories/reorder` : Réordonnancement.
* `DELETE /api/v1/admin/categories/{id}` : Suppression.

### 5.8. Paramètres de la Boutique
* `GET /api/v1/admin/settings` : Récupération des paramètres (nom de la boutique, téléphone, WhatsApp, email, devise `MAD`, langue `fr`, seuil de stock faible, ville, adresse, `delivery_fee: "0.00"`, `is_delivery_free: true`, `payment_method: "cash_on_delivery"`).
* `PUT /api/v1/admin/settings` : Modification des paramètres administratifs (la livraison gratuite 0.00 MAD et le paiement à la livraison sont sanctuarisés et non altérables).

### 5.9. Journal d'Audit de Sécurité
* `GET /api/v1/admin/audit-logs` : Traçabilité des actions d'administration, connexions et transitions sensibles.
