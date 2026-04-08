import { Link } from "react-router-dom";
import { ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/ProductCard";
import { products, vendors } from "@/data/mock";
import homeBg from "@/assets/home-bg.jpg";
import col1 from "@/assets/collection-1.jpg";
import col2 from "@/assets/collection-2.jpg";
import col3 from "@/assets/collection-3.jpg";
import { useState } from "react";

const HomePage = () => {
  const trending = products.filter((p) => p.isTrending);
  const newArrivals = products.filter((p) => p.isNew);
  const [email, setEmail] = useState("");

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center bg-pattern-african">
        <div className="container mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center pt-16">
          <div className="space-y-8 animate-fade-up">
            <div className="inline-block">
              <span className="font-sans text-xs uppercase tracking-[0.3em] text-primary border border-primary/30 px-4 py-1.5 rounded-full">
                Global African Fashion
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-serif font-bold leading-[1.1] text-foreground">
              Where Heritage
              <br />
              <span className="text-gradient-gold">Meets Haute</span>
              <br />
              Couture
            </h1>
            <p className="text-lg text-muted-foreground max-w-md font-sans leading-relaxed">
              Discover bold African prints, luxurious textures, and modern silhouettes from the continent's finest designers.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild variant="hero" size="lg" className="text-base px-8">
                <Link to="/shop">Shop Collection <ArrowRight className="ml-2 w-4 h-4" /></Link>
              </Button>
              <Button asChild variant="heroOutline" size="lg" className="text-base px-8">
                <Link to="/about">Our Story</Link>
              </Button>
            </div>
          </div>
          <div className="relative animate-fade-in hidden lg:block">
            <div className="relative rounded-sm overflow-hidden shadow-2xl shadow-primary/10">
              <img src={heroImg} alt="African fashion model in Ankara blazer" width={1024} height={1280} className="w-full h-auto" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* Collections */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-3">
            <span className="font-sans text-xs uppercase tracking-[0.3em] text-primary">Curated</span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground">Featured Collections</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { img: col1, title: "Heritage Luxe", subtitle: "Traditional meets premium" },
              { img: col2, title: "Urban Ankara", subtitle: "City-ready African prints" },
              { img: col3, title: "Textile Stories", subtitle: "Fabric as narrative" },
            ].map((col) => (
              <Link to="/shop" key={col.title} className="group relative aspect-square overflow-hidden rounded-sm">
                <img src={col.img} alt={col.title} loading="lazy" width={800} height={800} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <h3 className="font-serif text-2xl font-bold text-foreground mb-1">{col.title}</h3>
                  <p className="text-sm text-muted-foreground font-sans">{col.subtitle}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trending */}
      <section className="py-24 bg-card">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-12">
            <div className="space-y-2">
              <span className="font-sans text-xs uppercase tracking-[0.3em] text-primary">Popular Now</span>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground">Trending Pieces</h2>
            </div>
            <Link to="/shop" className="hidden md:flex items-center gap-2 text-sm font-sans text-primary hover:underline">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {trending.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-12">
            <div className="space-y-2">
              <span className="font-sans text-xs uppercase tracking-[0.3em] text-primary">Just Landed</span>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground">New Arrivals</h2>
            </div>
            <Link to="/shop" className="hidden md:flex items-center gap-2 text-sm font-sans text-primary hover:underline">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Vendors */}
      <section className="py-24 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-3">
            <span className="font-sans text-xs uppercase tracking-[0.3em] text-primary">Our Designers</span>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground">Meet the Artisans</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {vendors.map((v) => (
              <div key={v.id} className="bg-background rounded-sm p-6 border border-border hover:border-primary/30 transition-colors group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <span className="font-serif text-lg font-bold text-primary">{v.name[0]}</span>
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-semibold text-foreground">{v.name}</h3>
                    <p className="text-xs text-muted-foreground font-sans">{v.location}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground font-sans leading-relaxed mb-4 line-clamp-2">{v.description}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground font-sans">
                  <span>{v.productCount} products</span>
                  <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-primary text-primary" />{v.rating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-24 bg-pattern-african">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <span className="font-sans text-xs uppercase tracking-[0.3em] text-primary">Stay Connected</span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mt-3 mb-4">Join the Movement</h2>
          <p className="text-muted-foreground font-sans mb-8">
            Get exclusive access to new collections, designer stories, and member-only offers.
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
