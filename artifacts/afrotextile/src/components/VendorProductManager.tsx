import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetStorefrontQueryKey,
  getListProductsQueryKey,
  getListProductHistoryQueryKey,
  getListVendorProductsQueryKey,
  getListVendorProductsForReviewQueryKey,
  createProduct as createProductRequest,
  requestProductImageUpload,
  type Product,
  type ProductHistoryEntry,
  useCreateProduct,
  useListProductHistory,
  useListVendorProducts,
  useListVendorProductsForReview,
  updateProduct as updateProductRequest,
  useUpdateProduct,
} from "@workspace/api-client-react";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import ShopifyVendorProductManager, { ShopifyVendorReviewCatalog } from "./ShopifyVendorProductManager";

type ProductForm = {
  name: string;
  price: string;
  originalPrice: string;
  imageUrl: string;
  imageName: string;
  category: string;
  sizes: string;
  fabricType: string;
  description: string;
  inventory: string;
  status: "draft" | "published";
};

const emptyForm: ProductForm = {
  name: "",
  price: "",
  originalPrice: "",
  imageUrl: "",
  imageName: "",
  category: "Women's Fashion",
  sizes: "",
  fabricType: "",
  description: "",
  inventory: "0",
  status: "draft",
};

const inputClass =
  "mt-2 h-11 w-full border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary";
const reviewerCatalogRefreshInterval = 5_000;

const historyFieldLabels: Record<string, string> = {
  name: "Name",
  price: "Price",
  originalPrice: "Compare-at price",
  imageUrl: "Photo",
  category: "Category",
  sizes: "Sizes",
  fabricType: "Fabric",
  description: "Description",
  inventory: "Inventory",
  status: "Status",
};

function formatHistoryValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "None";
  if (Array.isArray(value)) return value.join(", ") || "None";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function ProductHistory({
  productId,
  liveRefresh = false,
}: {
  productId: string;
  liveRefresh?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const historyQuery = useListProductHistory(productId, {
    query: {
      enabled: open,
      queryKey: getListProductHistoryQueryKey(productId),
      refetchInterval: liveRefresh ? reviewerCatalogRefreshInterval : false,
      refetchIntervalInBackground: false,
    },
  });

  return (
    <details
      className="mt-4 border-t border-border pt-3"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <History className="h-4 w-4 text-primary" />
        View change history
      </summary>
      <div className="mt-3 space-y-3">
        {historyQuery.isLoading && (
          <p className="text-xs text-muted-foreground">Loading history…</p>
        )}
        {historyQuery.isError && (
          <p className="text-xs text-destructive">
            Product history could not be loaded.
          </p>
        )}
        {!historyQuery.isLoading &&
          !historyQuery.isError &&
          historyQuery.data?.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No changes have been recorded for this product.
            </p>
          )}
        {historyQuery.data?.map((entry) => (
          <HistoryEntry key={entry.id} entry={entry} />
        ))}
      </div>
    </details>
  );
}

