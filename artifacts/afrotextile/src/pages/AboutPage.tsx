import col2 from "@/assets/editorial-women.jpg";

const AboutPage = () => {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        {/* Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-24">
          <div className="space-y-6">
            <span className="font-sans text-xs uppercase tracking-[0.3em] text-primary">Our Story</span>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground leading-tight">
              Celebrating African <span className="text-gradient-gold">Heritage</span> Through Fashion
            </h1>
            <p className="text-muted-foreground font-sans leading-relaxed">
              Afrotextile was born from a simple yet powerful vision: to bring the rich tapestry of African fashion to the global stage.
              We believe that every thread tells a story — of identity, of pride, of cultural resilience.
            </p>
            <p className="text-muted-foreground font-sans leading-relaxed">
              Based in the vibrant heart of Victoria Island, Lagos, we connect independent African designers
              with fashion-forward consumers worldwide, creating a marketplace where tradition meets innovation.
            </p>
          </div>
          <div className="aspect-[4/5] rounded-sm overflow-hidden">
            <img src={col2} alt="African fashion" loading="lazy" width={800} height={800} className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Values */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
          {[
            { title: "Authenticity", desc: "Every piece on our platform is crafted by verified African designers using authentic techniques and fabrics." },
            { title: "Empowerment", desc: "We provide independent vendors with the tools and global reach to build sustainable fashion businesses." },
            { title: "Cultural Pride", desc: "We celebrate the diversity of African cultures through fashion that speaks to identity and self-expression." },
          ].map((v) => (
            <div key={v.title} className="bg-card rounded-sm p-8 border border-border">
              <h3 className="font-serif text-xl font-bold text-primary mb-3">{v.title}</h3>
              <p className="text-sm text-muted-foreground font-sans leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
