import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Métriques personnalisées
const errorRate = new Rate('custom_error_rate');
const rateLimitedCount = new Counter('rate_limited_429');
const successfulOrders = new Counter('orders_placed_successfully');
const responseTimeTrend = new Trend('custom_resp_time');

export const options = {
  stages: [
    { duration: '10s', target: 20 }, // Montée progressive à 20 VUs
    { duration: '40s', target: 50 }, // Palier à 50 VUs
    { duration: '10s', target: 0 },  // Descente
  ],
  thresholds: {
    // 95% des requêtes sous 500ms
    http_req_duration: ['p(95)<500'],
    // Taux d'erreurs serveur 5xx nul
    'http_req_failed{status:500}': ['rate==0'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:8000/api/v1';

export default function () {
  const rand = Math.random();

  // 1. Scénario 60% : Consultation Catalogue (Catégories + Produits)
  if (rand < 0.60) {
    const resCat = http.get(`${BASE_URL}/categories`);
    check(resCat, {
      'Catalogue Catégories status 200': (r) => r.status === 200,
    });
    responseTimeTrend.add(resCat.timings.duration);

    sleep(0.5);

    const resProd = http.get(`${BASE_URL}/products?per_page=12`);
    check(resProd, {
      'Catalogue Produits status 200': (r) => r.status === 200,
    });
    responseTimeTrend.add(resProd.timings.duration);
  }
  // 2. Scénario 25% : Calcul de panier (Cart estimate)
  else if (rand < 0.85) {
    const payload = JSON.stringify({
      items: [
        { product_id: 1, size: 'M', color: 'Standard', quantity: 2 },
      ],
    });

    const resCart = http.post(`${BASE_URL}/cart/estimate`, payload, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    });

    check(resCart, {
      'Cart estimate status 200': (r) => r.status === 200,
      'Cart estimate throttled 429 attendu': (r) => r.status === 200 || r.status === 429,
    });

    if (resCart.status === 429) {
      rateLimitedCount.add(1);
    }
    responseTimeTrend.add(resCart.timings.duration);
  }
  // 3. Scénario 15% : Passage de commande (Order submission)
  else {
    const uniqueId = `${Date.now()}_${__VU}_${__ITER}`;
    const payload = JSON.stringify({
      customer_name: `Test Client ${__VU}`,
      customer_phone: `061234${String(__VU).padStart(4, '0')}`,
      city: 'Casablanca',
      address: 'Test Boulevard Zerktouni',
      idempotency_token: `k6_${uniqueId}`,
      items: [
        { product_id: 1, size: 'M', color: 'Standard', quantity: 1 },
      ],
    });

    const resOrder = http.post(`${BASE_URL}/orders`, payload, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    });

    const orderSuccess = check(resOrder, {
      'Order status 201 créé ou 429 protégé': (r) => r.status === 201 || r.status === 429 || r.status === 422,
    });

    if (resOrder.status === 201) {
      successfulOrders.add(1);
    } else if (resOrder.status === 429) {
      // Normal car toutes les requêtes k6 locales partagent l'IP 127.0.0.1
      rateLimitedCount.add(1);
    } else if (resOrder.status >= 500) {
      errorRate.add(1);
    }

    responseTimeTrend.add(resOrder.timings.duration);
  }

  sleep(1);
}