function HistoryEntry({ entry }: { entry: ProductHistoryEntry }) {
  const changeLabels = Object.entries(entry.changes).map(([field, change]) => {
    const label = historyFieldLabels[field] ?? field;
    return `${label}: ${formatHistoryValue(change.from)} → ${formatHistoryValue(change.to)}`;
  });

  return (
    <div className="border-l-2 border-primary/40 pl-3 text-xs">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-semibold uppercase tracking-wider text-foreground">
          {entry.action}
        </span>
        <span className="text-muted-foreground">
          {new Date(entry.changedAt).toLocaleString()}
        </span>
      </div>
      <p className="mt-1 text-muted-foreground">By {entry.actorUserId}</p>
      {changeLabels.length > 0 && (
        <ul className="mt-2 space-y-1 text-muted-foreground">
          {changeLabels.map((change) => (
            <li key={change}>{change}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function productToForm(product: Product): ProductForm {
  const imageReference = product.images[0] ?? "";
  return {
    name: product.name,
    price: product.price.toString(),
    originalPrice: product.originalPrice?.toString() ?? "",
    imageUrl: imageReference.startsWith("/api/storage/objects/")
      ? imageReference.slice("/api/storage".length)
      : imageReference,
    imageName: "",
    category: product.category,
    sizes: product.sizes.join(", "),
    fabricType: product.fabricType,
    description: product.description,
    inventory: product.inventory.toString(),
    status: product.status === "published" ? "published" : "draft",
  };
}

function newSaveRequestKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function uploadFileWithProgress(
  uploadURL: string,
  file: File,
  onProgress: (progress: number) => void,
  signal?: AbortSignal,
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const abortRequest = () => request.abort();
    const cleanup = () => {
      signal?.removeEventListener("abort", abortRequest);
    };
    const rejectWithCleanup = (error: Error) => {
      cleanup();
      reject(error);
    };

    request.open("PUT", uploadURL);
    request.setRequestHeader("Content-Type", file.type);
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        cleanup();
        resolve();
        return;
      }
      rejectWithCleanup(new Error(`Image upload failed (${request.status})`));
    });
    request.addEventListener("error", () => {
      rejectWithCleanup(new Error("Network error while uploading the image."));
    });
    request.addEventListener("abort", () => {
      const error = new Error("Image upload was canceled.");
      error.name = "AbortError";
      rejectWithCleanup(error);
    });
    signal?.addEventListener("abort", abortRequest, { once: true });
    if (signal?.aborted) {
      request.abort();
      return;
    }
    try {
      request.send(file);
    } catch (error) {
      rejectWithCleanup(
        error instanceof Error
          ? error
          : new Error("Could not start the image upload."),
      );
    }
  });
}

type ActiveImageUpload = {
  canceled: boolean;
  controller: AbortController;
};

function LegacyVendorProductManager({
  vendorId,
  approved,
  reviewOnly = false,
}: {
  vendorId: string;
  approved: boolean;
  reviewOnly?: boolean;
}) {
  const managedCatalogQuery = useListVendorProducts(
    vendorId,
    {
      query: {
        queryKey: getListVendorProductsQueryKey(vendorId),
        enabled: approved && !reviewOnly,
      },
    },
  );
  const reviewCatalogQuery = useListVendorProductsForReview(vendorId, {
    query: {
      queryKey: getListVendorProductsForReviewQueryKey(vendorId),
      enabled: approved && reviewOnly,
      refetchInterval: reviewOnly ? reviewerCatalogRefreshInterval : false,
      refetchIntervalInBackground: false,
    },
  });
  const catalogQuery = reviewOnly ? reviewCatalogQuery : managedCatalogQuery;
  const products = catalogQuery.data ?? [];
  const { isLoading, isError, isFetching, refetch } = catalogQuery;
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [failedImageUpload, setFailedImageUpload] = useState<{
    file: File;
    message: string;
  } | null>(null);
  const [cancelingImageUpload, setCancelingImageUpload] = useState(false);
  const cleanupInFlight = useRef(new Set<string>());
  const temporaryImageReferences = useRef(new Set<string>());
  const activeImageUpload = useRef<ActiveImageUpload | null>(null);
  const createRequestKey = useRef<string | null>(null);
  const expectedUpdatedAt = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteUploadedImage = async (
    imageReference: string,
    keepalive = false,
  ) => {
    if (!imageReference.startsWith("/objects/uploads/")) return;
    if (cleanupInFlight.current.has(imageReference)) return;
    cleanupInFlight.current.add(imageReference);

    try {
      const response = await fetch(`/api/vendors/${vendorId}/product-image`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectPath: imageReference }),
        ...(keepalive ? { keepalive: true } : {}),
      });
      if (!response.ok && response.status !== 409) {
        throw new Error(`Image cleanup failed (${response.status})`);
      }
      temporaryImageReferences.current.delete(imageReference);
    } catch (error) {
      console.error("Could not clean up product image", error);
    } finally {
      cleanupInFlight.current.delete(imageReference);
    }
  };

  useEffect(() => {
    const cleanupTemporaryImages = () => {
      for (const imageReference of temporaryImageReferences.current) {
        void deleteUploadedImage(imageReference, true);
      }
    };

    window.addEventListener("pagehide", cleanupTemporaryImages);
    return () => {
      window.removeEventListener("pagehide", cleanupTemporaryImages);
      cleanupTemporaryImages();
    };
  }, [vendorId]);

  const refreshCatalog = () => {
    queryClient.invalidateQueries({
      queryKey: getListVendorProductsQueryKey(vendorId),
    });
    queryClient.invalidateQueries({
      queryKey: getGetStorefrontQueryKey(vendorId),
    });
    queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
  };

  const createProduct = useCreateProduct({
    mutation: {
      mutationFn: ({ id, data }) =>
        createProductRequest(id, data, {
          headers: {
            "Idempotency-Key": (createRequestKey.current ??=
              newSaveRequestKey()),
          },
        }),
      onSuccess: (_data, variables) => {
        refreshCatalog();
        if (variables.data.imageUrl) {
          temporaryImageReferences.current.delete(variables.data.imageUrl);
        }
        setForm(emptyForm);
        createRequestKey.current = null;
        toast({ title: "Product added to your catalog" });
      },
      onError: (error) =>
        toast({
          title: "Could not add product",
          description: error instanceof Error ? error.message : undefined,
          variant: "destructive",
        }),
    },
  });
  const updateProduct = useUpdateProduct({
    mutation: {
      mutationFn: ({ id, data }) =>
        updateProductRequest(id, data, {
          headers: expectedUpdatedAt.current
            ? { "If-Match": expectedUpdatedAt.current }
            : undefined,
        }),
      onSuccess: (_data, variables) => {
        refreshCatalog();
        if (variables.data.imageUrl) {
          temporaryImageReferences.current.delete(variables.data.imageUrl);
        }
        setEditingId(null);
        setForm(emptyForm);
        expectedUpdatedAt.current = null;
        toast({ title: "Product updated" });
      },
      onError: (error) =>
        toast({
          title: "Could not update product",
          description: error instanceof Error ? error.message : undefined,
          variant: "destructive",
        }),
    },
  });

  useEffect(() => {
    if (!editingId) return;
    const current = products.find((product) => product.id === editingId);
    if (current) {
      expectedUpdatedAt.current = current.updatedAt;
      setForm(productToForm(current));
    }
  }, [editingId, products]);

  const setField = <K extends keyof ProductForm>(
    field: K,
    value: ProductForm[K],
  ) => setForm((current) => ({ ...current, [field]: value }));

  const imageSrc = (imageReference: string) =>
    imageReference.startsWith("/objects/")
      ? `/api/storage${imageReference}`
      : imageReference;

  const uploadImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Choose an image file",
        description: "Product photos must be JPG, PNG, WebP, or another image format.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Image is too large",
        description: "Product photos must be 10 MB or smaller.",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);
    setUploadProgress(0);
    setFailedImageUpload(null);
    setCancelingImageUpload(false);
    const operation: ActiveImageUpload = {
      canceled: false,
      controller: new AbortController(),
    };
    activeImageUpload.current = operation;
    let objectPath = "";
    try {
      const upload = await requestProductImageUpload(vendorId, {
        name: file.name,
        size: file.size,
        contentType: file.type,
      });
      objectPath = upload.objectPath;
      temporaryImageReferences.current.add(objectPath);
      if (operation.canceled) {
        await deleteUploadedImage(objectPath);
        return;
      }
      await uploadFileWithProgress(
        upload.uploadURL,
        file,
        setUploadProgress,
        operation.controller.signal,
      );
      const previousImageReference = form.imageUrl;
      if (
        previousImageReference &&
        previousImageReference !== upload.objectPath &&
        temporaryImageReferences.current.has(previousImageReference)
      ) {
        void deleteUploadedImage(previousImageReference);
      }
      setForm((current) => ({
        ...current,
        imageUrl: upload.objectPath,
        imageName: file.name,
      }));
      setFailedImageUpload(null);
      toast({
        title: "Photo uploaded",
        description: "Save the product to apply it.",
      });
    } catch (error) {
      if (objectPath) {
        await deleteUploadedImage(objectPath);
      }
      if (operation.canceled) {
        setFailedImageUpload(null);
        toast({
          title: "Photo upload canceled",
          description: "Your product details are still here.",
        });
        return;
      }
      const errorMessage =
        error instanceof Error
          ? error.message
          : "The image could not be uploaded. Try again.";
      const message = objectPath
        ? errorMessage
        : `Could not prepare the photo upload. ${errorMessage}`;
      setFailedImageUpload({ file, message });
      toast({
        title: "Could not upload photo",
        description: message,
        variant: "destructive",
      });
    } finally {
      if (activeImageUpload.current === operation) {
        activeImageUpload.current = null;
      }
      setUploadingImage(false);
      setUploadProgress(null);
      setCancelingImageUpload(false);
    }
  };

  const cancelImageUpload = () => {
    const operation = activeImageUpload.current;
    if (!operation || !uploadingImage || operation.canceled) return;
    operation.canceled = true;
    setCancelingImageUpload(true);
    operation.controller.abort();
  };

  const uploadImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void uploadImageFile(file);
  };

  const cancelForm = () => {
    if (uploadingImage) {
      cancelImageUpload();
      return;
    }
    if (
      form.imageUrl &&
      temporaryImageReferences.current.has(form.imageUrl)
    ) {
      void deleteUploadedImage(form.imageUrl);
    }
    setUploadProgress(null);
    setFailedImageUpload(null);
    setEditingId(null);
    setForm(emptyForm);
    expectedUpdatedAt.current = null;
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = {
      name: form.name.trim(),
      price: Number(form.price),
      originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
      imageUrl: form.imageUrl.trim() || undefined,
      category: form.category.trim(),
      sizes: form.sizes
        .split(",")
        .map((size) => size.trim())
        .filter(Boolean),
      fabricType: form.fabricType.trim(),
      description: form.description.trim(),
      inventory: Number(form.inventory),
      status: form.status,
    };

    if (
      !data.name ||
      !Number.isFinite(data.price) ||
      data.price < 0 ||
      !data.category ||
      !data.fabricType ||
      data.description.length < 10 ||
      !Number.isInteger(data.inventory) ||
      data.inventory < 0
    ) {
      toast({
        title: "Check the product details",
        description:
          "Add a name, valid price, category, fabric, description, and whole-number stock.",
        variant: "destructive",
      });
      return;
    }

    if (editingId) {
      updateProduct.mutate({ id: editingId, data });
    } else {
      createProduct.mutate({ id: vendorId, data });
    }
  };

  const archive = (product: Product) => {
    expectedUpdatedAt.current = product.updatedAt;
    updateProduct.mutate({
      id: product.id,
      data: { status: "archived" },
    });
  };

  const busy = createProduct.isPending || updateProduct.isPending || uploadingImage;

  return (
    <section className="space-y-6 rounded-sm border border-border bg-card p-6 md:p-10">
      <div>
        <span className="font-sans text-xs uppercase tracking-[0.3em] text-primary">
          {reviewOnly ? "Vendor catalog" : "Catalog"}
        </span>
        <h2 className="mt-2 font-serif text-2xl font-bold">
          {reviewOnly ? "Products and change history" : "Products and inventory"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {reviewOnly
            ? "Review every catalog item, including drafts and archived products, with its recorded changes."
            : "Add products, update stock, or archive pieces you no longer sell."}
        </p>
      </div>

      {!approved ? (
        <div className="border border-primary/30 bg-primary/5 p-5 text-sm leading-6 text-muted-foreground">
          {reviewOnly
            ? "The catalog becomes available after the vendor application is approved."
            : "Product publishing unlocks after your vendor application is approved. You can return here as soon as the review is complete."}
        </div>
      ) : (
        <>
          {!reviewOnly && (
            <form onSubmit={submit} className="space-y-5 border-b border-border pb-8">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="text-sm text-foreground">
                Product name
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={(event) => setField("name", event.target.value)}
                  placeholder="e.g. Hand-dyed Adire wrap"
                  required
                />
              </label>
              <label className="text-sm text-foreground">
                Category
                <input
                  className={inputClass}
                  value={form.category}
                  onChange={(event) => setField("category", event.target.value)}
                  placeholder="Women's Fashion"
                  required
                />
              </label>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              <label className="text-sm text-foreground">
                Price
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => setField("price", event.target.value)}
                  required
                />
              </label>
              <label className="text-sm text-foreground">
                Compare-at price
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.originalPrice}
                  onChange={(event) =>
                    setField("originalPrice", event.target.value)
                  }
                />
              </label>
              <label className="text-sm text-foreground">
                Units in stock
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="1"
                  value={form.inventory}
                  onChange={(event) => setField("inventory", event.target.value)}
                  required
                />
              </label>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="text-sm text-foreground">
                Fabric or material
                <input
                  className={inputClass}
                  value={form.fabricType}
                  onChange={(event) =>
                    setField("fabricType", event.target.value)
                  }
                  placeholder="Adire"
                  required
                />
              </label>
              <label className="text-sm text-foreground">
                Sizes
                <input
                  className={inputClass}
                  value={form.sizes}
                  onChange={(event) => setField("sizes", event.target.value)}
                  placeholder="S, M, L, XL"
                />
              </label>
            </div>
            <div className="block text-sm text-foreground">
              Product photo
              <div className="mt-2 flex flex-wrap items-center gap-4">
                {form.imageUrl && (
                  <img
                    src={imageSrc(form.imageUrl)}
                    alt="Product preview"
                    className="h-20 w-20 object-cover"
                  />
                )}
                <div className="space-y-2">
                  <label
                    className="inline-flex cursor-pointer items-center border border-primary px-4 py-2 text-sm text-primary transition-colors hover:bg-primary/5 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
                    data-testid="product-photo-trigger"
                  >
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/*"
                      aria-label="Product photo"
                      onChange={uploadImage}
                      disabled={busy}
                    />
                    {uploadingImage
                      ? "Upload in progress…"
                      : failedImageUpload
                        ? "Choose a different photo"
                        : form.imageUrl
                          ? "Replace photo"
                          : "Choose photo"}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {form.imageName || "JPG, PNG, or WebP · up to 10 MB"}
                  </p>
                  {uploadingImage && (
                    <div
                      className="w-full min-w-56 max-w-sm space-y-2"
                      role="status"
                      aria-live="polite"
                      aria-busy="true"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                        <span className="font-medium text-foreground">
                          {cancelingImageUpload
                            ? "Canceling photo upload…"
                            : "Uploading product photo…"}
                        </span>
                        <span className="text-muted-foreground">
                          {uploadProgress ?? 0}%
                        </span>
                      </div>
                      <Progress
                        value={uploadProgress ?? 0}
                        aria-label="Photo upload progress"
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground">
                        {cancelingImageUpload
                          ? "Cleaning up the temporary photo…"
                          : "Save product will be available when the upload finishes."}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={cancelImageUpload}
                        disabled={cancelingImageUpload}
                        aria-label="Cancel photo upload"
                      >
                        {cancelingImageUpload ? "Canceling…" : "Cancel upload"}
                      </Button>
                    </div>
                  )}
                  {!uploadingImage &&
                    form.imageUrl &&
                    form.imageName &&
                    !failedImageUpload && (
                      <p
                        className="text-xs text-primary"
                        role="status"
                        aria-live="polite"
                      >
                        Photo uploaded. Save the product to apply it.
                      </p>
                    )}
                  {failedImageUpload && (
                    <div
                      className="space-y-2 border border-destructive/40 bg-destructive/5 p-3 text-xs"
                      role="alert"
                    >
                      <p className="font-medium text-destructive">
                        Photo upload failed. Your product details are still
                        here.
                      </p>
                      <p className="text-muted-foreground">
                        {failedImageUpload.message}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          void uploadImageFile(failedImageUpload.file)
                        }
                        disabled={busy}
                      >
                        Retry this photo
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <label className="block text-sm text-foreground">
              Description
              <textarea
                className="mt-2 min-h-28 w-full resize-y border border-input bg-background px-3 py-3 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary"
                value={form.description}
                onChange={(event) =>
                  setField("description", event.target.value)
                }
                placeholder="Tell shoppers what makes this piece special."
                required
              />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-foreground">
                Visibility
                <select
                  className="ml-3 h-10 border border-input bg-background px-3 text-sm"
                  value={form.status}
                  onChange={(event) =>
                    setField(
                      "status",
                      event.target.value as ProductForm["status"],
                    )
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="published">Publish to storefront</option>
                </select>
              </label>
              <Button type="submit" variant="hero" disabled={busy}>
                {uploadingImage
                  ? "Upload in progress…"
                  : busy
                    ? "Saving…"
                    : editingId
                      ? "Save product"
                      : "Add product"}
              </Button>
              {(editingId || form.imageUrl) && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    cancelForm();
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
            </form>
          )}

          {isLoading && (
            <p className="text-sm text-muted-foreground">Loading catalog…</p>
          )}
          {isError && (
            <div className="flex flex-col items-start gap-3 border border-destructive/40 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-destructive">
                {reviewOnly
                  ? "This vendor catalog could not be loaded."
                  : "Your catalog could not be loaded."}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                {isFetching ? "Retrying catalog…" : "Retry catalog"}
              </Button>
            </div>
          )}
          {!isLoading && !isError && products.length === 0 && (
            <div className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              {reviewOnly
                ? "This vendor has no catalog products yet."
                : "Your catalog is empty. Add your first product above."}
            </div>
          )}
          <div className="space-y-3">
            {products.map((product) => (
              <article
                key={product.id}
                className="space-y-4 border border-border p-4"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    {product.images[0] && (
                      <img
                        src={product.images[0]}
                        alt=""
                        className="h-14 w-14 shrink-0 object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-serif text-lg font-semibold">
                          {product.name}
                        </h3>
                        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {product.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        ${product.price.toFixed(2)} · {product.inventory} in stock ·{" "}
                        {product.category}
                      </p>
                    </div>
                  </div>
                  {!reviewOnly && (
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingId(product.id)}
                      >
                        Edit
                      </Button>
                      {product.status !== "archived" && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => archive(product)}
                        >
                          Archive
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <ProductHistory
                  productId={product.id}
                  liveRefresh={reviewOnly}
                />
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default function VendorProductManager(props: {
  vendorId: string; approved: boolean; reviewOnly?: boolean;
}) {
  return props.reviewOnly
    ? <>
        <LegacyVendorProductManager {...props} />
        {props.approved && <ShopifyVendorReviewCatalog vendorId={props.vendorId} />}
      </>
    : <ShopifyVendorProductManager vendorId={props.vendorId} approved={props.approved} />;
}
