import { Link } from "react-router-dom";
import { Instagram, Facebook, MessageCircle } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <h3 className="font-serif text-2xl font-bold text-gradient-gold mb-4">AFROTEXTILE</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Celebrating African heritage through fashion. Bold prints, luxurious textures, modern silhouettes.
            </p>
          </div>

          <div>
            <h4 className="font-sans text-sm uppercase tracking-widest text-foreground mb-4">Shop</h4>
            <ul className="space-y-2">
              {["New Arrivals", "Best Sellers", "Dresses", "Outerwear", "Accessories"].map((item) => (
                <li key={item}>
                  <Link to="/shop" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-sans text-sm uppercase tracking-widest text-foreground mb-4">Company</h4>
            <ul className="space-y-2">
              {[
                { label: "About Us", to: "/about" },
                { label: "Contact", to: "/contact" },
                { label: "Vendor Portal", to: "/shop" },
                { label: "Careers", to: "/about" },
              ].map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-sans text-sm uppercase tracking-widest text-foreground mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Victoria Island, Lagos, Nigeria</li>
              <li>
                <a href="mailto:ellprimegroup@gmail.com" className="hover:text-primary transition-colors">
                  ellprimegroup@gmail.com
                </a>
              </li>
              <li>
                <a href="tel:+2348160750288" className="hover:text-primary transition-colors">
                  +234 816 075 0288
                </a>
              </li>
            </ul>
            <div className="flex gap-4 mt-4">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="https://wa.me/2348160750288" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Afrotextile. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link to="/about" className="text-xs text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/about" className="text-xs text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
