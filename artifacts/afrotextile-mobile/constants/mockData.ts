export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  imageKey: string;
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
  logoKey: string;
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

export const productImages: Record<string, any> = {
  p1: require("../assets/images/product-1.jpg"),
  p2: require("../assets/images/product-2.jpg"),
  p3: require("../assets/images/product-3.jpg"),
  p4: require("../assets/images/product-4.jpg"),
  p5: require("../assets/images/product-5.jpg"),
  p6: require("../assets/images/product-6.jpg"),
  p7: require("../assets/images/product-7.jpg"),
  p8: require("../assets/images/product-8.jpg"),
};

export const vendorImages: Record<string, any> = {
  v1img: require("../assets/images/vendor-1.jpg"),
  v2img: require("../assets/images/vendor-2.jpg"),
  v3img: require("../assets/images/vendor-3.jpg"),
};

export const products: Product[] = [
  {
    id: "1", name: "Ankara Co-ord Set", price: 285, originalPrice: 350,
    imageKey: "p1", category: "Women's Fashion", vendor: "Adunni Couture", vendorId: "v1",
    sizes: ["XS", "S", "M", "L", "XL"], fabricType: "Ankara",
    description: "Bold two-piece Ankara set with cropped top and wide-leg trousers. Hand-crafted in Lagos with premium wax print.",
    rating: 4.8, reviews: 124, inStock: true, isNew: true, isTrending: true,
  },
  {
    id: "2", name: "Kente Maxi Gown", price: 420,
    imageKey: "p2", category: "Women's Fashion", vendor: "Nana's Heritage", vendorId: "v2",
    sizes: ["XS", "S", "M", "L"], fabricType: "Kente",
    description: "Floor-length evening gown woven with authentic Kente. Royal Ghanaian textile tradition reimagined.",
    rating: 4.9, reviews: 89, inStock: true, isTrending: true,
  },
  {
    id: "3", name: "Mudcloth Bomber Jacket", price: 310,
    imageKey: "p3", category: "Men's Fashion", vendor: "Bamako Modern", vendorId: "v3",
    sizes: ["M", "L", "XL", "XXL"], fabricType: "Mudcloth",
    description: "Street-luxury bomber in genuine Malian Bògòlanfini. Heritage craft meets urban silhouette.",
    rating: 4.7, reviews: 56, inStock: true, isNew: true,
  },
  {
    id: "4", name: "Aso-Oke Corset", price: 195,
    imageKey: "p4", category: "Women's Fashion", vendor: "Adunni Couture", vendorId: "v1",
    sizes: ["XS", "S", "M", "L"], fabricType: "Aso-Oke",
    description: "Hand-woven Aso-Oke shaped into a modern corset — Yoruba textile mastery in violet and gold.",
    rating: 4.6, reviews: 42, inStock: true,
  },
  {
    id: "5", name: "Embroidered Kaftan", price: 245,
    imageKey: "p5", category: "Men's Fashion", vendor: "Lagos Luxe", vendorId: "v4",
    sizes: ["S", "M", "L", "XL", "XXL"], fabricType: "Silk Blend",
    description: "Long-sleeve kaftan with intricate gold embroidery, finished with a hand-knotted tassel.",
    rating: 4.5, reviews: 78, inStock: true, isTrending: true,
  },
  {
    id: "6", name: "Adire Wide-Leg Trousers", price: 230,
    imageKey: "p6", category: "Women's Fashion", vendor: "Nana's Heritage", vendorId: "v2",
    sizes: ["S", "M", "L"], fabricType: "Adire",
    description: "Flowing wide-leg trousers in hand-dyed Adire indigo. Comfort meets cultural craft.",
    rating: 4.4, reviews: 33, inStock: true, isNew: true,
  },
  {
    id: "7", name: "Kitenge Wrap Skirt", price: 145,
    imageKey: "p7", category: "Women's Fashion", vendor: "Zanzibar Threads", vendorId: "v5",
    sizes: ["XS", "S", "M", "L", "XL"], fabricType: "Kitenge",
    description: "Versatile wrap skirt in vibrant East African Kitenge — style it three ways.",
    rating: 4.7, reviews: 67, inStock: true,
  },
  {
    id: "8", name: "Hand-Woven Tote", price: 165,
    imageKey: "p8", category: "Accessories", vendor: "Cape Heritage Co.", vendorId: "v6",
    sizes: ["One Size"], fabricType: "Woven Raffia",
    description: "Architectural tote in woven raffia with full-grain leather handles. Made in Cape Town.",
    rating: 4.8, reviews: 91, inStock: true, isTrending: true,
  },
];

export const vendors: Vendor[] = [
  {
    id: "v1", name: "Adunni Couture", logoKey: "v1img",
    description: "Lagos-based luxury fashion house blending Yoruba textile traditions with contemporary haute couture.",
    location: "Lagos, Nigeria", productCount: 48, rating: 4.8,
  },
  {
    id: "v2", name: "Nana's Heritage", logoKey: "v3img",
    description: "Preserving Ghanaian textile heritage through modern fashion. Specializing in Kente and Adinkra.",
    location: "Accra, Ghana", productCount: 35, rating: 4.9,
  },
  {
    id: "v3", name: "Bamako Modern", logoKey: "v2img",
    description: "Reinventing Malian mudcloth for the global streetwear market with bold contemporary designs.",
    location: "Bamako, Mali", productCount: 22, rating: 4.7,
  },
  {
    id: "v4", name: "Lagos Luxe", logoKey: "v2img",
    description: "Premium menswear celebrating West African embroidery and tailoring excellence.",
    location: "Lagos, Nigeria", productCount: 31, rating: 4.5,
  },
  {
    id: "v5", name: "Zanzibar Threads", logoKey: "v1img",
    description: "East African coastal designs in Kitenge and Khanga, crafted for the modern wardrobe.",
    location: "Stone Town, Zanzibar", productCount: 27, rating: 4.6,
  },
  {
    id: "v6", name: "Cape Heritage Co.", logoKey: "v3img",
    description: "South African leather goods and Shweshwe accessories with architectural sensibility.",
    location: "Cape Town, South Africa", productCount: 19, rating: 4.8,
  },
];

export const categories = [
  "All", "Women's Fashion", "Men's Fashion", "Accessories",
  "Fabrics", "Ready-to-Wear", "Footwear", "Cultural Fashion",
];

export const fabricTypes = [
  "All", "Ankara", "Kente", "Mudcloth", "Aso-Oke",
  "Adire", "Kitenge", "Silk Blend", "Woven Raffia",
];
