import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, RotateCcw, Search } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "@/components/ProductCard";
import { products, categories, fabricTypes } from "@/data/mock";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useListProducts } from "@workspace/api-client-react";
import { mapApiProduct } from "@/lib/product-mapper";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type SortOption = "latest" | "popular" | "price-asc" | "price-desc";
type StockOption = "all" | "in-stock" | "sold-out";
const pageSize = 24;

const ShopPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [location, setLocation] = useState(() => searchParams.get("location") ?? "");
  const [category, setCategory] = useState(() => searchParams.get("category") ?? "All");
  const [fabric, setFabric] = useState(() => searchParams.get("fabricType") ?? "All");
  const [minPrice, setMinPrice] = useState(() => searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(() => searchParams.get("maxPrice") ?? "");
  const [sort, setSort] = useState<SortOption>(() => {
    const value = searchParams.get("sort");
    return value === "popular" || value === "price-asc" || value === "price-desc" ? value : "latest";
  });
  const [stock, setStock] = useState<StockOption>(() => {
    const value = searchParams.get("inStock");
    return value === "true" ? "in-stock" : value === "false" ? "sold-out" : "all";
  });
  const [page, setPage] = useState(() => Math.max(1, Number(searchParams.get("page")) || 1));
  const hasMounted = useRef(false);

  const requestParams = useMemo(() => {
    const parsePrice = (value: string) => {
      if (!value.trim()) return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
    };

    return {
      q: query.trim() || undefined,
      location: location.trim() || undefined,
      category: category === "All" ? undefined : category,
      fabricType: fabric === "All" ? undefined : fabric,
      minPrice: parsePrice(minPrice),
      maxPrice: parsePrice(maxPrice),
      inStock: stock === "all" ? undefined : stock === "in-stock",
      sort,
      page,
      limit: pageSize,
    };
  }, [category, fabric, location, maxPrice, minPrice, page, query, sort, stock]);

  const { data: apiProducts, isLoading, isError } = useListProducts(requestParams);
  const marketplaceProducts =
    apiProducts === undefined
      ? products
      : apiProducts.map(mapApiProduct);

  useEffect(() => {
    const next = new URLSearchParams();
    if (query.trim()) next.set("q", query.trim());
    if (location.trim()) next.set("location", location.trim());
    if (category !== "All") next.set("category", category);
    if (fabric !== "All") next.set("fabricType", fabric);
    if (minPrice.trim()) next.set("minPrice", minPrice.trim());
    if (maxPrice.trim()) next.set("maxPrice", maxPrice.trim());
    if (stock !== "all") next.set("inStock", stock === "in-stock" ? "true" : "false");
    if (sort !== "latest") next.set("sort", sort);
    if (page > 1) next.set("page", String(page));
    setSearchParams(next, { replace: true });
  }, [category, fabric, location, maxPrice, minPrice, page, query, setSearchParams, sort, stock]);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    setPage(1);
  }, [category, fabric, location, maxPrice, minPrice, query, sort, stock]);

  const filtered = useMemo(() => {
    let result = [...marketplaceProducts];
    if (category !== "All") result = result.filter((p) => p.category === category);
    if (fabric !== "All") result = result.filter((p) => p.fabricType === fabric);
    if (query.trim()) {
      const needle = query.trim().toLowerCase();
      result = result.filter((p) =>
        [p.name, p.vendor, p.description].some((value) => value.toLowerCase().includes(needle)),
      );
    }
    const minimum = Number(minPrice);
    const maximum = Number(maxPrice);
    if (minPrice.trim() && Number.isFinite(minimum)) result = result.filter((p) => p.price >= minimum);
    if (maxPrice.trim() && Number.isFinite(maximum)) result = result.filter((p) => p.price <= maximum);
    if (stock !== "all") result = result.filter((p) => p.inStock === (stock === "in-stock"));
    switch (sort) {
      case "price-asc": result.sort((a, b) => a.price - b.price); break;
      case "price-desc": result.sort((a, b) => b.price - a.price); break;
      case "popular": result.sort((a, b) => b.reviews - a.reviews); break;
      default: break;
    }
    return result;
  }, [category, fabric, maxPrice, minPrice, marketplaceProducts, query, sort, stock]);

  const clearFilters = () => {
    setQuery("");
    setLocation("");
    setCategory("All");
    setFabric("All");
    setMinPrice("");
    setMaxPrice("");
    setStock("all");
    setSort("latest");
    setPage(1);
  };
  const hasActiveFilters =
    Boolean(query.trim()) ||
    Boolean(location.trim()) ||
    category !== "All" ||
    fabric !== "All" ||
    Boolean(minPrice.trim()) ||
    Boolean(maxPrice.trim()) ||
    stock !== "all";
  const emptyMessage =
    apiProducts !== undefined && apiProducts.length === 0 && !hasActiveFilters
      ? "No published products are available yet."
      : "No products match your filters.";

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="mb-12 space-y-2">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground">Shop</h1>
          <p className="text-muted-foreground font-sans">Discover authentic African fashion from independent designers</p>
        </div>

        {/* Search and marketplace filters */}
        <div className="mb-10 space-y-4 border border-border bg-card p-4 md:p-5">
          <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_auto]">
            <label className="relative block">
              <span className="sr-only">Search products</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search styles, fabrics, or designers"
                className="pl-10 bg-muted border-border"
              />
            </label>
            <label className="relative block">
              <span className="sr-only">Filter by location</span>
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Location, e.g. Lagos"
                className="pl-10 bg-muted border-border"
              />
            </label>
            <Button type="button" variant="outline" onClick={clearFilters} className="h-10">
              <RotateCcw className="h-4 w-4" />
              Clear
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-muted border-border font-sans text-sm">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fabric} onValueChange={setFabric}>
              <SelectTrigger className="bg-muted border-border font-sans text-sm">
                <SelectValue placeholder="Fabric" />
              </SelectTrigger>
              <SelectContent>
                {fabricTypes.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min="0"
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
              placeholder="Min price"
              aria-label="Minimum price"
              className="bg-muted border-border"
            />
            <Input
              type="number"
              min="0"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
              placeholder="Max price"
              aria-label="Maximum price"
              className="bg-muted border-border"
            />
            <Select value={stock} onValueChange={(value) => setStock(value as StockOption)}>
              <SelectTrigger className="bg-muted border-border font-sans text-sm">
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any availability</SelectItem>
                <SelectItem value="in-stock">In stock</SelectItem>
                <SelectItem value="sold-out">Sold out</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(value) => setSort(value as SortOption)}>
              <SelectTrigger className="bg-muted border-border font-sans text-sm">
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
        </div>

        <p className="text-sm text-muted-foreground font-sans mb-6">
          {isLoading
            ? "Searching marketplace…"
            : isError
              ? "Showing saved catalog while the marketplace reconnects."
              : `${filtered.length}${apiProducts?.length === pageSize ? "+" : ""} products`}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground font-sans">{emptyMessage}</p>
            {hasActiveFilters && (
              <Button type="button" variant="link" onClick={clearFilters} className="mt-2">
                Clear filters
              </Button>
            )}
          </div>
        )}

        {(page > 1 || (apiProducts !== undefined && apiProducts.length === pageSize)) && (
          <div className="mt-12 flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page === 1 || isLoading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoading || apiProducts?.length !== pageSize}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopPage;
