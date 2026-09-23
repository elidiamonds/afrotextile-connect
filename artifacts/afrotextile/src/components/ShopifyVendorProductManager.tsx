import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Variant = {
  id: string; price: string; compareAtPrice: string | null; inventoryQuantity: number;
  inventoryItem: { id: string; tracked: boolean;
    inventoryLevel: { quantities: Array<{ name: string; quantity: number }> } | null };
  selectedOptions: Array<{ name: string; value: string }>;
};
type ShopProduct = {
  id: string; title: string; descriptionHtml: string; productType: string;
  status: string; updatedAt: string;
  options: Array<{ id: string; name: string; optionValues: Array<{ name: string }> }>;
  media: { nodes: Array<{ id: string; image?: { url: string } | null }> };
  collections: { nodes: Array<{ id: string; ruleSet: unknown | null }> };
  variants: { nodes: Variant[] };
};
type ProductRow = { productId: string; product: ShopProduct | null };
type HistoryEntry = { id: string; action: string; changedAt: string };
type VariantForm = { size: string; color: string; inventory: string };
type Form = {
  title: string; description: string; category: string; price: string;
  compareAtPrice: string; collectionId: string; imageUrl: string;
  status: "draft" | "published" | "archived";
  variants: VariantForm[];
};
const emptyForm: Form = {
  title: "", description: "", category: "", price: "", compareAtPrice: "",
  collectionId: "", imageUrl: "", status: "draft", variants: [{ size: "", color: "", inventory: "0" }],
};
const inputClass = "mt-1 h-10 w-full border border-input bg-background px-3 text-sm";
function managedStock(variant: Variant) {
  return variant.inventoryItem.inventoryLevel?.quantities
    .find((quantity) => quantity.name === "available")?.quantity ?? 0;
}
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, credentials: "same-origin" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Shopify request failed.");
  return data as T;
}
function formFromProduct(product: ShopProduct): Form {
  const text = document.createElement("template");
  text.innerHTML = product.descriptionHtml;
  return {
    title: product.title, description: text.content.textContent ?? "", category: product.productType,
    price: product.variants.nodes[0]?.price ?? "",
    compareAtPrice: product.variants.nodes[0]?.compareAtPrice ?? "",
    collectionId: product.collections.nodes.find((c) => !c.ruleSet)?.id ?? "",
    imageUrl: product.media.nodes[0]?.image?.url ?? "",
    status: product.status === "ACTIVE" ? "published" :
      product.status === "ARCHIVED" ? "archived" : "draft",
    variants: product.variants.nodes.map((variant) => ({
      size: variant.selectedOptions.find((option) => option.name === "Size")?.value ?? "",
      color: variant.selectedOptions.find((option) => option.name === "Color")?.value ?? "",
      inventory: String(managedStock(variant)),
    })),
  };
}
export default function ShopifyVendorProductManager({ vendorId, approved }: {
  vendorId: string; approved: boolean;
}) {
  const [form, setForm] = useState<Form>(emptyForm);
  const [editing, setEditing] = useState<ShopProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const client = useQueryClient();
  const catalogKey = ["shopify-vendor-catalog", vendorId];
  const catalog = useQuery({
    queryKey: catalogKey,
    queryFn: () => api<ProductRow[]>(`/api/shopify/vendors/${vendorId}/products`),
    enabled: approved,
    staleTime: 0,
  });
  const options = useQuery({
    queryKey: ["shopify-vendor-options", vendorId],
    queryFn: () => api<{ collections: Array<{ id: string; title: string }>;
      location: { id: string; name: string } | null; hasPublication: boolean }>(
      `/api/shopify/vendor-catalog/options?vendorId=${encodeURIComponent(vendorId)}`),
    enabled: approved,
  });
  const change = <K extends keyof Form>(field: K, value: Form[K]) =>
    setForm((current) => ({ ...current, [field]: value }));
  const changeVariant = (index: number, field: keyof VariantForm, value: string) =>
    setForm((current) => ({
      ...current,
      variants: current.variants.map((v, i) => i === index ? { ...v, [field]: value } : v),
    }));
  const edit = (product: ShopProduct) => {
    setEditing(product);
    setForm(formFromProduct(product));
    document.getElementById("shopify-product-form")?.scrollIntoView({ behavior: "smooth" });
  };
  const reset = () => { setEditing(null); setForm(emptyForm); };
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const variants = form.variants.map((v) => {
      const previous = editing?.variants.nodes.find((item) =>
        (item.selectedOptions.find((option) => option.name === "Size")?.value ?? "") === v.size &&
        (item.selectedOptions.find((option) => option.name === "Color")?.value ?? "") === v.color);
      return { ...v, inventory: Number(v.inventory),
        expectedInventory: previous ? managedStock(previous) : null };
    });
    if (variants.some((v) => !Number.isInteger(v.inventory) || v.inventory < 0) ||
        new Set(variants.map((v) => JSON.stringify([v.size.trim().toLowerCase(), v.color.trim().toLowerCase()]))).size !== variants.length) {
      toast({ title: "Check variants", description: "Each size and color needs unique, whole-number stock.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await api(editing ? `/api/shopify/vendor-products/${encodeURIComponent(editing.id)}` :
        `/api/shopify/vendors/${vendorId}/products`, {
        method: editing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(editing ? { "If-Match": editing.updatedAt } : {}),
        },
        body: JSON.stringify({
          ...form, collectionId: form.collectionId || null,
          compareAtPrice: form.compareAtPrice || null, variants,
        }),
      });
      await client.invalidateQueries({ queryKey: catalogKey });
      if (editing) await client.invalidateQueries({ queryKey: ["shopify-product-history", editing.id] });
      await client.invalidateQueries({ queryKey: ["shopify-products"] });
      reset();
      toast({ title: "Product saved in Shopify" });
    } catch (error) {
      await client.invalidateQueries({ queryKey: catalogKey });
      toast({ title: "Could not finish Shopify save", description:
        `${error instanceof Error ? error.message : "Try again."} A draft may have been created; refresh the catalog before retrying.`,
        variant: "destructive" });
    } finally { setSaving(false); }
  };
  return (
    <section className="space-y-6 rounded-sm border border-border bg-card p-6 md:p-10">
      <div>
        <span className="text-xs uppercase tracking-[0.3em] text-primary">Shopify catalog</span>
        <h2 className="mt-2 font-serif text-2xl font-bold">Products and inventory</h2>
        <p className="mt-1 text-sm text-muted-foreground">Products, variants, stock and publication are saved in Shopify.</p>
      </div>
      {!approved ? <p className="text-sm">Product publishing unlocks after vendor approval.</p> : <>
        {options.isError && <p role="alert" className="text-sm text-destructive">
          Could not load Shopify collections or publication. <Button variant="outline" onClick={() => options.refetch()}>Retry</Button>
        </p>}
        <form id="shopify-product-form" onSubmit={save} className="space-y-4 border-b border-border pb-8">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">Product name<input className={inputClass} required value={form.title} onChange={(e) => change("title", e.target.value)} /></label>
            <label className="text-sm">Category<input className={inputClass} required value={form.category} onChange={(e) => change("category", e.target.value)} /></label>
            <label className="text-sm">Price<input className={inputClass} type="number" min="0" step="0.01" required value={form.price} onChange={(e) => change("price", e.target.value)} /></label>
            <label className="text-sm">Compare-at price<input className={inputClass} type="number" min="0" step="0.01" value={form.compareAtPrice} onChange={(e) => change("compareAtPrice", e.target.value)} /></label>
            <label className="text-sm">Shopify collection
              <select className={inputClass} value={form.collectionId} onChange={(e) => change("collectionId", e.target.value)}>
                <option value="">No collection</option>
                {options.data?.collections.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-sm">Description
            <textarea required className={`${inputClass} h-24 py-2`} value={form.description} onChange={(e) => change("description", e.target.value)} />
          </label>
          <label className="block text-sm">Public product image URL (optional)
            <input className={inputClass} type="url" placeholder="https://…" value={form.imageUrl}
              onChange={(e) => change("imageUrl", e.target.value)} />
            <span className="mt-1 block text-xs text-muted-foreground">Shopify imports publicly accessible HTTPS images. A changed URL adds a new featured image.</span>
          </label>
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold">Sizes, colors and stock</legend>
            <p className="text-xs text-muted-foreground">Enter one row for each size/color combination. Leave both blank for a single default variant. Units are managed at {options.data?.location?.name ?? "the Shopify inventory location"}; other Shopify locations are unchanged.</p>
            {form.variants.map((variant, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <label className="text-sm">Size<input className={inputClass} value={variant.size} onChange={(e) => changeVariant(index, "size", e.target.value)} placeholder="S" /></label>
              <label className="text-sm">Color<input className={inputClass} value={variant.color} onChange={(e) => changeVariant(index, "color", e.target.value)} placeholder="Indigo" /></label>
              <label className="text-sm">Units at {options.data?.location?.name ?? "managed location"}<input className={inputClass} type="number" min="0" step="1" required value={variant.inventory} onChange={(e) => changeVariant(index, "inventory", e.target.value)} /></label>
              <Button type="button" variant="ghost" className="self-end" disabled={form.variants.length === 1 || saving} onClick={() =>
                change("variants", form.variants.filter((_, i) => i !== index))}>Remove</Button>
            </div>)}
            <Button type="button" variant="outline" disabled={form.variants.length >= 100 || saving} onClick={() =>
              change("variants", [...form.variants, { size: "", color: "", inventory: "0" }])}>Add variant</Button>
          </fieldset>
          <label className="block text-sm">Visibility
            <select className={inputClass} value={form.status} onChange={(e) => change("status", e.target.value as Form["status"])}>
              <option value="draft">Draft</option>
              <option value="published" disabled={!options.data?.hasPublication}>Publish to Shopify storefront</option>
              {editing && <option value="archived">Archive</option>}
            </select>
          </label>
          {!options.data?.hasPublication && <p className="text-xs text-muted-foreground">Publishing requires the Shopify Sales Channel publication. Drafts can still be saved.</p>}
          <div className="flex gap-2">
            <Button type="submit" variant="hero" disabled={saving || options.isLoading || options.isError}>{saving ? "Saving in Shopify…" : editing ? "Save changes" : "Create in Shopify"}</Button>
            {editing && <Button type="button" variant="ghost" onClick={reset} disabled={saving}>Cancel</Button>}
          </div>
        </form>
        {catalog.isLoading && <p>Loading Shopify catalog…</p>}
        {catalog.isError && <p role="alert" className="text-sm text-destructive">Could not load Shopify products. <Button variant="outline" onClick={() => catalog.refetch()}>Retry</Button></p>}
        {catalog.data?.length === 0 && <p className="text-sm text-muted-foreground">No Shopify products yet. Add your first product above.</p>}
        <div className="space-y-3">
          {catalog.data?.map(({ productId, product }) => <article key={productId} className="flex items-center justify-between gap-4 border border-border p-4">
            {product ? <>
              <div><h3 className="font-serif text-lg font-semibold">{product.title}</h3>
                <p className="text-xs text-muted-foreground">{product.status} · {product.variants.nodes.length} variant(s) · {product.variants.nodes.reduce((sum, v) => sum + managedStock(v), 0)} at {options.data?.location?.name ?? "managed location"} · {product.variants.nodes.reduce((sum, v) => sum + v.inventoryQuantity, 0)} total across Shopify locations</p>
                <ProductAudit productId={productId} />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => edit(product)} disabled={saving}>Edit</Button>
            </> : <p className="text-sm text-destructive">Shopify product {productId} is no longer available.</p>}
          </article>)}
        </div>
      </>}
    </section>
  );
}

