import { Link } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { Package, RefreshCw } from "lucide-react";
import { getListOrdersQueryKey, useListOrders } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusLabel = (status: string) =>
  status.charAt(0).toUpperCase() + status.slice(1);

const OrdersPage = () => {
  const { isSignedIn } = useAuth();
  const ordersQuery = useListOrders({
    query: {
      enabled: Boolean(isSignedIn),
      queryKey: getListOrdersQueryKey(),
    },
  });

  if (!isSignedIn) {
    return (
      <div className="min-h-screen px-4 pb-16 pt-28">
        <div className="mx-auto max-w-xl rounded-sm border border-border bg-card p-8 text-center">
          <Package className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-5 font-serif text-3xl font-bold">Track your orders</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Sign in to see your order history and follow fulfillment updates from each vendor.</p>
          <Button asChild variant="hero" className="mt-6">
            <Link to="/sign-in" state={{ returnTo: "/orders" }}>Sign in to continue</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (ordersQuery.isLoading) {
    return <div className="min-h-screen pt-32 text-center text-sm text-muted-foreground">Loading your orders…</div>;
  }

  if (ordersQuery.isError) {
    return (
      <div className="min-h-screen px-4 pb-16 pt-28">
        <div className="mx-auto max-w-xl rounded-sm border border-destructive/40 bg-destructive/10 p-8 text-center">
          <h1 className="font-serif text-2xl font-bold">Orders could not be loaded</h1>
          <p className="mt-3 text-sm text-muted-foreground">Please try again in a moment.</p>
          <Button variant="heroOutline" className="mt-6" onClick={() => ordersQuery.refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Try again
          </Button>
        </div>
      </div>
    );
  }

  const orders = ordersQuery.data ?? [];
  return (
    <div className="min-h-screen px-4 pb-16 pt-28">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Your account</p>
          <h1 className="mt-2 font-serif text-4xl font-bold">Order history</h1>
          <p className="mt-2 text-muted-foreground">Follow every piece from order confirmation to delivery.</p>
        </div>
        {orders.length === 0 ? (
          <div className="rounded-sm border border-dashed border-border py-16 text-center">
            <Package className="mx-auto h-9 w-9 text-primary" />
            <h2 className="mt-4 font-serif text-2xl font-bold">No orders yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">Your next discovery can start in the marketplace.</p>
            <Button asChild variant="hero" className="mt-6"><Link to="/shop">Shop the collection</Link></Button>
          </div>
        ) : (
          <div className="space-y-5">
            {orders.map((order) => (
              <article key={order.id} className="rounded-sm border border-border bg-card p-6 md:p-8">
                <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-primary">Order #{order.id.slice(0, 8)}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={order.status === "cancelled" ? "destructive" : "default"} className="capitalize">{statusLabel(order.status)}</Badge>
                    <span className="font-serif text-lg text-primary">${order.total.toFixed(2)}</span>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-4 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-14 w-12 object-cover" /> : <div className="flex h-14 w-12 items-center justify-center bg-muted"><Package className="h-4 w-4 text-primary" /></div>}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{item.productName}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{item.vendorName} · Size {item.size} · Qty {item.quantity}</p>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs capitalize text-muted-foreground">{statusLabel(item.fulfillmentStatus)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
                  Delivering to {order.shippingAddress.city}, {order.shippingAddress.country}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;