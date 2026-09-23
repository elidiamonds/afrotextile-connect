const STOREFRONT_API_VERSION = "2026-04";
const CONFIG_CACHE_TTL_MS = 60_000;
const FETCH_TIMEOUT_MS = 10_000;

type ShopifyStorefrontConfig = {
  shopDomain: string;
  storefrontAccessToken: string;
};

type ShopifyConnectionResponse = {
  items?: Array<{
    settings?: {
      shop_domain?: string;
      storefront_access_token?: string;
    };
  }>;
};

let cachedConfig:
  | { value: ShopifyStorefrontConfig; expiresAt: number }
  | undefined;

function getConnectionRequest() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const token = process.env.REPL_IDENTITY
    ? `repl ${process.env.REPL_IDENTITY}`
    : process.env.WEB_REPL_RENEWAL
      ? `depl ${process.env.WEB_REPL_RENEWAL}`
      : null;

  if (!hostname || !token) {
    throw new Error("The Shopify connection is not available in this environment.");
  }

  const protocol = hostname.startsWith("localhost") ? "http" : "https";
  const url = new URL(`${protocol}://${hostname}/api/v2/connection`);
  url.searchParams.set("include_secrets", "true");
  url.searchParams.set("connector_names", "shopify-store");
  url.searchParams.set("refresh_policy", "none");
  return { url: url.toString(), token };
}

async function getShopifyStorefrontConfig(
  options: { forceRefresh?: boolean } = {},
): Promise<ShopifyStorefrontConfig> {
  if (cachedConfig && !options.forceRefresh && Date.now() < cachedConfig.expiresAt) {
    return cachedConfig.value;
  }

  const connection = getConnectionRequest();
  const response = await fetch(connection.url, {
    headers: {
      Accept: "application/json",
      X_REPLIT_TOKEN: connection.token,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Could not load the Shopify connection (${response.status}).`);
  }

  const payload = (await response.json()) as ShopifyConnectionResponse;
  const settings = payload.items?.[0]?.settings;
  if (!settings?.shop_domain || !settings.storefront_access_token) {
    throw new Error("The Shopify connection is missing Storefront access.");
  }

  cachedConfig = {
    value: {
      shopDomain: settings.shop_domain,
      storefrontAccessToken: settings.storefront_access_token,
    },
    expiresAt: Date.now() + CONFIG_CACHE_TTL_MS,
  };
  return cachedConfig.value;
}

export async function shopifyStorefrontRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
  options: { retryOnUnauthorized?: boolean } = {},
): Promise<T> {
  const config = await getShopifyStorefrontConfig();
  const response = await fetch(
    `https://${config.shopDomain}/api/${STOREFRONT_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": config.storefrontAccessToken,
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    },
  );

  if (
    options.retryOnUnauthorized !== false &&
    (response.status === 401 || response.status === 403)
  ) {
    cachedConfig = undefined;
    await getShopifyStorefrontConfig({ forceRefresh: true });
    return shopifyStorefrontRequest<T>(query, variables, {
      retryOnUnauthorized: false,
    });
  }

  const text = await response.text();
  const payload = text ? safeJsonParse(text) : {};
  if (!response.ok || payload.errors?.length) {
    throw new Error(
      `Shopify Storefront API error (${response.status}): ${JSON.stringify(payload.errors ?? payload)}`,
    );
  }
  return payload.data as T;
}

function safeJsonParse(text: string): Record<string, any> {
  try {
    return JSON.parse(text) as Record<string, any>;
  } catch {
    return { errors: [{ message: text }] };
  }
}