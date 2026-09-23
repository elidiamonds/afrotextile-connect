import type { Product, ProductVariant } from "@/types";

type Money = {
  amount: string;
  currencyCode: string;
};

type ShopifyImage = {
  url: string;
  altText: string | null;
};

export type ShopifyProduct = {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  tags: string[];
  availableForSale: boolean;
  createdAt: string;
  featuredImage: ShopifyImage | null;
  images: { nodes: ShopifyImage[] };
  priceRange: {
    minVariantPrice: Money;
    maxVariantPrice: Money;
  };
  compareAtPriceRange: {
    minVariantPrice: Money;
    maxVariantPrice: Money;
  };
  variants: {
    nodes: Array<{
      id: string;
      title: string;
      availableForSale: boolean;
      quantityAvailable: number | null;
      selectedOptions: Array<{ name: string; value: string }>;
      price: Money;
      compareAtPrice: Money | null;
      image: ShopifyImage | null;
    }>;
  };
};

export type ShopifyProductsResponse = {
  nodes: ShopifyProduct[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
};

export type ShopifyCartResponse = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: {
    subtotalAmount: Money;
    totalAmount: Money;
    totalTaxAmount: Money | null;
  };
  discountCodes: Array<{ code: string; applicable: boolean }>;
  warnings: Array<{ message: string; code?: string }>;
};

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    cache: init?.cache ?? "no-store",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status}).`);
  }
  return payload;
}

export function getShopifyProducts(params: {
  q?: string;
  productType?: string;
  minPrice?: number;
  maxPrice?: number;
  available?: boolean;
  sort?: string;
  first?: number;
  after?: string;
}): Promise<ShopifyProductsResponse> {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value));
  });
  return apiRequest(`/api/shopify/products?${search}`);
}

export function getShopifyProduct(handle: string): Promise<ShopifyProduct> {
  return apiRequest(`/api/shopify/products/${encodeURIComponent(handle)}`);
}

export function createShopifyCart(input: {
  lines: Array<{ merchandiseId: string; quantity: number }>;
  discountCodes?: string[];
}): Promise<ShopifyCartResponse> {
  return apiRequest("/api/shopify/cart", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function mapShopifyProduct(product: ShopifyProduct): Product {
  const variants: ProductVariant[] = product.variants.nodes.map((variant) => ({
    id: variant.id,
    title: variant.title,
    price: Number(variant.price.amount),
    currencyCode: variant.price.currencyCode,
    availableForSale: variant.availableForSale,
    quantityAvailable: variant.quantityAvailable ?? undefined,
    options: variant.selectedOptions,
    image: variant.image?.url,
  }));
  const availableVariant = variants.find((variant) => variant.availableForSale);
  const firstVariant = availableVariant ?? variants[0];
  const sizeValues = variants
    .map((variant) => {
      const size = variant.options.find(
        (option) => option.name.toLowerCase() === "size",
      )?.value;
      return size ?? (variant.title === "Default Title" ? "One size" : variant.title);
    })
    .filter((value, index, values) => values.indexOf(value) === index);
  const images = product.images.nodes.map((image) => image.url);
  if (images.length === 0 && product.featuredImage?.url) {
    images.push(product.featuredImage.url);
  }

  return {
    id: product.handle,
    shopifyProductId: product.id,
    commerceSource: "shopify",
    name: product.title,
    price: Number(firstVariant?.price ?? product.priceRange.minVariantPrice.amount),
    currencyCode:
      firstVariant?.currencyCode ?? product.priceRange.minVariantPrice.currencyCode,
    originalPrice:
      Number(product.compareAtPriceRange.minVariantPrice.amount) > 0
        ? Number(product.compareAtPriceRange.minVariantPrice.amount)
        : undefined,
    images: images.length > 0 ? images : ["/placeholder.svg"],
    category: product.productType || "Fashion",
    vendor: product.vendor || "Afrotextile",
    vendorId: product.vendor || "afrotextile",
    sizes: sizeValues.length > 0 ? sizeValues : ["One size"],
    fabricType: product.tags.find((tag) => /cotton|linen|silk|wool|ankara|kente/i.test(tag)) ?? "African textile",
    description: product.description,
    rating: 0,
    reviews: 0,
    inStock: product.availableForSale,
    inventory: firstVariant?.quantityAvailable,
    isNew: Date.now() - new Date(product.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000,
    variants,
  };
}

export function variantForSize(product: Product, size: string): ProductVariant | undefined {
  return (
    product.variants?.find((variant) =>
      variant.options.some(
        (option) => option.name.toLowerCase() === "size" && option.value === size,
      ),
    ) ??
    product.variants?.find((variant) => variant.title === size) ??
    product.variants?.[0]
  );
}

export function formatMoney(amount: number, currencyCode = "USD"): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}