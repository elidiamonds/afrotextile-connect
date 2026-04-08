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
  isNew?: boolean;
  isTrending?: boolean;
}

export interface Vendor {
  id: string;
  name: string;
  logo: string;
  description: string;
  location: string;
  productCount: number;
  rating: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  size: string;
}
