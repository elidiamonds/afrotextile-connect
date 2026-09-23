import { Link } from "react-router-dom";
import { Heart, ShoppingBag, Star, BadgeCheck } from "lucide-react";
import { Product } from "@/types";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";
import { formatMoney, variantForSize } from "@/lib/shopify-commerce";

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const { addItem } = useCart();
  const { toggleItem, isWished } = useWishlist();
  const wished = isWished(product.id);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleWishlist = () => {
    toggleItem(product.id);
    toast(wished ? "Removed from wishlist" : "Saved to wishlist", {
      description: product.name,
    });
  };

  const handleAddToBag = () => {
    const size = product.sizes[0];
    const variant = variantForSize(product, size);
    if (!variant?.availableForSale) {
      toast.error("This option is currently unavailable");
      return;
    }
    addItem(product, size, variant.id);
    toast.success("Added to bag", { description: `${product.name} · ${product.sizes[0]}` });
  };

  return (
    <article className="group relative product-card" data-testid={`card-product-${product.id}`}>
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-muted">
          {!imageLoaded && <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden="true" />}
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            className={`h-full w-full object-cover transition-[transform,opacity,filter] duration-700 ease-out group-hover:scale-105 group-hover:saturate-[1.08] ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
            data-testid={`img-product-${product.id}`}
          />
          {product.isNew && (
            <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground font-sans text-[10px] uppercase tracking-wider">
              New
            </Badge>
          )}
          {product.originalPrice && (
            <Badge className="absolute top-3 right-3 bg-accent text-accent-foreground font-sans text-[10px] uppercase tracking-wider">
              Sale
            </Badge>
          )}
        </div>
      </Link>

      <div className="absolute right-3 top-3 flex flex-col gap-2 opacity-100 transition-all duration-300 md:translate-x-2 md:opacity-0 md:group-hover:translate-x-0 md:group-hover:opacity-100">
        <button
          type="button"
          onClick={handleWishlist}
          aria-label={wished ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          aria-pressed={wished}
          data-testid={`button-wishlist-${product.id}`}
           className={`press-feedback flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-sm transition-all hover:scale-110 ${
            wished ? "bg-primary text-primary-foreground" : "bg-background/80 text-foreground hover:bg-primary hover:text-primary-foreground"
          }`}
        >
          <Heart className="w-4 h-4" fill={wished ? "currentColor" : "none"} />
        </button>
        <button
          type="button"
          onClick={handleAddToBag}
          aria-label={`Add ${product.name} to bag`}
          data-testid={`button-add-to-bag-${product.id}`}
          disabled={!product.inStock}
          title={product.inStock ? "Add to bag" : "Out of stock"}
           className="press-feedback flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur-sm transition-all hover:scale-110 hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ShoppingBag className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 space-y-1.5">
        {product.commerceSource !== "marketplace" ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground font-sans uppercase tracking-wider">
            <BadgeCheck className="w-3 h-3 text-primary" />
            {product.vendor}
          </span>
        ) : (
          <Link to={`/store/${product.vendorId}`} className="flex items-center gap-1 text-xs text-muted-foreground font-sans uppercase tracking-wider transition-colors hover:text-primary" data-testid={`link-vendor-${product.id}`}>
            <BadgeCheck className="w-3 h-3 text-primary" />
            {product.vendor}
          </Link>
        )}
        <Link to={`/product/${product.id}`} data-testid={`link-product-${product.id}`}>
          <h3 className="font-serif text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-sans text-sm font-semibold text-primary">{formatMoney(product.price, product.currencyCode)}</span>
            {product.originalPrice && (
              <span className="font-sans text-xs text-muted-foreground line-through">{formatMoney(product.originalPrice, product.currencyCode)}</span>
            )}
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground font-sans">
            <Star className="w-3 h-3 fill-primary text-primary" />
            {product.rating}
          </span>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;