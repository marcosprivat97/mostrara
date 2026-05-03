import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { CartProvider, useCart } from "@/contexts/CartContext";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/formatters";
import {
  ShoppingCart, X, ChevronLeft, ChevronRight,
  MapPin, Zap, ShieldCheck, Battery, Store, MessageCircle, Package,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface StoreData {
  store_name: string;
  owner_name: string;
  description?: string;
  city?: string;
  whatsapp: string;
  logo_url?: string;
  store_slug: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  photos: string[];
  category: string;
  storage?: string;
  condition?: string;
  battery?: string;
  warranty?: string;
  description?: string;
  status: string;
}

function ProductSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white">
      <div className="aspect-square skeleton" />
      <div className="p-4 space-y-2">
        <div className="h-3.5 rounded-lg skeleton w-3/4" />
        <div className="h-3 rounded-lg skeleton w-1/2" />
        <div className="h-5 rounded-lg skeleton w-1/3 mt-1" />
      </div>
    </div>
  );
}

function ProductCard({ product, onClick }: { product: Product; onClick: () => void }) {
  const { items, addItem, removeItem } = useCart();
  const inCart = items.some(i => i.product.id === product.id);
  const photo = product.photos?.[0];

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group"
    >
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {photo ? (
          <img src={photo} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10 text-gray-300" />
          </div>
        )}
        {product.condition && (
          <div className="absolute top-2 left-2">
            <span className="text-xs font-semibold bg-white/90 backdrop-blur-sm text-gray-700 px-2 py-0.5 rounded-lg border border-gray-200">
              {product.condition}
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{product.name}</p>
        <div className="flex flex-wrap gap-1 mt-1.5 mb-3">
          {product.storage && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg">{product.storage}</span>}
          {product.battery && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg">🔋 {product.battery}</span>}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-lg font-black text-gray-900">{formatPrice(product.price)}</p>
          <button
            onClick={e => {
              e.stopPropagation();
              inCart ? removeItem(product.id) : addItem(product);
            }}
            className={cn(
              "text-xs font-bold px-3 py-1.5 rounded-xl transition-all",
              inCart
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-gray-900 text-white hover:bg-gray-800"
            )}
          >
            {inCart ? "No carrinho ✓" : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CartSidebar({ open, onClose, storeWhatsapp, storeName }: { open: boolean; onClose: () => void; storeWhatsapp: string; storeName: string }) {
  const { items, removeItem, totalItems, totalPrice, clearCart } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [form, setForm] = useState({ name: "", whatsapp: "", payment: "pix", notes: "" });
  const [sent, setSent] = useState(false);

  const sendOrder = () => {
    const pmt = { pix: "Pix", dinheiro: "Dinheiro", cartao_credito: "Cartão de Crédito", cartao_debito: "Cartão de Débito" }[form.payment] || form.payment;
    const lines = [
      `🛒 *Novo Pedido — ${storeName}*`,
      "",
      `*Cliente:* ${form.name}`,
      `*WhatsApp:* ${form.whatsapp}`,
      `*Pagamento:* ${pmt}`,
      "",
      "*Itens:*",
      ...items.map(i => `• ${i.product.name}${i.product.storage ? ` (${i.product.storage})` : ""} — ${formatPrice(i.product.price)} × ${i.quantity}`),
      "",
      `*Total: ${formatPrice(totalPrice)}*`,
      form.notes ? `\n*Obs:* ${form.notes}` : "",
    ].filter(Boolean).join("\n");

    const wa = storeWhatsapp.replace(/\D/g, "");
    const url = `https://wa.me/55${wa}?text=${encodeURIComponent(lines)}`;
    window.open(url, "_blank");
    setSent(true);
    clearCart();
    setTimeout(() => { setSent(false); setCheckoutOpen(false); onClose(); }, 2000);
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={onClose}
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-gray-700" />
                  <h2 className="font-bold text-gray-900">Carrinho</h2>
                  {totalItems > 0 && (
                    <span className="bg-red-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {totalItems}
                    </span>
                  )}
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {items.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
                  <ShoppingCart className="w-12 h-12 text-gray-200" />
                  <p className="text-sm font-medium">Carrinho vazio</p>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {items.map(item => {
                      const photo = item.product.photos?.[0];
                      return (
                        <div key={item.product.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                          <div className="w-14 h-14 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                            {photo ? <img src={photo} alt={item.product.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-gray-400" /></div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{item.product.name}</p>
                            <p className="text-sm font-bold text-red-600">{formatPrice(item.product.price)}</p>
                          </div>
                          <button onClick={() => removeItem(item.product.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <p className="font-semibold text-gray-700">Total</p>
                      <p className="text-xl font-black text-gray-900">{formatPrice(totalPrice)}</p>
                    </div>
                    <button
                      onClick={() => setCheckoutOpen(true)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Enviar pelo WhatsApp
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Checkout dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-sm p-0 border-0 shadow-2xl">
          <div className="bg-white rounded-2xl overflow-hidden">
            {sent ? (
              <div className="py-16 text-center px-6">
                <DialogTitle className="sr-only">Pedido enviado</DialogTitle>
                <DialogDescription className="sr-only">Seu pedido foi enviado com sucesso</DialogDescription>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Pedido enviado!</h3>
                <p className="text-gray-500 text-sm">O WhatsApp vai abrir com o pedido formatado.</p>
              </div>
            ) : (
              <>
                <div className="px-6 py-4 border-b border-gray-100">
                  <DialogTitle className="font-bold text-gray-900">Finalizar pedido</DialogTitle>
                  <DialogDescription className="text-sm text-gray-400 mt-0.5">Seu pedido vai pro WhatsApp do lojista</DialogDescription>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Seu nome *</label>
                    <input
                      value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="João Silva"
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-500/10 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Seu WhatsApp *</label>
                    <input
                      value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                      placeholder="(21) 99999-9999"
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-500/10 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Forma de pagamento</label>
                    <select
                      value={form.payment} onChange={e => setForm(f => ({ ...f, payment: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/10 transition-all"
                    >
                      <option value="pix">Pix</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="cartao_credito">Cartão de Crédito</option>
                      <option value="cartao_debito">Cartão de Débito</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Observações</label>
                    <textarea
                      value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Alguma observação..."
                      rows={2}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-500/10 transition-all resize-none"
                    />
                  </div>
                </div>
                <div className="flex gap-3 px-6 pb-6">
                  <button onClick={() => setCheckoutOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-colors">
                    Voltar
                  </button>
                  <button
                    onClick={sendOrder}
                    disabled={!form.name || !form.whatsapp}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Enviar
                  </button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProductDetailDialog({ product, open, onClose, onAddToCart }: { product: Product | null; open: boolean; onClose: () => void; onAddToCart: (p: Product) => void }) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const { items } = useCart();
  const inCart = product ? items.some(i => i.product.id === product.id) : false;

  useEffect(() => { setPhotoIdx(0); }, [product]);

  if (!product) return null;
  const photos = product.photos || [];

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg p-0 border-0 shadow-2xl overflow-hidden">
        <DialogTitle className="sr-only">{product.name}</DialogTitle>
        <DialogDescription className="sr-only">{product.description || `${product.name} — ${product.condition || ""}`}</DialogDescription>
        <div className="bg-white rounded-2xl overflow-hidden">
          {/* Photo */}
          <div className="relative bg-gray-100 aspect-[4/3]">
            {photos.length > 0 ? (
              <img src={photos[photoIdx]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-16 h-16 text-gray-300" />
              </div>
            )}
            {photos.length > 1 && (
              <>
                <button onClick={() => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPhotoIdx(i => (i + 1) % photos.length)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1">
                  {photos.map((_, i) => (
                    <button key={i} onClick={() => setPhotoIdx(i)} className={cn("w-1.5 h-1.5 rounded-full transition-all", i === photoIdx ? "bg-white w-4" : "bg-white/60")} />
                  ))}
                </div>
              </>
            )}
            <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-sm hover:bg-white">
              <X className="w-4 h-4 text-gray-700" />
            </button>
          </div>

          {/* Info */}
          <div className="p-5">
            <h2 className="text-xl font-bold text-gray-900 mb-1">{product.name}</h2>
            <p className="text-2xl font-black text-red-600 mb-4">{formatPrice(product.price)}</p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {product.storage && (
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <Zap className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Armazenamento</p>
                    <p className="text-sm font-semibold text-gray-900">{product.storage}</p>
                  </div>
                </div>
              )}
              {product.condition && (
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <ShieldCheck className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Condição</p>
                    <p className="text-sm font-semibold text-gray-900">{product.condition}</p>
                  </div>
                </div>
              )}
              {product.battery && (
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <Battery className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Bateria</p>
                    <p className="text-sm font-semibold text-gray-900">{product.battery}</p>
                  </div>
                </div>
              )}
              {product.warranty && (
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <ShieldCheck className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Garantia</p>
                    <p className="text-sm font-semibold text-gray-900">{product.warranty}</p>
                  </div>
                </div>
              )}
            </div>

            {product.description && (
              <p className="text-sm text-gray-500 leading-relaxed mb-4">{product.description}</p>
            )}

            <button
              onClick={() => { onAddToCart(product); onClose(); }}
              className={cn(
                "w-full font-bold py-3.5 rounded-xl transition-colors",
                inCart
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-gray-900 text-white hover:bg-gray-800"
              )}
            >
              {inCart ? "✓ No carrinho" : "Adicionar ao carrinho"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StorefrontInner({ storeSlug }: { storeSlug: string }) {
  const [store, setStore] = useState<StoreData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("Todos");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const { addItem, totalItems } = useCart();

  useEffect(() => {
    apiFetch<{ store: StoreData; products: Product[] }>(`/store/${storeSlug}`)
      .then(d => { setStore(d.store); setProducts(d.products); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [storeSlug]);

  const categories = ["Todos", ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];
  const filtered = categoryFilter === "Todos" ? products : products.filter(p => p.category === categoryFilter);

  if (notFound) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
          <Store className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Loja não encontrada</h1>
        <p className="text-gray-400 text-sm">Este link não existe ou foi removido.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {store?.logo_url ? (
              <img src={store.logo_url} alt="" className="w-9 h-9 rounded-xl object-cover border border-gray-200" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              {loading ? (
                <div className="w-28 h-4 skeleton rounded" />
              ) : (
                <p className="font-bold text-gray-900 text-sm leading-tight">{store?.store_name}</p>
              )}
              {store?.city && <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{store.city}</p>}
            </div>
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="relative p-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Store description */}
      {!loading && store?.description && (
        <div className="max-w-4xl mx-auto px-4 py-4">
          <p className="text-sm text-gray-500 text-center">{store.description}</p>
        </div>
      )}

      {/* Category filter */}
      {categories.length > 1 && (
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  "flex-shrink-0 text-sm font-semibold px-4 py-2 rounded-xl transition-all",
                  categoryFilter === cat
                    ? "bg-red-600 text-white shadow-sm"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Products */}
      <main className="max-w-4xl mx-auto px-4 pb-12">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <ProductSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Nenhum produto nesta categoria</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filtered.map(p => (
              <ProductCard key={p.id} product={p} onClick={() => setSelectedProduct(p)} />
            ))}
          </div>
        )}
      </main>

      {/* Product detail */}
      <ProductDetailDialog
        product={selectedProduct}
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={p => addItem(p)}
      />

      {/* Cart */}
      {store && (
        <CartSidebar
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          storeWhatsapp={store.whatsapp}
          storeName={store.store_name}
        />
      )}
    </div>
  );
}

export default function Storefront() {
  const [match, params] = useRoute("/loja/:storeSlug");
  if (!match || !params?.storeSlug) return null;
  return (
    <CartProvider>
      <StorefrontInner storeSlug={params.storeSlug} />
    </CartProvider>
  );
}
