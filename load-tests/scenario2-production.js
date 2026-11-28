import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Métriques
const failureRate = new Rate('failed_requests_rate');
const durationTrend = new Trend('production_req_duration');

export const options = {
  // Test prudent pour serveur mutualisé Hostinger LiteSpeed (20 VUs, 30s)
  stages: [
    { duration: '5s', target: 5 },   // Échauffement
    { duration: '20s', target: 20 }, // 20 utilisateurs simultanés
    { duration: '5s', target: 0 },   // Retour au calme
  ],
  thresholds: {
    // 95% des requêtes sous 500ms
    http_req_duration: ['p(95)<500'],
    // 0% d'erreurs HTTP 5xx (stabilité absolue du serveur)
    'http_req_failed{status:500}': ['rate==0'],
    'http_req_failed{status:502}': ['rate==0'],
    'http_req_failed{status:503}': ['rate==0'],
    'http_req_failed{status:504}': ['rate==0'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'https://api.elbahlistore.com/api/v1';

export default function () {
  // 100% LECTURE SEULE : Aucune écriture en base de données de production
  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'k6-LoadTest-ElBahliStore/1.0',
  };

  // 1. Liste des catégories publiques (mise en cache)
  const resCategories = http.get(`${BASE_URL}/categories`, { headers });
  const catOk = check(resCategories, {
    'Categories HTTP 200': (r) => r.status === 200,
    'Categories renvoie du JSON': (r) => r.headers['Content-Type'] && r.headers['Content-Type'].includes('application/json'),
  });
  if (!catOk) failureRate.add(1);
  durationTrend.add(resCategories.timings.duration);

  sleep(0.5);

  // 2. Liste des produits publics paginée
  const resProducts = http.get(`${BASE_URL}/products?per_page=12`, { headers });
  const prodOk = check(resProducts, {
    'Products HTTP 200': (r) => r.status === 200,
    'Products payload valide': (r) => r.json('data') !== undefined,
  });
  if (!prodOk) failureRate.add(1);
  durationTrend.add(resProducts.timings.duration);

  // Pause réaliste entre deux consultations d'un internaute (1 à 2 secondes)
  sleep(1.5);
}
