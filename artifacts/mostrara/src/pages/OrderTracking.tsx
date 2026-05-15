import { useEffect, useMemo, useRef, useState } from "react";
import { useRoute } from "wouter";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Bike,
  Check,
  CheckCircle2,
  ChefHat,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  MessageCircle,
  QrCode,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { copyTextToClipboard } from "@/lib/clipboard";
import { formatPrice } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface TrackingItem {
  name: string;
  price: number;
  quantity: number;
}

interface TrackingOrder {
  id: string;
  customer_name: string;
  total: string | number;
  status: "pendente" | "confirmado" | "preparando" | "saiu_entrega" | "em_rota" | "entregue" | "cancelado";
  payment_method: string;
  payment_status: string;
  delivery_method?: string;
  appointment_date?: string;
  appointment_time?: string;
  appointment_end_time?: string;
  created_at: string;
  notes?: string;
  assigned_courier_name?: string;
  assigned_courier_whatsapp?: string;
  courier_assignment_status?: "unassigned" | "pending" | "accepted" | "declined" | string | null;
  items: TrackingItem[];
}

interface TrackingStore {
  store_name: string;
  whatsapp?: string;
}

interface TrackingPayment {
  provider?: string | null;
  status: string;
  status_detail?: string | null;
  qr_code?: string | null;
  qr_code_base64?: string | null;
  ticket_url?: string | null;
  mp_payment_id?: string | null;
  paid_at?: string | null;
}

const STEPS = [
  { id: "pendente", label: "Pedido recebido", icon: Clock },
  { id: "confirmado", label: "Aceito", icon: CheckCircle2 },
  { id: "preparando", label: "Preparando", icon: ChefHat },
  { id: "saiu_entrega", label: "Saiu para entrega", icon: Bike },
  { id: "em_rota", label: "Em rota", icon: Bike },
  { id: "entregue", label: "Entregue", icon: Check },
] as const;

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cash: "Dinheiro",
  cartao_credito: "Cartao de credito",
  credito: "Cartao de credito",
  credit: "Cartao de credito",
  cartao_debito: "Cartao de debito",
  debito: "Cartao de debito",
  debit: "Cartao de debito",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  paid: "Pago",
  rejected: "Recusado",
  failed: "Falhou",
  cancelled: "Cancelado",
  canceled: "Cancelado",
  refunded: "Estornado",
  not_applicable: "Nao se aplica",
};

const DELIVERY_METHOD_LABELS: Record<string, string> = {
  delivery: "Entrega",
  pickup: "Retirada",
};

