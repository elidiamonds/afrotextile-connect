import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Search, Star, ShieldCheck, Truck, Globe, BadgeCheck, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/ProductCard";
import { products, vendors, testimonials } from "@/data/mock";
import heroMain from "@/assets/hero-main.jpg";
import catFabrics from "@/assets/cat-fabrics.jpg";
import catMen from "@/assets/cat-men.jpg";
import catWomen from "@/assets/cat-women.jpg";
import catAccessories from "@/assets/cat-accessories.jpg";
import catFootwear from "@/assets/cat-footwear.jpg";
import catCultural from "@/assets/cat-cultural.jpg";
import catRtw from "@/assets/cat-rtw.jpg";

const HomePage = () => {
  const trending = products.filter((p) => p.isTrending);
  const newArrivals = products.filter((p) => p.isNew);
  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/shop?q=${encodeURIComponent(search)}`);
  };

  const categoryCards = [
    { img: catFabrics, title: "Fabrics", count: "320+ items" },
    { img: catWomen, title: "Women's Fashion", count: "1,240+ items" },
    { img: catMen, title: "Men's Fashion", count: "680+ items" },
    { img: catAccessories, title: "Accessories", count: "490+ items" },
    { img: catFootwear, title: "Footwear", count: "210+ items" },
    { img: catCultural, title: "Cultural Fashion", count: "180+ items" },
    { img: catRtw, title: "Ready-to-Wear", count: "560+ items" },
  ];

  const regionCards = [
    { name: "West Africa", desc: "Lagos · Accra · Dakar", count: 1240 },
    { name: "East Africa", desc: "Nairobi · Addis · Zanzibar", count: 680 },
    { name: "Southern Africa", desc: "Cape Town · Joburg · Maputo", count: 540 },
    { name: "Diaspora", desc: "London · NYC · Paris", count: 320 },
  ];

  return (
    <div className="min-h-screen">
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroMain} alt="" width={1600} height={1200} className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
        </div>

        <div className="container mx-auto px-4 relative z-10 pt-16">
          <div className="max-w-2xl space-y-8 animate-fade-up">
            <span className="inline-block font-sans text-xs uppercase tracking-[0.3em] text-primary border border-primary/30 px-4 py-1.5 rounded-full">
              Africa's Premier Fashion Marketplace
            </span>
            <h1 className="text-5xl md:text-7xl font-serif font-bold leading-[1.05] text-foreground">
              Discover the
              <br />
              <span className="text-gradient-gold">Soul of African</span>
              <br />
              Fashion.
            </h1>
            <p className="text-lg text-muted-foreground max-w-md font-sans leading-relaxed">
              From Lagos ateliers to Cape Town boutiques — shop from thousands of verified African designers, fabric merchants, and artisans on one trusted marketplace.
            </p>

            <form onSubmit={handleSearch} className="relative max-w-lg">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Ankara, Kente, vendors, accessories…"
                className="w-full h-14 pl-12 pr-32 rounded-full bg-card/90 backdrop-blur border border-border text-foreground placeholder:text-muted-foreground font-sans text-sm focus:outline-none focus:border-primary transition-colors"
              />
              <Button type="submit" variant="hero" className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full h-11 px-6">
                Search
              </Button>
            </form>

            <div className="flex flex-wrap gap-4">
              <Button asChild variant="hero" size="lg" className="text-base px-8">
                <Link to="/shop">Explore Marketplace <ArrowRight className="ml-2 w-4 h-4" /></Link>
              </Button>
              <Button asChild variant="heroOutline" size="lg" className="text-base px-8">
                <Link to="/vendor">Sell on Afrotextile</Link>
              </Button>
            </div>

            <div className="flex flex-wrap gap-6 pt-4 text-xs text-muted-foreground font-sans">
              <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Verified Vendors</span>
              <span className="flex items-center gap-2"><Truck className="w-4 h-4 text-primary" /> Global Shipping</span>
              <span className="flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> 40+ Countries</span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-3">
            <span className="font-sans text-xs uppercase tracking-[0.3em] text-primary">Shop By</span>
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground">Popular Categories</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {categoryCards.map((cat) => (
              <Link
                key={cat.title}
                to={`/shop?category=${encodeURIComponent(cat.title)}`}
                className="group relative aspect-[3/4] overflow-hidden rounded-sm bg-muted"
              >
                <img src={cat.img} alt={cat.title} loading="lazy" width={800} height={800} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 text-left">
                  <h3 className="font-serif text-sm md:text-base font-bold text-foreground leading-tight">{cat.title}</h3>
                  <p className="text-[10px] text-muted-foreground font-sans uppercase tracking-wider">{cat.count}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-24 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-2">
            <span className="font-sans text-xs uppercase tracking-[0.3em] text-primary">Popular Now</span>
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground">Trending Across Africa</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {trending.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <div className="text-center mt-10">
            <Button asChild variant="heroOutline">
              <Link to="/shop">View All Products <ArrowRight className="w-4 h-4 ml-2" /></Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-3">
            <span className="font-sans text-xs uppercase tracking-[0.3em] text-primary">Verified Designers</span>
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground">Featured Vendors</h2>
            <p className="text-muted-foreground font-sans max-w-xl mx-auto">
              Independent African designers, fabric merchants, and tailors — each one verified by our team.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vendors.slice(0, 6).map((v) => (
              <Link to={`/store/${v.id}`} key={v.id} className="group bg-card rounded-sm border border-border hover:border-primary/50 transition-all overflow-hidden">
                <div className="aspect-[5/3] overflow-hidden bg-muted">
                  <img src={v.logo} alt={v.name} loading="lazy" width={800} height={1000} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-lg font-semibold text-foreground group-hover:text-primary transition-colors">{v.name}</h3>
                      <BadgeCheck className="w-4 h-4 text-primary" />
                    </div>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground font-sans">
                      <Star className="w-3 h-3 fill-primary text-primary" />{v.rating}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-sans uppercase tracking-wider mb-3">{v.location}</p>
                  <p className="text-sm text-muted-foreground font-sans leading-relaxed line-clamp-2 mb-3">{v.description}</p>
                  <span className="text-xs text-primary font-sans uppercase tracking-wider inline-flex items-center gap-1">
                    Visit Store <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-24 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-3">
            <span className="font-sans text-xs uppercase tracking-[0.3em] text-primary">From the Continent</span>
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground">Regional Collections</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {regionCards.map((r) => (
              <Link key={r.name} to={`/shop?region=${encodeURIComponent(r.name)}`} className="group p-6 md:p-8 bg-background rounded-sm border border-border hover:border-primary/50 transition-colors">
                <p className="font-sans text-xs uppercase tracking-[0.3em] text-primary mb-2">{r.count}+ products</p>
                <h3 className="font-serif text-xl md:text-2xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{r.name}</h3>
                <p className="text-sm text-muted-foreground font-sans">{r.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-2">
            <span className="font-sans text-xs uppercase tracking-[0.3em] text-primary">Just Landed</span>
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground">New Arrivals</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-24 bg-card bg-pattern-african">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-3">
            <span className="font-sans text-xs uppercase tracking-[0.3em] text-primary">Voices from the Marketplace</span>
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground">Success Stories</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-background border border-border rounded-sm p-8 space-y-4">
                <Quote className="w-8 h-8 text-primary opacity-50" />
                <p className="text-foreground font-serif italic text-lg leading-relaxed">"{t.quote}"</p>
                <div className="pt-4 border-t border-border">
                  <p className="text-sm font-sans font-semibold text-foreground">{t.author}</p>
                  <p className="text-xs text-muted-foreground font-sans">{t.role} · {t.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-24">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-gold rounded-sm p-10 md:p-16 text-center max-w-4xl mx-auto">
            <span className="font-sans text-xs uppercase tracking-[0.3em] text-primary-foreground/80">For Designers & Vendors</span>
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-primary-foreground mt-3 mb-4">
              Sell to the World From Anywhere in Africa
            </h2>
            <p className="text-primary-foreground/90 font-sans mb-8 max-w-2xl mx-auto">
              Open your storefront in minutes. Reach buyers in 40+ countries. We handle payments, trust, and global logistics — you focus on craft.
            </p>
            <Button asChild size="lg" className="bg-background text-foreground hover:bg-background/90 text-base px-8">
              <Link to="/vendor">Become a Vendor <ArrowRight className="w-4 h-4 ml-2" /></Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-24 bg-card">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <span className="font-sans text-xs uppercase tracking-[0.3em] text-primary">Stay Connected</span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mt-3 mb-4">Join the Movement</h2>
          <p className="text-muted-foreground font-sans mb-8">
            Exclusive drops, vendor spotlights, and member-only offers — straight to your inbox.
          </p>
          <form onSubmit={(e) => { e.preventDefault(); setEmail(""); }} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              className="flex-1 h-11 px-4 rounded-sm bg-muted border border-border text-foreground placeholder:text-muted-foreground font-sans text-sm focus:outline-none focus:border-primary transition-colors"
              required
            />
            <Button variant="hero" className="h-11 px-6">Subscribe</Button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default HomePage;