import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Compass, Plus, Sparkles, ShoppingBag, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { products } from "@/data/mock";
import { useCart } from "@/contexts/CartContext";
import { Product } from "@/types";
import runwayImage from "@/assets/editorial-runway.jpg";
import accessoriesImage from "@/assets/editorial-accessories.jpg";
import lookbookImage from "@/assets/editorial-lookbook.jpg";

type Occasion = "gallery" | "ceremony" | "evening" | "everyday";
type Aesthetic = "sculptural" | "indigo" | "sunlit" | "quiet";

const occasions: { id: Occasion; label: string; note: string }[] = [
  { id: "gallery", label: "Gallery opening", note: "For rooms with something to say" },
  { id: "ceremony", label: "Wedding weekend", note: "A little more than the invitation asks" },
  { id: "evening", label: "After dark", note: "Dinner, dancing, city lights" },
  { id: "everyday", label: "Everyday ritual", note: "The pieces you reach for again" },
];

const aesthetics: { id: Aesthetic; label: string; note: string; swatch: string }[] = [
  { id: "sculptural", label: "Sculptural", note: "Clean volume, strong line", swatch: "bg-[#c58a3a]" },
  { id: "indigo", label: "Indigo quiet", note: "Depth, texture, restraint", swatch: "bg-[#283b59]" },
  { id: "sunlit", label: "Sunlit print", note: "Colour with a pulse", swatch: "bg-[#b95f3d]" },
  { id: "quiet", label: "Soft authority", note: "Polished, never precious", swatch: "bg-[#c5b18a]" },
];

const scoreProduct = (product: Product, occasion: Occasion, aesthetic: Aesthetic) => {
  const text = `${product.name} ${product.fabricType} ${product.description}`.toLowerCase();
  let score = product.rating * 2;

  const occasionTerms: Record<Occasion, string[]> = {
    gallery: ["bomber", "corset", "trouser", "tote", "woven", "isi agu"],
    ceremony: ["kente", "aso-oke", "gown", "kaftan", "silk", "agbada", "iro", "aso ebi"],
    evening: ["gown", "corset", "kaftan", "gold", "silk", "aso ebi"],
    everyday: ["ankara", "trouser", "skirt", "tote", "kitenge", "isi agu"],
  };
  const aestheticTerms: Record<Aesthetic, string[]> = {
    sculptural: ["corset", "bomber", "tote", "woven", "agbada", "isi agu"],
    indigo: ["adire", "mudcloth", "kitenge", "aso-oke"],
    sunlit: ["ankara", "kente", "aso-oke", "gold", "aso ebi", "iro"],
    quiet: ["silk", "kaftan", "tote", "woven", "adire", "agbada"],
  };

  if (occasionTerms[occasion].some((term) => text.includes(term))) score += 8;
  if (aestheticTerms[aesthetic].some((term) => text.includes(term))) score += 7;
  if (product.isNew) score += 1.2;
  if (product.isTrending) score += 0.8;
  return score;
};

const recommendLook = (occasion: Occasion, aesthetic: Aesthetic) => {
  const available = products.filter((product) => product.inStock);
  if (available.length < 3) return [];

  const ranked = [...available].sort((a, b) => {
    const scoreDifference = scoreProduct(b, occasion, aesthetic) - scoreProduct(a, occasion, aesthetic);
    return scoreDifference || a.id.localeCompare(b.id);
  });
  const anchor = ranked.find((product) => product.category !== "Accessories") ?? ranked[0];
  const second = ranked.find((product) => product.id !== anchor.id && product.category !== "Accessories") ?? ranked[1];
  const accessory = ranked.find((product) => product.category === "Accessories" && product.id !== anchor.id) ?? ranked[2];
  return [anchor, second, accessory].filter(Boolean) as Product[];
};

