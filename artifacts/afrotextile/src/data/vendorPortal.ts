export type VendorPlan = "Starter" | "Growth" | "Enterprise";

export type VendorApplication = {
  businessName: string;
  ownerName: string;
  email: string;
  location: string;
  category: string;
  story: string;
  plan: VendorPlan;
  submittedAt: string;
};

export type VendorProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  inventory: number;
  status: "Published" | "Draft";
};

export type VendorOrder = {
  id: string;
  item: string;
  date: string;
  total: number;
  status: "Processing" | "Shipped" | "Delivered";
};

export type VendorWorkspace = {
  application: VendorApplication;
  storefront: {
    tagline: string;
    about: string;
    accent: string;
  };
  products: VendorProduct[];
  orders: VendorOrder[];
};

export const VENDOR_STORAGE_KEY = "afrotextile-vendor-workspace-v1";

export const planDetails: Record<VendorPlan, { price: string; note: string }> = {
  Starter: { price: "Free", note: "For new ateliers testing the waters." },
  Growth: { price: "$29 / month", note: "For established labels scaling with intention." },
  Enterprise: { price: "Custom", note: "For larger houses with bespoke support." },
};

export const planValues: VendorPlan[] = ["Starter", "Growth", "Enterprise"];

export const categories = [
  "Women's Fashion",
  "Men's Fashion",
  "Accessories",
  "Fabrics & Textiles",
  "Cultural Fashion",
  "Tailoring Materials",
];

export const createId = () =>
  `product-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;