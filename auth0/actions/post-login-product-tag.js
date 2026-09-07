/**
 * Auth0 Post-Login Action — "which product did this person come from?"
 *
 * One Auth0 tenant fronts every APAS product, so attribution has to be decided
 * here, once, rather than reconstructed per product afterwards. Marketing and
 * the CRM read `app_metadata.signup_product` and `app_metadata.products`.
 *
 * Deploy: Auth0 Dashboard → Actions → Library → Build Custom → Login / Post Login.
 * Paste this file, Deploy, then drag it into the Login flow.
 *
 * The product slug arrives as the `ext-product` parameter that each product's
 * bridge adds to /authorize (Auth0 forwards custom parameters only when they
 * carry the `ext-` prefix). PRODUCTS_BY_CLIENT_ID is the fallback for clients
 * that do not send it — a native app, or a direct Universal Login visit.
 */

const NAMESPACE = 'https://apas.ai/';

/** Fill in one entry per Auth0 Application. */
const PRODUCTS_BY_CLIENT_ID = {
  // 'AUTH0_CLIENT_ID_FOR_PROJOS': 'projos',
};

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

exports.onExecutePostLogin = async (event, api) => {
  const query = event.request.query || {};
  const requestedProduct = typeof query['ext-product'] === 'string' ? query['ext-product'] : null;
  const product = requestedProduct
    || PRODUCTS_BY_CLIENT_ID[event.client.client_id]
    || 'unknown';

  const appMetadata = event.user.app_metadata || {};
  const products = Array.isArray(appMetadata.products) ? appMetadata.products.slice() : [];

  // First login is the signup. `signup_product` is written once and never
  // rewritten, so it stays true even after the user adopts other products.
  // Keying off its absence (rather than event.stats.logins_count) keeps this
  // idempotent if the Action is ever re-run or added to an existing tenant.
  if (!appMetadata.signup_product) {
    api.user.setAppMetadata('signup_product', product);
    api.user.setAppMetadata('signup_client_id', event.client.client_id);
    api.user.setAppMetadata('signup_at', new Date().toISOString());

    const utm = {};
    for (const key of UTM_KEYS) {
      const value = query['ext-' + key] || query[key];
      if (typeof value === 'string' && value) utm[key] = value.slice(0, 200);
    }
    if (Object.keys(utm).length > 0) api.user.setAppMetadata('signup_utm', utm);
  }

  // Cross-product footprint: every product this identity has ever signed in to.
  if (product !== 'unknown' && !products.includes(product)) {
    products.push(product);
    api.user.setAppMetadata('products', products);
  }

  // Namespaced ID-token claims. Auth0 silently strips non-namespaced custom
  // claims, and the ProjOS bridge reads these to attribute the account it
  // creates. app_metadata written above is not yet visible on `event`, so
  // compute the outgoing values from what we just decided.
  api.idToken.setCustomClaim(
    NAMESPACE + 'signup_product',
    appMetadata.signup_product || product,
  );
  api.idToken.setCustomClaim(
    NAMESPACE + 'products',
    products.length > 0 ? products : [product],
  );
  api.idToken.setCustomClaim(NAMESPACE + 'connection', event.connection.name);
};
