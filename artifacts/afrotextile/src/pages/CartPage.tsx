import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2, Minus, Plus, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { createShopifyCart, formatMoney } from "@/lib/shopify-commerce";
import { Input } from "@/components/ui/input";

const CartPage = () => {
  const { items, updateQuantity, removeItem, totalPrice } = useCart();
  const { toast } = useToast();
  const [discountCode, setDiscountCode] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);

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

  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCheckingOut(true);
    try {
      const cart = await createShopifyCart({
        lines: items.map((item) => ({
          merchandiseId: item.merchandiseId,
          quantity: item.quantity,
        })),
        ...(discountCode.trim() ? { discountCodes: [discountCode.trim()] } : {}),
      });
      const rejectedCode = cart.discountCodes.find((code) => !code.applicable);
      if (rejectedCode) {
        toast({
          title: "Discount code is not applicable",
          description: `${rejectedCode.code} cannot be used with this cart.`,
          variant: "destructive",
        });
        setIsCheckingOut(false);
        return;
      }
      window.location.assign(cart.checkoutUrl);
    } catch (error) {
      toast({
        title: "Shopify checkout could not be started",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <h1 className="mb-10 text-3xl font-serif font-bold text-foreground md:text-4xl">Shopping Bag</h1>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {items.map((item) => (
              <div key={`${item.product.id}-${item.size}`} className="flex gap-4 rounded-sm border border-border bg-card p-4">
                <Link to={`/product/${item.product.id}`} className="h-32 w-24 flex-shrink-0 overflow-hidden rounded-sm bg-muted">
                  <img src={item.product.images[0]} alt={item.product.name} className="h-full w-full object-cover" />
                </Link>
                <div className="flex flex-1 flex-col justify-between">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">{item.product.vendor}</p>
                      <h3 className="font-serif text-sm font-medium text-foreground">{item.product.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">Size: {item.size}</p>
                    </div>
                    <button onClick={() => removeItem(item.product.id, item.size)} className="text-muted-foreground hover:text-foreground" aria-label={`Remove ${item.product.name}`}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-3 rounded-sm border border-border">
                      <button onClick={() => updateQuantity(item.product.id, item.size, item.quantity - 1)} className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground" aria-label="Decrease quantity">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.size, item.quantity + 1)}
                        disabled={item.product.inventory !== undefined && item.quantity >= item.product.inventory}
                        className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="text-sm font-semibold text-primary">${(item.product.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}

            <form onSubmit={submitOrder} className="space-y-6 rounded-sm border border-border bg-card p-6 md:p-8">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-primary">Secure checkout</p>
                <h2 className="mt-2 font-serif text-2xl font-bold">Continue with Shopify</h2>
                <p className="mt-2 text-sm text-muted-foreground">Shipping, taxes, payment, and order confirmation are completed securely on Shopify.</p>
              </div>
              <label className="block text-sm text-foreground">
                Discount code
                <Input
                  value={discountCode}
                  onChange={(event) => setDiscountCode(event.target.value)}
                  placeholder="Optional"
                  className="mt-2 bg-background"
                />
              </label>
              <div className="flex items-start gap-3 border border-primary/25 bg-primary/5 p-4 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p>Shopify calculates live shipping and taxes and processes your payment. Afrotextile never handles your card details.</p>
              </div>
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isCheckingOut}>
                {isCheckingOut ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Opening Shopify…</> : <>Checkout securely <ArrowRight className="ml-2 h-4 w-4" /></>}
              </Button>
            </form>
          </div>

          <div className="h-fit space-y-6 rounded-sm border border-border bg-card p-6">
            <h2 className="font-serif text-xl font-bold text-foreground">Order Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatMoney(totalPrice, items[0]?.product.currencyCode)}</span></div>
              <div className="flex justify-between border-t border-border pt-3 font-semibold text-foreground"><span>Estimated total</span><span className="text-primary">{formatMoney(totalPrice, items[0]?.product.currencyCode)}</span></div>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">Shipping, tax, and eligible discounts are finalized by Shopify at checkout.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;