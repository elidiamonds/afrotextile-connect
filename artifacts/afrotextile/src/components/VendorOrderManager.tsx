import { useQueryClient } from "@tanstack/react-query";
import {
  getListVendorOrdersQueryKey,
  useListVendorOrders,
  useUpdateOrderItemStatus,
  type OrderItemStatus,
} from "@workspace/api-client-react";
import { Loader2, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const fulfillmentStatuses: OrderItemStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const label = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export default function VendorOrderManager({
  vendorId,
  enabled,
}: {
  vendorId: string;
  enabled: boolean;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const ordersQuery = useListVendorOrders(vendorId, {
    query: {
      enabled,
      queryKey: getListVendorOrdersQueryKey(vendorId),
    },
  });
  const updateStatus = useUpdateOrderItemStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListVendorOrdersQueryKey(vendorId) });
        toast({ title: "Fulfillment status updated" });
      },
      onError: () =>
        toast({
          title: "Could not update fulfillment status",
          variant: "destructive",
        }),
    },
  });

  if (!enabled) return null;
  if (ordersQuery.isLoading) {
    return (
      <section className="rounded-sm border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading orders…
        </div>
      </section>
    );
  }
  if (ordersQuery.isError) {
    return (
      <section
        className="rounded-sm border border-destructive/40 bg-destructive/10 p-6"
        data-testid="vendor-orders-section"
      >
        <h2 className="font-serif text-xl font-bold">Orders could not be loaded</h2>
        <p className="mt-2 text-sm text-muted-foreground">Please refresh and try again.</p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => ordersQuery.refetch()}
          disabled={ordersQuery.isFetching}
        >
          {ordersQuery.isFetching ? "Retrying orders…" : "Retry orders"}
        </Button>
      </section>
    );
  }

  const orders = ordersQuery.data ?? [];
  return (
    <section className="space-y-5" data-testid="vendor-orders-section">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Fulfillment</p>
        <h2 className="mt-2 font-serif text-2xl font-bold">Orders for your products</h2>
        <p className="mt-2 text-sm text-muted-foreground">Review customer delivery details and keep each item’s progress current.</p>
      </div>
      {orders.length === 0 ? (
        <div className="rounded-sm border border-dashed border-border py-14 text-center">
          <Package className="mx-auto h-8 w-8 text-primary" />
          <h3 className="mt-4 font-serif text-2xl font-bold">No orders yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">Orders containing your published products will appear here.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((order) => (
            <article key={order.id} className="rounded-sm border border-border bg-card p-6">
              <div className="flex flex-col justify-between gap-3 border-b border-border pb-4 sm:flex-row sm:items-start">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">Order #{order.id.slice(0, 8)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <Badge className="w-fit capitalize">{label(order.status)}</Badge>
              </div>
              <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Deliver to</p><p className="mt-1 text-foreground">{order.shippingAddress.name}</p><p className="text-muted-foreground">{order.shippingAddress.addressLine1}{order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ""}</p><p className="text-muted-foreground">{order.shippingAddress.city}, {order.shippingAddress.postalCode}, {order.shippingAddress.country}</p></div>
                <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Order total</p><p className="mt-1 font-serif text-xl text-primary">${order.total.toFixed(2)}</p><p className="text-xs text-muted-foreground">Vendor items shown below</p></div>
              </div>
              <div className="mt-5 divide-y divide-border border-t border-border">
                {order.items.map((item) => (
                  <div key={item.id} className="flex flex-col justify-between gap-3 py-4 md:flex-row md:items-center">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.productName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Size {item.size} · Qty {item.quantity} · ${(item.unitPrice * item.quantity).toFixed(2)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {fulfillmentStatuses.map((status) => (
                        <Button
                          key={status}
                          type="button"
                          size="sm"
                          variant={item.fulfillmentStatus === status ? "default" : "outline"}
                          disabled={updateStatus.isPending}
                          onClick={() =>
                            updateStatus.mutate({
                              vendorId,
                              orderId: order.id,
                              itemId: item.id,
                              data: { status },
                            })
                          }
                        >
                          {label(status)}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}