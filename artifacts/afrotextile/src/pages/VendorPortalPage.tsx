import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  CircleHelp,
  Clock3,
  LayoutDashboard,
  Mail,
  MapPin,
  Menu,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  ShoppingBag,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  categories,
  createId,
  planDetails,
  planValues,
  VENDOR_STORAGE_KEY,
  type VendorApplication,
  type VendorPlan,
  type VendorProduct,
  type VendorWorkspace,
} from "@/data/vendorPortal";

type PortalSection = "overview" | "storefront" | "products" | "orders" | "analytics";

const emptyApplication: Omit<VendorApplication, "submittedAt"> = {
  businessName: "",
  ownerName: "",
  email: "",
  location: "",
  category: categories[0],
  story: "",
  plan: "Starter",
};

const navItems: { id: PortalSection; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "storefront", label: "Storefront", icon: Store },
  { id: "products", label: "Products", icon: Package },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

const readWorkspace = (): VendorWorkspace | null => {
  try {
    const saved = localStorage.getItem(VENDOR_STORAGE_KEY);
    return saved ? (JSON.parse(saved) as VendorWorkspace) : null;
  } catch {
    return null;
  }
};

const VendorPortalPage = () => {
  const [searchParams] = useSearchParams();
  const [workspace, setWorkspace] = useState<VendorWorkspace | null>(() => readWorkspace());
  const [application, setApplication] = useState(emptyApplication);
  const [applicationErrors, setApplicationErrors] = useState<Record<string, string>>({});
  const [section, setSection] = useState<PortalSection>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const plan = searchParams.get("plan");
    const matchedPlan = planValues.find((value) => value.toLowerCase() === plan?.toLowerCase());
    if (matchedPlan && !workspace) {
      setApplication((current) => ({ ...current, plan: matchedPlan }));
    }
  }, [searchParams, workspace]);

  useEffect(() => {
    if (workspace) {
      localStorage.setItem(VENDOR_STORAGE_KEY, JSON.stringify(workspace));
    }
  }, [workspace]);

  const showFeedback = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(""), 3600);
  };

  const updateApplication = (field: keyof typeof application, value: string) => {
    setApplication((current) => ({ ...current, [field]: value }));
    setApplicationErrors((current) => ({ ...current, [field]: "" }));
  };

  const submitApplication = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!application.businessName.trim()) errors.businessName = "Enter your business name.";
    if (!application.ownerName.trim()) errors.ownerName = "Enter the primary owner's name.";
    if (!/^\S+@\S+\.\S+$/.test(application.email)) errors.email = "Enter a valid email address.";
    if (!application.location.trim()) errors.location = "Add your city and country.";
    if (!application.story.trim() || application.story.trim().length < 40) {
      errors.story = "Tell us at least 40 characters about your work.";
    }
    if (Object.keys(errors).length) {
      setApplicationErrors(errors);
      return;
    }

    const submittedApplication: VendorApplication = {
      ...application,
      businessName: application.businessName.trim(),
      ownerName: application.ownerName.trim(),
      email: application.email.trim(),
      location: application.location.trim(),
      story: application.story.trim(),
      submittedAt: new Date().toISOString(),
    };
    setWorkspace({
      application: submittedApplication,
      storefront: {
        tagline: "Contemporary African craft, made with meaning.",
        about: submittedApplication.story,
        accent: "ochre",
      },
      products: [],
      orders: [],
    });
    setSection("overview");
    showFeedback("Application saved. Your private vendor workspace is ready.");
  };

  const resetPortal = () => {
    if (!window.confirm("Reset this demo workspace and return to the application form?")) return;
    localStorage.removeItem(VENDOR_STORAGE_KEY);
    setWorkspace(null);
    setApplication(emptyApplication);
    setSection("overview");
    setFeedback("");
  };

  if (!workspace) {
    return (
      <main className="min-h-screen px-4 pb-20 pt-28 md:px-8 md:pt-36">
        <div className="mx-auto max-w-6xl">
          <div className="grid overflow-hidden border border-border bg-card/70 lg:grid-cols-[0.86fr_1.14fr]">
            <div className="bg-pattern-african relative flex min-h-[280px] flex-col justify-between overflow-hidden p-7 md:p-12 lg:min-h-[720px]">
              <div className="absolute -right-24 -top-20 h-72 w-72 rounded-full border border-primary/20" />
              <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full border border-accent/25" />
              <div className="relative">
                <div className="mb-8 flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-primary">
                  <span className="h-px w-8 bg-primary" />
                  Vendor registration
                </div>
                <p className="mb-5 max-w-sm font-serif text-4xl leading-[1.04] text-foreground md:text-6xl">
                  Put your work in the room.
                </p>
                <p className="max-w-md text-sm leading-7 text-muted-foreground">
                  Afrotextile is a considered marketplace for independent African designers, makers, and textile houses. Tell us what you are building.
                </p>
              </div>
              <div className="relative mt-12 border-t border-border/70 pt-5 text-xs leading-6 text-muted-foreground">
                <p className="mb-2 uppercase tracking-[0.18em] text-primary">What happens next</p>
                <p>Submit your details, then shape a storefront and add your first collection from this browser.</p>
              </div>
            </div>

            <form onSubmit={submitApplication} noValidate className="p-6 md:p-12">
              <div className="mb-10 flex items-start justify-between gap-5">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-[0.24em] text-primary">01 / Application</p>
                  <h1 className="font-serif text-3xl font-semibold text-foreground md:text-4xl">Start your vendor story</h1>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                    A few details help us understand your label. There is no payment or account creation in this prototype.
                  </p>
                </div>
                <CircleHelp className="mt-1 hidden h-5 w-5 shrink-0 text-muted-foreground md:block" aria-label="Application help" />
              </div>

              <div className="space-y-6">
                <Field
                  id="businessName"
                  label="Business name"
                  value={application.businessName}
                  onChange={(value) => updateApplication("businessName", value)}
                  placeholder="e.g. Adunni Couture"
                  error={applicationErrors.businessName}
                />
                <div className="grid gap-6 md:grid-cols-2">
                  <Field
                    id="ownerName"
                    label="Owner or primary contact"
                    value={application.ownerName}
                    onChange={(value) => updateApplication("ownerName", value)}
                    placeholder="Full name"
                    error={applicationErrors.ownerName}
                  />
                  <Field
                    id="email"
                    label="Email address"
                    type="email"
                    value={application.email}
                    onChange={(value) => updateApplication("email", value)}
                    placeholder="you@yourlabel.com"
                    error={applicationErrors.email}
                  />
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <Field
                    id="location"
                    label="Based in"
                    value={application.location}
                    onChange={(value) => updateApplication("location", value)}
                    placeholder="City, country"
                    error={applicationErrors.location}
                  />
                  <label className="block text-sm text-foreground" htmlFor="category">
                    Category
                    <select
                      id="category"
                      data-testid="select-category"
                      value={application.category}
                      onChange={(event) => updateApplication("category", event.target.value)}
                      className="mt-2 h-11 w-full border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                      {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                  </label>
                </div>
                <label className="block text-sm text-foreground" htmlFor="story">
                  Tell us about your work
                  <textarea
                    id="story"
                    data-testid="textarea-story"
                    value={application.story}
                    onChange={(event) => updateApplication("story", event.target.value)}
                    placeholder="What do you make, where does it come from, and what should a customer feel when they find it?"
                    rows={5}
                    className="mt-2 w-full resize-y border border-input bg-background px-3 py-3 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <span className="mt-1 block text-xs text-muted-foreground">Minimum 40 characters · {application.story.length}/600</span>
                  {applicationErrors.story && <ErrorMessage message={applicationErrors.story} />}
                </label>
              </div>

              <div className="mt-9 border-t border-border pt-7">
                <div className="mb-4">
                  <p className="text-sm text-foreground">Choose a starting plan</p>
                  <p className="mt-1 text-xs text-muted-foreground">You can explore this prototype without a payment method.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {planValues.map((plan) => (
                    <button
                      type="button"
                      key={plan}
                      data-testid={`button-plan-${plan.toLowerCase()}`}
                      onClick={() => updateApplication("plan", plan)}
                      className={`text-left transition-colors ${application.plan === plan ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/60"} border p-4`}
                      aria-pressed={application.plan === plan}
                    >
                      <span className="flex items-center justify-between gap-2 text-sm font-medium text-foreground">
                        {plan}
                        {application.plan === plan && <Check className="h-4 w-4 text-primary" />}
                      </span>
                      <span className="mt-2 block font-serif text-xl text-primary">{planDetails[plan].price}</span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">{planDetails[plan].note}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-9 flex flex-col gap-4 border-t border-border pt-7 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-sm text-xs leading-5 text-muted-foreground">
                  By continuing, you are saving a local prototype application only. It is not a live seller agreement.
                </p>
                <Button type="submit" variant="hero" size="lg" data-testid="button-submit-application">
                  Create workspace <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-3 pb-20 pt-24 md:px-6 md:pt-28">
      <div className="mx-auto flex max-w-[1440px] gap-5">
        <aside className={`fixed inset-y-0 left-0 z-40 w-[280px] border-r border-border bg-background px-5 pb-7 pt-24 transition-transform md:static md:block md:w-[230px] md:translate-x-0 md:border md:px-4 md:pt-5 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex h-full flex-col">
            <div className="mb-8 flex items-start justify-between md:block">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-primary">Vendor workspace</p>
                <p className="mt-2 font-serif text-xl text-foreground">{workspace.application.businessName}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {workspace.application.location}</p>
              </div>
              <button type="button" className="text-muted-foreground md:hidden" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" data-testid="button-close-vendor-navigation">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="space-y-1" aria-label="Vendor workspace sections">
              {navItems.map(({ id, label, icon: Icon }) => (
                <button
                  type="button"
                  key={id}
                  data-testid={`button-section-${id}`}
                  onClick={() => { setSection(id); setMobileNavOpen(false); }}
                  className={`flex w-full items-center gap-3 px-3 py-3 text-left text-sm transition-colors ${section === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                  aria-current={section === id ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {id === "products" && workspace.products.length > 0 && <span className="ml-auto text-xs opacity-70">{workspace.products.length}</span>}
                </button>
              ))}
            </nav>
            <div className="mt-auto border-t border-border pt-5">
              <div className="mb-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>Local prototype. Your workspace stays in this browser.</span>
              </div>
              <Button type="button" variant="outline" size="sm" className="w-full" onClick={resetPortal} data-testid="button-reset-demo">
                <RotateCcw className="h-3.5 w-3.5" /> Reset demo
              </Button>
            </div>
          </div>
        </aside>
        {mobileNavOpen && <button type="button" className="fixed inset-0 z-30 bg-background/70 md:hidden" onClick={() => setMobileNavOpen(false)} aria-label="Close workspace menu" />}

        <section className="min-w-0 flex-1">
          <div className="mb-5 flex items-center justify-between border-b border-border pb-5">
            <div className="flex items-center gap-3">
              <button type="button" className="border border-border p-2 text-muted-foreground md:hidden" onClick={() => setMobileNavOpen(true)} aria-label="Open workspace navigation" data-testid="button-open-vendor-navigation">
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-primary">Afrotextile / {section}</p>
                <h1 className="mt-1 font-serif text-2xl text-foreground md:text-3xl">{sectionTitle(section)}</h1>
              </div>
            </div>
            <div className="hidden items-center gap-3 sm:flex">
              <span className="border border-primary/30 px-3 py-1.5 text-xs text-primary">{workspace.application.plan} plan</span>
              <span className="flex h-9 w-9 items-center justify-center bg-primary font-serif text-sm text-primary-foreground" aria-label={`Initials for ${workspace.application.businessName}`}>
                {initials(workspace.application.businessName)}
              </span>
            </div>
          </div>

          {feedback && <div className="mb-5 flex items-center gap-2 border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-foreground" role="status" data-testid="status-feedback"><CheckCircle2 className="h-4 w-4 text-primary" /> {feedback}</div>}
          {section === "overview" && <Overview workspace={workspace} onNavigate={setSection} />}
          {section === "storefront" && <Storefront workspace={workspace} setWorkspace={setWorkspace} onSaved={showFeedback} />}
          {section === "products" && <Products workspace={workspace} setWorkspace={setWorkspace} onSaved={showFeedback} />}
          {section === "orders" && <Orders workspace={workspace} />}
          {section === "analytics" && <Analytics workspace={workspace} />}
        </section>
      </div>
    </main>
  );
};

const Field = ({ id, label, value, onChange, placeholder, error, type = "text" }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder: string; error?: string; type?: string }) => (
  <label className="block text-sm text-foreground" htmlFor={id}>
    {label}
    <input id={id} data-testid={`input-${id}`} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`mt-2 h-11 w-full border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary ${error ? "border-destructive" : "border-input"}`} />
    {error && <ErrorMessage message={error} />}
  </label>
);

const ErrorMessage = ({ message }: { message: string }) => <span className="mt-1 flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3 w-3" /> {message}</span>;

const sectionTitle = (section: PortalSection) => navItems.find((item) => item.id === section)?.label ?? "Overview";

const initials = (name: string) => name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "AF";

const Overview = ({ workspace, onNavigate }: { workspace: VendorWorkspace; onNavigate: (section: PortalSection) => void }) => {
  const published = workspace.products.filter((product) => product.status === "Published").length;
  const inventory = workspace.products.reduce((sum, product) => sum + product.inventory, 0);
  return (
    <div className="space-y-6">
      <div className="grid gap-5 border border-border bg-card p-6 md:grid-cols-[1.3fr_0.7fr] md:p-8">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.24em] text-primary">Application received</p>
          <h2 className="max-w-2xl font-serif text-3xl leading-tight text-foreground md:text-5xl">A good beginning for {workspace.application.businessName}.</h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">{workspace.application.story}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" variant="hero" onClick={() => onNavigate("storefront")} data-testid="button-edit-storefront">Edit storefront <ArrowUpRight className="h-4 w-4" /></Button>
            <Button type="button" variant="heroOutline" onClick={() => onNavigate("products")} data-testid="button-add-first-product"><Plus className="h-4 w-4" /> Add a product</Button>
          </div>
        </div>
        <div className="flex flex-col justify-between border-t border-border pt-5 md:border-l md:border-t-0 md:pl-7 md:pt-0">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Application status</p>
            <p className="mt-3 flex items-center gap-2 font-serif text-2xl text-foreground"><span className="h-2 w-2 rounded-full bg-primary" /> Under review</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">This status is a prototype placeholder; no live review team is connected.</p>
          </div>
          <p className="mt-8 text-xs text-muted-foreground">Submitted {formatDate(workspace.application.submittedAt)}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Published products" value={published.toString()} detail="Ready for your storefront" icon={Package} />
        <Metric label="Units in inventory" value={inventory.toString()} detail="Across your catalog" icon={Boxes} />
        <Metric label="Orders" value={workspace.orders.length.toString()} detail="No live orders connected" icon={ShoppingBag} />
        <Metric label="Revenue" value="$0.00" detail="Prototype analytics only" icon={CircleDollarSign} />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_0.72fr]">
        <div className="border border-border bg-card p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div><p className="text-xs uppercase tracking-[0.2em] text-primary">Next steps</p><h3 className="mt-2 font-serif text-2xl text-foreground">Shape the shop</h3></div>
            <span className="text-sm text-muted-foreground">{published}/3 complete</span>
          </div>
          <div className="space-y-3">
            <Step done label="Application submitted" detail="Your business details are saved locally." />
            <Step done={workspace.storefront.tagline.length > 0} label="Write your storefront introduction" detail="Give browsers a reason to stay." onClick={() => onNavigate("storefront")} />
            <Step done={workspace.products.length > 0} label="Add your first product" detail="Start with one piece from your current collection." onClick={() => onNavigate("products")} />
          </div>
        </div>
        <div className="border border-primary/25 bg-primary/5 p-6">
          <div className="mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center bg-primary text-primary-foreground"><Building2 className="h-5 w-5" /></div><div><p className="text-xs uppercase tracking-[0.2em] text-primary">Your details</p><p className="mt-1 text-sm text-foreground">{workspace.application.ownerName}</p></div></div>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p className="flex gap-3"><Mail className="h-4 w-4 shrink-0 text-primary" />{workspace.application.email}</p>
            <p className="flex gap-3"><MapPin className="h-4 w-4 shrink-0 text-primary" />{workspace.application.location}</p>
            <p className="flex gap-3"><Store className="h-4 w-4 shrink-0 text-primary" />{workspace.application.category}</p>
          </div>
        </div>
      </div>
      <Disclosure />
    </div>
  );
};

