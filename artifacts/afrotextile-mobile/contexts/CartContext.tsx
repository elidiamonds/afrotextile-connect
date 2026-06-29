import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CartItem, Product } from "@/constants/mockData";

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, size: string) => void;
  removeFromCart: (productId: string, size: string) => void;
  updateQuantity: (productId: string, size: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | null>(null);
const CART_KEY = "@afrotextile_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(CART_KEY).then((data) => {
      if (data) setItems(JSON.parse(data));
    });
  }, []);

  const persist = useCallback((newItems: CartItem[]) => {
    AsyncStorage.setItem(CART_KEY, JSON.stringify(newItems));
  }, []);

  const addToCart = useCallback((product: Product, size: string) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id && i.size === size);
      const next = existing
        ? prev.map((i) =>
            i.product.id === product.id && i.size === size
              ? { ...i, quantity: i.quantity + 1 }
              : i
          )
        : [...prev, { product, size, quantity: 1 }];
      persist(next);
      return next;
    });
  }, [persist]);

  const removeFromCart = useCallback((productId: string, size: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => !(i.product.id === productId && i.size === size));
      persist(next);
      return next;
    });
  }, [persist]);

  const updateQuantity = useCallback((productId: string, size: string, quantity: number) => {
    setItems((prev) => {
      const next = quantity <= 0
        ? prev.filter((i) => !(i.product.id === productId && i.size === size))
        : prev.map((i) =>
            i.product.id === productId && i.size === size ? { ...i, quantity } : i
          );
      persist(next);
      return next;
    });
  }, [persist]);

  const clearCart = useCallback(() => {
    setItems([]);
    AsyncStorage.removeItem(CART_KEY);
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
