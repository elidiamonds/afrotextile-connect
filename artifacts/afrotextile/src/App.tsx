import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HomePage from "@/pages/HomePage";
import ShopPage from "@/pages/ShopPage";
import ProductPage from "@/pages/ProductPage";
import CartPage from "@/pages/CartPage";
import AboutPage from "@/pages/AboutPage";
import ContactPage from "@/pages/ContactPage";
import VendorPage from "@/pages/VendorPage";
import VendorOnboardingPage from "@/pages/VendorOnboardingPage";
import VendorPortalPage from "@/pages/VendorPortalPage";
import StyleLabPage from "@/pages/StyleLabPage";
import TrendDeskPage from "@/pages/TrendDeskPage";
import NotFound from "./pages/NotFound.tsx";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ClerkProvider, Show, SignIn, SignUp, useAuth } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { dark } from "@clerk/themes";
import VendorDashboardPage from "@/pages/VendorDashboardPage";
import VendorAdminPage from "@/pages/VendorAdminPage";
import OrdersPage from "@/pages/OrdersPage";

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const App = () => (
  <ClerkProvider
    publishableKey={clerkPubKey}
    proxyUrl={clerkProxyUrl}
    appearance={{
      theme: dark,
      variables: {
        colorPrimary: "#d6a63d",
        colorBackground: "#1b1713",
        colorForeground: "#f5efe6",
        colorMutedForeground: "#aaa096",
        colorInput: "#302821",
        colorInputForeground: "#f5efe6",
        borderRadius: "0.25rem",
        fontFamily: "Montserrat, sans-serif",
      },
    }}
    signInUrl="/sign-in"
    signUpUrl="/sign-up"
  >
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CartProvider>
          <WishlistProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Navbar />
              <ScrollToTop />
              <main className="min-h-screen">
                <PageTransition>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/shop" element={<ShopPage />} />
                    <Route path="/product/:id" element={<ProductPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/orders" element={<OrdersPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/store/:id" element={<VendorPage />} />
                    <Route path="/vendor" element={<VendorOnboardingPage />} />
                    <Route path="/vendor/portal" element={<VendorPortalPage />} />
                    <Route
                      path="/vendor/onboard"
                      element={<VendorOnboardingPage />}
                    />
                    <Route
                      path="/vendor/dashboard/:id"
                      element={
                        <Protected>
                          <VendorDashboardPage />
                        </Protected>
                      }
                    />
                    <Route
                      path="/admin/vendors"
                      element={
                        <Protected renderWhileLoading>
                          <VendorAdminPage />
                        </Protected>
                      }
                    />
                    <Route
                      path="/admin"
                      element={<Navigate to="/admin/vendors" replace />}
                    />
                    <Route
                      path="/sign-in/*"
                      element={<SignInPage />}
                    />
                    <Route
                      path="/sign-up/*"
                      element={
                        <div className="flex min-h-screen justify-center pt-28">
                          <SignUp
                            routing="path"
                            path="/sign-up"
                            signInUrl="/sign-in"
                            forceRedirectUrl="/vendor?apply=true"
                          />
                        </div>
                      }
                    />
                    <Route path="/style-lab" element={<StyleLabPage />} />
                    <Route path="/trend-desk" element={<TrendDeskPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </PageTransition>
              </main>
              <Footer />
            </BrowserRouter>
          </WishlistProvider>
        </CartProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ClerkProvider>
);

export default App;

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, search]);

  return null;
};

const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();

  return (
    <div key={pathname} className="page-transition">
      {children}
    </div>
  );
};

const Protected = ({
  children,
  renderWhileLoading = false,
}: {
  children: React.ReactNode;
  renderWhileLoading?: boolean;
}) => {
  const { isLoaded } = useAuth();

  if (!isLoaded && renderWhileLoading) {
    return <>{children}</>;
  }

  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">
        <Navigate to="/sign-in" replace />
      </Show>
    </>
  );
};

const SignInPage = () => {
  const location = useLocation();
  const returnTo =
    (location.state as { returnTo?: string } | null)?.returnTo ?? "/vendor";
  return (
    <div className="flex min-h-screen justify-center pt-28">
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        forceRedirectUrl={returnTo}
      />
    </div>
  );
};
