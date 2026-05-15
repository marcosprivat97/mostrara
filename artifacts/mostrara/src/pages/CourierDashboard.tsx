import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Bike, CheckCircle2, Clock, MapPin, Phone, Package, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { useToastSimple } from "@/hooks/useToastSimple";
import { formatPrice } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface CourierOrderItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CourierOrder {
  id: string;
  customer_name: string;
  customer_whatsapp: string;
  delivery_method?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  reference?: string;
  notes?: string;
  total: number;
  status: "saiu_entrega" | "em_rota" | "entregue" | string;
  created_at: string;
  assigned_courier_id?: string | null;
  courier_assignment_status?: "unassigned" | "pending" | "accepted" | "declined" | string | null;
  courier_assignment_updated_at?: string | null;
  courier_pickup_at?: string | null;
  courier_on_route_at?: string | null;
  courier_delivered_at?: string | null;
  items: CourierOrderItem[];
}

function openWhatsApp(phone: string) {
  const clean = phone.replace(/\D/g, "");
  window.open(`https://wa.me/${clean}`, "_blank");
}

function formatAddress(order: CourierOrder) {
  return [
    order.street,
    order.number ? `, ${order.number}` : "",
    order.neighborhood ? ` - ${order.neighborhood}` : "",
    order.city ? `, ${order.city}` : "",
    order.state ? ` / ${order.state}` : "",
  ].join("").trim();
}

