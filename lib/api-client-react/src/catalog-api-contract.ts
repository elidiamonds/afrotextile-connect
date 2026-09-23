/**
 * Compile-only contract for the generated client surface used by the vendor
 * catalog and order dashboard.
 *
 * Keep this list in sync with the imports in VendorProductManager and
 * VendorOrderManager. A missing generated export should fail this focused
 * check before the storefront package is typechecked.
 */
import {
  createProduct,
  getGetStorefrontQueryKey,
  getListProductHistoryQueryKey,
  getListProductsQueryKey,
  getListVendorOrdersQueryKey,
  getListVendorProductsForReviewQueryKey,
  getListVendorProductsQueryKey,
  requestProductImageUpload,
  updateProduct,
  useCreateProduct,
  useListProductHistory,
  useListVendorOrders,
  useListVendorProducts,
  useListVendorProductsForReview,
  useUpdateOrderItemStatus,
  useUpdateProduct,
  type OrderItemStatus,
  type Product,
  type ProductHistoryEntry,
} from "./index";

export type CatalogApiContract = {
  createProduct: typeof createProduct;
  getGetStorefrontQueryKey: typeof getGetStorefrontQueryKey;
  getListProductHistoryQueryKey: typeof getListProductHistoryQueryKey;
  getListProductsQueryKey: typeof getListProductsQueryKey;
  getListVendorOrdersQueryKey: typeof getListVendorOrdersQueryKey;
  getListVendorProductsForReviewQueryKey: typeof getListVendorProductsForReviewQueryKey;
  getListVendorProductsQueryKey: typeof getListVendorProductsQueryKey;
  requestProductImageUpload: typeof requestProductImageUpload;
  updateProduct: typeof updateProduct;
  useCreateProduct: typeof useCreateProduct;
  useListProductHistory: typeof useListProductHistory;
  useListVendorOrders: typeof useListVendorOrders;
  useListVendorProducts: typeof useListVendorProducts;
  useListVendorProductsForReview: typeof useListVendorProductsForReview;
  useUpdateOrderItemStatus: typeof useUpdateOrderItemStatus;
  useUpdateProduct: typeof useUpdateProduct;
  OrderItemStatus: OrderItemStatus;
  Product: Product;
  ProductHistoryEntry: ProductHistoryEntry;
};