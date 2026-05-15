import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToastSimple } from "@/hooks/useToastSimple";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/formatters";
import { resolveStoreTypeFromProfile } from "@/lib/store-types";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ChefHat, Bike, CheckCircle2, AlertCircle, ShoppingBag, Printer, Phone, ChevronDown, ChevronUp, MapPin, CreditCard, Truck, Store } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderItem {
  product_id: string;
  name: string;
  storage?: string;
  price: number;
  quantity: number;
  selected_options?: { name: string; price: number }[];
}

interface Order {
  id: string;
  customer_name: string;
  customer_whatsapp: string;
  appointment_date?: string;
  appointment_time?: string;
  appointment_end_time?: string;
  appointment_duration_minutes?: number;
  payment_method: string;
  payment_status: string;
  delivery_method?: string;
  notes?: string;
  total: number;
  discount?: number;
  delivery_fee?: number;
  status: "pendente" | "confirmado" | "preparando" | "saiu_entrega" | "em_rota" | "entregue" | "cancelado";
  created_at: string;
  assigned_courier_id?: string | null;
  courier_assignment_status?: "unassigned" | "pending" | "accepted" | "declined" | string | null;
  courier_pickup_at?: string | null;
  items: OrderItem[];
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  reference?: string;
}

interface Courier {
  id: string;
  owner_name: string;
  email: string;
  active?: boolean;
}

const STATUSES = [
  { id: "pendente", label: "Novos", icon: AlertCircle, color: "bg-blue-500", light: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "confirmado", label: "Aceitos", icon: CheckCircle2, color: "bg-emerald-500", light: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "preparando", label: "Preparando", icon: ChefHat, color: "bg-orange-500", light: "bg-orange-50 text-orange-700 border-orange-200" },
  { id: "saiu_entrega", label: "Saiu para entrega", icon: Bike, color: "bg-purple-500", light: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "em_rota", label: "Em rota", icon: Bike, color: "bg-amber-500", light: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "entregue", label: "Entregues", icon: CheckCircle2, color: "bg-emerald-600", light: "bg-emerald-50 text-emerald-700 border-emerald-200" },
] as const;

const PAYMENT_LABELS: Record<string, string> = {
  pix: "Pix", credito: "Cartão Crédito", debito: "Cartão Débito",
  dinheiro: "Dinheiro", cartao_credito: "Cartão Crédito", cartao_debito: "Cartão Débito",
  cash: "Dinheiro", credit: "Cartão Crédito", debit: "Cartão Débito",
};

function formatAppointment(order: Order) {
  if (!order.appointment_date || !order.appointment_time) return "";
  const date = order.appointment_date.split("-").reverse().join("/");
  return `${date} ${order.appointment_time}${order.appointment_end_time ? `-${order.appointment_end_time}` : ""}`;
}

// Local notification sound
let notifAudio: HTMLAudioElement | null = null;
function playNotificationSound() {
  try {
    if (!notifAudio) {
      notifAudio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkYyKg3x1eHmEjpOTjYaCfHl6fIKIjI6LiIWCgYKDhYeIiIiHhoWEg4KBgIB/f39/f39/gIGCg4SFhoeIiImJiYmJiImIh4aFhIOCgYB/fn59fX19fn+AgYKDhIWGh4iIiYmJiYmIiIeGhYSDgoGA");
    }
    notifAudio.currentTime = 0;
    notifAudio.volume = 0.5;
    notifAudio.play().catch(() => {});
  } catch {}
}

