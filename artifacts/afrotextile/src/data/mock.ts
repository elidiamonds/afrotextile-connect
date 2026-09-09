import { Product, Vendor } from "@/types";
import v1img from "@/assets/editorial-women.jpg";
import v2img from "@/assets/editorial-men.jpg";
import v3img from "@/assets/editorial-craft.jpg";

// Fashion items extracted from Pinterest — all African-focused boards
// (Ankara, Nigerian fashion, African print dresses, Kente, etc.)
const pin = (id: string) => `https://i.pinimg.com/236x/${id}.jpg`;

export const products: Product[] = [
  {
    id: "1",
    name: "Ankara Co-ord Set",
    price: 285,
    originalPrice: 350,
    images: [pin("00/a0/af/00a0af96ad1a0675e015ea6e5ab71418"), pin("05/13/e9/0513e9143ede759bc7523c2b534ad3c0"), pin("06/5c/f9/065cf9c6e4c82c310229ed20a8fda87d")],
    category: "Ankara Styles",
    vendor: "Adunni Couture",
    vendorId: "v1",
    sizes: ["XS", "S", "M", "L", "XL"],
    fabricType: "Ankara",
    description: "Bold two-piece Ankara set with cropped top and wide-leg trousers. Hand-crafted in Lagos with premium wax print.",
    rating: 4.8, reviews: 124, inStock: true, isNew: true, isTrending: true,
  },
  {
    id: "2",
    name: "Kente Maxi Gown",
    price: 420,
    images: [pin("06/f3/f3/06f3f35120107c86693e0995ab220fb9"), pin("07/e7/1c/07e71c5e3b3ec544939ee771d736bb09"), pin("0b/4c/93/0b4c9373015668f37ee85ea603ee5b83")],
    category: "Kente & Woven",
    vendor: "Nana's Heritage",
    vendorId: "v2",
    sizes: ["XS", "S", "M", "L"],
    fabricType: "Kente",
    description: "Floor-length evening gown woven with authentic Kente. Royal Ghanaian textile tradition reimagined.",
    rating: 4.9, reviews: 89, inStock: true, isTrending: true,
  },
  {
    id: "3",
    name: "Mudcloth Bomber Jacket",
    price: 310,
    images: [pin("0e/f8/84/0ef884abbf06deedf812bd63fd2ae1e5"), pin("0f/15/b4/0f15b4eee81c1030aa716d5ff68efcb7"), pin("10/08/4d/10084d712f8317bd21d457539dd2e7d0")],
    category: "Mudcloth & Bogolan",
    vendor: "Bamako Modern",
    vendorId: "v3",
    sizes: ["M", "L", "XL", "XXL"],
    fabricType: "Mudcloth",
    description: "Street-luxury bomber in genuine Malian Bògòlanfini. Heritage craft meets urban silhouette.",
    rating: 4.7, reviews: 56, inStock: true, isNew: true,
  },
  {
    id: "4",
    name: "Aso-Oke Corset",
    price: 195,
    images: [pin("10/da/3c/10da3c47e2080c62475479a188a26333"), pin("10/f3/84/10f384af3b8fb716f1bf3f6ce90af1f9"), pin("11/d2/0a/11d20a63b1788ba2ef938fe7a5760a42")],
    category: "Aso-Oke & Ceremonial",
    vendor: "Adunni Couture",
    vendorId: "v1",
    sizes: ["XS", "S", "M", "L"],
    fabricType: "Aso-Oke",
    description: "Hand-woven Aso-Oke shaped into a modern corset — Yoruba textile mastery in violet and gold.",
    rating: 4.6, reviews: 42, inStock: true,
  },
  {
    id: "5",
    name: "Embroidered Kaftan",
    price: 245,
    images: [pin("12/a3/c0/12a3c0af3a7a02252219f4ccbec103ba"), pin("14/4f/77/144f772aa075f5984885a37b1df68e64"), pin("15/66/19/1566192de421a4199bc5e2eb3898f753")],
    category: "Men's Fashion Styles",
    vendor: "Lagos Luxe",
    vendorId: "v4",
    sizes: ["S", "M", "L", "XL", "XXL"],
    fabricType: "Silk Blend",
    description: "Long-sleeve kaftan with intricate gold embroidery, finished with a hand-knotted tassel.",
    rating: 4.5, reviews: 78, inStock: true, isTrending: true,
  },
  {
    id: "6",
    name: "Adire Wide-Leg Trousers",
    price: 230,
    images: [pin("17/93/9c/17939c6281c737675f14b41e51cac2ac"), pin("17/cb/1a/17cb1ae146fe9cc55aaddbd2cdbc8c5d"), pin("18/5f/a6/185fa6284fec8657ab1fd5c9a39ce075")],
    category: "Adire & Indigo",
    vendor: "Nana's Heritage",
    vendorId: "v2",
    sizes: ["S", "M", "L"],
    fabricType: "Adire",
    description: "Flowing wide-leg trousers in hand-dyed Adire indigo. Comfort meets cultural craft.",
    rating: 4.4, reviews: 33, inStock: true, isNew: true,
  },
  {
    id: "7",
    name: "Kitenge Wrap Skirt",
    price: 145,
    images: [pin("18/c5/bc/18c5bcfa0e41769b6567a87825ea436f"), pin("19/8a/73/198a73dcd0c8c97566e8334f33bed620"), pin("1a/4a/ba/1a4abaa27edd628bea2f317a12e06a92")],
    category: "Kitenge & East African",
    vendor: "Zanzibar Threads",
    vendorId: "v5",
    sizes: ["XS", "S", "M", "L", "XL"],
    fabricType: "Kitenge",
    description: "Versatile wrap skirt in vibrant East African Kitenge — style it three ways.",
    rating: 4.7, reviews: 67, inStock: true,
  },
  {
    id: "8",
    name: "Hand-Woven Tote",
    price: 165,
    images: [pin("1a/97/d7/1a97d7ef5cea8377f44b39e2b8a45d9d"), pin("1a/fc/93/1afc93d91dd744a4cd35c53c52dc3409"), pin("1c/e3/ca/1ce3ca93b29300daf224444fd5bfdb8a")],
    category: "Accessories & Bags",
    vendor: "Cape Heritage Co.",
    vendorId: "v6",
    sizes: ["One Size"],
    fabricType: "Woven Raffia",
    description: "Architectural tote in woven raffia with full-grain leather handles. Made in Cape Town.",
    rating: 4.8, reviews: 91, inStock: true, isTrending: true,
  },
  {
    id: "9",
    name: "Ankara Wax Print Fabric",
    price: 45,
    images: [pin("26/89/2c/26892cf1e0857ecf0391d449c07a12ca"), pin("27/42/15/274215ec1c41aa6cbd99088d0d551b17")],
    category: "Unsown Fabric",
    vendor: "Adunni Couture",
    vendorId: "v1",
    sizes: ["Per Yard (6 yds)"],
    fabricType: "Ankara",
    description: "Premium Hollandais wax print sold by the full 6-yard piece. Unsewn — ready for your tailor to craft a bespoke look.",
    rating: 4.7, reviews: 58, inStock: true, isNew: true,
  },
  {
    id: "10",
    name: "Handwoven Kente Panel",
    price: 180,
    images: [pin("27/42/15/274215ec1c41aa6cbd99088d0d551b17"), pin("26/89/2c/26892cf1e0857ecf0391d449c07a12ca")],
    category: "Unsown Fabric",
    vendor: "Nana's Heritage",
    vendorId: "v2",
    sizes: ["2 yards"],
    fabricType: "Kente",
    description: "Authentic handwoven Kente strip from Bonwire. Sold as an unsewn panel for ceremonial wrapping or custom tailoring.",
    rating: 4.9, reviews: 37, inStock: true, isTrending: true,
  },
];

