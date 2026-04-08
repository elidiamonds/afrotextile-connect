import { Link } from "react-router-dom";
import { Heart, ShoppingBag } from "lucide-react";
import { Product } from "@/types";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const { addItem } = useCart();
  const { toggleItem, isWished } = useWishlist();
  const wished = isWished(product.id);

  return (
    <div className="group relative">
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-muted">
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
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
          <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-colors duration-300" />
        </div>
      </Link>

      {/* Quick actions */}
      <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={() => toggleItem(product.id)}
          className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors ${
            wished ? "bg-primary text-primary-foreground" : "bg-background/80 text-foreground hover:bg-primary hover:text-primary-foreground"
          }`}
        >
          <Heart className="w-4 h-4" fill={wished ? "currentColor" : "none"} />
        </button>
        <button
          onClick={() => addItem(product, product.sizes[0])}
          className="w-9 h-9 rounded-full bg-background/80 text-foreground hover:bg-primary hover:text-primary-foreground flex items-center justify-center backdrop-blur-sm transition-colors"
        >
          <ShoppingBag className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 space-y-1">
        <p className="text-xs text-muted-foreground font-sans uppercase tracking-wider">{product.vendor}</p>
        <Link to={`/product/${product.id}`}>
          <h3 className="font-serif text-sm font-medium text-foreground group-hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-sans text-sm font-semibold text-primary">${product.price}</span>
          {product.originalPrice && (
            <span className="font-sans text-xs text-muted-foreground line-through">${product.originalPrice}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
