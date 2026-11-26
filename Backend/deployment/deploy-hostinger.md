# Guide Complet de Déploiement Hostinger — El Bahli Store

Ce document présente la procédure complète et standardisée pour déployer **El Bahli Store** sur l'infrastructure de production **Hostinger** (VPS Ubuntu / Debian ou Hébergement Mutualisé / Cloud).

---

## 1. Prérequis Système

| Élément | Version Requise / Recommandée | Statut Projet |
| :--- | :--- | :--- |
| **PHP** | `8.5.x` ou `8.4.x` avec extensions requises | Validé |
| **Node.js** | `>= 20.x LTS` (pour le build Frontend) | Validé |
| **MySQL** | `8.4.x LTS` ou `8.0.x` | Validé |
| **Serveur Web** | Nginx (recommandé sur VPS) ou Apache | Modèles fournis |
| **SSL** | Certificat Let's Encrypt TLS 1.3 | Requis en production |

### Extensions PHP indispensables :
- `pdo_mysql`
- `mbstring`
- `bcmath`
- `ctype`
- `fileinfo`
- `openssl`
- `tokenizer`
- `xml`
- `gd` ou `imagick`
- `curl`

---

## 2. Configuration des Variables d'Environnement (`.env` Backend)

Copier `.env.example` en `.env` dans le dossier `Backend/` du serveur et ajuster les clés critiques :

```env
APP_NAME="El Bahli Store"
APP_ENV=production
APP_KEY=base64:... # Générer via: php artisan key:generate
APP_DEBUG=false
APP_URL=https://elbahlistore.ma

LOG_CHANNEL=daily
LOG_LEVEL=warning

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=nom_base_hostinger
DB_USERNAME=utilisateur_hostinger
DB_PASSWORD=mot_de_passe_robuste

BROADCAST_CONNECTION=log
FILESYSTEM_DISK=public
QUEUE_CONNECTION=database
SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=elbahlistore.ma
SESSION_SECURE_COOKIE=true

SANCTUM_STATEFUL_DOMAINS=elbahlistore.ma,www.elbahlistore.ma

CORS_ALLOWED_ORIGINS=https://elbahlistore.ma,https://www.elbahlistore.ma
```

---

## 3. Déploiement et Commandes d'Initialisation

### A. Déploiement Backend (Laravel 13)

```bash
cd /var/www/el-bahli-store/Backend

# 1. Installation des dépendances de production sans paquets de dev
composer install --no-dev --optimize-autoloader --no-interaction

# 2. Exécution des migrations (SANS toucher aux données existantes)
php artisan migrate --force

# 3. Création du lien symbolique pour le stockage public des photos
php artisan storage:link

# 4. Optimisation et mise en cache des configurations, routes et vues
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
```

### B. Déploiement Frontend (React 19 + Vite)

```bash
cd /var/www/el-bahli-store/Frontend

# 1. Configuration des variables d'API de production (.env.production)
echo "VITE_API_URL=https://elbahlistore.ma/api/v1" > .env.production

# 2. Installation des dépendances et compilation du bundle optimisé
npm ci
npm run build

# Le bundle compilé est généré dans Frontend/dist
# Nginx servira directement les fichiers de Frontend/dist
```

---

## 4. Tâches Planifiées (Cron Laravel)

Sur le serveur Hostinger (via Cron Jobs dans hPanel ou crontab sur VPS) :

```cron
* * * * * cd /var/www/el-bahli-store/Backend && php artisan schedule:run >> /dev/null 2>&1
```

---

## 5. Exécution des Files d'Attente (Queue Worker)

Pour l'envoi d'e-mails, de notifications et les opérations asynchrones :

### Configuration Supervisor recommandée sur VPS (`/etc/supervisor/conf.d/elbahli-worker.conf`) :

```ini
[program:elbahli-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/el-bahli-store/Backend/artisan queue:work database --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/el-bahli-store/Backend/storage/logs/worker.log
stopwaitsecs=3600
```

---

## 6. Checklist de Vérification Post-Déploiement

- [ ] `APP_DEBUG=false` bien vérifié dans `.env`.
- [ ] Certificat SSL actif (cadenas vert sur `https://elbahlistore.ma`).
- [ ] Route d'authentification admin accessible sur `https://elbahlistore.ma/zakaria/admin/login`.
- [ ] Redirection de l'ancienne URL `/admin/login` vers `/zakaria/admin/login` fonctionnelle.
- [ ] Navigation vitrine et accès direct aux catégories opérationnels.
- [ ] Modal "Guide des tailles" s'ouvre avec le titre fixé et sans dépassement d'en-tête.
- [ ] Enregistrement des commandes WhatsApp et base de données vérifié.
- [ ] Rate limiting actif sur les soumissions de commandes et les connexions admin.
- [ ] Fichiers sensibles `.env` et `.git` inaccessibles depuis l'extérieur (code 403/404).
