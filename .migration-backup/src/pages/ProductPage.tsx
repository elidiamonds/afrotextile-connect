import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { Heart, ShoppingBag, Star, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { products } from "@/data/mock";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import ProductCard from "@/components/ProductCard";
import { useToast } from "@/hooks/use-toast";

const ProductPage = () => {
  const { id } = useParams<{ id: string }>();
  const product = products.find((p) => p.id === id);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const { addItem } = useCart();
  const { toggleItem, isWished } = useWishlist();
  const { toast } = useToast();

  if (!product) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <p className="text-muted-foreground font-sans">Product not found.</p>
      </div>
    );
  }

  const wished = isWished(product.id);
  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast({ title: "Please select a size", variant: "destructive" });
      return;
    }
    addItem(product, selectedSize);
    toast({ title: "Added to bag", description: `${product.name} (${selectedSize})` });
  };

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container mx-auto px-4">
        <Link to="/shop" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-sans mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to shop
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image */}
          <div className="aspect-[3/4] bg-muted rounded-sm overflow-hidden">
            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
          </div>

          {/* Details */}
          <div className="space-y-6 lg:py-8">
            <div>
              <p className="text-xs text-muted-foreground font-sans uppercase tracking-widest mb-2">{product.vendor}</p>
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground">{product.name}</h1>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-2xl font-sans font-bold text-primary">${product.price}</span>
              {product.originalPrice && (
                <span className="text-lg font-sans text-muted-foreground line-through">${product.originalPrice}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating) ? "fill-primary text-primary" : "text-muted"}`} />
                ))}
              </div>
              <span className="text-sm text-muted-foreground font-sans">{product.rating} ({product.reviews} reviews)</span>
            </div>

            <p className="text-muted-foreground font-sans leading-relaxed">{product.description}</p>

            <div>
              <p className="text-sm font-sans font-medium text-foreground mb-3">Fabric: <span className="text-primary">{product.fabricType}</span></p>
            </div>

            {/* Size selector */}
            <div>
              <p className="text-sm font-sans font-medium text-foreground mb-3">Size</p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-[48px] h-10 px-3 rounded-sm border text-sm font-sans transition-colors ${
                      selectedSize === size
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted text-foreground hover:border-primary"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="hero" size="lg" className="flex-1 text-base" onClick={handleAddToCart}>
                <ShoppingBag className="w-5 h-5 mr-2" /> Add to Bag
              </Button>
              <Button
                variant={wished ? "default" : "heroOutline"}
                size="lg"
                onClick={() => toggleItem(product.id)}
                className="px-4"
              >
                <Heart className="w-5 h-5" fill={wished ? "currentColor" : "none"} />
              </Button>
            </div>

            <div className="pt-4 border-t border-border text-sm text-muted-foreground font-sans space-y-1">
              <p>{product.inStock ? "✓ In Stock" : "✗ Out of Stock"}</p>
              <p>Free shipping on orders over $200</p>
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-24">
            <h2 className="text-2xl font-serif font-bold text-foreground mb-8">You May Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProductPage;
