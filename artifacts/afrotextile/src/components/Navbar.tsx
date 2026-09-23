import { Link, NavLink, useLocation } from "react-router-dom";
import { ShoppingBag, Heart, Menu, X, Search, Sparkles, Package, Moon, Sun, ArrowUpRight } from "lucide-react";
import { useAuth } from "@clerk/react";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useEffect, useState } from "react";
import { BrandLockup } from "@/components/BrandLockup";
import { useTheme } from "next-themes";

const navLinks = [
  { label: "Shop", to: "/shop" },
  { label: "Style Lab", to: "/style-lab" },
  { label: "Trend Desk", to: "/trend-desk" },
  { label: "Collections", to: "/shop" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
  { label: "Vendor Portal", to: "/vendor" },
];

const Navbar = () => {
  const { totalItems } = useCart();
  const { items: wishlistItems } = useWishlist();
  const { isSignedIn } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/65 transition-[box-shadow,background-color] duration-500 ${scrolled ? "shadow-[0_8px_30px_hsl(var(--foreground)/0.08)] bg-background/95" : ""}`}>
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link
          to="/"
          aria-label="Afrotextile home"
          className="shrink-0 rounded-sm transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          data-testid="link-home"
        >
          <BrandLockup tone="dark" compact />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-[22px]">
          {navLinks.map((link) => (
            <NavLink
              key={link.label}
              to={link.to}
              className={({ isActive }) => `relative py-2 font-sans uppercase tracking-widest transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:bg-primary after:transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-[12px] text-center text-[#167a09] ml-[0px] mr-[0px] pl-[0px] pr-[0px] font-bold ${isActive ? "text-primary after:scale-x-100" : "after:scale-x-0 hover:text-primary hover:after:scale-x-100"}`}
              data-testid={`link-nav-${link.label.toLowerCase().replaceAll(" ", "-")}`}
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/style-lab"
            data-testid="link-style-lab-nav"
            className="hidden items-center gap-1.5 text-xs font-sans uppercase tracking-widest text-primary transition-colors hover:text-foreground lg:flex"
          >
            <Sparkles className="h-3.5 w-3.5" /> Style Lab
          </Link>
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            title={isDark ? "Use light theme" : "Use dark theme"}
            data-testid="button-theme-toggle"
            className="press-feedback relative flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground transition-all hover:-translate-y-0.5 hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link
            to="/shop"
            aria-label="Search products"
            data-testid="link-search"
            className="press-feedback rounded-sm text-foreground transition-all hover:-translate-y-0.5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Search className="w-5 h-5" />
          </Link>
          <Link
            to="/shop"
            aria-label={`Wishlist${wishlistItems.length ? `, ${wishlistItems.length} saved` : ""}`}
            data-testid="link-wishlist"
            className="press-feedback relative rounded-sm text-foreground transition-all hover:-translate-y-0.5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Heart className="w-5 h-5" />
            {wishlistItems.length > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-sans text-[10px] font-bold text-primary-foreground animate-badge-pop">
                {wishlistItems.length}
              </span>
            )}
          </Link>
          <Link
            to="/cart"
            aria-label={`Shopping bag${totalItems ? `, ${totalItems} items` : ""}`}
            data-testid="link-cart"
            className="press-feedback relative rounded-sm text-foreground transition-all hover:-translate-y-0.5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ShoppingBag className="w-5 h-5" />
            {totalItems > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-sans text-[10px] font-bold text-primary-foreground animate-badge-pop">
                {totalItems}
              </span>
            )}
          </Link>
          {isSignedIn && (
            <Link to="/orders" className="hidden rounded-sm text-foreground transition-all hover:-translate-y-0.5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:block" aria-label="Order history" data-testid="link-orders">
              <Package className="h-5 w-5" />
            </Link>
          )}
          <button
            type="button"
            className="rounded-sm text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            data-testid="button-mobile-menu"
          >
            {mobileOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>
      {/* Mobile menu */}
      <div
        className={`fixed inset-0 top-16 bg-background/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!mobileOpen}
        onClick={() => setMobileOpen(false)}
      >
        <div
          id="mobile-navigation"
          className={`border-t border-border bg-background px-4 py-6 shadow-2xl transition-transform duration-300 ${
            mobileOpen ? "translate-y-0" : "-translate-y-4"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="container mx-auto flex flex-col gap-2">
            {navLinks.map((link, index) => (
              <NavLink
                key={link.label}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-sm px-3 py-3 text-lg font-sans uppercase tracking-widest transition-all duration-300 hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isActive ? "bg-muted text-primary" : "text-foreground"
                  }`
                }
                style={{ transitionDelay: mobileOpen ? `${index * 35}ms` : "0ms" }}
                data-testid={`link-mobile-${link.label.toLowerCase().replaceAll(" ", "-")}`}
              >
                {link.label}
              <ArrowUpRight className="h-4 w-4 text-primary/60" aria-hidden="true" />
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
