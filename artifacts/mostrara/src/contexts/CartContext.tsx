import { createContext, useContext, useState, type ReactNode } from "react";

interface Product {
  id: string;
  name: string;
  price: number;
  photos?: string[];
  storage?: string;
  category?: string;
  condition?: string;
  battery?: string;
  warranty?: string;
  description?: string;
  status?: string;
  options?: ProductOption[];
}

interface ProductOption {
  name: string;
  price: number;
}

interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  selectedOptions: ProductOption[];
  unitPrice: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, selectedOptions?: ProductOption[]) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (product: Product, selectedOptions: ProductOption[] = []) => {
    setItems((prev) => {
      const optionKey = selectedOptions.map((option) => option.name).sort().join("|");
      const existing = prev.find((i) => i.product.id === product.id && i.selectedOptions.map((option) => option.name).sort().join("|") === optionKey);
      if (existing) return prev.map((i) => i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i);
      const unitPrice = product.price + selectedOptions.reduce((sum, option) => sum + Number(option.price || 0), 0);
      return [...prev, { id: `${product.id}:${optionKey}:${Date.now()}`, product, selectedOptions, unitPrice, quantity: 1 }];
    });
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, quantity } : i));
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

export type { CartItem, Product, ProductOption };