const StyleLabPage = () => {
  const { addItem } = useCart();
  const [occasion, setOccasion] = useState<Occasion>("gallery");
  const [aesthetic, setAesthetic] = useState<Aesthetic>("sculptural");
  const [generatedLook, setGeneratedLook] = useState<Product[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [added, setAdded] = useState(false);

  const activeOccasion = useMemo(() => occasions.find((item) => item.id === occasion) ?? occasions[0], [occasion]);
  const activeAesthetic = useMemo(() => aesthetics.find((item) => item.id === aesthetic) ?? aesthetics[0], [aesthetic]);

  useEffect(() => {
    setIsGenerating(true);
    setAdded(false);
    const timer = window.setTimeout(() => {
      setGeneratedLook(recommendLook(occasion, aesthetic));
      setIsGenerating(false);
    }, 420);
    return () => window.clearTimeout(timer);
  }, [occasion, aesthetic]);

  const total = generatedLook?.reduce((sum, product) => sum + product.price, 0) ?? 0;

  const addFullLook = () => {
    generatedLook?.forEach((product) => addItem(product, product.sizes[0]));
    setAdded(true);
  };

  return (
    <main className="min-h-[100dvh] pt-16">
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0">
          <img src={lookbookImage} alt="Editorial portrait in indigo and cream textile" className="h-full w-full object-cover object-center opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/50" />
        </div>
        <div className="container relative mx-auto grid min-h-[390px] items-end gap-10 px-4 py-16 md:grid-cols-[1fr_280px] md:items-center md:py-20">
          <div className="max-w-2xl animate-fade-up">
            <div className="mb-6 flex items-center gap-3 text-xs font-sans uppercase tracking-[0.28em] text-primary">
              <Sparkles className="h-4 w-4" />
              Afrotextile / Style Lab
            </div>
            <h1 className="text-balance font-serif text-5xl font-medium leading-[0.98] text-foreground md:text-7xl">
              Dress the moment.
              <span className="block italic text-primary">Keep the provenance.</span>
            </h1>
            <p className="mt-6 max-w-lg font-sans text-base leading-relaxed text-muted-foreground md:text-lg">
              A considered three-piece edit from verified African makers. Tell us where you are going and how you want to feel; we will find the thread.
            </p>
          </div>
          <div className="hidden border-l border-primary/30 pl-7 md:block">
            <p className="font-sans text-xs uppercase tracking-[0.25em] text-primary">The edit</p>
            <p className="mt-4 font-serif text-2xl leading-tight text-foreground">One occasion. One point of view. Three pieces with a story.</p>
          </div>
        </div>
      </section>

      <section className="container mx-auto grid gap-10 px-4 py-12 md:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] md:py-16">
        <div className="space-y-10">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/50 font-sans text-xs text-primary">01</span>
              <div>
                <p className="font-sans text-xs uppercase tracking-[0.25em] text-primary">Set the scene</p>
                <h2 className="font-serif text-2xl text-foreground">What is the occasion?</h2>
              </div>
            </div>
            <div className="grid gap-2">
              {occasions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`button-occasion-${item.id}`}
                  aria-pressed={occasion === item.id}
                  onClick={() => setOccasion(item.id)}
                  className={`group flex items-center justify-between border p-4 text-left transition-all duration-300 ${occasion === item.id ? "border-primary bg-primary/10" : "border-border bg-card/50 hover:border-primary/50"}`}
                >
                  <span>
                    <span className="block font-serif text-lg text-foreground">{item.label}</span>
                    <span className="mt-1 block font-sans text-xs text-muted-foreground">{item.note}</span>
                  </span>
                  <Check className={`h-4 w-4 text-primary transition-opacity ${occasion === item.id ? "opacity-100" : "opacity-0 group-hover:opacity-50"}`} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/50 font-sans text-xs text-primary">02</span>
              <div>
                <p className="font-sans text-xs uppercase tracking-[0.25em] text-primary">Name your energy</p>
                <h2 className="font-serif text-2xl text-foreground">Choose an aesthetic.</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {aesthetics.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`button-aesthetic-${item.id}`}
                  aria-pressed={aesthetic === item.id}
                  onClick={() => setAesthetic(item.id)}
                  className={`relative min-h-[112px] overflow-hidden border p-4 text-left transition-all duration-300 ${aesthetic === item.id ? "border-primary bg-primary/10" : "border-border bg-card/50 hover:border-primary/50"}`}
                >
                  <span className={`mb-5 block h-2 w-10 ${item.swatch}`} />
                  <span className="block font-serif text-lg text-foreground">{item.label}</span>
                  <span className="mt-1 block font-sans text-[11px] text-muted-foreground">{item.note}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="hidden border-t border-border pt-6 md:block">
            <div className="flex gap-4">
              <Compass className="mt-1 h-5 w-5 shrink-0 text-primary" />
              <p className="font-sans text-sm leading-relaxed text-muted-foreground">
                Every recommendation is selected from the current Afrotextile catalogue, not a stock wardrobe. Change either choice to see a new edit.
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-5 flex items-end justify-between border-b border-border pb-5">
            <div>
              <p className="font-sans text-xs uppercase tracking-[0.25em] text-primary">Your generated look</p>
              <h2 className="mt-2 font-serif text-3xl text-foreground">{activeOccasion.label}</h2>
              <p className="mt-1 font-sans text-sm text-muted-foreground">{activeAesthetic.label} / {activeAesthetic.note}</p>
            </div>
            <SlidersHorizontal className="mb-1 h-5 w-5 text-muted-foreground" />
          </div>

          {isGenerating ? (
            <div className="grid gap-4 sm:grid-cols-3" data-testid="status-style-lab-loading">
              {[1, 2, 3].map((item) => (
                <div key={item} className="animate-pulse">
                  <div className="aspect-[4/5] bg-muted" />
                  <div className="mt-3 h-3 w-2/3 bg-muted" />
                  <div className="mt-2 h-4 w-5/6 bg-muted" />
                  <div className="mt-3 h-3 w-1/3 bg-muted" />
                </div>
              ))}
            </div>
          ) : generatedLook && generatedLook.length === 3 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                {generatedLook.map((product, index) => (
                  <article key={product.id} className="group animate-fade-up" style={{ animationDelay: `${index * 90}ms` }} data-testid={`card-style-look-${product.id}`}>
                    <Link to={`/product/${product.id}`} data-testid={`link-style-product-${product.id}`} className="block">
                      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                        <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        <span className="absolute left-3 top-3 bg-background/85 px-2 py-1 font-sans text-[10px] uppercase tracking-[0.2em] text-primary backdrop-blur">
                          0{index + 1}
                        </span>
                      </div>
                    </Link>
                    <div className="mt-3">
                      <Link to={`/store/${product.vendorId}`} className="font-sans text-[10px] uppercase tracking-[0.17em] text-muted-foreground hover:text-primary">{product.vendor}</Link>
                      <Link to={`/product/${product.id}`} data-testid={`link-style-product-name-${product.id}`} className="block">
                        <h3 className="mt-1 font-serif text-base leading-tight text-foreground group-hover:text-primary">{product.name}</h3>
                      </Link>
                      <p className="mt-2 font-sans text-sm font-semibold text-primary">${product.price}</p>
                    </div>
                  </article>
                ))}
              </div>
              <div className="mt-8 flex flex-col gap-5 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-sans text-xs uppercase tracking-[0.18em] text-muted-foreground">Three-piece edit</p>
                  <p className="mt-1 font-serif text-2xl text-foreground">${total}</p>
                </div>
                <Button type="button" data-testid="button-add-full-look" variant="hero" size="lg" onClick={addFullLook}>
                  {added ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
                  {added ? "Look added to bag" : "Add full look"}
                </Button>
              </div>
              <button type="button" data-testid="button-regenerate-look" onClick={() => { setGeneratedLook(null); setIsGenerating(true); window.setTimeout(() => { setGeneratedLook(recommendLook(occasion, aesthetic)); setIsGenerating(false); }, 420); }} className="mt-5 inline-flex items-center gap-2 font-sans text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary">
                <Plus className="h-3.5 w-3.5" /> Regenerate this edit
              </button>
            </>
          ) : (
            <div className="border border-dashed border-primary/40 bg-card/40 px-6 py-16 text-center" data-testid="status-style-lab-empty">
              <p className="font-serif text-2xl text-foreground">The archive is quiet.</p>
              <p className="mx-auto mt-2 max-w-sm font-sans text-sm leading-relaxed text-muted-foreground">There are not enough available pieces to build this edit right now. Try another direction or return to the marketplace.</p>
              <Button asChild variant="heroOutline" className="mt-6">
                <Link to="/shop">Browse the catalogue <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-border bg-card/60 py-12">
        <div className="container mx-auto grid gap-4 px-4 md:grid-cols-[1.3fr_0.7fr_0.7fr]">
          <div className="relative min-h-[220px] overflow-hidden">
            <img src={runwayImage} alt="African fashion runway with graphic textile silhouettes" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent" />
            <div className="absolute bottom-5 left-5">
              <p className="font-sans text-[10px] uppercase tracking-[0.25em] text-primary">Field note 01</p>
              <p className="mt-1 font-serif text-2xl text-foreground">The moving archive</p>
            </div>
          </div>
          <div className="relative min-h-[220px] overflow-hidden">
            <img src={accessoriesImage} alt="Woven accessory and jewellery on dark stone" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5">
              <p className="font-sans text-[10px] uppercase tracking-[0.25em] text-primary">Field note 02</p>
              <p className="mt-1 font-serif text-xl text-foreground">Material memory</p>
            </div>
          </div>
          <div className="flex min-h-[220px] flex-col justify-between border border-primary/30 bg-background p-6">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <p className="font-sans text-xs uppercase tracking-[0.2em] text-primary">Keep exploring</p>
              <h3 className="mt-2 font-serif text-2xl leading-tight text-foreground">Style is a conversation between places.</h3>
              <Link to="/shop" data-testid="link-style-lab-shop" className="mt-5 inline-flex items-center gap-2 font-sans text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-primary">Enter the marketplace <ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default StyleLabPage;