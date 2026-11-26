# Procédure de Retour Arrière (Rollback) — Hostinger Premium Web Hosting
## El Bahli Store

Ce document détaille les étapes d'urgence à exécuter en cas d'incident critique lors d'une mise en production ou d'une mise à jour sur l'hébergement mutualisé Hostinger Premium.

---

## 1. Principes de Sécurité du Rollback

* **Préservation des Commandes Réelles** : Lors d'un retour arrière, ne jamais écraser une base de données de production avec une sauvegarde locale obsolète sans avoir préalablement sauvegardé les nouvelles commandes passées par les clients durant la période.
* **Stratégie en 3 Niveaux** :
  - **Niveau 1** : Incident Frontend pur (problème d'affichage, bug JS, mauvaise variable API).
  - **Niveau 2** : Incident Backend applicatif (erreur 500 sur l'API, bug de contrôleur).
  - **Niveau 3** : Incident Base de données (migration défectueuse ou corruption de données).

---

## 2. Procédure Niveau 1 : Rollback Frontend (Rapide — < 2 minutes)

Si le problème provient uniquement de l'interface visuelle ou d'un chunk JS défectueux :

1. Sur votre machine locale, positionnez-vous sur la version précédente stable :
   ```bash
   cd Frontend
   # Recompiler le bundle précédent stable
   npm run build
   ```
2. Sur le serveur Hostinger, connectez-vous par SFTP ou File Manager hPanel :
   - Rendez-vous dans `/home/u123456789/domains/DOMAINE-MA/public_html/`.
   - Remplacez le dossier `assets/` et le fichier `index.html` par ceux du build stable précédent.
   - Conservez le fichier `.htaccess`.
3. Videz le cache de votre navigateur ou testez en navigation privée (`Ctrl + Shift + R`).

---

## 3. Procédure Niveau 2 : Rollback Backend Applicatif (Rapide — < 5 minutes)

Si l'API Laravel renvoie des erreurs 500 ou si une régression applicative survient :

1. Connectez-vous en SSH au serveur Hostinger :
   ```bash
   ssh -p 65002 u123456789@IP_SERVEUR
   cd ~/backend
   ```
2. Nettoyez immédiatement tous les caches Laravel pour éliminer tout cache corrompu :
   ```bash
   php artisan config:clear
   php artisan route:clear
   php artisan view:clear
   php artisan cache:clear
   ```
3. Si le code a été mis à jour via Git, revenez au commit précédent :
   ```bash
   # Identifier le commit stable précédent
   git log -2 --oneline
   # Revenir au commit stable
   git checkout <HASH_COMMIT_STABLE>
   ```
4. Réinstallez les dépendances Composer si `composer.lock` a changé :
   ```bash
   composer install --no-dev --optimize-autoloader --no-interaction
   ```
5. Reconstituez les caches d'optimisation :
   ```bash
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   ```
6. Vérifiez la santé de l'API :
   ```bash
   curl -I https://api.DOMAINE-MA/up
   ```

---

## 4. Procédure Niveau 3 : Rollback Base de Données

> [!CAUTION]
> Une restauration de base de données écrase l'état actuel de la base. Suivre scrupuleusement les étapes ci-dessous pour ne perdre aucune commande client.

### Étape 4.1 : Sauvegarde d'urgence de l'état actuel
Avant toute restauration, faites un export instantané de la base actuelle :
```bash
# Via SSH
mysqldump -u u123456789_user -p u123456789_dbname > ~/backup_urgence_avant_rollback_$(date +%F_%H-%M-%S).sql
```
*(Cette sauvegarde contient toutes les éventuelles commandes passées jusqu'à la dernière minute).*

### Étape 4.2 : Restauration de la sauvegarde saine
1. Via **hPanel** -> **Bases de données** -> Ouvrez **phpMyAdmin** sur la base concernée.
2. Cliquez sur l'onglet **Importer**.
3. Sélectionnez votre fichier de sauvegarde SQL sain (ex: `el_bahli_store_pre_deploiement.sql`).
4. Cliquez sur **Importer** en bas de page.

### Étape 4.3 : Vérification post-restauration
1. Vérifiez que la table `orders` contient vos données de commandes.
2. Vérifiez que la table `products` contient vos produits et variantes actifs.
3. Testez l'endpoint public des produits :
   ```bash
   curl https://api.DOMAINE-MA/api/v1/products
   ```

---

## 5. Contacts & Procédure de Continuité de Service

En cas de blocage persistant de l'infrastructure Hostinger :
1. Vérifier le statut des serveurs Hostinger sur `https://status.hostinger.com`.
2. Contacter le support technique Hostinger par chat en direct 24/7 disponible sur hPanel.
3. Conserver les logs d'erreurs récents disponibles dans :
   `/home/u123456789/backend/storage/logs/laravel-*.log`