export const vendors: Vendor[] = [
  {
    id: "v1", name: "Adunni Couture", logo: v1img,
    description: "Lagos-based luxury fashion house blending Yoruba textile traditions with contemporary haute couture.",
    location: "Lagos, Nigeria", productCount: 48, rating: 4.8,
  },
  {
    id: "v2", name: "Nana's Heritage", logo: v3img,
    description: "Preserving Ghanaian textile heritage through modern fashion. Specializing in Kente and Adinkra.",
    location: "Accra, Ghana", productCount: 35, rating: 4.9,
  },
  {
    id: "v3", name: "Bamako Modern", logo: v2img,
    description: "Reinventing Malian mudcloth for the global streetwear market with bold contemporary designs.",
    location: "Bamako, Mali", productCount: 22, rating: 4.7,
  },
  {
    id: "v4", name: "Lagos Luxe", logo: v2img,
    description: "Premium menswear celebrating West African embroidery and tailoring excellence.",
    location: "Lagos, Nigeria", productCount: 31, rating: 4.5,
  },
  {
    id: "v5", name: "Zanzibar Threads", logo: v1img,
    description: "East African coastal designs in Kitenge and Khanga, crafted for the modern wardrobe.",
    location: "Stone Town, Zanzibar", productCount: 27, rating: 4.6,
  },
  {
    id: "v6", name: "Cape Heritage Co.", logo: v3img,
    description: "South African leather goods and Shweshwe accessories with architectural sensibility.",
    location: "Cape Town, South Africa", productCount: 19, rating: 4.8,
  },
];

export const categories = [
  "All",
  "Ankara Styles",
  "Kente & Woven",
  "Aso-Oke & Ceremonial",
  "Adire & Indigo",
  "Mudcloth & Bogolan",
  "Kitenge & East African",
  "Men's Fashion Styles",
  "Unsown Fabric",
  "Accessories & Bags",
];

export const fabricTypes = [
  "All", "Ankara", "Kente", "Mudcloth", "Aso-Oke", "Adire",
  "Kitenge", "Shweshwe", "Silk Blend", "Woven Raffia",
];

export const regions = ["All", "West Africa", "East Africa", "Southern Africa", "North Africa", "Diaspora"];

export const testimonials = [
  {
    quote: "Afrotextile gave my small Lagos atelier a global stage. I went from 8 local clients to 400+ international customers in six months.",
    author: "Adunni O.", role: "Vendor — Adunni Couture", location: "Lagos, Nigeria",
  },
  {
    quote: "Finally a marketplace that treats African designers like the luxury houses they are. The quality and presentation are world-class.",
    author: "Maya R.", role: "Buyer", location: "London, UK",
  },
  {
    quote: "The platform handles everything — payments, shipping, customer trust. I focus on what I love: designing.",
    author: "Kofi A.", role: "Vendor — Nana's Heritage", location: "Accra, Ghana",
  },
];
