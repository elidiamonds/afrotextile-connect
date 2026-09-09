export type OrderStatus = "Pending" | "Processing" | "Shipped" | "Delivered" | "Cancelled";

export interface VendorOrder {
  id: string;
  customer: string;
  customerLocation: string;
  product: string;
  size: string;
  quantity: number;
  total: number;
  status: OrderStatus;
  date: string;
}

export const vendorOrders: VendorOrder[] = [
  { id: "ORD-2041", customer: "Amara Eze", customerLocation: "London, UK", product: "Ankara Co-ord Set", size: "M", quantity: 1, total: 285, status: "Delivered", date: "2026-08-28" },
  { id: "ORD-2042", customer: "Chioma Okafor", customerLocation: "Toronto, CA", product: "Aso-Oke Corset", size: "S", quantity: 2, total: 390, status: "Shipped", date: "2026-08-30" },
  { id: "ORD-2043", customer: "Tunde Bello", customerLocation: "Lagos, NG", product: "Ankara Co-ord Set", size: "L", quantity: 1, total: 285, status: "Processing", date: "2026-09-01" },
  { id: "ORD-2044", customer: "Zainab Yusuf", customerLocation: "New York, US", product: "Aso-Oke Corset", size: "M", quantity: 1, total: 195, status: "Pending", date: "2026-09-02" },
  { id: "ORD-2045", customer: "Kemi Adeyemi", customerLocation: "Dubai, AE", product: "Ankara Co-ord Set", size: "S", quantity: 3, total: 855, status: "Shipped", date: "2026-09-02" },
  { id: "ORD-2046", customer: "Funke Adebayo", customerLocation: "Atlanta, US", product: "Aso-Oke Corset", size: "L", quantity: 1, total: 195, status: "Delivered", date: "2026-08-25" },
  { id: "ORD-2047", customer: "Ngozi Obi", customerLocation: "Abuja, NG", product: "Ankara Co-ord Set", size: "XL", quantity: 2, total: 570, status: "Cancelled", date: "2026-08-27" },
  { id: "ORD-2048", customer: "Bisi Olawale", customerLocation: "Manchester, UK", product: "Aso-Oke Corset", size: "XS", quantity: 1, total: 195, status: "Pending", date: "2026-09-03" },
];

export const orderStatuses: OrderStatus[] = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];

export const statusStyles: Record<OrderStatus, string> = {
  Pending: "bg-accent/15 text-accent border-accent/30",
  Processing: "bg-primary/15 text-primary border-primary/30",
  Shipped: "bg-secondary text-secondary-foreground border-secondary",
  Delivered: "bg-primary/20 text-primary border-primary/40",
  Cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};
