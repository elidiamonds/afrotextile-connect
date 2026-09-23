const API_VERSION = "2026-04";

export class ShopifyAdminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShopifyAdminError";
  }
}

// All Admin calls go through the Replit Shopify connector; no Admin token is handled here.
export async function shopifyAdminRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const token = process.env.REPL_IDENTITY
    ? `repl ${process.env.REPL_IDENTITY}`
    : process.env.WEB_REPL_RENEWAL
      ? `depl ${process.env.WEB_REPL_RENEWAL}`
      : null;
  if (!hostname || !token) {
    throw new ShopifyAdminError("Shopify is not connected in this environment.");
  }
  const protocol = hostname.startsWith("localhost") ? "http" : "https";
  const response = await fetch(
    `${protocol}://${hostname}/api/v2/proxy/admin/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Replit-Token": token,
        "Connector-Name": "shopify-store",
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(30_000),
    },
  );
  const payload = await response.json() as {
    data?: T;
    errors?: Array<{ message: string }>;
  };
  if (!response.ok || payload.errors?.length || !payload.data) {
    throw new ShopifyAdminError(
      payload.errors?.map((error) => error.message).join("; ") ||
        `Shopify Admin request failed (${response.status}). Reconnect Shopify if access has expired.`,
    );
  }
  const mutation = Object.values(payload.data as Record<string, unknown>).find(
    (value) => !!value && typeof value === "object",
  ) as Record<string, unknown> | undefined;
  const userErrors = Object.entries(mutation ?? {})
    .filter(([name, errors]) => name.toLowerCase().endsWith("usererrors") && Array.isArray(errors))
    .flatMap(([, errors]) => errors as Array<{ field?: string[]; message: string }>);
  if (userErrors.length) {
    throw new ShopifyAdminError(
      userErrors.map(({ field, message }) =>
        `${field?.join(".") || "Shopify"}: ${message}`,
      ).join("; "),
    );
  }
  return payload.data;
}