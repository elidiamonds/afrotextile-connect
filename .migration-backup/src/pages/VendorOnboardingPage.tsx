import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Store, TrendingUp, Globe, Zap, ArrowRight, CheckCircle2 } from "lucide-react";

const VendorOnboardingPage = () => {
  const benefits = [
    { icon: Globe, title: "Global Reach", desc: "Sell to buyers across 40+ countries with built-in localization and currency support." },
    { icon: Zap, title: "Launch in Minutes", desc: "Set up your storefront, upload products, and start selling — no technical skill needed." },
    { icon: TrendingUp, title: "Grow with Insights", desc: "Track orders, revenue, and customer behavior with our vendor analytics dashboard." },
    { icon: Store, title: "Your Brand, Your Store", desc: "Customize your storefront with your logo, banner, and brand story." },
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
            Sell Your Craft to <span className="text-gradient-gold">The World</span>
          </h1>
          <p className="text-lg text-muted-foreground font-sans leading-relaxed">
            Join thousands of African designers, fabric merchants, and artisans growing their business on Afrotextile — Africa's premier fashion marketplace.
          </p>
          <div className="flex flex-wrap gap-4 justify-center pt-4">
            <Button variant="hero" size="lg" className="text-base px-8">
              Start Selling <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button asChild variant="heroOutline" size="lg" className="text-base px-8">
              <Link to="/contact">Talk to Sales</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
          {benefits.map((b) => (
            <div key={b.title} className="bg-card border border-border rounded-sm p-6 space-y-3">
              <div className="w-12 h-12 rounded-sm bg-primary/10 flex items-center justify-center">
                <b.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-foreground">{b.title}</h3>
              <p className="text-sm text-muted-foreground font-sans leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-sm p-8 md:p-12 mb-24">
          <div className="text-center mb-10 space-y-3">
            <span className="font-sans text-xs uppercase tracking-[0.3em] text-primary">Get Started</span>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground">How It Works</h2>
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
          <span className="font-sans text-xs uppercase tracking-[0.3em] text-primary">Simple Pricing</span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground">No Setup Fees. Pay as You Grow.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            { name: "Starter", price: "Free", desc: "Perfect for new vendors testing the waters.", features: ["Up to 20 product listings", "Standard storefront", "10% commission per sale"], featured: false },
            { name: "Growth", price: "$29/mo", desc: "For established designers scaling globally.", features: ["Unlimited products", "Custom branding", "7% commission per sale", "Analytics dashboard"], featured: true },
            { name: "Enterprise", price: "Custom", desc: "For large brands with bespoke needs.", features: ["Dedicated account manager", "Lowest commission rates", "API access", "Priority support"], featured: false },
          ].map((plan) => (
            <div key={plan.name} className={`rounded-sm p-8 space-y-4 ${plan.featured ? "bg-gradient-gold text-primary-foreground" : "bg-card border border-border"}`}>
              <h3 className={`font-serif text-2xl font-bold ${plan.featured ? "text-primary-foreground" : "text-foreground"}`}>{plan.name}</h3>
              <p className={`font-serif text-4xl font-bold ${plan.featured ? "text-primary-foreground" : "text-primary"}`}>{plan.price}</p>
              <p className={`text-sm font-sans ${plan.featured ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{plan.desc}</p>
              <ul className="space-y-2 pt-2">
                {plan.features.map((f) => (
                  <li key={f} className={`flex items-start gap-2 text-sm font-sans ${plan.featured ? "text-primary-foreground" : "text-foreground"}`}>
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button className={`w-full mt-4 ${plan.featured ? "bg-background text-foreground hover:bg-background/90" : ""}`} variant={plan.featured ? "default" : "heroOutline"}>
                Get Started
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VendorOnboardingPage;