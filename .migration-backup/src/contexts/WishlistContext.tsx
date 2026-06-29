import React, { createContext, useContext, useState, useCallback } from "react";

interface WishlistContextType {
  items: string[];
  toggleItem: (productId: string) => void;
  isWished: (productId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("afrotextile-wishlist");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleItem = useCallback((productId: string) => {
    setItems((prev) => {
      const next = prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId];
      localStorage.setItem("afrotextile-wishlist", JSON.stringify(next));
      return next;
    });
  }, []);

  const isWished = useCallback((productId: string) => items.includes(productId), [items]);

  return (
    <WishlistContext.Provider value={{ items, toggleItem, isWished }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
};
