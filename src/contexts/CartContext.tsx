import React, { createContext, useContext, useState, useCallback } from "react";
import { CartItem, Product } from "@/types";

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, size: string) => void;
  removeItem: (productId: string, size: string) => void;
  updateQuantity: (productId: string, size: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("afrotextile-cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const persist = (newItems: CartItem[]) => {
    setItems(newItems);
    localStorage.setItem("afrotextile-cart", JSON.stringify(newItems));
  };

  const addItem = useCallback((product: Product, size: string) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id && i.size === size);
      const next = existing
        ? prev.map((i) => i.product.id === product.id && i.size === size ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { product, size, quantity: 1 }];
      localStorage.setItem("afrotextile-cart", JSON.stringify(next));
      return next;
    });
  }, []);

  const removeItem = useCallback((productId: string, size: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => !(i.product.id === productId && i.size === size));
      localStorage.setItem("afrotextile-cart", JSON.stringify(next));
      return next;
    });
  }, []);

  const updateQuantity = useCallback((productId: string, size: string, quantity: number) => {
    if (quantity <= 0) return removeItem(productId, size);
    setItems((prev) => {
      const next = prev.map((i) => i.product.id === productId && i.size === size ? { ...i, quantity } : i);
      localStorage.setItem("afrotextile-cart", JSON.stringify(next));
      return next;
    });
  }, [removeItem]);

  const clearCart = useCallback(() => persist([]), []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