export default function CourierDashboard() {
  const { user, token } = useAuth();
  const [, navigate] = useLocation();
  const { success, error } = useToastSimple();
  const [orders, setOrders] = useState<CourierOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [routeingId, setRouteingId] = useState<string | null>(null);

  const opts = useMemo(() => ({ token: token ?? undefined }), [token]);

  useEffect(() => {
    if (user && (user.account_role ?? "merchant") !== "courier") {
      navigate("/dashboard");
    }
  }, [navigate, user]);

  const loadOrders = () => {
    setLoading(true);
    apiFetch<{ orders: CourierOrder[] }>("/couriers/orders", opts)
      .then((data) => setOrders(Array.isArray(data.orders) ? data.orders : []))
      .catch((err) => error(err instanceof Error ? err.message : "Erro ao carregar entregas"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!token) return;
    loadOrders();
    const timer = setInterval(loadOrders, 30000);
    return () => clearInterval(timer);
  }, [token]);

  const markDelivered = async (orderId: string) => {
    setUpdatingId(orderId);
    try {
      await apiFetch(`/couriers/orders/${orderId}/delivered`, {
        method: "PUT",
        ...opts,
      });
      success("Entrega confirmada");
      loadOrders();
    } catch (err) {
      error(err instanceof Error ? err.message : "Nao foi possivel concluir a entrega");
    } finally {
      setUpdatingId(null);
    }
  };

  const acceptDelivery = async (orderId: string) => {
    setUpdatingId(orderId);
    try {
      await apiFetch(`/couriers/orders/${orderId}/accept`, {
        method: "PUT",
        ...opts,
      });
      success("Entrega aceita");
      loadOrders();
    } catch (err) {
      error(err instanceof Error ? err.message : "Nao foi possivel aceitar a entrega");
    } finally {
      setUpdatingId(null);
    }
  };

  const markPickedUp = async (orderId: string) => {
    setUpdatingId(orderId);
    try {
      await apiFetch(`/couriers/orders/${orderId}/pickup`, {
        method: "PUT",
        ...opts,
      });
      success("Coleta confirmada");
      loadOrders();
    } catch (err) {
      error(err instanceof Error ? err.message : "Nao foi possivel confirmar a coleta");
    } finally {
      setUpdatingId(null);
    }
  };

  const declineDelivery = async (orderId: string) => {
    setUpdatingId(orderId);
    try {
      await apiFetch(`/couriers/orders/${orderId}/decline`, {
        method: "PUT",
        ...opts,
      });
      success("Entrega recusada");
      loadOrders();
    } catch (err) {
      error(err instanceof Error ? err.message : "Nao foi possivel recusar a entrega");
    } finally {
      setUpdatingId(null);
    }
  };

  const markOnRoute = async (orderId: string) => {
    setRouteingId(orderId);
    try {
      await apiFetch(`/couriers/orders/${orderId}/on-route`, {
        method: "PUT",
        ...opts,
      });
      success("Saida para entrega confirmada");
      loadOrders();
    } catch (err) {
      error(err instanceof Error ? err.message : "Nao foi possivel marcar a saida");
    } finally {
      setRouteingId(null);
    }
  };

  const pendingOrders = orders.filter((order) => order.status === "saiu_entrega" && (order.courier_assignment_status ?? "pending") === "pending");
  const acceptedOrders = orders.filter((order) => order.status === "saiu_entrega" && (order.courier_assignment_status ?? "pending") === "accepted" && !order.courier_pickup_at);
  const pickedUpOrders = orders.filter((order) => order.status === "saiu_entrega" && Boolean(order.courier_pickup_at));
  const onRouteOrders = orders.filter((order) => order.status === "em_rota");
  const declinedOrders = orders.filter((order) => order.status === "saiu_entrega" && (order.courier_assignment_status ?? "") === "declined");
  const queuedOrders = orders.filter((order) => order.status !== "saiu_entrega" && order.status !== "em_rota" && order.status !== "entregue");
  const deliveredOrders = orders.filter((order) => order.status === "entregue");

  return (
    <div className="max-w-5xl space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-gray-900 via-gray-900 to-emerald-950 text-white p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-3 text-emerald-300 mb-3">
          <Bike className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-[0.3em]">Painel do entregador</span>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{user?.owner_name || "Entregador"}</h1>
            <p className="text-white/70 mt-2 max-w-2xl">
              Aqui ficam as entregas atribuídas pela loja. Quando o pedido sair para entrega, você confirma a baixa e o cliente recebe a atualização no WhatsApp.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={loadOrders}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </button>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
            <p className="text-xs uppercase tracking-wider text-white/50">Pendentes</p>
            <p className="text-3xl font-black mt-1">{pendingOrders.length}</p>
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
            <p className="text-xs uppercase tracking-wider text-white/50">Aceitas</p>
            <p className="text-3xl font-black mt-1">{acceptedOrders.length}</p>
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
            <p className="text-xs uppercase tracking-wider text-white/50">Coletadas</p>
            <p className="text-3xl font-black mt-1">{pickedUpOrders.length}</p>
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
            <p className="text-xs uppercase tracking-wider text-white/50">Em rota</p>
            <p className="text-3xl font-black mt-1">{onRouteOrders.length}</p>
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
            <p className="text-xs uppercase tracking-wider text-white/50">Entregues</p>
            <p className="text-3xl font-black mt-1">{deliveredOrders.length}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {loading && (
          <div className="grid gap-4">
            <div className="h-40 rounded-3xl skeleton" />
            <div className="h-40 rounded-3xl skeleton" />
          </div>
        )}

        {!loading && pendingOrders.length === 0 && acceptedOrders.length === 0 && pickedUpOrders.length === 0 && onRouteOrders.length === 0 && queuedOrders.length === 0 && (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-xl font-black text-gray-900">Nenhuma entrega atribuída</h2>
            <p className="mt-2 text-sm text-gray-500">
              Quando o lojista colocar o pedido em <strong>saiu para entrega</strong> e atribuir para você, ele aparece aqui.
            </p>
          </div>
        )}

        {pendingOrders.map((order) => {
          const address = formatAddress(order);
          return (
            <div key={order.id} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold bg-amber-50 text-amber-700",
                    )}>
                      <Package className="w-3.5 h-3.5" />
                      Aguardando aceitação
                    </div>
                    <span className="text-xs font-medium text-gray-400">
                      {new Date(order.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-lg font-black text-gray-900">{order.customer_name}</h2>
                    <p className="text-sm text-gray-500">{formatPrice(order.total)}</p>
                  </div>

                  <div className="space-y-1 text-sm text-gray-600">
                    {address && (
                      <p className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 text-gray-400" />
                        <span>{address}</span>
                      </p>
                    )}
                    {order.courier_pickup_at && <p className="text-xs text-amber-700">Coleta {new Date(order.courier_pickup_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>}
                    {order.reference && <p className="text-xs text-gray-400 italic">Ref.: {order.reference}</p>}
                    {order.notes && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">{order.notes}</p>}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {order.items.map((item, index) => (
                      <span key={index} className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                        {item.quantity}x {item.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 lg:min-w-56">
                  <button
                    type="button"
                    onClick={() => openWhatsApp(order.customer_whatsapp)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    WhatsApp do cliente
                  </button>
                  <button
                    type="button"
                    onClick={() => acceptDelivery(order.id)}
                    disabled={updatingId === order.id}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                  >
                    {updatingId === order.id ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Aceitar entrega
                  </button>
                  <button
                    type="button"
                    onClick={() => declineDelivery(order.id)}
                    disabled={updatingId === order.id}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-60 transition-colors"
                  >
                    <Bike className="h-4 w-4" />
                    Recusar
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {acceptedOrders.map((order) => {
          const address = formatAddress(order);
          return (
            <div key={order.id} className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Entrega aceita
                    </div>
                    <span className="text-xs font-medium text-gray-400">
                      {new Date(order.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-lg font-black text-gray-900">{order.customer_name}</h2>
                    <p className="text-sm text-gray-500">{formatPrice(order.total)}</p>
                  </div>

                  <div className="space-y-1 text-sm text-gray-600">
                    {address && (
                      <p className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 text-gray-400" />
                        <span>{address}</span>
                      </p>
                    )}
                    {order.courier_on_route_at && <p className="text-xs text-orange-700">Saiu {new Date(order.courier_on_route_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>}
                    {order.reference && <p className="text-xs text-gray-400 italic">Ref.: {order.reference}</p>}
                    {order.notes && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">{order.notes}</p>}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {order.items.map((item, index) => (
                      <span key={index} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700">
                        {item.quantity}x {item.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 lg:min-w-56">
                  <button
                    type="button"
                    onClick={() => openWhatsApp(order.customer_whatsapp)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    Falar com cliente
                  </button>
                  <button
                    type="button"
                    onClick={() => markPickedUp(order.id)}
                    disabled={updatingId === order.id}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-60 transition-colors"
                  >
                    {updatingId === order.id ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-700 border-t-transparent" />
                    ) : (
                      <Package className="h-4 w-4" />
                    )}
                    Confirmar coleta
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {pickedUpOrders.map((order) => {
          const address = formatAddress(order);
          return (
            <div key={order.id} className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold bg-amber-100 text-amber-800">
                      <Package className="w-3.5 h-3.5" />
                      Coletado
                    </div>
                    <span className="text-xs font-medium text-gray-400">
                      {order.courier_pickup_at ? new Date(order.courier_pickup_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : ""}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-lg font-black text-gray-900">{order.customer_name}</h2>
                    <p className="text-sm text-gray-500">{formatPrice(order.total)}</p>
                  </div>

                  <div className="space-y-1 text-sm text-gray-600">
                    {address && (
                      <p className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 text-gray-400" />
                        <span>{address}</span>
                      </p>
                    )}
                    {order.courier_delivered_at && <p className="text-xs text-emerald-700">Entregue {new Date(order.courier_delivered_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>}
                    {order.reference && <p className="text-xs text-gray-400 italic">Ref.: {order.reference}</p>}
                    {order.notes && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">{order.notes}</p>}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {order.items.map((item, index) => (
                      <span key={index} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700">
                        {item.quantity}x {item.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 lg:min-w-56">
                  <button
                    type="button"
                    onClick={() => openWhatsApp(order.customer_whatsapp)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    Falar com cliente
                  </button>
                  <button
                    type="button"
                    onClick={() => markOnRoute(order.id)}
                    disabled={routeingId === order.id}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-60 transition-colors"
                  >
                    {routeingId === order.id ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-700 border-t-transparent" />
                    ) : (
                      <Bike className="h-4 w-4" />
                    )}
                    Sair para entrega
                  </button>
                  <button
                    type="button"
                    onClick={() => markDelivered(order.id)}
                    disabled={updatingId === order.id}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-bold text-white hover:bg-black disabled:opacity-60 transition-colors"
                  >
                    {updatingId === order.id ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Confirmar entrega
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {!loading && deliveredOrders.length > 0 && (
          <div className="rounded-3xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2 text-gray-900">
              <Clock className="h-4 w-4 text-gray-500" />
              <h3 className="font-black">Entregas concluídas</h3>
            </div>
            <div className="space-y-3">
              {deliveredOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                  <div>
                    <p className="font-semibold text-gray-900">{order.customer_name}</p>
                    <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>
                  </div>
                  <p className="text-sm font-bold text-gray-700">{formatPrice(order.total)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && declinedOrders.length > 0 && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-5">
            <div className="mb-3 flex items-center gap-2 text-red-900">
              <Bike className="h-4 w-4 text-red-500" />
              <h3 className="font-black">Entregas recusadas</h3>
            </div>
            <p className="text-sm text-red-700">
              Estas entregas voltaram para a loja e precisam ser redistribuídas.
            </p>
          </div>
        )}

        {!loading && queuedOrders.length > 0 && (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-2 text-gray-900">
              <Clock className="h-4 w-4 text-gray-500" />
              <h3 className="font-black">Aguardando saída</h3>
            </div>
            <p className="text-sm text-gray-500">
              Estes pedidos já estão atribuídos, mas o lojista ainda não marcou como <strong>saiu para entrega</strong>.
            </p>
          </div>
        )}

        {onRouteOrders.map((order) => {
          const address = formatAddress(order);
          return (
            <div key={order.id} className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold bg-emerald-100 text-emerald-800">
                      <Bike className="w-3.5 h-3.5" />
                      Em rota
                    </div>
                    <span className="text-xs font-medium text-gray-400">
                      {new Date(order.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-900">{order.customer_name}</h2>
                    <p className="text-sm text-gray-500">{formatPrice(order.total)}</p>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    {address && (
                      <p className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 text-gray-400" />
                        <span>{address}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 lg:min-w-56">
                  <button
                    type="button"
                    onClick={() => openWhatsApp(order.customer_whatsapp)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    Falar com cliente
                  </button>
                  <button
                    type="button"
                    onClick={() => markDelivered(order.id)}
                    disabled={updatingId === order.id}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-bold text-white hover:bg-black disabled:opacity-60 transition-colors"
                  >
                    {updatingId === order.id ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Confirmar entrega
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
