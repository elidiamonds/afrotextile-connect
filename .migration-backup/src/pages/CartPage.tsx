import { Link } from "react-router-dom";
import { Minus, Plus, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";

const CartPage = () => {
  const { items, updateQuantity, removeItem, totalPrice } = useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-serif font-bold text-foreground">Your Bag is Empty</h1>
          <p className="text-muted-foreground font-sans">Discover unique African fashion pieces.</p>
          <Button asChild variant="hero" size="lg">
            <Link to="/shop">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-10">Shopping Bag</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-6">
            {items.map((item) => (
              <div key={`${item.product.id}-${item.size}`} className="flex gap-4 p-4 bg-card rounded-sm border border-border">
                <Link to={`/product/${item.product.id}`} className="w-24 h-32 flex-shrink-0 bg-muted rounded-sm overflow-hidden">
                  <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                </Link>
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-sans uppercase tracking-wider">{item.product.vendor}</p>
                      <h3 className="font-serif text-sm font-medium text-foreground">{item.product.name}</h3>
                      <p className="text-xs text-muted-foreground font-sans mt-1">Size: {item.size}</p>
                    </div>
                    <button onClick={() => removeItem(item.product.id, item.size)} className="text-muted-foreground hover:text-foreground transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3 border border-border rounded-sm">
                      <button onClick={() => updateQuantity(item.product.id, item.size, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-sans w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.id, item.size, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="font-sans text-sm font-semibold text-primary">${item.product.price * item.quantity}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-card rounded-sm border border-border p-6 h-fit space-y-6">
            <h2 className="font-serif text-xl font-bold text-foreground">Order Summary</h2>
            <div className="space-y-3 text-sm font-sans">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>${totalPrice}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span>{totalPrice >= 200 ? "Free" : "$15"}</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between text-foreground font-semibold">
                <span>Total</span>
                <span className="text-primary">${totalPrice >= 200 ? totalPrice : totalPrice + 15}</span>
              </div>
            </div>
            <Button variant="hero" className="w-full" size="lg">
              Checkout <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Link to="/shop" className="block text-center text-sm text-muted-foreground hover:text-primary transition-colors font-sans">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
