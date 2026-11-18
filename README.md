# El Bahli Store

Projet e-commerce de prêt-à-porter masculin traditionnel et moderne au Maroc.

## Architecture Globale

Le projet est architecturé en deux répertoires principaux :

```
El-Bahli-Store/
├── Backend/        # API REST Laravel 13, PHP 8.5, MySQL 8.4, Sanctum
└── Frontend/       # Futur client web autonome (React, Vite, Tailwind CSS, shadcn/ui)
```

## Backend (Laravel 13)

- **API REST versionnée** : `/api/v1`
- **Sécurité** : Authentification Sanctum, politiques d'accès administrateur, headers de sécurité stricts (HSTS, CSP, X-Frame-Options, nosniff), protection anti-IDOR.
- **Règles commerciales** :
  - Livraison 100 % gratuite sur toutes les commandes (0.00 MAD).
  - Mode de paiement exclusif : Paiement à la réception (`cash_on_delivery`).
  - Décrémentation atomique des stocks lors de la confirmation administrative.
- **Tests** : Suite automatisée Pest / PHPUnit avec 122 tests et 831 assertions réussis.
- **Serveur local** : `http://el-bahli-store.test` (via Laravel Herd).

## Frontend (React)

- Prêt pour initialisation lors des phases suivantes.
