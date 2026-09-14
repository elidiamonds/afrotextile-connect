import { useParams, Link } from "react-router-dom";
import {
  Star,
  BadgeCheck,
  MapPin,
  MessageCircle,
  ArrowLeft,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { vendors, products } from "@/data/mock";
import ProductCard from "@/components/ProductCard";
import {
  getGetStorefrontQueryKey,
  useGetStorefront,
} from "@workspace/api-client-react";
import { mapApiProduct } from "@/lib/product-mapper";

const VendorPage = () => {
  const { id } = useParams<{ id: string }>();
  const legacyVendor = vendors.find((v) => v.id === id);
  const {
    data: storedVendor,
    isLoading,
    isError,
  } = useGetStorefront(id ?? "", {
    query: {
      queryKey: getGetStorefrontQueryKey(id ?? ""),
      retry: false,
    },
  });
  const vendor = storedVendor
    ? {
        id: storedVendor.id,
        name: storedVendor.businessName,
        logo: storedVendor.logoUrl ?? "",
        description: storedVendor.description,
        location: storedVendor.location,
        productCount: storedVendor.products?.length ?? 0,
        rating: 0,
        verified: storedVendor.status === "approved",
      }
    : legacyVendor
      ? { ...legacyVendor, verified: true }
      : undefined;
  const vendorProducts = storedVendor
    ? (storedVendor.products ?? []).map(mapApiProduct)
    : products.filter((p) => p.vendorId === id);

  if (isLoading && !legacyVendor) {
    return (
      <div className="min-h-screen pt-32 text-center text-muted-foreground">
        Loading storefront…
      </div>
    );
  }

  if (!vendor || (isError && !legacyVendor)) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground font-sans mb-4">
            Vendor not found.
          </p>
          <Button asChild variant="hero">
            <Link to="/shop">Browse Marketplace</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 pb-16">
      <div className="relative h-64 md:h-80 overflow-hidden bg-card">
        {vendor.logo && (
          <img
            src={vendor.logo}
            alt={vendor.name}
            className="w-full h-full object-cover opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      <div className="container mx-auto px-4 -mt-24 relative z-10">
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-sans mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to marketplace
        </Link>

        <div className="bg-card border border-border rounded-sm p-6 md:p-8 mb-10">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden bg-muted border-4 border-background flex-shrink-0">
              {vendor.logo ? (
                <img
                  src={vendor.logo}
                  alt={vendor.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-gold font-serif text-4xl font-bold text-primary-foreground">
                  {vendor.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
                  {vendor.name}
                </h1>
                {vendor.verified && (
                  <>
                    <BadgeCheck className="w-6 h-6 text-primary" />
                    <span className="text-xs font-sans uppercase tracking-wider text-primary border border-primary/30 px-2 py-0.5 rounded-full">
                      Verified
                    </span>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-sm font-sans text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" /> {vendor.location}
                </span>
                {vendor.rating > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-primary text-primary" />{" "}
                    {vendor.rating} rating
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Package className="w-4 h-4" /> {vendor.productCount} products
                </span>
              </div>
              <p className="text-muted-foreground font-sans leading-relaxed max-w-2xl">
                {vendor.description}
              </p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button variant="hero" className="flex-1 md:flex-none">
                <MessageCircle className="w-4 h-4 mr-2" /> Message
              </Button>
              <Button variant="heroOutline" className="flex-1 md:flex-none">
                Follow
              </Button>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-serif font-bold text-foreground mb-2">
            Storefront
          </h2>
          <p className="text-sm text-muted-foreground font-sans">
            {vendorProducts.length} products from {vendor.name}
          </p>
        </div>

        {vendorProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {vendorProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground font-sans">
            This vendor hasn't listed products yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorPage;
