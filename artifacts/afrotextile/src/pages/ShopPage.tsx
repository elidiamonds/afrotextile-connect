import { useState, useMemo } from "react";
import ProductCard from "@/components/ProductCard";
import { products, categories, fabricTypes } from "@/data/mock";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useListProducts } from "@workspace/api-client-react";
import { mapApiProduct } from "@/lib/product-mapper";

const ShopPage = () => {
  const [category, setCategory] = useState("All");
  const [fabric, setFabric] = useState("All");
  const [sort, setSort] = useState("latest");
  const { data: apiProducts, isLoading } = useListProducts();
  const marketplaceProducts =
    apiProducts === undefined
      ? products
      : apiProducts.map(mapApiProduct);

  const filtered = useMemo(() => {
    let result = [...marketplaceProducts];
    if (category !== "All") result = result.filter((p) => p.category === category);
    if (fabric !== "All") result = result.filter((p) => p.fabricType === fabric);
    switch (sort) {
      case "price-asc": result.sort((a, b) => a.price - b.price); break;
      case "price-desc": result.sort((a, b) => b.price - a.price); break;
      case "popular": result.sort((a, b) => b.reviews - a.reviews); break;
      default: break;
    }
    return result;
  }, [category, fabric, sort, marketplaceProducts]);

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="mb-12 space-y-2">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground">Shop</h1>
          <p className="text-muted-foreground font-sans">Discover authentic African fashion from independent designers</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-10">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[160px] bg-muted border-border font-sans text-sm">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fabric} onValueChange={setFabric}>
            <SelectTrigger className="w-[160px] bg-muted border-border font-sans text-sm">
              <SelectValue placeholder="Fabric" />
            </SelectTrigger>
            <SelectContent>
              {fabricTypes.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[160px] bg-muted border-border font-sans text-sm">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest</SelectItem>
              <SelectItem value="popular">Popular</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p className="text-sm text-muted-foreground font-sans mb-6">
          {isLoading ? "Loading products…" : `${filtered.length} products`}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground font-sans">No products match your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopPage;
