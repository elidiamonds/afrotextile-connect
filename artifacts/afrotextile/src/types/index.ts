export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  images: string[];
  category: string;
  vendor: string;
  vendorId: string;
  sizes: string[];
  fabricType: string;
  description: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  inventory?: number;
  isNew?: boolean;
  isTrending?: boolean;
  commerceSource?: "shopify" | "marketplace" | "demo";
  shopifyProductId?: string;
  currencyCode?: string;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  title: string;
  price: number;
  currencyCode: string;
  availableForSale: boolean;
  quantityAvailable?: number;
  options: Array<{ name: string; value: string }>;
  image?: string;
}

export interface Vendor {
  id: string;
  name: string;
  logo: string;
  description: string;
  location: string;
  productCount: number;
  rating: number;
  isDemo?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  size: string;
  merchandiseId: string;
}
