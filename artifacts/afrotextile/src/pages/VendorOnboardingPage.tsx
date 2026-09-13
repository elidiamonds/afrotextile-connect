import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Store,
  TrendingUp,
  Globe,
  Zap,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import {
  getGetMyVendorQueryKey,
  useCreateVendor,
  useGetMyVendor,
} from "@workspace/api-client-react";
import { useAuth } from "@clerk/react";
import VendorFormFields, {
  type VendorForm,
} from "@/components/VendorFormFields";
import { useToast } from "@/hooks/use-toast";

const VendorOnboardingPage = () => {
  const [searchParams] = useSearchParams();
  const { isSignedIn } = useAuth();
  const { data: myVendor, isLoading: isLoadingVendor } = useGetMyVendor({
    query: {
      enabled: Boolean(isSignedIn),
      queryKey: getGetMyVendorQueryKey(),
      retry: false,
    },
  });
  const navigate = useNavigate();
  const { toast } = useToast();
  const requestedPlan = searchParams.get("plan");
  const initialPlan =
    requestedPlan === "Growth" || requestedPlan === "Enterprise"
      ? requestedPlan
      : "Starter";
  const [showForm, setShowForm] = useState(
    searchParams.get("apply") === "true" || Boolean(requestedPlan),
  );
  const [form, setForm] = useState<VendorForm>({
    businessName: "",
    contactName: "",
    email: "",
    phone: "",
    location: "",
    category: "",
    plan: initialPlan,
    description: "",
    logoUrl: "",
  });
  useEffect(() => {
    if (searchParams.get("apply") === "true" || requestedPlan) {
      setShowForm(true);
    }
    if (
      requestedPlan === "Starter" ||
      requestedPlan === "Growth" ||
      requestedPlan === "Enterprise"
    ) {
      setForm((current) => ({ ...current, plan: requestedPlan }));
    }
  }, [requestedPlan, searchParams]);
  const createVendor = useCreateVendor({
    mutation: {
      onSuccess: (vendor) => {
        toast({
          title: "Application submitted",
          description: "Your vendor dashboard is ready.",
        });
        navigate(`/vendor/dashboard/${vendor.id}`);
      },
      onError: (error) => {
        toast({
          title: "Could not submit application",
          description:
            error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isSignedIn) {
      navigate("/sign-up");
      return;
    }
    createVendor.mutate({
      data: { ...form, logoUrl: form.logoUrl || undefined },
    });
  };
  const benefits = [
    {
      icon: Globe,
      title: "Global Reach",
      desc: "Sell to buyers across 40+ countries with built-in localization and currency support.",
    },
    {
      icon: Zap,
      title: "Launch in Minutes",
      desc: "Set up your storefront, upload products, and start selling — no technical skill needed.",
    },
    {
      icon: TrendingUp,
      title: "Grow with Insights",
      desc: "Track orders, revenue, and customer behavior with our vendor analytics dashboard.",
    },
    {
      icon: Store,
      title: "Your Brand, Your Store",
      desc: "Customize your storefront with your logo, banner, and brand story.",
    },
  ];

  const steps = [
    "Register and submit your business details",
    "Get verified by our trust & safety team",
    "Customize your storefront and upload products",
    "Start receiving orders from across the world",
  ];

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-6">
          <span className="inline-block font-sans text-xs uppercase tracking-[0.3em] text-primary border border-primary/30 px-4 py-1.5 rounded-full">
            Vendor Portal
          </span>
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-foreground leading-tight">
            Sell Your Craft to{" "}
            <span className="text-gradient-gold">The World</span>
          </h1>
          <p className="text-lg text-muted-foreground font-sans leading-relaxed">
            Join thousands of African designers, fabric merchants, and artisans
            growing their business on Afrotextile — Africa's premier fashion
            marketplace.
          </p>
          <div className="flex flex-wrap gap-4 justify-center pt-4">
            <Button asChild variant="hero" size="lg" className="text-base px-8">
              <button
                type="button"
                onClick={() =>
                  isSignedIn ? setShowForm(true) : navigate("/sign-up")
                }
              >
                Start Selling <ArrowRight className="ml-2 w-4 h-4" />
              </button>
            </Button>
            <Button
              asChild
              variant="heroOutline"
              size="lg"
              className="text-base px-8"
            >
              <Link to="/contact">Talk to Sales</Link>
            </Button>
          </div>
        </div>

        {showForm && !isSignedIn && (
          <section className="mx-auto mb-24 max-w-2xl rounded-sm border border-border bg-card p-8 text-center">
            <h2 className="font-serif text-3xl font-bold">
              Create your vendor account
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
              Sign up first, then complete your application. Your form details
              will stay with your account.
            </p>
            <Button asChild variant="hero" size="lg" className="mt-6">
              <Link to="/sign-up">Create account</Link>
            </Button>
          </section>
        )}

        {isSignedIn && myVendor && (
          <section className="mx-auto mb-24 max-w-2xl rounded-sm border border-primary/30 bg-card p-8 text-center">
            <span className="font-sans text-xs uppercase tracking-[0.3em] text-primary">
              Welcome back
            </span>
            <h2 className="mt-3 font-serif text-3xl font-bold">
              {myVendor.businessName}
            </h2>
            <p className="mt-3 text-muted-foreground">
              Your application is {myVendor.status}. Continue to your dashboard
              to manage your storefront.
            </p>
            <Button asChild variant="hero" size="lg" className="mt-6">
              <Link to={`/vendor/dashboard/${myVendor.id}`}>
                Open dashboard
              </Link>
            </Button>
          </section>
        )}

        {showForm && isSignedIn && !myVendor && !isLoadingVendor && (
          <section
            id="apply"
            className="mx-auto mb-24 max-w-4xl scroll-mt-24 rounded-sm border border-border bg-card p-6 md:p-10"
          >
            <div className="mb-8 space-y-2">
              <span className="font-sans text-xs uppercase tracking-[0.3em] text-primary">
                Vendor application
              </span>
              <h2 className="font-serif text-3xl font-bold">
                Build your storefront
              </h2>
              <p className="text-sm text-muted-foreground">
                Submit your business details for review. You can edit your
                storefront from the dashboard afterward.
              </p>
            </div>
            <form onSubmit={submit} className="space-y-7">
              <VendorFormFields form={form} setForm={setForm} />
              <Button
                type="submit"
                variant="hero"
                size="lg"
                disabled={createVendor.isPending || !form.category}
                className="w-full md:w-auto"
              >
                {createVendor.isPending ? "Submitting…" : "Submit application"}
              </Button>
            </form>
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="bg-card border border-border rounded-sm p-6 space-y-3"
            >
              <div className="w-12 h-12 rounded-sm bg-primary/10 flex items-center justify-center">
                <b.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-foreground">
                {b.title}
              </h3>
              <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                {b.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-sm p-8 md:p-12 mb-24">
          <div className="text-center mb-10 space-y-3">
            <span className="font-sans text-xs uppercase tracking-[0.3em] text-primary">
              Get Started
            </span>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
              How It Works
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 max-w-3xl mx-auto">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center flex-shrink-0 font-serif font-bold text-primary-foreground">
                  {i + 1}
                </div>
                <p className="text-foreground font-sans pt-1.5">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mb-10 space-y-3">
          <span className="font-sans text-xs uppercase tracking-[0.3em] text-primary">
            Simple Pricing
          </span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
            No Setup Fees. Pay as You Grow.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            {
              name: "Starter",
              price: "Free",
              desc: "Perfect for new vendors testing the waters.",
              features: [
                "Up to 20 product listings",
                "Standard storefront",
                "10% commission per sale",
              ],
              featured: false,
            },
            {
              name: "Growth",
              price: "$29/mo",
              desc: "For established designers scaling globally.",
              features: [
                "Unlimited products",
                "Custom branding",
                "7% commission per sale",
                "Analytics dashboard",
              ],
              featured: true,
            },
            {
              name: "Enterprise",
              price: "Custom",
              desc: "For large brands with bespoke needs.",
              features: [
                "Dedicated account manager",
                "Lowest commission rates",
                "API access",
                "Priority support",
              ],
              featured: false,
            },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`rounded-sm p-8 space-y-4 ${plan.featured ? "bg-gradient-gold text-primary-foreground" : "bg-card border border-border"}`}
            >
              <h3
                className={`font-serif text-2xl font-bold ${plan.featured ? "text-primary-foreground" : "text-foreground"}`}
              >
                {plan.name}
              </h3>
              <p
                className={`font-serif text-4xl font-bold ${plan.featured ? "text-primary-foreground" : "text-primary"}`}
              >
                {plan.price}
              </p>
              <p
                className={`text-sm font-sans ${plan.featured ? "text-primary-foreground/80" : "text-muted-foreground"}`}
              >
                {plan.desc}
              </p>
              <ul className="space-y-2 pt-2">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className={`flex items-start gap-2 text-sm font-sans ${plan.featured ? "text-primary-foreground" : "text-foreground"}`}
                  >
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className={`w-full mt-4 ${plan.featured ? "bg-background text-foreground hover:bg-background/90" : ""}`}
                variant={plan.featured ? "default" : "heroOutline"}
              >
                <Link
                  to={`/vendor?apply=true&plan=${encodeURIComponent(plan.name)}`}
                >
                  Get Started
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VendorOnboardingPage;
