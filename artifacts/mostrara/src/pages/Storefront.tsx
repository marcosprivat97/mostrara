import { useState, useEffect, useRef, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { CartProvider, useCart } from "@/contexts/CartContext";
import type { ProductOption } from "@/contexts/CartContext";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/formatters";
import {
  ShoppingCart, X, ChevronLeft, ChevronRight,
  MapPin, Zap, ShieldCheck, Battery, Store, MessageCircle, Package, Search,
  Copy, ExternalLink, Loader2, CheckCircle2, AlertTriangle, QrCode, Clock,
  Truck, ShoppingBag, Star, BadgeCheck,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getStoreTypeConfig } from "@/lib/store-types";
import { StoreMap } from "@/components/StoreMap";
import { trackAnalytics } from "@/lib/analytics";
import { DotLottiePlayer } from "@dotlottie/react-player";

interface StoreData {
  store_name: string;
  owner_name: string;
  description?: string;
  city?: string;
  state?: string;
  store_cep?: string;
  store_address?: string;
  store_address_number?: string;
  store_neighborhood?: string;
  store_latitude?: string;
  store_longitude?: string;
  store_hours?: string;
  whatsapp: string;
  logo_url?: string;
  cover_url?: string;
  theme_primary?: string;
  theme_secondary?: string;
  theme_accent?: string;
  store_slug: string;
  store_type?: string;
  is_open?: boolean;
  delivery_fee_type?: "none" | "fixed" | "distance";
  delivery_fee_amount?: number;
  verified_badge?: boolean;
  mercado_pago_connected?: boolean;
  mercado_pago_connected_at?: string | null;
}

interface MercadoPagoPayment {
  provider: string;
  status: string;
  status_detail?: string;
  qr_code?: string;
  qr_code_base64?: string;
  ticket_url?: string;
  mp_payment_id?: string;
  order_id?: string;
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
  stock?: number;
  unlimited_stock?: boolean;
  status: string;
  options?: ProductOption[];
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
}

function normalizeProduct(p: Partial<Product>): Product {
  return {
    id: String(p.id ?? crypto.randomUUID()),
    name: String(p.name ?? "Produto sem nome"),
    price: Number(p.price ?? 0),
    photos: Array.isArray(p.photos) ? p.photos.filter(Boolean) : [],
    category: String(p.category ?? "Outros"),
    storage: p.storage ? String(p.storage) : "",
    condition: p.condition ? String(p.condition) : "",
    battery: p.battery ? String(p.battery) : "",
    warranty: p.warranty ? String(p.warranty) : "",
    description: p.description ? String(p.description) : "",
    stock: Number(p.stock ?? 0),
    unlimited_stock: Boolean(p.unlimited_stock),
    status: String(p.status ?? "disponivel"),
    options: Array.isArray(p.options)
      ? p.options
          .map((option) => ({ name: String(option?.name ?? ""), price: Number(option?.price ?? 0) }))
          .filter((option) => option.name)
      : [],
    weight: Number(p.weight ?? 0.3),
    width: Number(p.width ?? 11),
    height: Number(p.height ?? 2),
    length: Number(p.length ?? 16),
  };
}

function ProductSkeleton() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-3xl overflow-hidden shadow-lg border border-gray-100 flex flex-col h-full"
    >
      <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-gray-200/50 to-transparent" />
        <div className="absolute top-3 left-3 w-16 h-2 bg-gray-300 rounded-full" />
        <div className="absolute top-3 right-3 w-12 h-2 bg-gray-300 rounded-full" />
      </div>
      <div className="p-5 flex flex-col flex-1 space-y-4">
        <div className="space-y-3">
          <div className="h-5 bg-gray-200 rounded-lg w-3/4 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded-lg w-1/2 animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-6 bg-gray-200 rounded-xl w-16 animate-pulse" />
          <div className="h-6 bg-gray-200 rounded-xl w-20 animate-pulse" />
        </div>
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
          <div className="h-7 bg-gray-200 rounded-lg w-24 animate-pulse" />
          <div className="h-10 bg-gray-200 rounded-2xl w-28 animate-pulse" />
        </div>
      </div>
    </motion.div>
  );
}

