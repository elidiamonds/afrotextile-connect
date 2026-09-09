import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, Package, DollarSign, ShoppingCart, Star, TrendingUp, ArrowLeft, BadgeCheck, Store, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { vendors, products, categories, fabricTypes } from "@/data/mock";
import { vendorOrders, orderStatuses, statusStyles, type OrderStatus } from "@/data/vendorDashboard";
import type { Product } from "@/types";

const VendorDashboardPage = () => {
  const vendor = vendors[0];
  const { toast } = useToast();
  const [myProducts, setMyProducts] = useState<Product[]>(() =>
    products.filter((p) => p.vendorId === vendor.id),
  );
  const [orders] = useState(vendorOrders);
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    price: "",
    originalPrice: "",
    category: "Ankara Styles",
    fabric: "Ankara",
    description: "",
    sizes: "S, M, L",
    image: "",
  });

  const stats = useMemo(() => {
    const revenue = orders
      .filter((o) => o.status !== "Cancelled")
      .reduce((s, o) => s + o.total, 0);
    const pending = orders.filter(
      (o) => o.status === "Pending" || o.status === "Processing",
    ).length;
    return { revenue, orders: orders.length, products: myProducts.length, pending };
  }, [orders, myProducts]);

  const filteredOrders = useMemo(
    () => (statusFilter === "All" ? orders : orders.filter((o) => o.status === statusFilter)),
    [orders, statusFilter],
  );

  const recentOrders = [...orders].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  const topProducts = useMemo(() => {
    const counts: Record<string, number> = {};
    orders
      .filter((o) => o.status !== "Cancelled")
      .forEach((o) => {
        counts[o.product] = (counts[o.product] ?? 0) + o.quantity;
      });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [orders]);

  // All African fashion items grouped by their style category
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    products.forEach((p) => {
      (groups[p.category] ??= []).push(p);
    });
    return groups;
  }, []);

  const resetForm = () =>
    setForm({
      name: "",
      price: "",
      originalPrice: "",
      category: "Ankara Styles",
      fabric: "Ankara",
      description: "",
      sizes: "S, M, L",
      image: "",
    });

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price) {
      toast({ title: "Name and price are required", variant: "destructive" });
      return;
    }
    const newProduct: Product = {
      id: `v-${Date.now()}`,
      name: form.name,
      price: Number(form.price),
      originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
      images: [form.image || products[0].images[0]],
      category: form.category,
      vendor: vendor.name,
      vendorId: vendor.id,
      sizes: form.sizes.split(",").map((s) => s.trim()).filter(Boolean),
      fabricType: form.fabric,
      description: form.description || `New collection piece from ${vendor.name}.`,
      rating: 0,
      reviews: 0,
      inStock: true,
      isNew: true,
    };
    setMyProducts((prev) => [newProduct, ...prev]);
    toast({ title: "Product added", description: `${form.name} is now live in your storefront` });
    resetForm();
    setOpen(false);
  };

  const removeProduct = (id: string) => {
    setMyProducts((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "Product removed from storefront" });
  };

  const statCards = [
    { label: "Total Revenue", value: `$${stats.revenue.toLocaleString()}`, icon: DollarSign, hint: "From fulfilled orders" },
    { label: "Orders", value: stats.orders, icon: ShoppingCart, hint: `${stats.pending} awaiting action` },
    { label: "Products Listed", value: stats.products, icon: Package, hint: "Live in your storefront" },
    { label: "Store Rating", value: vendor.rating, icon: Star, hint: "Across all reviews" },
  ];

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container mx-auto px-4">
        <Link to="/vendor" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-sans mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to vendor portal
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-muted border-2 border-primary/40 flex-shrink-0">
              <img src={vendor.logo} alt={vendor.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground">{vendor.name}</h1>
                <BadgeCheck className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground font-sans">{vendor.location} · Vendor Dashboard</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="heroOutline">
              <Link to={`/store/${vendor.id}`}><Store className="w-4 h-4 mr-2" /> View Storefront</Link>
            </Button>
            <Button variant="hero" onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Product
            </Button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((s) => (
            <Card key={s.label} className="bg-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-sans uppercase tracking-wider text-muted-foreground">{s.label}</span>
                  <s.icon className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl md:text-3xl font-serif font-bold text-foreground">{s.value}</div>
                <p className="text-xs text-muted-foreground font-sans mt-1">{s.hint}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="collections">Collections</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 bg-card">
                <CardHeader>
                  <CardTitle className="text-lg font-serif">Recent Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentOrders.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="font-sans text-xs text-muted-foreground">{o.id}</TableCell>
                          <TableCell className="font-sans text-sm text-foreground">{o.customer}</TableCell>
                          <TableCell className="font-sans text-sm text-foreground">{o.product}</TableCell>
                          <TableCell className="text-right font-sans text-sm font-semibold text-primary">${o.total}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusStyles[o.status]}`}>
                              {o.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-lg font-serif flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" /> Best Sellers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {topProducts.map(([name, qty], i) => (
                    <div key={name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                        <span className="font-sans text-sm text-foreground">{name}</span>
                      </div>
                      <span className="font-sans text-sm text-muted-foreground">{qty} sold</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground font-sans">{stats.pending} orders need your attention.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Products */}
          <TabsContent value="products">
            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-serif">Your Collection ({myProducts.length})</CardTitle>
                <Button variant="hero" size="sm" onClick={() => setOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Add Product
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Fabric</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myProducts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-12 rounded-sm overflow-hidden bg-muted flex-shrink-0">
                              <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <p className="font-sans text-sm font-medium text-foreground">{p.name}</p>
                              <p className="font-sans text-xs text-muted-foreground">{p.sizes.join(", ")}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-sans text-sm text-muted-foreground">{p.category}</TableCell>
                        <TableCell className="font-sans text-sm text-muted-foreground">{p.fabricType}</TableCell>
                        <TableCell className="text-right font-sans text-sm font-semibold text-primary">
                          ${p.price}
                          {p.originalPrice && (
                            <span className="ml-1 text-xs text-muted-foreground line-through">${p.originalPrice}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {p.isNew ? (
                            <Badge className="bg-primary text-primary-foreground text-[10px] uppercase">New</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] uppercase">Live</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => removeProduct(p.id)}
                            aria-label={`Remove ${p.name}`}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Collections — African fashion items organized by style category */}
          <TabsContent value="collections">
            <div className="space-y-10">
              {Object.entries(groupedByCategory).map(([category, items]) => (
                <section key={category}>
                  <div className="flex items-center gap-4 mb-4">
                    <div>
                      <h3 className="text-xl font-serif font-bold text-foreground">{category}</h3>
                      <p className="text-xs text-muted-foreground font-sans uppercase tracking-wider">
                        {items.length} {items.length === 1 ? "item" : "items"}
                      </p>
                    </div>
                    <span className="h-px flex-1 bg-border" />
                    <Link to={`/shop?category=${encodeURIComponent(category)}`} className="text-xs font-sans uppercase tracking-wider text-primary hover:underline whitespace-nowrap">
                      View in shop
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {items.map((p) => (
                      <div key={p.id} className="group bg-card rounded-sm border border-border overflow-hidden">
                        <div className="aspect-[3/4] overflow-hidden bg-muted">
                          <img src={p.images[0]} alt={p.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        </div>
                        <div className="p-3">
                          <p className="font-sans text-sm font-medium text-foreground leading-tight">{p.name}</p>
                          <p className="text-xs text-muted-foreground font-sans mt-0.5">{p.fabricType}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-serif font-bold text-primary">${p.price}</span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground font-sans">
                              <Star className="w-3 h-3 fill-primary text-primary" />{p.rating}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </TabsContent>

          {/* Orders */}
          <TabsContent value="orders">
            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-serif">Customer Orders</CardTitle>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px] bg-muted border-border font-sans text-sm">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All statuses</SelectItem>
                    {orderStatuses.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-sans text-xs text-muted-foreground">{o.id}</TableCell>
                        <TableCell className="font-sans text-sm text-foreground">{o.customer}</TableCell>
                        <TableCell className="font-sans text-sm text-muted-foreground">{o.customerLocation}</TableCell>
                        <TableCell className="font-sans text-sm text-foreground">{o.product} <span className="text-xs text-muted-foreground">({o.size})</span></TableCell>
                        <TableCell className="text-center font-sans text-sm">{o.quantity}</TableCell>
                        <TableCell className="text-right font-sans text-sm font-semibold text-primary">${o.total}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusStyles[o.status]}`}>
                            {o.status}
                          </span>
                        </TableCell>
                        <TableCell className="font-sans text-xs text-muted-foreground">{o.date}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredOrders.length === 0 && (
                  <p className="text-center py-10 text-muted-foreground font-sans text-sm">No orders match this status.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add product dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">Upload a New Product</DialogTitle>
              <DialogDescription>Add a piece to your storefront collection.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product name</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ankara Mermaid Gown" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($)</Label>
                  <Input id="price" type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="285" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="originalPrice">Original price ($)</Label>
                  <Input id="originalPrice" type="number" min="0" value={form.originalPrice} onChange={(e) => setForm({ ...form, originalPrice: e.target.value })} placeholder="350" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.filter((c) => c !== "All").map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fabric</Label>
                  <Select value={form.fabric} onValueChange={(v) => setForm({ ...form, fabric: v })}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {fabricTypes.filter((f) => f !== "All").map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sizes">Sizes (comma-separated)</Label>
                <Input id="sizes" value={form.sizes} onChange={(e) => setForm({ ...form, sizes: e.target.value })} placeholder="S, M, L, XL" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image">Image URL (optional)</Label>
                <Input id="image" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://…" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the piece, fabric, and craftsmanship…" />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" variant="hero">Publish Product</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default VendorDashboardPage;
