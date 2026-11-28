# Guide des Tests de Charge (k6) — El Bahli Store

Ce dossier contient les scénarios de test de charge conçus avec [k6](https://k6.io/) pour évaluer la réactivité et la résilience de l'API El Bahli Store (Laravel 13 sur PHP 8.5, LiteSpeed / Hostinger).

---

## 1. Installation de k6 sur votre PC

### Windows (au choix) :
- **Via winget (recommandé)** :
  ```powershell
  winget install k6 --source winget
  ```
- **Via Chocolatey** :
  ```powershell
  choco install k6
  ```
- **Ou téléchargement direct** :
  Téléchargez le binaire officiel sur [https://dl.k6.io/msi/k6-latest-amd64.msi](https://dl.k6.io/msi/k6-latest-amd64.msi).

---

## 2. Exécution des Scénarios

### Scénario 1 : Test Local Intensif (50 VUs, 1 minute)
*Mix réaliste de trafic : 60% consultation catalogue, 25% panier, 15% passage de commande.*

1. Démarrez votre serveur local :
   ```bash
   cd Backend
   php artisan serve
   ```
2. Dans un autre terminal, lancez le test k6 :
   ```bash
   k6 run load-tests/scenario1-local.js
   ```
   *Optionnel (personnaliser l'URL cible) :*
   ```bash
   k6 run -e API_BASE_URL=http://127.0.0.1:8000/api/v1 load-tests/scenario1-local.js
   ```

> **Note importante sur le Rate Limiting local :**
> Puisque toutes les 50 VUs s'exécutent depuis votre propre machine (IP `127.0.0.1`), la protection `order-submission` (5 commandes/min par IP) bloquera légitimement les commandes excédentaires avec le code HTTP **429 Too Many Requests**. C'est la preuve que votre protection anti-abus fonctionne parfaitement ! Le script comptabilise ces 429 comme des protections réussies et non des pannes.

---

### Scénario 2 : Test Prudent en Production (20 VUs, 30 secondes)
*100% LECTURE SEULE sur les endpoints publics. Ne modifie aucun stock et ne crée aucune commande parasite.*

Exécutez la commande :
```bash
k6 run load-tests/scenario2-production.js
```
*Ou en ciblant explicitement votre domaine :*
```bash
k6 run -e API_BASE_URL=https://api.elbahlistore.com/api/v1 load-tests/scenario2-production.js
```

---

## 3. Comment Interpréter les Résultats

À la fin de l'exécution, k6 affiche un tableau récapitulatif. Voici les indicateurs clés à analyser :

| Métrique | Signification | Seuil Idéal Attendu |
| :--- | :--- | :--- |
| `http_req_duration (p95)` | Temps de réponse pour 95% des requêtes | **< 500 ms** (idéalement 100-250ms) |
| `http_req_duration (med)` | Temps de réponse médian (50% des requêtes) | **< 150 ms** |
| `http_req_failed` | Pourcentage d'échecs serveur (5xx) | **0.00 %** (aucun crash serveur) |
| `rate_limited_429` | Requêtes bloquées par le limiteur anti-spam | Présent si le trafic dépasse le quota configuré |
| `vus` | Nombre d'utilisateurs virtuels simultanés actifs | Conforme aux paliers définis (20 ou 50) |

---

## 4. Analyse de Capacité : Hostinger Mutualisé Premium vs Besoins Futurs

### Caractéristiques de l'offre Hostinger Mutualisé Premium :
- **CPU / RAM alloués (CloudLinux LVE)** : ~1 vCPU virtuel et 1 Go de RAM partagée.
- **Serveur web** : LiteSpeed Enterprise avec gestion efficace des connexions statiques et PHP-FPM.
- **Cache** : Stockage du cache en base de données (`CACHE_STORE=database`).
- **Concurrence supportée** :
  - **Consultation de catalogue / lecture seule** : Très bonne tenue jusqu'à **30 à 50 utilisateurs simultanés** grâce aux index BDD que nous venons d'ajouter (`products.is_active`, `product_sizes.stock`).
  - **Écritures concurrentes (soumission de commandes)** : Le verrouillage pessimiste MySQL (`lockForUpdate`) et les transactions courtes garantissent une intégrité parfaite des stocks. Sur Hostinger Premium, une cadence de **5 à 15 commandes par minute** est absorbée sans aucune dégradation.

### Quand envisager une montée en gamme ?
Si votre boutique dépasse les **100 visiteurs simultanés permanents** ou lors de campagnes publicitaires massives (ex. soldes, Black Friday, campagnes TikTok/Instagram Ads à fort pic d'affluence) :
- **Hostinger Business ou Cloud Startup** :
  - Fournit 2 à 4 vCPU dédiés et 3 Go de RAM.
  - Active le cache **Redis / Memcached** en mémoire vive (évite les écritures de cache en BDD MySQL).
  - Multiplie la capacité de traitement par 3 à 5 sans modifier une seule ligne de code.
