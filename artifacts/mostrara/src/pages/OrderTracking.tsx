import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/formatters";
import { motion } from "framer-motion";
import { Check, Clock, ChefHat, Bike, MessageCircle, AlertCircle, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrackingOrder {
  id: string;
  customer_name: string;
  total: string;
  status: "pendente" | "preparando" | "saiu_entrega" | "confirmado" | "cancelado";
  payment_method: string;
  payment_status: string;
  delivery_method: string;
  created_at: string;
  items: Array<{ name: string; price: number; quantity: number }>;
}

interface TrackingStore {
  store_name: string;
  whatsapp: string;
}

const STEPS = [
  { id: "pendente", label: "Pedido Recebido", icon: Clock },
  { id: "preparando", label: "Preparando", icon: ChefHat },
  { id: "saiu_entrega", label: "Em Rota", icon: Bike },
  { id: "confirmado", label: "Entregue", icon: Check },
];

export default function OrderTracking() {
  const [match, params] = useRoute("/loja/:storeSlug/pedido/:orderId");
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [store, setStore] = useState<TrackingStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const storeSlug = params?.storeSlug;
  const orderId = params?.orderId;

  const loadData = () => {
    if (!storeSlug || !orderId) return;
    apiFetch<{ order: TrackingOrder; store: TrackingStore }>(`/store/${storeSlug}/orders/${orderId}`)
      .then((data) => {
        setOrder(data.order);
        setStore(data.store);
      })
      .catch((err) => setError(err.message || "Erro ao carregar pedido"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [storeSlug, orderId]);

  if (!match) return null;

  if (loading && !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Pedido não encontrado</h1>
        <p className="text-gray-500 mb-6">{error || "Verifique o link acessado"}</p>
        <a href={`/loja/${storeSlug}`} className="bg-gray-900 text-white font-bold py-3 px-6 rounded-xl hover:bg-black transition-colors">
          Voltar para o Catálogo
        </a>
      </div>
    );
  }

  const isCanceled = order.status === "cancelado";
  const currentStepIndex = STEPS.findIndex(s => s.id === order.status);
  
  const generateWhatsAppLink = () => {
    if (!store?.whatsapp) return "#";
    const phone = store.whatsapp.replace(/\D/g, "");
    const msg = `Olá! Fiz o pedido *#${order.id.split('-')[0]}* no valor de *${formatPrice(Number(order.total))}* e gostaria de acompanhar/confirmar o pagamento.`;
    return `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-gray-100 shadow-sm flex items-center justify-center">
        <h1 className="font-black text-lg text-gray-900 tracking-tight text-center truncate">
          {store?.store_name || "Rastreamento"}
        </h1>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6 mt-4">
        
        {/* Status Timeline */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
            Status do Pedido
            <span className="text-xs text-gray-400 font-medium">#{order.id.split('-')[0]}</span>
          </h2>
          
          {isCanceled ? (
            <div className="flex flex-col items-center text-center py-4 text-red-500">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-3">
                <AlertCircle className="w-8 h-8" />
              </div>
              <p className="font-bold text-lg">Pedido Cancelado</p>
              <p className="text-sm text-gray-500 mt-1">Este pedido foi cancelado pelo estabelecimento.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-8">
              {/* Vertical line connecting steps */}
              <div className="absolute top-2 bottom-2 left-[11px] w-0.5 bg-gray-100" />
              
              {STEPS.map((step, index) => {
                const isActive = currentStepIndex === index;
                const isPast = currentStepIndex > index;
                const isFuture = currentStepIndex < index;
                
                const Icon = step.icon;
                
                return (
                  <div key={step.id} className="relative flex items-center gap-4">
                    {/* Circle Indicator */}
                    <div className={cn(
                      "absolute -left-6 w-6 h-6 rounded-full flex items-center justify-center border-2 bg-white transition-colors duration-500 z-10",
                      isActive ? "border-red-500" : isPast ? "border-emerald-500 bg-emerald-500" : "border-gray-200"
                    )}>
                      {isPast && <Check className="w-3.5 h-3.5 text-white" />}
                      {isActive && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                    </div>

                    {/* Step Text */}
                    <div>
                      <p className={cn(
                        "font-bold text-sm transition-colors duration-500",
                        isActive ? "text-gray-900" : isPast ? "text-gray-900" : "text-gray-400"
                      )}>
                        {step.label}
                      </p>
                    </div>
                    
                    {/* Floating Icon */}
                    {(isActive || isPast) && (
                      <motion.div 
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={cn(
                          "ml-auto w-10 h-10 rounded-full flex items-center justify-center",
                          isActive ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </motion.div>
                    )}
                  </div>
                );
              })}
              
              {/* Highlight Progress Bar */}
              <motion.div 
                className="absolute top-2 left-[11px] w-0.5 bg-emerald-500 origin-top"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: currentStepIndex / (STEPS.length - 1) }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                style={{ height: "calc(100% - 16px)" }}
              />
            </div>
          )}
        </div>

        {/* WhatsApp Action */}
        {!isCanceled && (
          <a
            href={generateWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-[#25D366] text-white rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-green-900/10 hover:bg-[#20bd5a] transition-all"
          >
            <div>
              <p className="font-bold">Falar com a loja</p>
              <p className="text-xs text-green-100 font-medium mt-0.5">Enviar mensagem no WhatsApp</p>
            </div>
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <MessageCircle className="w-5 h-5 fill-current" />
            </div>
          </a>
        )}

        {/* Order Details */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4 text-gray-900 font-bold">
            <ShoppingBag className="w-5 h-5" />
            <h3>Resumo do Pedido</h3>
          </div>
          
          <div className="space-y-3 mb-6">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-600"><span className="font-bold text-gray-900 mr-2">{item.quantity}x</span> {item.name}</span>
                <span className="font-medium text-gray-900">{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          
          <div className="pt-4 border-t border-gray-100 space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Pagamento</span>
              <span className="font-medium text-gray-900 uppercase">{order.payment_method}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Entrega</span>
              <span className="font-medium text-gray-900 capitalize">{order.delivery_method}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="font-bold text-gray-900">Total</span>
              <span className="font-black text-xl text-gray-900">{formatPrice(Number(order.total))}</span>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
