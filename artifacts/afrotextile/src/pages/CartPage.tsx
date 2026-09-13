import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { ArrowRight, CheckCircle2, Loader2, Minus, Plus, X } from "lucide-react";
import { useCreateOrder, type Order } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";

type ShippingForm = {
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

const emptyShipping: ShippingForm = {
  name: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

const CartPage = () => {
  const { items, updateQuantity, removeItem, totalPrice, clearCart } = useCart();
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shipping, setShipping] = useState<ShippingForm>(emptyShipping);
  const [order, setOrder] = useState<Order | null>(null);
  const createOrder = useCreateOrder({
    mutation: {
      onSuccess: (created) => {
        clearCart();
        setOrder(created);
        toast({ title: "Order placed", description: `Order #${created.id.slice(0, 8)} is now being prepared.` });
      },
      onError: (error) => {
        toast({
          title: "Checkout could not be completed",
          description: error instanceof Error ? error.message : "Please review your cart and try again.",
          variant: "destructive",
        });
      },
    },
  });

  if (order) {
    return (
      <div className="min-h-screen px-4 pb-16 pt-28">
        <div className="mx-auto max-w-2xl rounded-sm border border-primary/30 bg-card p-8 text-center md:p-12">
          <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
          <p className="mt-6 text-xs uppercase tracking-[0.3em] text-primary">Order confirmed</p>
          <h1 className="mt-3 font-serif text-4xl font-bold">Thank you for your order.</h1>
          <p className="mt-4 text-muted-foreground">
            Your order <span className="font-medium text-foreground">#{order.id.slice(0, 8)}</span> has been sent to the makers. You can follow each item as it moves through fulfillment.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild variant="hero">
              <Link to="/orders">Track your order</Link>
            </Button>
            <Button asChild variant="heroOutline">
              <Link to="/shop">Continue shopping</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

  const shippingCost = totalPrice >= 200 ? 0 : 15;
  const updateShipping = (field: keyof ShippingForm, value: string) =>
    setShipping((current) => ({ ...current, [field]: value }));

  const submitOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSignedIn) {
      navigate("/sign-in", { state: { returnTo: "/cart" } });
      return;
    }
    createOrder.mutate({
      data: {
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          size: item.size,
        })),
        shippingAddress: {
          name: shipping.name.trim(),
          addressLine1: shipping.addressLine1.trim(),
          addressLine2: shipping.addressLine2.trim() || null,
          city: shipping.city.trim(),
          state: shipping.state.trim() || null,
          postalCode: shipping.postalCode.trim(),
          country: shipping.country.trim(),
        },
      },
    });
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
                <p className="text-xs uppercase tracking-[0.25em] text-primary">Delivery details</p>
                <h2 className="mt-2 font-serif text-2xl font-bold">Where should we send it?</h2>
                <p className="mt-2 text-sm text-muted-foreground">Your address is shared with the vendors fulfilling this order.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <ShippingInput label="Full name" value={shipping.name} onChange={(value) => updateShipping("name", value)} required />
                <ShippingInput label="Country" value={shipping.country} onChange={(value) => updateShipping("country", value)} required />
                <ShippingInput label="Address" value={shipping.addressLine1} onChange={(value) => updateShipping("addressLine1", value)} required className="md:col-span-2" />
                <ShippingInput label="Apartment, suite (optional)" value={shipping.addressLine2} onChange={(value) => updateShipping("addressLine2", value)} className="md:col-span-2" />
                <ShippingInput label="City" value={shipping.city} onChange={(value) => updateShipping("city", value)} required />
                <ShippingInput label="State / region (optional)" value={shipping.state} onChange={(value) => updateShipping("state", value)} />
                <ShippingInput label="Postal code" value={shipping.postalCode} onChange={(value) => updateShipping("postalCode", value)} required />
              </div>
              {!isSignedIn && (
                <p className="border border-primary/30 bg-primary/5 p-3 text-sm text-muted-foreground">
                  Sign in is required to place an order and keep your fulfillment updates available across visits.
                </p>
              )}
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={createOrder.isPending}>
                {createOrder.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Placing order…</> : <>Place order <ArrowRight className="ml-2 h-4 w-4" /></>}
              </Button>
            </form>
          </div>

          <div className="h-fit space-y-6 rounded-sm border border-border bg-card p-6">
            <h2 className="font-serif text-xl font-bold text-foreground">Order Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>${totalPrice.toFixed(2)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Shipping</span><span>{shippingCost === 0 ? "Free" : `$${shippingCost.toFixed(2)}`}</span></div>
              <div className="flex justify-between border-t border-border pt-3 font-semibold text-foreground"><span>Total</span><span className="text-primary">${(totalPrice + shippingCost).toFixed(2)}</span></div>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">Free shipping is applied automatically on orders over $200.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ShippingInput = ({
  label,
  value,
  onChange,
  required = false,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}) => (
  <label className={`block text-sm text-foreground ${className}`}>
    {label}
    <input
      required={required}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mt-2 h-11 w-full border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
    />
  </label>
);

export default CartPage;