function ProductAudit({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);
  const history = useQuery({
    queryKey: ["shopify-product-history", productId],
    queryFn: () => api<HistoryEntry[]>(`/api/shopify/vendor-products/${encodeURIComponent(productId)}/history`),
    enabled: open,
    staleTime: 0,
  });
  return <details className="mt-2 text-xs text-muted-foreground" onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary className="cursor-pointer">Change history</summary>
    {history.isLoading && <p>Loading history…</p>}
    {history.isError && <p role="alert">History unavailable.</p>}
    {history.data?.map((entry) => <p key={entry.id}>{entry.action} · {new Date(entry.changedAt).toLocaleString()}</p>)}
  </details>;
}

export function ShopifyVendorReviewCatalog({ vendorId }: { vendorId: string }) {
  const catalog = useQuery({
    queryKey: ["shopify-vendor-catalog", vendorId],
    queryFn: () => api<ProductRow[]>(`/api/shopify/vendors/${vendorId}/products`),
    staleTime: 0,
  });
  return <section className="mt-5 space-y-3 border-t border-border pt-5">
    <h3 className="font-serif text-lg font-semibold">Shopify catalog</h3>
    {catalog.isLoading && <p className="text-sm">Loading Shopify products…</p>}
    {catalog.isError && <p role="alert" className="text-sm text-destructive">
      Shopify catalog unavailable. <Button variant="outline" onClick={() => catalog.refetch()}>Retry</Button>
    </p>}
    {catalog.data?.length === 0 && <p className="text-sm text-muted-foreground">No Shopify products yet.</p>}
    {catalog.data?.map(({ productId, product }) => <article key={productId} className="border border-border p-4">
      <h4 className="font-medium">{product?.title ?? "Product removed from Shopify"}</h4>
      {product && <p className="text-xs text-muted-foreground">{product.status} · {product.variants.nodes.length} variant(s)</p>}
      <ProductAudit productId={productId} />
    </article>)}
  </section>;
}