function ProductCard({ product, isOpen, onClick }: { product: Product; isOpen: boolean; onClick: () => void }) {
  const { items, addItem, removeItem } = useCart();
  const inCart = items.some(i => i.product.id === product.id);
  const photo = Array.isArray(product.photos) ? product.photos[0] : undefined;
  const hasOptions = Boolean(product.options?.length);

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group flex flex-col h-full border border-gray-100"
    >
      <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
        {photo ? (
          <>
            <img src={photo} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <Package className="w-14 h-14 text-gray-400" />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-3 left-3 right-3 flex justify-between">
          {product.condition && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg"
            >
              {product.condition}
            </motion.div>
          )}
          <div className="flex gap-2">
            {product.category === "iPhone" && (
              <div className="bg-blue-500 text-white text-xs font-bold px-2.5 py-1.5 rounded-full shadow-lg">
                iPhone
              </div>
            )}
          </div>
        </div>
        
        {/* Quick view indicator */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
            <Search className="w-4 h-4 text-gray-700" />
          </div>
        </div>
      </div>
      
      <div className="p-5 flex flex-col flex-1">
        <div className="flex-1 space-y-3">
          <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-2 group-hover:text-red-600 transition-colors">
            {product.name}
          </h3>
          
          {product.description && (
            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{product.description}</p>
          )}
          
          <div className="flex flex-wrap gap-2">
            {product.storage && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 bg-gray-100 px-2.5 py-1.5 rounded-xl">
                <Zap className="w-3 h-3 text-gray-500" />
                {product.storage}
              </span>
            )}
            {product.battery && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1.5 rounded-xl">
                <Battery className="w-3 h-3 text-green-600" />
                {product.battery}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 gap-3">
          <div className="flex flex-col">
            <p className="text-xl font-black text-gray-900 leading-none">{formatPrice(product.price)}</p>
            {product.warranty && (
              <p className="text-xs text-gray-500 mt-0.5">{product.warranty}</p>
            )}
          </div>
          
          <motion.button
            onClick={e => {
              e.stopPropagation();
              if (!isOpen) return;
              if (hasOptions) {
                onClick();
                return;
              }
              const existing = items.find(i => i.product.id === product.id);
              inCart && existing ? removeItem(existing.id) : addItem(product);
            }}
            whileHover={isOpen ? { scale: 1.05 } : {}}
            whileTap={isOpen ? { scale: 0.95 } : {}}
            className={cn(
              "flex-1 text-sm font-bold py-3 px-4 rounded-2xl transition-all duration-300 shadow-md",
              !isOpen
                ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
                : inCart
                ? "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg"
                : "bg-gradient-to-r from-gray-900 to-gray-800 text-white hover:from-gray-800 hover:to-gray-700"
            )}
          >
            {!isOpen ? (
              <span className="flex items-center justify-center gap-1 text-xs">
                Fechada
              </span>
            ) : hasOptions ? (
              <span className="flex items-center justify-center gap-1">
                <Search className="w-4 h-4" />
                Ver
              </span>
            ) : inCart ? (
              <span className="flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                No carrinho
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1">
                <ShoppingCart className="w-4 h-4" />
                Adicionar
              </span>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function CartSidebar({ open, onClose, storeWhatsapp, storeName, storeSlug, storeMercadoPagoConnected, isOpen, deliveryFeeType, deliveryFeeAmount, storeType, onOrderCreated }: {
  open: boolean;
  onClose: () => void;
  storeWhatsapp: string;
  storeName: string;
  storeSlug: string;
  storeMercadoPagoConnected: boolean;
  isOpen: boolean;
  deliveryFeeType: string;
  deliveryFeeAmount: number;
  storeType?: string;
  onOrderCreated: (order: { id: string; items: { name: string; quantity: number }[]; total: number }) => void;
}) {
  const { items, removeItem, updateQuantity, totalItems, totalPrice, clearCart } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  // Estados do Melhor Envio
  const [shippingRates, setShippingRates] = useState<any[]>([]);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState<any | null>(null);

  const audioSuccess = useMemo(() => typeof Audio !== "undefined" ? new Audio("/sounds/success.mp3") : null, []);
  const [form, setForm] = useState({
    name: "",
    email: "",
    cpf: "",
    whatsapp: "",
    payment: "pix",
    deliveryMethod: "delivery",
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    reference: "",
    notes: "",
    coupon: "",
  });

  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponValidationMsg, setCouponValidationMsg] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Cálculo do frete (seja fixo ou calculado pelo Melhor Envio)
  const currentDeliveryFee = deliveryFeeType === "fixed" 
    ? deliveryFeeAmount 
    : (selectedShipping?.price || 0);
  
  // Identifica se a loja e de produtos fisicos que podem ir pelo correio
  const isPhysicalShippingStore = (storeType || "") === "celulares";

  const finalTotal = Math.max(0, totalPrice + (form.deliveryMethod === "delivery" ? currentDeliveryFee : 0) - couponDiscount);

  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [mpPayment, setMpPayment] = useState<MercadoPagoPayment | null>(null);
  const [pollingPayment, setPollingPayment] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    const cep = form.cep.replace(/\D/g, "");
    if (form.deliveryMethod !== "delivery" || cep.length !== 8) return;

    let cancelled = false;
    const handle = window.setTimeout(async () => {
      try {
        const lookup = await apiFetch<{
          cep: string;
          street: string;
          neighborhood: string;
          city: string;
          state: string;
        }>(`/integrations/viacep/${cep}`);
        if (cancelled) return;
        setForm((current) => ({
          ...current,
          cep: lookup.cep || current.cep,
          street: lookup.street || current.street,
          neighborhood: lookup.neighborhood || current.neighborhood,
          city: lookup.city || current.city,
          state: lookup.state || current.state,
        }));
      } catch {
        // Fica em modo manual quando o CEP nao encontra endereco.
      }
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [form.cep, form.deliveryMethod]);

  // Busca de Frete (Melhor Envio)
  useEffect(() => {
    const cep = form.cep.replace(/\D/g, "");
    if (form.deliveryMethod !== "delivery" || !isPhysicalShippingStore || cep.length !== 8) {
      setShippingRates([]);
      setSelectedShipping(null);
      return;
    }

    let cancelled = false;
    const fetchRates = async () => {
      setLoadingShipping(true);
      try {
        const rates = await apiFetch<any[]>("/shipping/calculate", {
          method: "POST",
          body: JSON.stringify({
            storeSlug,
            cep,
            products: items.map(i => ({
              id: i.product.id,
              name: i.product.name,
              price: i.unitPrice,
              quantity: i.quantity,
              weight: i.product.weight || 0.3,
              width: i.product.width || 11,
              height: i.product.height || 2,
              length: i.product.length || 16
            }))
          })
        });
        if (cancelled) return;
        setShippingRates(rates || []);
        // Selecionar o primeiro automaticamente se houver
        if (rates?.length > 0) setSelectedShipping(rates[0]);
      } catch (err) {
        console.error("Erro frete:", err);
      } finally {
        if (!cancelled) setLoadingShipping(false);
      }
    };

    fetchRates();
    return () => { cancelled = true; };
  }, [form.cep, form.deliveryMethod, storeSlug, items]);

  const sendOrder = () => {
    const pmt = { pix: "Pix", dinheiro: "Dinheiro", cartao_credito: "Cartao de Credito", cartao_debito: "Cartao de Debito" }[form.payment] || form.payment;
    const addressLines = form.deliveryMethod === "delivery"
      ? [
          form.cep ? `*CEP:* ${form.cep}` : "",
          form.street ? `*Endereco:* ${form.street}${form.number ? `, ${form.number}` : ""}` : "",
          form.complement ? `*Complemento:* ${form.complement}` : "",
          form.neighborhood ? `*Bairro:* ${form.neighborhood}` : "",
          form.city || form.state ? `*Cidade/UF:* ${[form.city, form.state].filter(Boolean).join(" / ")}` : "",
          form.reference ? `*Referencia:* ${form.reference}` : "",
          selectedShipping ? `*Frete:* ${selectedShipping.name} (${formatPrice(currentDeliveryFee)})` : (currentDeliveryFee > 0 ? `*Frete:* ${formatPrice(currentDeliveryFee)}` : ""),
        ].filter(Boolean)
      : ["*Modalidade:* Retirada no local"];
    const lines = [
      `Novo Pedido - ${storeName}`,
      "",
      `*Cliente:* ${form.name}`,
      `*WhatsApp:* ${form.whatsapp}`,
      `*Pagamento:* ${pmt}`,
      ...addressLines,
      "",
      "*Itens:*",
      ...items.map(i => `â€¢ ${i.product.name}${i.product.storage ? ` (${i.product.storage})` : ""}${i.selectedOptions.length ? `\n  + ${i.selectedOptions.map(o => o.name).join(", ")}` : ""} - ${formatPrice(i.unitPrice)} x ${i.quantity}`),
      "",
      `*Total: ${formatPrice(finalTotal)}*`,
      form.notes ? `\n*Obs:* ${form.notes}` : "",
    ].filter(Boolean).join("\n");

    setSent(true);
    clearCart();
    setTimeout(() => { setSent(false); setCheckoutOpen(false); onClose(); }, 3000);
  };

  const sendOrderTracked = async () => {
    if (sending || items.length === 0) return;
    setSending(true);
    setSendError("");
    const pmt = { pix: "Pix", dinheiro: "Dinheiro", cartao_credito: "Cartao de Credito", cartao_debito: "Cartao de Debito" }[form.payment] || form.payment;
    const paymentProvider = storeMercadoPagoConnected && form.payment === "pix" ? "mercadopago_pix" : "whatsapp";
    const addressLines = form.deliveryMethod === "delivery"
      ? [
          form.cep ? `*CEP:* ${form.cep}` : "",
          form.street ? `*Endereco:* ${form.street}${form.number ? `, ${form.number}` : ""}` : "",
          form.complement ? `*Complemento:* ${form.complement}` : "",
          form.neighborhood ? `*Bairro:* ${form.neighborhood}` : "",
          form.city || form.state ? `*Cidade/UF:* ${[form.city, form.state].filter(Boolean).join(" / ")}` : "",
          form.reference ? `*Referencia:* ${form.reference}` : "",
          selectedShipping ? `*Frete:* ${selectedShipping.name} (${formatPrice(currentDeliveryFee)})` : (currentDeliveryFee > 0 ? `*Frete:* ${formatPrice(currentDeliveryFee)}` : ""),
        ].filter(Boolean)
      : ["*Modalidade:* Retirada no local"];
    try {
      const created = await apiFetch<{
        order: { id: string; items: { name: string; storage?: string; price: number; quantity: number; selected_options?: ProductOption[] }[]; total: number; discount?: number };
        payment?: MercadoPagoPayment;
      }>(
        `/store/${encodeURIComponent(storeSlug)}/orders`,
        {
          method: "POST",
          body: JSON.stringify({
            customer_name: form.name,
            customer_email: form.email,
            customer_document: form.cpf,
            delivery_method: form.deliveryMethod,
            cep: form.cep,
            street: form.street,
            number: form.number,
            complement: form.complement,
            neighborhood: form.neighborhood,
            city: form.city,
            state: form.state,
            reference: form.reference,
            customer_whatsapp: form.whatsapp,
            payment_method: form.payment,
            payment_provider: paymentProvider,
            delivery_fee: currentDeliveryFee,
            delivery_method_name: selectedShipping?.name || (deliveryFeeType === "fixed" ? "Entrega Fixa" : "Entrega"),
            notes: form.notes,
            coupon_code: form.coupon,
            items: items.map((item) => ({
              product_id: item.product.id,
              quantity: item.quantity,
              selected_options: item.selectedOptions.map((option) => option.name),
            })),
          }),
        },
      );

      const lines = [
        `*Pedido Mostrara #${created.order.id.slice(0, 8)} - ${storeName}*`,
        "",
        `*Cliente:* ${form.name}`,
        `*WhatsApp:* ${form.whatsapp}`,
        `*Pagamento:* ${pmt}`,
      ...addressLines,
        created.order.discount ? `*Desconto:* ${formatPrice(created.order.discount)}` : "",
        "",
        "*Itens:*",
        ...created.order.items.map(i => `- ${i.name}${i.storage ? ` (${i.storage})` : ""}${i.selected_options?.length ? `\n  + ${i.selected_options.map(o => o.name).join(", ")}` : ""} - ${formatPrice(i.price)} x ${i.quantity}`),
        "",
        `*Total: ${formatPrice(created.order.total)}*`,
        form.notes ? `\n*Obs:* ${form.notes}` : "",
        "",
        "Para confirmar a compra, envie esta mensagem pronta para a loja.",
      ].filter(Boolean).join("\n");

      if (paymentProvider === "whatsapp") {
        const text = encodeURIComponent(lines);
        const phone = storeWhatsapp.replace(/\D/g, "");
        let cleanPhone = phone;
        if (cleanPhone && !cleanPhone.startsWith("55") && cleanPhone.length <= 11) {
          cleanPhone = "55" + cleanPhone;
        }
        window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank");
      }

      onOrderCreated({ ...created.order, whatsappText: lines } as any);
      trackAnalytics("checkout_completed", {
        store_slug: storeSlug,
        payment_provider: paymentProvider,
        payment_method: form.payment,
        delivery_method: form.deliveryMethod,
        total: created.order.total,
        items_count: created.order.items.length,
      });
      clearCart();
      if (created.payment?.provider === "mercadopago_pix") {
        setMpPayment(created.payment);
        setCheckoutOpen(false);
        setSent(false);
        return;
      }

      audioSuccess?.play().catch(() => {});
      setSent(true);
      setTimeout(() => { setSent(false); setCheckoutOpen(false); onClose(); }, 3000);
    } catch (e: unknown) {
      setSendError(e instanceof Error ? e.message : "Nao foi possivel registrar o pedido");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!mpPayment?.order_id) return;
    let cancelled = false;

    const refreshPayment = async () => {
      try {
        setPollingPayment(true);
        const data = await apiFetch<{ payment: MercadoPagoPayment }>(
          `/store/${encodeURIComponent(storeSlug)}/orders/${encodeURIComponent(mpPayment.order_id || "")}/payment`,
        );
        if (cancelled) return;
        setMpPayment((current) => current ? { ...current, ...data.payment } : current);
        if (data.payment.status === "approved") {
          setTimeout(() => {
            if (!cancelled) {
              setMpPayment((current) => current ? { ...current, status: "approved" } : current);
            }
          }, 200);
        }
      } catch {
        // Polling is best effort. Keep the UI open even if the status endpoint temporarily fails.
      } finally {
        if (!cancelled) setPollingPayment(false);
      }
    };

    refreshPayment();
    const interval = window.setInterval(refreshPayment, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [mpPayment?.order_id, storeSlug]);

  const copyPixCode = async () => {
    if (!mpPayment?.qr_code) return;
    await navigator.clipboard.writeText(mpPayment.qr_code);
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 1500);
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
                        <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                          <div className="w-14 h-14 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                            {photo ? <img src={photo} alt={item.product.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-gray-400" /></div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{item.product.name}</p>
                            {item.selectedOptions.length > 0 && (
                              <p className="text-xs text-gray-500 truncate">
                                + {item.selectedOptions.map((option) => option.name).join(", ")}
                              </p>
                            )}
                            <p className="text-sm font-bold text-red-600">{formatPrice(item.unitPrice * item.quantity)}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-7 h-7 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-sm flex items-center justify-center transition-colors"
                            >−</button>
                            <span className="text-sm font-bold text-gray-900 w-5 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-7 h-7 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-sm flex items-center justify-center transition-colors"
                            >+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-4 border-t border-gray-100">
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-500">Subtotal</p>
                        <p className="text-sm font-semibold text-gray-900">{formatPrice(totalPrice)}</p>
                      </div>
                      {form.deliveryMethod === "delivery" && currentDeliveryFee > 0 && (
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-500">Taxa de Entrega</p>
                          <p className="text-sm font-semibold text-gray-900">{formatPrice(currentDeliveryFee)}</p>
                        </div>
                      )}
                      {couponDiscount > 0 && (
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-emerald-600">Desconto</p>
                          <p className="text-sm font-semibold text-emerald-600">-{formatPrice(couponDiscount)}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-2">
                        <p className="font-semibold text-gray-700">Total</p>
                        <p className="text-xl font-black text-gray-900">{formatPrice(finalTotal)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setCheckoutOpen(true)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Finalizar Pedido
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
          <div className="bg-white rounded-2xl overflow-hidden flex flex-col max-h-[90dvh]">
            {sent ? (
              <div className="py-16 text-center px-6 shrink-0">
                <DialogTitle className="sr-only">Pedido enviado</DialogTitle>
                <DialogDescription className="sr-only">Seu pedido foi enviado com sucesso</DialogDescription>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Pedido recebido!</h3>
                <p className="text-gray-500 text-sm">A loja recebeu seu pedido e entrará em contato em breve.</p>
              </div>
            ) : (
              <>
                <div className="px-6 py-4 border-b border-gray-100 shrink-0">
                  <DialogTitle className="font-bold text-gray-900">Finalizar pedido</DialogTitle>
                  <DialogDescription className="text-sm text-gray-500 mt-0.5">
                    Preencha os dados abaixo para finalizar o seu pedido.
                  </DialogDescription>
                </div>
                <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Seu nome *</label>
                    <input
                      value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Joao Silva"
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
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Modalidade</label>
                    <select
                      value={form.deliveryMethod}
                      onChange={e => setForm(f => ({ ...f, deliveryMethod: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/10 transition-all"
                    >
                      <option value="delivery">Entrega</option>
                      <option value="pickup">Retirada no local</option>
                    </select>
                  </div>
                  {form.deliveryMethod === "delivery" ? (
                    <>
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800">
                        ViaCEP preenche o endereco automaticamente quando o CEP for valido.
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">CEP *</label>
                          <input
                            value={form.cep}
                            onChange={e => setForm(f => ({ ...f, cep: e.target.value }))}
                            inputMode="numeric"
                            placeholder="00000-000"
                            className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-500/10 transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Numero *</label>
                          <input
                            value={form.number}
                            onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                            inputMode="numeric"
                            placeholder="123"
                            className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-500/10 transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Rua</label>
                        <input
                          value={form.street}
                          onChange={e => setForm(f => ({ ...f, street: e.target.value }))}
                          placeholder="Rua, avenida, travessa..."
                          className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-500/10 transition-all"
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Bairro</label>
                          <input
                            value={form.neighborhood}
                            onChange={e => setForm(f => ({ ...f, neighborhood: e.target.value }))}
                            placeholder="Bairro"
                            className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-500/10 transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Cidade / UF</label>
                          <input
                            value={`${form.city}${form.state ? ` / ${form.state}` : ""}`}
                            onChange={e => {
                              const value = e.target.value;
                              const parts = value.split("/").map((part) => part.trim());
                              setForm(f => ({ ...f, city: parts[0] || "", state: (parts[1] || "").slice(0, 2).toUpperCase() }));
                            }}
                            placeholder="Cidade / UF"
                            className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-500/10 transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Complemento</label>
                        <input
                          value={form.complement}
                          onChange={e => setForm(f => ({ ...f, complement: e.target.value }))}
                          placeholder="Apto, bloco, fundo..."
                          className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-500/10 transition-all"
                        />
                      </div>

                      {/* Opcoes de Frete (Melhor Envio) */}
                      {form.deliveryMethod === "delivery" && form.cep.replace(/\D/g, "").length === 8 && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                            Opcoes de Entrega
                          </label>
                          {loadingShipping ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Calculando frete...
                            </div>
                          ) : shippingRates.length > 0 ? (
                            <div className="space-y-2">
                              {shippingRates.map((rate) => (
                                <button
                                  key={rate.id}
                                  type="button"
                                  onClick={() => setSelectedShipping(rate)}
                                  className={cn(
                                    "w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all",
                                    selectedShipping?.id === rate.id
                                      ? "border-red-500 bg-red-50 ring-1 ring-red-500"
                                      : "border-gray-200 bg-gray-50 hover:border-gray-300"
                                  )}
                                >
                                  <div className="flex items-center gap-3">
                                    {rate.company?.picture && (
                                      <img src={rate.company.picture} alt="" className="w-8 h-8 object-contain" />
                                    )}
                                    <div>
                                      <p className="text-sm font-bold text-gray-900">{rate.name}</p>
                                      <p className="text-xs text-gray-500">
                                        Prazo: {rate.delivery_range.min}-{rate.delivery_range.max} dias uteis
                                      </p>
                                    </div>
                                  </div>
                                  <p className="text-sm font-black text-gray-900">{formatPrice(rate.price)}</p>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-red-500 font-medium">Nenhuma transportadora disponivel para este CEP.</p>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                      Cliente escolheu retirada no local.
                    </div>
                  )}
                  {storeMercadoPagoConnected && form.payment === "pix" ? (
                    <>
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800">
                        Pix do Mercado Pago ativo. O pedido vai gerar QR Code nesta tela.
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">E-mail para o Pix *</label>
                          <input
                            value={form.email}
                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                            type="email"
                            placeholder="voce@exemplo.com"
                            className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-500/10 transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">CPF opcional</label>
                          <input
                            value={form.cpf}
                            onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))}
                            inputMode="numeric"
                            placeholder="000.000.000-00"
                            className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-500/10 transition-all"
                          />
                        </div>
                      </div>
                    </>
                  ) : form.payment === "pix" ? (
                    <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-800">
                      Esta loja ainda nao conectou Mercado Pago. O Pix vai seguir para finalizacao manual via WhatsApp.
                    </div>
                  ) : null}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Observacoes</label>
                    <textarea
                      value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Alguma observacao..."
                      rows={2}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-500/10 transition-all resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Cupom de Desconto</label>
                    <div className="flex gap-2">
                      <input
                        value={form.coupon}
                        onChange={e => {
                          setForm(f => ({ ...f, coupon: e.target.value.toUpperCase() }));
                          if (couponDiscount > 0) {
                            setCouponDiscount(0);
                            setCouponValidationMsg("");
                          }
                        }}
                        placeholder="Ex: PROMO10"
                        className="flex-1 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-500/10 transition-all"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (!form.coupon) return;
                          setValidatingCoupon(true);
                          try {
                            const res = await apiFetch<{ discountAmount: number }>(`/store/${encodeURIComponent(storeSlug)}/validate-coupon`, {
                              method: "POST",
                              body: JSON.stringify({ code: form.coupon, subtotal: totalPrice }),
                            });
                            setCouponDiscount(res.discountAmount);
                            setCouponValidationMsg(`Cupom aplicado! Desconto de ${formatPrice(res.discountAmount)}`);
                          } catch (e: any) {
                            setCouponDiscount(0);
                            setCouponValidationMsg(e.message || "Cupom inválido");
                          } finally {
                            setValidatingCoupon(false);
                          }
                        }}
                        disabled={validatingCoupon || !form.coupon}
                        className="bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                      >
                        {validatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
                      </button>
                    </div>
                    {couponValidationMsg && (
                      <p className={cn("text-xs font-medium mt-1", couponDiscount > 0 ? "text-emerald-600" : "text-red-500")}>
                        {couponValidationMsg}
                      </p>
                    )}
                  </div>
                </div>
                <div className="shrink-0 p-6 pt-4 border-t border-gray-100 bg-white">
                  {sendError && (
                    <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 font-medium">
                      {sendError}
                    </p>
                  )}
                  {/* Inline validation hints */}
                  {(!form.name || !form.whatsapp) && (
                    <p className="mb-3 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 font-medium">
                      ⚠️ Preencha seu <strong>nome</strong> e <strong>WhatsApp</strong> para continuar.
                    </p>
                  )}
                  {form.deliveryMethod === "delivery" && form.name && form.whatsapp && (!form.cep || !form.street || !form.number) && (
                    <p className="mb-3 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 font-medium">
                      ⚠️ Preencha o <strong>CEP</strong>, <strong>rua</strong> e <strong>número</strong> para entrega.
                    </p>
                  )}
                  {storeMercadoPagoConnected && form.payment === "pix" && !form.email && form.name && form.whatsapp && (
                    <p className="mb-3 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 font-medium">
                      ⚠️ Informe seu <strong>e-mail</strong> para gerar o Pix.
                    </p>
                  )}
                  <div className="flex gap-3">
                    <button onClick={() => setCheckoutOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-colors">
                      Voltar
                    </button>
                    <button
                      onClick={sendOrderTracked}
                      disabled={!form.name || !form.whatsapp || (form.deliveryMethod === "delivery" && (!form.cep || !form.street || !form.number || !form.neighborhood || !form.city || !form.state)) || (storeMercadoPagoConnected && form.payment === "pix" && !form.email) || sending}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      {storeMercadoPagoConnected && form.payment === "pix" ? <QrCode className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                      {sending ? "Abrindo..." : storeMercadoPagoConnected && form.payment === "pix" ? "Gerar Pix" : "Ir ao WhatsApp"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!mpPayment} onOpenChange={(v) => { if (!v) setMpPayment(null); }}>
        <DialogContent className="max-w-md p-0 border-0 shadow-2xl overflow-hidden">
          <div className="bg-white flex flex-col max-h-[90dvh]">
            {mpPayment?.status === "approved" ? (
              <div className="p-6 text-center space-y-4 shrink-0">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black text-gray-900">Pagamento aprovado</DialogTitle>
                  <DialogDescription className="text-sm text-gray-500 mt-2">
                    A loja ja recebeu a confirmacao do Mercado Pago.
                  </DialogDescription>
                </div>
                <button
                  type="button"
                  onClick={() => setMpPayment(null)}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  Voltar para a loja
                </button>
              </div>
            ) : (
              <>
                <div className="px-6 py-4 border-b border-gray-100 shrink-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <DialogTitle className="font-bold text-gray-900">Pague com Pix</DialogTitle>
                      <DialogDescription className="text-sm text-gray-500 mt-0.5">
                        Abra o app do banco ou copie o codigo Pix.
                      </DialogDescription>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold bg-amber-100 text-amber-700">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {mpPayment?.status_detail || mpPayment?.status || "pending"}
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <p className="text-sm font-semibold text-gray-800">QR Code do Pix</p>
                      <span className="text-xs text-gray-500">
                        {pollingPayment ? "Atualizando..." : "Aguardando pagamento"}
                      </span>
                    </div>
                    <div className="rounded-2xl bg-white border border-gray-200 p-3 flex items-center justify-center min-h-[240px]">
                      {mpPayment?.qr_code_base64 ? (
                        <img
                          src={`data:image/png;base64,${mpPayment.qr_code_base64}`}
                          alt="QR Code Pix"
                          className="w-full max-w-[280px] h-auto"
                        />
                      ) : (
                        <div className="text-center space-y-2 text-gray-400">
                          <QrCode className="w-10 h-10 mx-auto" />
                          <p className="text-sm">QR code indisponivel</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                      Copia e cola
                    </label>
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={mpPayment?.qr_code || ""}
                        className="flex-1 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm outline-none"
                      />
                      <button
                        type="button"
                        onClick={copyPixCode}
                        className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold px-4 rounded-xl transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                        {copiedCode ? "Copiado" : "Copiar"}
                      </button>
                    </div>
                  </div>

                  {mpPayment?.ticket_url && (
                    <a
                      href={mpPayment.ticket_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Abrir pagamento
                    </a>
                  )}

                  <p className="text-xs text-gray-500 leading-relaxed">
                    Depois de pagar, o sistema recebe a confirmacao automaticamente pelo webhook do Mercado Pago.
                  </p>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProductDetailDialog({
  product,
  open,
  onClose,
  onAddToCart,
  storeType,
  isOpen,
}: {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onAddToCart: (p: Product, options?: ProductOption[]) => void;
  storeType?: string;
  isOpen: boolean;
}) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const [selectedOptionNames, setSelectedOptionNames] = useState<string[]>([]);
  const { items } = useCart();
  const inCart = product ? items.some(i => i.product.id === product.id) : false;
  const storeConfig = getStoreTypeConfig(storeType);

  useEffect(() => {
    setPhotoIdx(0);
    setSelectedOptionNames([]);
  }, [product]);

  if (!product) return null;
  const photos = product.photos || [];
  const options = product.options ?? [];
  const selectedOptions = options.filter((option) => selectedOptionNames.includes(option.name));
  const detailPrice = product.price + selectedOptions.reduce((sum, option) => sum + Number(option.price || 0), 0);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg p-0 border-0 shadow-2xl overflow-hidden">
        <DialogTitle className="sr-only">{product.name}</DialogTitle>
        <DialogDescription className="sr-only">{product.description || `${product.name} - ${product.condition || ""}`}</DialogDescription>
        <div className="bg-white rounded-2xl overflow-hidden flex flex-col max-h-[90dvh]">
          {/* Photo */}
          <div className="relative bg-gray-100 aspect-[4/3] shrink-0">
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
          <div className="p-5 flex-1 overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-1">{product.name}</h2>
            <p className="text-2xl font-black text-red-600 mb-4">{formatPrice(detailPrice)}</p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {product.storage && (
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <Zap className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">{storeConfig.variantLabel}</p>
                    <p className="text-sm font-semibold text-gray-900">{product.storage}</p>
                  </div>
                </div>
              )}
              {product.condition && (
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <ShieldCheck className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Condicao</p>
                    <p className="text-sm font-semibold text-gray-900">{product.condition}</p>
                  </div>
                </div>
              )}
              {product.battery && (
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <Battery className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">{storeConfig.detailLabel}</p>
                    <p className="text-sm font-semibold text-gray-900">{product.battery}</p>
                  </div>
                </div>
              )}
              {product.warranty && (
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <ShieldCheck className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">{storeConfig.warrantyLabel}</p>
                    <p className="text-sm font-semibold text-gray-900">{product.warranty}</p>
                  </div>
                </div>
              )}
            </div>

            {product.description && (
              <p className="text-sm text-gray-500 leading-relaxed mb-4">{product.description}</p>
            )}

            {options.length > 0 && (
              <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Adicionais e complementos
                </p>
                <div className="space-y-2">
                  {options.map((option) => {
                    const checked = selectedOptionNames.includes(option.name);
                    return (
                      <label key={option.name} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 border border-gray-100">
                        <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setSelectedOptionNames((current) =>
                                e.target.checked
                                  ? [...current, option.name]
                                  : current.filter((name) => name !== option.name),
                              );
                            }}
                          />
                          {option.name}
                        </span>
                        {option.price > 0 && <span className="text-sm font-bold text-red-600">+ {formatPrice(option.price)}</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          <div className="p-5 pt-0 shrink-0 bg-white">
            <button
              onClick={() => {
                if (!isOpen) return;
                onAddToCart(product, selectedOptions);
                onClose();
              }}
              className={cn(
                "w-full font-bold py-3.5 rounded-xl transition-colors mt-2",
                !isOpen 
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : inCart
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-gray-900 text-white hover:bg-gray-800"
              )}
            >
              {!isOpen ? "Loja Fechada" : inCart ? "✓ No carrinho" : "Adicionar ao carrinho"}
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
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<{ id: string; items: { name: string; quantity: number }[]; total: number } | null>(null);
  const [cartPulse, setCartPulse] = useState(false);
  const cartPulseRef = useRef(0);
  const { addItem, totalItems } = useCart();
  const [, navigate] = useLocation();

  useEffect(() => {
    apiFetch<{ store: StoreData; products: Product[] }>(`/store/${encodeURIComponent(storeSlug)}`)
      .then(d => {
        setStore(d.store);
        setProducts(Array.isArray(d.products) ? d.products.map(normalizeProduct) : []);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [storeSlug]);

  useEffect(() => {
    const raw = localStorage.getItem(`mostrara:last-order:${storeSlug}`);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { id: string; items: { name: string; quantity: number }[]; total: number; shown?: boolean };
      if (!parsed.shown) setLastOrder(parsed);
    } catch {
      localStorage.removeItem(`mostrara:last-order:${storeSlug}`);
    }
  }, [storeSlug]);

  useEffect(() => {
    if (totalItems > cartPulseRef.current) {
      setCartPulse(true);
      const timer = window.setTimeout(() => setCartPulse(false), 450);
      return () => window.clearTimeout(timer);
    }
    cartPulseRef.current = totalItems;
    return undefined;
  }, [totalItems]);

  const rememberOrder = (order: { id: string; items: { name: string; quantity: number }[]; total: number }) => {
    navigate(`/loja/${storeSlug}/pedido/${order.id}`);
  };

  const closeLastOrder = () => {
    if (lastOrder) {
      localStorage.setItem(`mostrara:last-order:${storeSlug}`, JSON.stringify({ ...lastOrder, shown: true }));
    }
    setLastOrder(null);
  };

  const categories = ["Todos", ...Array.from(new Set(products.map(p => String(p.category ?? "")).filter(Boolean)))];
  const filtered = products.filter((p) => {
    const q = search.trim().toLowerCase();
    const name = String(p.name ?? "").toLowerCase();
    const category = String(p.category ?? "").toLowerCase();
    const storage = String(p.storage ?? "").toLowerCase();
    return (
      (categoryFilter === "Todos" || p.category === categoryFilter) &&
      (!q || name.includes(q) || category.includes(q) || storage.includes(q))
    );
  });

  if (notFound) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
          <Store className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Loja nao encontrada</h1>
        <p className="text-gray-400 text-sm">Este link nao existe ou foi removido.</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#fafafa]"
      style={{
        ["--store-primary" as string]: store?.theme_primary || "#dc2626",
        ["--store-secondary" as string]: store?.theme_secondary || "#111827",
      }}
    >
      {/* ── Premium Header ── */}
      <header className="relative overflow-hidden">
        {/* Cover */}
        <div className="relative h-44 sm:h-56">
          {store?.cover_url ? (
            <img src={store.cover_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/60" />
          <button onClick={() => setInfoOpen(true)} className="absolute top-4 right-4 backdrop-blur-md bg-white/15 hover:bg-white/25 text-white p-2.5 rounded-xl transition-colors border border-white/10">
            <MapPin className="w-4 h-4" />
          </button>
        </div>

        {/* Store info card overlapping cover */}
        <div className="relative -mt-16 mx-4 sm:mx-auto sm:max-w-2xl">
          <div className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-gray-100 p-5 flex items-center gap-4">
            <div className="flex-shrink-0">
              {store?.logo_url ? (
                <img src={store.logo_url} alt={store.store_name || ''} className="w-[72px] h-[72px] rounded-2xl object-cover ring-[3px] ring-white shadow-lg" />
              ) : (
                <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                  <Store className="w-8 h-8 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-gray-900 truncate">{store?.store_name || ''}</h1>
                {store?.verified_badge && <BadgeCheck className="w-5 h-5 text-blue-500 flex-shrink-0" />}
              </div>
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{store?.description || store?.city || 'Catálogo digital'}</p>
              <div className="flex items-center gap-3 mt-2">
                {store?.is_open === false ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full" /> Fechada
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Aberta
                  </span>
                )}
                {store?.city && <span className="text-xs text-gray-400">{store.city}{store.state ? ` / ${store.state}` : ''}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Search + Category pills */}
        <div className="mt-4 px-4 sm:px-0 sm:max-w-2xl sm:mx-auto space-y-3 pb-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder-gray-400 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/10 transition-all"
            />
          </div>
          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  "flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                  categoryFilter === cat
                    ? "bg-gray-900 text-white border-gray-900 shadow-md shadow-gray-900/20"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>
        
        {/* ── Product Grid ── */}
        <main className="px-4 sm:px-0 sm:max-w-5xl sm:mx-auto py-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
              {categoryFilter === "Todos" ? "Todos os produtos" : categoryFilter}
            </h2>
            <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
              {filtered.length} {filtered.length === 1 ? "item" : "itens"}
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <ProductSkeleton />
                </motion.div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-20 text-center">
              <div className="w-48 h-48 mx-auto mb-4">
                <DotLottiePlayer
                  src="https://lottie.host/7e09876c-31c3-4d87-99e6-123772216e91/R6p6D9Y6eQ.lottie"
                  autoplay
                  loop
                />
              </div>
              <h3 className="text-lg font-bold text-gray-900">{search ? "Nenhum resultado" : "Sem produtos"}</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">{search ? "Tente buscar por outros termos." : "Esta categoria ainda não tem produtos."}</p>
              {search && (
                <button onClick={() => setSearch("")} className="mt-4 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors">Limpar busca</button>
              )}
            </motion.div>
          ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            {filtered.map((p, index) => (
              <ProductCard
                key={p.id}
                product={p}
                isOpen={store?.is_open !== false}
                onClick={() => setSelectedProduct(p)}
              />
            ))}
          </motion.div>
          )}
        </main>

      {/* Info Dialog */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-w-lg p-0 border-0 shadow-2xl overflow-hidden rounded-3xl">
          <div className="bg-white flex flex-col max-h-[90dvh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <DialogTitle className="font-bold text-gray-900">Informações da loja</DialogTitle>
                <DialogDescription className="text-sm text-gray-500 mt-0.5">Localização e área de entrega</DialogDescription>
              </div>
              <button onClick={() => setInfoOpen(false)} className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-0 flex-1 overflow-y-auto">
              <StoreMap
                title="Onde fica a loja"
                subtitle={[
                  store?.store_address,
                  store?.store_address_number ? `, ${store?.store_address_number}` : "",
                  store?.store_neighborhood ? ` - ${store?.store_neighborhood}` : "",
                  store?.city ? `, ${store?.city}` : "",
                  store?.state ? ` / ${store?.state}` : "",
                ].join("").trim()}
                latitude={store?.store_latitude}
                longitude={store?.store_longitude}
              />
              <div className="p-6">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3 rounded-2xl bg-gray-50 border border-gray-100 p-4">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">Endereço</p>
                      <p className="text-gray-500 mt-0.5">
                        {[
                          store?.store_address,
                          store?.store_address_number ? `, ${store?.store_address_number}` : "",
                          store?.store_neighborhood ? ` - ${store?.store_neighborhood}` : "",
                          store?.city ? `, ${store?.city}` : "",
                          store?.state ? ` / ${store?.state}` : "",
                        ].join("").trim() || store?.city || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl bg-gray-50 border border-gray-100 p-4">
                    <MessageCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900">Atendimento</p>
                      <p className="text-gray-500 mt-0.5">Pedidos via WhatsApp com Pix direto na plataforma.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product detail */}
      <ProductDetailDialog
        product={selectedProduct}
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={(p, options) => addItem(p, options)}
        storeType={store?.store_type}
        isOpen={store?.is_open !== false}
      />

      {/* Floating Cart Button */}
      <AnimatePresence>
        {totalItems > 0 && (
          <motion.button
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            onClick={() => {
              if (store?.is_open !== false) {
                setCartOpen(true);
              }
            }}
            className={cn(
              "fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-auto z-50 flex items-center justify-between gap-4 rounded-2xl px-6 py-4 font-bold text-white shadow-2xl transition-transform",
              cartPulse ? "scale-105" : "scale-100",
              store?.is_open === false && "opacity-80 cursor-not-allowed bg-gray-500"
            )}
            style={store?.is_open !== false ? { backgroundColor: store?.theme_primary || '#dc2626' } : undefined}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="w-5 h-5" />
                {store?.is_open !== false && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-xs font-black rounded-full flex items-center justify-center" style={{ color: store?.theme_primary || '#dc2626' }}>
                    {totalItems}
                  </span>
                )}
              </div>
              <span className="text-sm">{store?.is_open === false ? "Loja Fechada" : "Ver sacola"}</span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Cart Sidebar */}
      {store && (
        <CartSidebar
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          storeWhatsapp={store.whatsapp}
          storeName={store.store_name}
          storeSlug={store.store_slug}
          storeMercadoPagoConnected={Boolean(store.mercado_pago_connected)}
          isOpen={store.is_open !== false}
          deliveryFeeType={store.delivery_fee_type || "none"}
          deliveryFeeAmount={store.delivery_fee_amount || 0}
          storeType={store.store_type}
          onOrderCreated={rememberOrder}
        />
      )}
      <Dialog open={!!lastOrder} onOpenChange={(v) => { if (!v) closeLastOrder(); }}>
        <DialogContent className="max-w-sm border-0 p-0 overflow-hidden shadow-2xl">
          <div className="bg-white p-6 text-center flex flex-col max-h-[90dvh] overflow-y-auto">
            <div className="mx-auto mb-2 w-32 h-32">
              <DotLottiePlayer
                src="https://lottie.host/801e74f3-3171-4796-930f-b48e65893f4e/vS2M7fG4aQ.lottie"
                autoplay
              />
            </div>
            <DialogTitle className="text-xl font-black text-gray-900">Pedido registrado</DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-2">
              Seu pedido foi separado no catalogo. Para confirmar a compra, envie a mensagem pronta no WhatsApp da loja.
            </DialogDescription>
            {lastOrder && (
              <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 p-3 text-left">
                <p className="text-xs font-semibold text-gray-400 uppercase">Resumo</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  {lastOrder.items.map((item) => `${item.quantity}x ${item.name}`).join(", ")}
                </p>
                <p className="text-lg font-black text-gray-900 mt-2">{formatPrice(lastOrder.total)}</p>
              </div>
            )}
            <button
              onClick={closeLastOrder}
              className="mt-5 w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Voltar ao catalogo
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Storefront() {
  const [match, params] = useRoute("/loja/:storeSlug");
  if (!match || !params?.storeSlug) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-red-600 border-t-transparent animate-spin mx-auto" />
          <p className="text-sm font-semibold text-gray-700">Abrindo loja...</p>
        </div>
      </div>
    );
  }
  return (
    <CartProvider>
      <StorefrontInner storeSlug={params.storeSlug} />
    </CartProvider>
  );
}