const Metric = ({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Boxes }) => (
  <div className="border border-border bg-card p-5">
    <div className="mb-7 flex items-center justify-between"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p><Icon className="h-4 w-4 text-primary" /></div>
    <p className="font-serif text-3xl text-foreground" data-testid={`metric-${label.toLowerCase().replaceAll(" ", "-")}`}>{value}</p>
    <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
  </div>
);

const Step = ({ label, detail, done, onClick }: { label: string; detail: string; done: boolean; onClick?: () => void }) => (
  <button type="button" disabled={!onClick} onClick={onClick} className={`flex w-full items-start gap-3 border p-3 text-left ${done ? "border-primary/30 bg-primary/5" : "border-border hover:border-primary/50"} disabled:cursor-default`}>
    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${done ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent"}`}><Check className="h-3 w-3" /></span>
    <span><span className="block text-sm text-foreground">{label}</span><span className="mt-1 block text-xs text-muted-foreground">{detail}</span></span>
    {onClick && <ChevronRight className="ml-auto mt-1 h-4 w-4 text-muted-foreground" />}
  </button>
);

const Storefront = ({ workspace, setWorkspace, onSaved }: { workspace: VendorWorkspace; setWorkspace: (workspace: VendorWorkspace) => void; onSaved: (message: string) => void }) => {
  const [tagline, setTagline] = useState(workspace.storefront.tagline);
  const [about, setAbout] = useState(workspace.storefront.about);
  const [accent, setAccent] = useState(workspace.storefront.accent);
  const saveStorefront = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWorkspace({ ...workspace, storefront: { tagline: tagline.trim() || "Contemporary African craft, made with meaning.", about: about.trim(), accent } });
    onSaved("Storefront details saved in this browser.");
  };
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
      <form onSubmit={saveStorefront} className="border border-border bg-card p-6 md:p-8">
        <div className="mb-8"><p className="text-xs uppercase tracking-[0.2em] text-primary">Public-facing details</p><h2 className="mt-2 font-serif text-2xl text-foreground">Make the first impression yours</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">These fields will shape your future storefront. Images and live publishing are not connected in this prototype.</p></div>
        <label className="block text-sm text-foreground" htmlFor="storefront-tagline">Storefront tagline<input id="storefront-tagline" data-testid="input-storefront-tagline" value={tagline} onChange={(event) => setTagline(event.target.value)} maxLength={100} className="mt-2 h-11 w-full border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary" /></label>
        <label className="mt-6 block text-sm text-foreground" htmlFor="storefront-about">About your label<textarea id="storefront-about" data-testid="textarea-storefront-about" value={about} onChange={(event) => setAbout(event.target.value)} rows={8} maxLength={700} className="mt-2 w-full resize-y border border-input bg-background px-3 py-3 text-sm leading-6 text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary" /></label>
        <div className="mt-6"><p className="text-sm text-foreground">Accent treatment</p><div className="mt-3 flex gap-3">{["ochre", "terracotta", "indigo"].map((option) => <button type="button" key={option} data-testid={`button-accent-${option}`} onClick={() => setAccent(option)} className={`flex items-center gap-2 border px-3 py-2 text-xs capitalize ${accent === option ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"}`} aria-pressed={accent === option}><span className={`h-3 w-3 rounded-full ${option === "ochre" ? "bg-primary" : option === "terracotta" ? "bg-accent" : "bg-secondary"}`} />{option}{accent === option && <Check className="h-3 w-3 text-primary" />}</button>)}</div></div>
        <Button type="submit" variant="hero" className="mt-8" data-testid="button-save-storefront"><Save className="h-4 w-4" /> Save storefront</Button>
      </form>
      <div className="border border-border bg-card p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Preview</p>
        <div className={`mt-5 min-h-[430px] border border-border p-6 ${accent === "ochre" ? "bg-primary/5" : accent === "terracotta" ? "bg-accent/10" : "bg-secondary/20"}`}>
          <div className="flex items-center justify-between border-b border-border pb-4"><span className="font-serif text-lg text-foreground">{workspace.application.businessName}</span><span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Atelier</span></div>
          <div className="flex min-h-[330px] flex-col justify-center"><p className="max-w-sm font-serif text-3xl leading-tight text-foreground">{tagline || "Your tagline will live here."}</p><p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">{about || "A short story about your label will appear here."}</p><div className="mt-7 h-px w-20 bg-primary" /></div>
        </div>
      </div>
    </div>
  );
};