export default function DashboardOrdersKanban() {
  const { token, user } = useAuth();
  const { success, error: toastError } = useToastSimple();
  const [orders, setOrders] = useState<Order[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const storeType = resolveStoreTypeFromProfile(user);
  const isBookingStore = storeType === "manicure" || storeType === "salao";
  const isCourier = (user?.account_role ?? "merchant") === "courier";

  const opts = useMemo(() => ({ token: token ?? undefined }), [token]);

  const loadOrders = () => {
    setLoading(true);
    apiFetch<{ orders: Order[] }>("/orders", opts)
      .then((data) => {
        const activeOrders = data.orders.filter(o => o.status !== "cancelado");
        setOrders(activeOrders);

        const pendingOrders = activeOrders.filter(o => o.status === "pendente");
        if (pendingOrders.length > 0) {
          const newestId = pendingOrders[0].id;
          setLastOrderId(prev => {
            if (prev !== null && newestId !== prev) {
              playNotificationSound();
            }
            return newestId;
          });
        }
      })
      .catch(() => toastError("Erro ao carregar pedidos"))
      .finally(() => setLoading(false));
  };

  const loadCouriers = () => {
    if (isCourier) return;
    apiFetch<{ couriers: Courier[] }>("/couriers", opts)
      .then((data) => setCouriers(Array.isArray(data.couriers) ? data.couriers : []))
      .catch(() => setCouriers([]));
  };

  useEffect(() => {
    loadOrders();
    loadCouriers();
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, [token, isCourier]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    setMovingId(orderId);
    try {
      await apiFetch(`/orders/${orderId}/status`, {
        method: "PUT",
        ...opts,
        body: JSON.stringify({ status: newStatus }),
      });
      success("Status atualizado!");
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o));
    } catch (e: any) {
      toastError(e.message || "Erro ao atualizar status");
    } finally {
      setMovingId(null);
    }
  };

  const assignCourier = async (orderId: string, courierId: string) => {
    try {
      await apiFetch(`/orders/${orderId}/assign-courier`, {
        method: "PUT",
        ...opts,
        body: JSON.stringify({ courier_id: courierId }),
      });
      setOrders((prev) => prev.map((order) => (
        order.id === orderId ? { ...order, assigned_courier_id: courierId || null } : order
      )));
      success(courierId ? "Entregador atribuido" : "Entregador removido");
    } catch (e: any) {
      toastError(e.message || "Erro ao atribuir entregador");
    }
  };

  const getNextStatus = (current: string) => {
    const idx = STATUSES.findIndex(s => s.id === current);
    if (idx >= 0 && idx < STATUSES.length - 1) return STATUSES[idx + 1].id;
    return null;
  };

  const handlePrint = (order: Order) => {
    setPrintingOrder(order);
    setTimeout(() => {
      window.print();
      setPrintingOrder(null);
    }, 100);
  };

  const openWhatsApp = (phone: string) => {
    const clean = phone.replace(/\D/g, "");
    window.open(`https://wa.me/${clean}`, "_blank");
  };

  return (
    <>
    <div className="space-y-6 print:hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            {isBookingStore ? "Agenda e atendimentos" : "Gestão de Pedidos"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isBookingStore
              ? "Acompanhe confirmações, cancelamentos e horários ocupados da agenda."
              : "Acompanhe e atualize o status dos seus pedidos em tempo real."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 pb-4">
        {STATUSES.map((col) => {
          const colOrders = orders.filter(o => o.status === col.id);
          const Icon = col.icon;
          
          return (
            <div key={col.id} className="flex flex-col gap-3">
              <div className={cn("flex items-center justify-between p-3 rounded-2xl border", col.light)}>
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5" />
                  <h3 className="font-bold">{col.label}</h3>
                </div>
                <span className="bg-white/50 px-2 py-0.5 rounded-full text-sm font-bold">
                  {colOrders.length}
                </span>
              </div>

              <div className="flex flex-col gap-3 min-h-[200px] bg-gray-50/50 rounded-2xl p-2 border border-dashed border-gray-200">
                <AnimatePresence>
                  {colOrders.map(order => {
                    const isExpanded = expandedId === order.id;
                    const deliveryLabel = (order.delivery_method || "delivery") === "delivery" ? "Entrega" : "Retirada";
                    const payLabel = PAYMENT_LABELS[order.payment_method] || order.payment_method;
                    const hasAddress = order.street || order.cep;

                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        key={order.id}
                        className={cn(
                          "bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow",
                          movingId === order.id && "opacity-50 pointer-events-none"
                        )}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{order.customer_name}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              {new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                            {formatAppointment(order) && (
                              <p className="text-xs text-emerald-700 font-semibold mt-1">
                                Agendamento: {formatAppointment(order)}
                              </p>
                            )}
                          </div>
                          <p className="font-black text-gray-900 text-sm">{formatPrice(order.total)}</p>
                        </div>

                        {/* Quick info badges */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">
                            <CreditCard className="w-3 h-3" /> {payLabel}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">
                            {(order.delivery_method || "delivery") === "delivery" ? <Truck className="w-3 h-3" /> : <Store className="w-3 h-3" />}
                            {deliveryLabel}
                          </span>
                        </div>

                        {/* Items */}
                        <div className="space-y-1 mb-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span className="text-gray-600 font-medium">
                                {item.quantity}x {item.name}
                                {item.selected_options?.length ? (
                                  <span className="text-gray-400 ml-1">({item.selected_options.map(o => o.name).join(", ")})</span>
                                ) : null}
                              </span>
                              <span className="text-gray-500 font-medium">{formatPrice(item.price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>

                        {order.notes && (
                          <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded-lg mb-3 font-medium italic border border-orange-100">
                            "{order.notes}"
                          </p>
                        )}

                        {/* Expandable details */}
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : order.id)}
                          className="w-full flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600 py-1 mb-2 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          {isExpanded ? "Menos detalhes" : "Mais detalhes"}
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden mb-3"
                            >
                              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2 text-xs">
                                {/* WhatsApp */}
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-500">📱 WhatsApp:</span>
                                  <button
                                    onClick={() => openWhatsApp(order.customer_whatsapp)}
                                    className="text-emerald-600 font-semibold hover:underline flex items-center gap-1"
                                  >
                                    <Phone className="w-3 h-3" />
                                    {order.customer_whatsapp}
                                  </button>
                                </div>

                                {formatAppointment(order) && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray-500">🗓️ Agendamento:</span>
                                    <span className="font-semibold text-gray-700">{formatAppointment(order)}</span>
                                  </div>
                                )}

                                {/* Address */}
                                {(order.delivery_method || "delivery") === "delivery" && hasAddress && (
                                  <div className="pt-1 border-t border-gray-200">
                                    <p className="font-semibold text-gray-700 flex items-center gap-1 mb-1">
                                      <MapPin className="w-3 h-3" /> Endereço:
                                    </p>
                                    {order.cep && <p className="text-gray-500 ml-4">CEP: {order.cep}</p>}
                                    {order.street && <p className="text-gray-500 ml-4">{order.street}{order.number ? `, ${order.number}` : ""}</p>}
                                    {order.complement && <p className="text-gray-500 ml-4">{order.complement}</p>}
                                    {order.neighborhood && <p className="text-gray-500 ml-4">{order.neighborhood}</p>}
                                    {(order.city || order.state) && <p className="text-gray-500 ml-4">{[order.city, order.state].filter(Boolean).join(" / ")}</p>}
                                    {order.reference && <p className="text-gray-500 ml-4 italic">Ref: {order.reference}</p>}
                                  </div>
                                )}

                                {/* Discount / Delivery fee */}
                                {(order.discount && Number(order.discount) > 0) ? (
                                  <div className="flex justify-between pt-1 border-t border-gray-200">
                                    <span className="text-gray-500">🏷️ Desconto:</span>
                                    <span className="text-emerald-600 font-semibold">-{formatPrice(Number(order.discount))}</span>
                                  </div>
                                ) : null}
                                {(order.delivery_fee && Number(order.delivery_fee) > 0) ? (
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">🚚 Taxa entrega:</span>
                                    <span className="text-gray-700 font-semibold">{formatPrice(Number(order.delivery_fee))}</span>
                                  </div>
                                ) : null}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {!isCourier && !isBookingStore && (order.delivery_method || "delivery") === "delivery" && order.status !== "entregue" && (
                          <div className="mb-3 rounded-2xl border border-gray-200 bg-gray-50 p-3">
                            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                              Entregador
                            </label>
                            <select
                              value={order.assigned_courier_id || ""}
                              onChange={(event) => assignCourier(order.id, event.target.value)}
                              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-all focus:border-red-400 focus:ring-2 focus:ring-red-500/10"
                            >
                              <option value="">Sem atribuição</option>
                              {couriers.map((courier) => (
                                <option key={courier.id} value={courier.id}>
                                  {courier.owner_name} {courier.active === false ? "(inativo)" : ""}
                                </option>
                              ))}
                            </select>
                            {order.courier_assignment_status && order.courier_assignment_status !== "unassigned" && (
                              <p className={cn(
                                "mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider",
                                order.courier_assignment_status === "accepted"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : order.courier_assignment_status === "declined"
                                    ? "bg-red-50 text-red-700"
                                    : "bg-amber-50 text-amber-700",
                              )}>
                                {order.courier_assignment_status === "accepted"
                                  ? "Entregador aceitou"
                                  : order.courier_assignment_status === "declined"
                                    ? "Entregador recusou"
                                  : "Aguardando entregador"}
                              </p>
                            )}
                            {order.courier_pickup_at && (
                              <p className="mt-2 inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-700">
                                Coletado {new Date(order.courier_pickup_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          {getNextStatus(order.status) && (
                            <button
                              onClick={() => updateStatus(order.id, getNextStatus(order.status)!)}
                              className="flex-1 bg-gray-900 hover:bg-black text-white text-xs font-bold py-2.5 rounded-xl transition-colors"
                            >
                              Avançar Status
                            </button>
                          )}
                          <button
                            onClick={() => openWhatsApp(order.customer_whatsapp)}
                            className="px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center"
                            title="Chamar no WhatsApp"
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePrint(order)}
                            className="px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center"
                            title="Imprimir Comanda"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {order.status !== "cancelado" && order.status !== "entregue" && (
                            <button
                              onClick={() => updateStatus(order.id, "cancelado")}
                              className="px-3 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold py-2.5 rounded-xl transition-colors"
                            >
                              {isBookingStore ? "Cancelar agendamento" : "Cancelar"}
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {colOrders.length === 0 && !loading && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-400">
                    <ShoppingBag className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-sm font-medium">Nenhum pedido</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {/* Thermal Print Layout */}
    {printingOrder && (
      <div className="hidden print:block text-black font-mono text-sm max-w-[80mm] mx-auto p-4 bg-white">
        <div className="text-center mb-4">
          <h2 className="font-bold text-xl uppercase">Pedido #{printingOrder.id.split('-')[0]}</h2>
          <p className="text-xs mt-1">{new Date(printingOrder.created_at).toLocaleString('pt-BR')}</p>
        </div>
        
        <div className="mb-4 border-b border-dashed border-black pb-4">
          <p className="font-bold uppercase text-base">{printingOrder.customer_name}</p>
          <p className="text-sm">WhatsApp: {printingOrder.customer_whatsapp}</p>
          {formatAppointment(printingOrder) && <p className="text-sm">Agendamento: {formatAppointment(printingOrder)}</p>}
          <p className="text-sm">Pagamento: {PAYMENT_LABELS[printingOrder.payment_method] || printingOrder.payment_method}</p>
          <p className="text-sm">{(printingOrder.delivery_method || "delivery") === "delivery" ? "Entrega" : "Retirada na loja"}</p>
        </div>

        {(printingOrder.delivery_method || "delivery") === "delivery" && printingOrder.street && (
          <div className="mb-4 border-b border-dashed border-black pb-4">
            <p className="font-bold uppercase mb-1">Endereço</p>
            {printingOrder.cep && <p className="text-sm">CEP: {printingOrder.cep}</p>}
            <p className="text-sm">{printingOrder.street}{printingOrder.number ? `, ${printingOrder.number}` : ""}</p>
            {printingOrder.complement && <p className="text-sm">{printingOrder.complement}</p>}
            {printingOrder.neighborhood && <p className="text-sm">{printingOrder.neighborhood}</p>}
            {(printingOrder.city || printingOrder.state) && <p className="text-sm">{[printingOrder.city, printingOrder.state].filter(Boolean).join(" / ")}</p>}
            {printingOrder.reference && <p className="text-sm italic">Ref: {printingOrder.reference}</p>}
          </div>
        )}

        <div className="mb-4">
          <p className="font-bold uppercase mb-2">Itens do Pedido</p>
          {printingOrder.items.map((item, i) => (
            <div key={i} className="flex justify-between items-start mb-2">
              <span className="flex-1 pr-2 leading-tight">
                <span className="font-bold">{item.quantity}x</span> {item.name}
              </span>
              <span className="font-bold whitespace-nowrap">{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        {printingOrder.notes && (
          <div className="mb-4 border-y border-dashed border-black py-2">
            <p className="font-bold uppercase text-xs">Observações:</p>
            <p className="text-sm italic">{printingOrder.notes}</p>
          </div>
        )}

        <div className="flex justify-between items-center text-lg font-black mt-2 pt-2 border-t-2 border-black">
          <span>TOTAL</span>
          <span>{formatPrice(printingOrder.total)}</span>
        </div>
        
        <div className="text-center mt-8 text-xs">
          <p>Gerado via Mostrara App</p>
          <p className="font-bold">www.mostrara.shop</p>
        </div>
      </div>
    )}
    </>
  );
}
