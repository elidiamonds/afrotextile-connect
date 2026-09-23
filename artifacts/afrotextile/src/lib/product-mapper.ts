import type { Product as ApiProduct } from "@workspace/api-client-react";
import type { Product } from "@/types";

export function mapApiProduct(product: ApiProduct): Product {
  return {
    id: product.id,
    commerceSource: "marketplace",
    name: product.name,
    price: product.price,
    ...(product.originalPrice == null
      ? {}
      : { originalPrice: product.originalPrice }),
    images: product.images.length > 0 ? product.images : ["/placeholder.svg"],
    category: product.category,
    vendor: product.vendor,
    vendorId: product.vendorId,
    sizes: product.sizes,
    fabricType: product.fabricType,
    description: product.description,
    rating: product.rating,
    reviews: product.reviews,
    inStock: product.inStock,
    inventory: product.inventory,
  };
}