const Products = ({ workspace, setWorkspace, onSaved }: { workspace: VendorWorkspace; setWorkspace: (workspace: VendorWorkspace) => void; onSaved: (message: string) => void }) => {
  const [editing, setEditing] = useState<VendorProduct | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", category: categories[0], price: "", inventory: "0", status: "Published" as VendorProduct["status"] });
  const openAdd = () => { setDraft({ name: "", category: categories[0], price: "", inventory: "0", status: "Published" }); setEditing(null); setIsAdding(true); };
  const openEdit = (product: VendorProduct) => { setDraft({ name: product.name, category: product.category, price: product.price.toString(), inventory: product.inventory.toString(), status: product.status }); setEditing(product); setIsAdding(true); };
  const saveProduct = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.price || Number(draft.price) < 0 || Number(draft.inventory) < 0) return;
    const product: VendorProduct = { id: editing?.id ?? createId(), name: draft.name.trim(), category: draft.category, price: Number(draft.price), inventory: Number(draft.inventory), status: draft.status };
    const products = editing ? workspace.products.map((item) => item.id === editing.id ? product : item) : [...workspace.products, product];
    setWorkspace({ ...workspace, products });
    setIsAdding(false);
    onSaved(editing ? "Product updated." : "Product added to your catalog.");
  };
  const removeProduct = (product: VendorProduct) => {
    if (!window.confirm(`Remove ${product.name} from this demo catalog?`)) return;
    setWorkspace({ ...workspace, products: workspace.products.filter((item) => item.id !== product.id) });
    onSaved("Product removed from your catalog.");
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 border border-border bg-card p-6 sm:flex-row sm:items-end md:p-8"><div><p className="text-xs uppercase tracking-[0.2em] text-primary">Catalog manager</p><h2 className="mt-2 font-serif text-2xl text-foreground">Your collection, clearly presented</h2><p className="mt-2 text-sm text-muted-foreground">Add simple product records and keep an eye on available units.</p></div><Button type="button" variant="hero" onClick={openAdd} data-testid="button-add-product"><Plus className="h-4 w-4" /> Add product</Button></div>
      {isAdding && <form onSubmit={saveProduct} className="border border-primary/40 bg-primary/5 p-6" data-testid="form-product"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.2em] text-primary">{editing ? "Edit product" : "New product"}</p><h3 className="mt-1 font-serif text-2xl text-foreground">{editing ? editing.name : "Add a piece"}</h3></div><button type="button" onClick={() => setIsAdding(false)} className="text-muted-foreground hover:text-foreground" aria-label="Close product form" data-testid="button-close-product-form"><X className="h-5 w-5" /></button></div><div className="grid gap-5 md:grid-cols-2"><label className="text-sm text-foreground">Product name<input required data-testid="input-product-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. Indigo Ceremony Wrap" className="mt-2 h-11 w-full border border-input bg-background px-3 text-sm outline-none focus:border-primary" /></label><label className="text-sm text-foreground">Category<select data-testid="select-product-category" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className="mt-2 h-11 w-full border border-input bg-background px-3 text-sm outline-none focus:border-primary">{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="text-sm text-foreground">Price (USD)<input required min="0" step="0.01" type="number" data-testid="input-product-price" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} placeholder="0.00" className="mt-2 h-11 w-full border border-input bg-background px-3 text-sm outline-none focus:border-primary" /></label><label className="text-sm text-foreground">Inventory units<input required min="0" step="1" type="number" data-testid="input-product-inventory" value={draft.inventory} onChange={(event) => setDraft({ ...draft, inventory: event.target.value })} className="mt-2 h-11 w-full border border-input bg-background px-3 text-sm outline-none focus:border-primary" /></label></div><div className="mt-5"><p className="text-sm text-foreground">Listing status</p><div className="mt-2 flex gap-3">{(["Published", "Draft"] as const).map((status) => <button type="button" key={status} onClick={() => setDraft({ ...draft, status })} className={`border px-3 py-2 text-xs ${draft.status === status ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"}`} aria-pressed={draft.status === status}>{status}</button>)}</div></div><div className="mt-6 flex gap-3"><Button type="submit" variant="hero" data-testid="button-save-product"><Save className="h-4 w-4" /> {editing ? "Update product" : "Save product"}</Button><Button type="button" variant="outline" onClick={() => setIsAdding(false)} data-testid="button-cancel-product">Cancel</Button></div></form>}
      {workspace.products.length === 0 && !isAdding ? <div className="border border-dashed border-border bg-card/40 px-6 py-16 text-center"><Package className="mx-auto h-8 w-8 text-primary" /><h3 className="mt-4 font-serif text-2xl text-foreground">Your catalog is waiting</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Add one hero piece to begin shaping your storefront. These records stay in this browser and are not published live.</p><Button type="button" variant="heroOutline" className="mt-6" onClick={openAdd} data-testid="button-empty-add-product"><Plus className="h-4 w-4" /> Add your first product</Button></div> : <div className="overflow-hidden border border-border bg-card"><div className="hidden grid-cols-[1fr_150px_100px_110px_90px] gap-4 border-b border-border px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground md:grid"><span>Product</span><span>Category</span><span>Price</span><span>Status</span><span className="text-right">Actions</span></div>{workspace.products.map((product) => <div key={product.id} className="grid gap-4 border-b border-border px-5 py-5 last:border-b-0 md:grid-cols-[1fr_150px_100px_110px_90px] md:items-center md:py-4"><div><p className="text-sm text-foreground">{product.name}</p><p className="mt-1 text-xs text-muted-foreground">{product.inventory} units in inventory</p></div><span className="text-xs text-muted-foreground">{product.category}</span><span className="font-serif text-lg text-primary">${product.price.toFixed(2)}</span><span className={`w-fit border px-2 py-1 text-[10px] uppercase tracking-[0.12em] ${product.status === "Published" ? "border-primary/40 text-primary" : "border-border text-muted-foreground"}`}>{product.status}</span><div className="flex justify-end gap-1"><button type="button" onClick={() => openEdit(product)} className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Edit ${product.name}`} data-testid={`button-edit-product-${product.id}`}><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => removeProduct(product)} className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Remove ${product.name}`} data-testid={`button-remove-product-${product.id}`}><Trash2 className="h-4 w-4" /></button></div></div>)}</div>}
    </div>
  );
};

const Orders = ({ workspace }: { workspace: VendorWorkspace }) => (
  <div className="space-y-5">
    <div className="border border-border bg-card p-6 md:p-8"><p className="text-xs uppercase tracking-[0.2em] text-primary">Order desk</p><h2 className="mt-2 font-serif text-2xl text-foreground">A quiet inbox, for now</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Orders will appear here when a shared marketplace backend is connected. No customer, payment, or fulfillment data is being processed in this frontend prototype.</p></div>
    {workspace.orders.length === 0 ? <div className="border border-dashed border-border bg-card/40 px-6 py-20 text-center"><ShoppingBag className="mx-auto h-8 w-8 text-primary" /><h3 className="mt-4 font-serif text-2xl text-foreground">No orders yet</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">This is an intentional empty state. Your future order history will be organized here.</p></div> : <div className="border border-border bg-card">{workspace.orders.map((order) => <div key={order.id} className="flex items-center justify-between border-b border-border p-5 last:border-0"><div><p className="text-sm text-foreground">{order.item}</p><p className="mt-1 text-xs text-muted-foreground">{order.id} · {order.date}</p></div><div className="text-right"><p className="font-serif text-lg text-primary">${order.total.toFixed(2)}</p><p className="text-xs text-muted-foreground">{order.status}</p></div></div>)}</div>}
  </div>
);

const Analytics = ({ workspace }: { workspace: VendorWorkspace }) => {
  const inventory = workspace.products.reduce((sum, product) => sum + product.inventory, 0);
  const published = workspace.products.filter((product) => product.status === "Published").length;
  return <div className="space-y-5"><div className="border border-border bg-card p-6 md:p-8"><p className="text-xs uppercase tracking-[0.2em] text-primary">Signal, not noise</p><h2 className="mt-2 font-serif text-2xl text-foreground">A useful baseline for your next decision</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">This summary reflects the records you have entered locally. It does not represent live traffic, customers, payments, or marketplace performance.</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Catalog size" value={workspace.products.length.toString()} detail="Products added" icon={Package} /><Metric label="Published" value={published.toString()} detail="Visible when connected" icon={Store} /><Metric label="Inventory" value={inventory.toString()} detail="Units recorded" icon={Boxes} /><Metric label="Conversion" value="—" detail="Awaiting shared data" icon={BarChart3} /></div><div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]"><div className="border border-border bg-card p-6 md:p-8"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.2em] text-primary">Performance view</p><h3 className="mt-2 font-serif text-2xl text-foreground">No live signal yet</h3></div><BarChart3 className="h-5 w-5 text-primary" /></div><div className="mt-10 flex h-36 items-end gap-2 border-b border-l border-border px-3 pb-0">{[22, 35, 30, 45, 38, 55, 48, 64, 56, 72, 60, 78].map((height, index) => <div key={index} className="flex-1 bg-primary/20" style={{ height: `${height}%` }} />)}</div><div className="mt-3 flex justify-between text-[10px] uppercase tracking-[0.15em] text-muted-foreground"><span>Application</span><span>Today</span></div></div><div className="border border-primary/25 bg-primary/5 p-6 md:p-8"><CircleDollarSign className="h-5 w-5 text-primary" /><h3 className="mt-5 font-serif text-2xl text-foreground">Keep the story close</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">Products with a clear origin story often give shoppers a stronger reason to explore. Use your storefront editor to make that context visible.</p></div></div><Disclosure /></div>;
};

const Disclosure = () => <div className="flex gap-3 border border-border bg-muted/40 p-4 text-xs leading-5 text-muted-foreground"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p><span className="text-foreground">Frontend prototype disclosure:</span> workspace data is saved in localStorage on this browser only. There are no shared accounts, live payments, real orders, or connected backend services yet.</p></div>;

const formatDate = (date: string) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));

export default VendorPortalPage;