function formatAppointment(order: TrackingOrder) {
  if (!order.appointment_date || !order.appointment_time) return "";
  const [year, month, day] = order.appointment_date.split("-");
  const date = [day, month, year].filter(Boolean).join("/");
  const end = order.appointment_end_time ? ` - ${order.appointment_end_time}` : "";
  return `${date} ${order.appointment_time}${end}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatOrderStatus(status: string) {
  const step = STEPS.find((item) => item.id === status);
  if (step) return step.label;
  if (status === "cancelado") return "Cancelado";
  return status;
}

function getPaymentBadgeClasses(status: string) {
  if (["approved", "paid"].includes(status)) {
    return "bg-emerald-100 text-emerald-700";
  }

  if (["failed", "rejected", "cancelled", "canceled", "refunded"].includes(status)) {
    return "bg-red-100 text-red-700";
  }

  return "bg-amber-100 text-amber-700";
}

export default function OrderTracking() {
  const [match, params] = useRoute("/loja/:storeSlug/pedido/:orderId");
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [store, setStore] = useState<TrackingStore | null>(null);
  const [payment, setPayment] = useState<TrackingPayment | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fatalError, setFatalError] = useState("");
  const [softError, setSoftError] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [manualRefreshTick, setManualRefreshTick] = useState(0);

  const paymentRef = useRef<TrackingPayment | null>(null);
  const hasLoadedRef = useRef(false);

  const storeSlug = params?.storeSlug;
  const orderId = params?.orderId;

  useEffect(() => {
    if (!storeSlug || !orderId) return;

    let active = true;

    const refresh = async (mode: "initial" | "manual" | "poll") => {
      const firstLoad = mode === "initial";

      if (firstLoad) {
        setInitialLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const orderData = await apiFetch<{ order: TrackingOrder; store: TrackingStore }>(
          `/store/${encodeURIComponent(storeSlug)}/orders/${encodeURIComponent(orderId)}`,
        );

        if (!active) return;

        hasLoadedRef.current = true;
        setOrder(orderData.order);
        setStore(orderData.store);
        setFatalError("");

        let nextPayment = paymentRef.current;
        let nextSoftError = "";
        const shouldLoadPayment =
          orderData.order.payment_method === "pix" ||
          orderData.order.payment_status !== "not_applicable";

        if (shouldLoadPayment) {
          try {
            const paymentData = await apiFetch<{ payment: TrackingPayment }>(
              `/store/${encodeURIComponent(storeSlug)}/orders/${encodeURIComponent(orderId)}/payment`,
            );
            if (!active) return;
            nextPayment = paymentData.payment;
          } catch {
            nextSoftError = "Atualizacao do pagamento indisponivel no momento. Tentando novamente.";
          }
        } else {
          nextPayment = null;
        }

        if (!active) return;

        paymentRef.current = nextPayment;
        setPayment(nextPayment);
        setSoftError(nextSoftError);
        setLastUpdatedAt(new Date().toISOString());
      } catch (err) {
        if (!active) return;

        const message = err instanceof Error ? err.message : "Erro ao carregar pedido";

        if (hasLoadedRef.current) {
          setSoftError("Atualizacao temporariamente indisponivel. Exibindo a ultima informacao recebida.");
        } else {
          setFatalError(message);
        }
      } finally {
        if (!active) return;
        setInitialLoading(false);
        setRefreshing(false);
      }
    };

    void refresh(hasLoadedRef.current ? "manual" : "initial");

    const interval = window.setInterval(() => {
      void refresh("poll");
    }, 15000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [manualRefreshTick, orderId, storeSlug]);

  const currentStepIndex = useMemo(() => {
    const index = STEPS.findIndex((step) => step.id === order?.status);
    return index < 0 ? 0 : index;
  }, [order?.status]);

  const publicOrderId = useMemo(() => {
    if (!order?.id) return "";
    return order.id.slice(0, 8).toUpperCase();
  }, [order?.id]);

  const whatsappLink = useMemo(() => {
    if (!store?.whatsapp || !order) return "#";
    const phone = store.whatsapp.replace(/\D/g, "");
    const message = `Ola! Quero acompanhar o pedido #${publicOrderId}.`;
    return `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
  }, [order, publicOrderId, store?.whatsapp]);

  const courierWhatsappLink = useMemo(() => {
    if (!order?.assigned_courier_whatsapp || !order) return "#";
    const phone = order.assigned_courier_whatsapp.replace(/\D/g, "");
    const message = `Ola! Gostaria de falar sobre o pedido #${publicOrderId}.`;
    return `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
  }, [order, publicOrderId]);

  const paymentStatusSource = String(payment?.status || order?.payment_status || "pending").toLowerCase();
  const paymentStatusLabel = PAYMENT_STATUS_LABELS[paymentStatusSource] || paymentStatusSource;
  const paymentMethod = PAYMENT_METHOD_LABELS[order?.payment_method || ""] || order?.payment_method || "";
  const deliveryMethod = DELIVERY_METHOD_LABELS[order?.delivery_method || "delivery"] || "Entrega";
  const courierLabel = order?.assigned_courier_name || "";
  const courierAssignmentStatus = order?.courier_assignment_status || "unassigned";
  const courierAssignmentLabel = courierAssignmentStatus === "accepted"
    ? "Entrega aceita"
    : courierAssignmentStatus === "declined"
      ? "Entrega recusada"
      : courierAssignmentStatus === "pending"
        ? "Aguardando aceitação"
        : "";
  const appointmentLabel = order ? formatAppointment(order) : "";
  const progressScale = currentStepIndex / (STEPS.length - 1);
  const isCanceled = order?.status === "cancelado";
  const isPaymentApproved = ["approved", "paid"].includes(paymentStatusSource);
  const showPixCard = order?.payment_method === "pix" || payment?.provider === "mercadopago_pix";
  const showNotes = Boolean(order?.notes?.trim());

  const handleManualRefresh = () => {
    setManualRefreshTick((current) => current + 1);
  };

  const copyPixCode = async () => {
    if (!payment?.qr_code) return;

    try {
      await copyTextToClipboard(payment.qr_code);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 1500);
    } catch {
      setSoftError("Nao foi possivel copiar o codigo Pix automaticamente.");
    }
  };

  if (!match) return null;

  if (initialLoading && !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm border border-gray-100">
          <Loader2 className="h-5 w-5 animate-spin text-red-500" />
          <span className="text-sm font-semibold text-gray-700">Carregando pedido...</span>
        </div>
      </div>
    );
  }

  if (fatalError || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
        <h1 className="mb-2 text-xl font-bold text-gray-900">Pedido indisponivel</h1>
        <p className="mb-6 max-w-sm text-sm text-gray-500">
          {fatalError || "Nao foi possivel localizar este pedido agora."}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleManualRefresh}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3 font-bold text-white transition-colors hover:bg-black"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </button>
          <a
            href={storeSlug ? `/loja/${storeSlug}` : "/"}
            className="rounded-xl bg-gray-100 px-6 py-3 font-bold text-gray-700 transition-colors hover:bg-gray-200"
          >
            Voltar para a loja
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Acompanhe seu pedido</p>
            <h1 className="truncate text-lg font-black tracking-tight text-gray-900">
              {store?.store_name || "Rastreamento"}
            </h1>
          </div>
          <a
            href={storeSlug ? `/loja/${storeSlug}` : "/"}
            className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700"
          >
            Loja
          </a>
        </div>
      </header>

      <main className="mx-auto mt-4 max-w-md space-y-6 px-4">
        {softError ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-amber-800">Atualizacao parcial</p>
                <p className="mt-1 text-sm text-amber-700">{softError}</p>
              </div>
              <button
                type="button"
                onClick={handleManualRefresh}
                className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-100"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                Atualizar
              </button>
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Pedido</p>
              <h2 className="text-xl font-black text-gray-900">#{publicOrderId}</h2>
              <p className="mt-1 text-sm text-gray-500">{order.customer_name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Status</p>
              <p className={cn("text-sm font-bold", isCanceled ? "text-red-600" : "text-gray-900")}>
                {formatOrderStatus(order.status)}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {refreshing
                  ? "Atualizando..."
                  : lastUpdatedAt
                    ? `Atualizado ${formatDateTime(lastUpdatedAt)}`
                    : ""}
              </p>
            </div>
          </div>

          {isCanceled ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white text-red-500">
                <AlertCircle className="h-7 w-7" />
              </div>
              <p className="text-lg font-bold text-red-700">Pedido cancelado</p>
              <p className="mt-1 text-sm text-red-600">Fale com a loja para entender o motivo ou refazer o pedido.</p>
            </div>
          ) : (
            <div className="relative pl-6">
              <div className="absolute bottom-2 left-[11px] top-2 w-0.5 bg-gray-100" />
              <motion.div
                className="absolute left-[11px] top-2 w-0.5 origin-top bg-emerald-500"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: progressScale }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
                style={{ height: "calc(100% - 16px)" }}
              />

              <div className="space-y-8">
                {STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = currentStepIndex === index;
                  const isPast = currentStepIndex > index;

                  return (
                    <div key={step.id} className="relative flex items-center gap-4">
                      <div
                        className={cn(
                          "absolute -left-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white transition-colors",
                          isActive
                            ? "border-red-500"
                            : isPast
                              ? "border-emerald-500 bg-emerald-500"
                              : "border-gray-200",
                        )}
                      >
                        {isPast && <Check className="h-3.5 w-3.5 text-white" />}
                        {isActive && <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
                      </div>

                      <div>
                        <p
                          className={cn(
                            "text-sm font-bold transition-colors",
                            isActive || isPast ? "text-gray-900" : "text-gray-400",
                          )}
                        >
                          {step.label}
                        </p>
                      </div>

                      {(isActive || isPast) && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={cn(
                            "ml-auto flex h-10 w-10 items-center justify-center rounded-full",
                            isActive ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600",
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {showPixCard ? (
          <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Pagamento</p>
                <h3 className="text-lg font-black text-gray-900">Pix</h3>
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold",
                  getPaymentBadgeClasses(paymentStatusSource),
                )}
              >
                {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {payment?.status_detail || paymentStatusLabel}
              </span>
            </div>

            {isPaymentApproved ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-600">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-800">Pagamento aprovado</p>
                    <p className="mt-1 text-sm text-emerald-700">
                      A confirmacao do Pix ja foi recebida pela loja.
                    </p>
                    {payment?.paid_at ? (
                      <p className="mt-2 text-xs font-medium text-emerald-700">
                        Pago em {formatDateTime(payment.paid_at)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-800">QR Code do Pix</p>
                    <span className="text-xs text-gray-500">
                      {refreshing ? "Atualizando..." : "Aguardando pagamento"}
                    </span>
                  </div>
                  <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-gray-200 bg-white p-3">
                    {payment?.qr_code_base64 ? (
                      <img
                        src={`data:image/png;base64,${payment.qr_code_base64}`}
                        alt="QR Code Pix"
                        className="h-auto w-full max-w-[280px]"
                      />
                    ) : (
                      <div className="space-y-2 text-center text-gray-400">
                        <QrCode className="mx-auto h-10 w-10" />
                        <p className="text-sm">QR code indisponivel no momento</p>
                      </div>
                    )}
                  </div>
                </div>

                {showNotes && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Observacoes</p>
                    <p className="mt-2 text-sm text-gray-700 leading-relaxed">{order?.notes}</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Copia e cola
                  </label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={payment?.qr_code || ""}
                      className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 outline-none"
                    />
                    <button
                      type="button"
                      onClick={copyPixCode}
                      disabled={!payment?.qr_code}
                      className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Copy className="h-4 w-4" />
                      {copiedCode ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                </div>

                {payment?.ticket_url ? (
                  <a
                    href={payment.ticket_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 font-bold text-white transition-colors hover:bg-red-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir pagamento
                  </a>
                ) : null}

                <p className="text-xs leading-relaxed text-gray-500">
                  Depois de pagar, o sistema confirma automaticamente assim que o retorno do provedor chegar.
                </p>
              </div>
            )}
          </section>
        ) : null}

        {!isCanceled && store?.whatsapp ? (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-between rounded-2xl bg-[#25D366] p-4 text-white shadow-lg shadow-green-900/10 transition-all hover:bg-[#20bd5a]"
          >
            <div>
              <p className="font-bold">Falar com a loja</p>
              <p className="mt-0.5 text-xs font-medium text-green-100">Abrir conversa no WhatsApp</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <MessageCircle className="h-5 w-5 fill-current" />
            </div>
          </a>
        ) : null}

        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-bold text-gray-900">
            <ShoppingBag className="h-5 w-5" />
            <h3>Resumo do pedido</h3>
          </div>

          <div className="space-y-3">
            {order.items.length > 0 ? (
              order.items.map((item, index) => (
                <div key={`${item.name}-${index}`} className="flex justify-between gap-3 text-sm">
                  <span className="text-gray-600">
                    <span className="mr-2 font-bold text-gray-900">{item.quantity}x</span>
                    {item.name}
                  </span>
                  <span className="whitespace-nowrap font-medium text-gray-900">
                    {formatPrice(Number(item.price) * item.quantity)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">Os itens do pedido nao foram enviados nesta consulta.</p>
            )}
          </div>

          <div className="mt-6 space-y-2 border-t border-gray-100 pt-4 text-sm">
            <div className="flex justify-between gap-4 text-gray-500">
              <span>Pagamento</span>
              <span className="text-right font-medium text-gray-900">
                {paymentMethod} - {paymentStatusLabel}
              </span>
            </div>
            <div className="flex justify-between gap-4 text-gray-500">
              <span>Entrega</span>
              <span className="text-right font-medium text-gray-900">{deliveryMethod}</span>
            </div>
            {courierLabel ? (
              <div className="flex justify-between gap-4 text-gray-500">
                <span>Entregador</span>
                <span className="text-right font-medium text-gray-900">{courierLabel}</span>
              </div>
            ) : null}
            {courierAssignmentLabel ? (
              <div className="flex justify-between gap-4 text-gray-500">
                <span>Status do entregador</span>
                <span className={cn(
                  "text-right font-semibold",
                  courierAssignmentStatus === "accepted"
                    ? "text-emerald-700"
                    : courierAssignmentStatus === "declined"
                      ? "text-red-700"
                      : "text-amber-700",
                )}>
                  {courierAssignmentLabel}
                </span>
              </div>
            ) : null}
            {order?.assigned_courier_whatsapp ? (
              <div className="flex justify-end">
                <a
                  href={courierWhatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Falar com entregador
                </a>
              </div>
            ) : null}
            {appointmentLabel ? (
              <div className="flex justify-between gap-4 text-gray-500">
                <span>Agendamento</span>
                <span className="text-right font-medium text-gray-900">{appointmentLabel}</span>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 text-gray-500">
              <span>Criado em</span>
              <span className="text-right font-medium text-gray-900">{formatDateTime(order.created_at)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-2">
              <span className="font-bold text-gray-900">Total</span>
              <span className="text-xl font-black text-gray-900">{formatPrice(Number(order.total))}</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
