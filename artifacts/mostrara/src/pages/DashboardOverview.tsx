import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Package, Copy, ExternalLink, TrendingUp, ArrowRight, Plus, Zap, CircleHelp, Link2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToastSimple } from "@/hooks/useToastSimple";
import { apiFetch } from "@/lib/api";
import { copyTextToClipboard } from "@/lib/clipboard";
import { formatPrice } from "@/lib/formatters";
import { getStoreTypeConfig, resolveStoreTypeFromProfile } from "@/lib/store-types";
import { cn } from "@/lib/utils";
import { buildStoreUrl } from "@/lib/urls";

interface Stats {
  total_products: number;
  available_products: number;
  reserved_products: number;
  sold_products: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  status: string;
  photos: string[];
  storage?: string;
}

interface OrderFeedback {
  id: string;
  customer_name: string;
  customer_delivery_rating?: number | null;
  customer_delivery_feedback?: string;
  customer_delivery_feedback_at?: string | null;
}

function normalizeProduct(p: Partial<Product>): Product {
  return {
    id: String(p.id ?? crypto.randomUUID()),
    name: String(p.name ?? "Produto sem nome"),
    price: Number(p.price ?? 0),
    status: String(p.status ?? "disponivel"),
    photos: Array.isArray(p.photos) ? p.photos.filter(Boolean) : [],
    storage: p.storage ? String(p.storage) : undefined,
  };
}

interface MonthSummary {
  month: string;
  year: string;
  label: string;
  total: number;
  count: number;
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  disponivel: { label: "Disponível", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  reservado:  { label: "Reservado",  cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  vendido:    { label: "Vendido",    cls: "bg-gray-100 text-gray-500 border border-gray-200" },
};

export default function DashboardOverview() {
  const { user, token } = useAuth();
  const { success, error: toastError } = useToastSimple();
  const [, navigate] = useLocation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [monthSummary, setMonthSummary] = useState<MonthSummary | null>(null);
  const [orders, setOrders] = useState<OrderFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  const opts = useMemo(() => ({ token: token ?? undefined }), [token]);
  const storeConfig = getStoreTypeConfig(resolveStoreTypeFromProfile(user));
  const createItemLabel = storeConfig.mode === "booking" ? "Novo servico" : storeConfig.mode === "food" ? "Novo item" : "Novo produto";
  const recentItemsLabel = storeConfig.mode === "booking" ? "Servicos recentes" : storeConfig.mode === "food" ? "Itens recentes" : "Produtos recentes";
  const emptyItemsLabel = storeConfig.mode === "booking" ? "Nenhum servico cadastrado" : storeConfig.mode === "food" ? "Nenhum item cadastrado" : "Nenhum produto cadastrado";
  const addFirstItemLabel = storeConfig.mode === "booking" ? "Adicionar servico" : storeConfig.mode === "food" ? "Adicionar item" : "Adicionar produto";

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      apiFetch<Stats>("/dashboard/stats", opts),
      apiFetch<{ products: Product[] }>("/products", opts),
      apiFetch<{ current_month: MonthSummary }>("/sales/monthly-summary", opts),
      apiFetch<{ orders: OrderFeedback[] }>("/orders", opts),
    ])
      .then(([s, p, ms, o]) => {
        console.log("📊 Stats Recebidos:", s);
        console.log("📦 Produtos Recebidos:", p);
        console.log("💰 Resumo Mensal:", ms);
        setStats(s);
        setProducts(Array.isArray(p.products) ? p.products.map(normalizeProduct).slice(0, 6) : []);
        setMonthSummary(ms.current_month);
        setOrders(Array.isArray(o.orders) ? o.orders : []);
      })
      .catch((err) => {
        console.error("❌ Erro ao carregar dados do painel:", err);
        toastError("Erro ao carregar painel");
      })
      .finally(() => setLoading(false));
  }, [toastError, token]);

  const storeUrl = user?.store_slug ? buildStoreUrl(user.store_slug) : null;
  const feedbackOrders = orders
    .filter((order) => order.customer_delivery_feedback_at && Number.isFinite(Number(order.customer_delivery_rating)))
    .sort((a, b) => new Date(b.customer_delivery_feedback_at || "").getTime() - new Date(a.customer_delivery_feedback_at || "").getTime());
  const feedbackCount = feedbackOrders.length;
  const averageRating = feedbackCount > 0
    ? feedbackOrders.reduce((sum, order) => sum + Number(order.customer_delivery_rating || 0), 0) / feedbackCount
    : 0;
  const lowRatingOrders = feedbackOrders.filter((order) => Number(order.customer_delivery_rating || 0) <= 2);
  const lowRatingCount = lowRatingOrders.length;

  const copyLink = async () => {
    if (!storeUrl) return;
    try {
      await copyTextToClipboard(storeUrl);
      success("Link copiado!");
    } catch {
      toastError("Nao foi possivel copiar o link da vitrine");
    }
  };

  const openGuide = () => {
    window.dispatchEvent(new Event("mostrara-tutorial-open"));
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="h-8 w-48 skeleton rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 skeleton rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-64 skeleton rounded-2xl" />
          <div className="h-64 skeleton rounded-2xl" />
        </div>
        <div className="h-64 skeleton rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl w-full overflow-x-hidden space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {user?.store_name || "Sua loja"}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Aqui está um resumo da sua loja</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={openGuide}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <CircleHelp className="w-4 h-4" />
            Guia
          </button>
          <button
            onClick={() => navigate("/dashboard/products")}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {createItemLabel}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total",       value: stats?.total_products ?? 0,     accent: false },
          { label: "Disponíveis", value: stats?.available_products ?? 0, accent: true  },
          { label: "Reservados",  value: stats?.reserved_products ?? 0,  accent: false },
          { label: "Vendidos",    value: stats?.sold_products ?? 0,      accent: false },
        ].map((s, i) => (
          <div
            key={i}
            className={cn(
              "rounded-2xl p-5 border transition-shadow hover:shadow-md",
              s.accent
                ? "bg-red-600 border-red-700 shadow-lg shadow-red-600/20"
                : "bg-white border-gray-200"
            )}
          >
            <p className={cn("text-xs font-semibold uppercase tracking-wider mb-2", s.accent ? "text-red-100" : "text-gray-400")}>
              {s.label}
            </p>
            <p className={cn("text-3xl font-black", s.accent ? "text-white" : "text-gray-900")}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* This month */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Este mês</p>
                <p className="text-xs text-gray-400">{monthSummary?.label}</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/dashboard/sales")}
              className="text-xs text-red-600 font-semibold hover:underline flex items-center gap-1"
            >
              Ver tudo <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400 font-medium">Faturamento</p>
              <p className="text-3xl font-black text-gray-900 mt-0.5">
                {formatPrice(monthSummary?.total ?? 0)}
              </p>
            </div>
            <div className="h-px bg-gray-100" />
            <div>
              <p className="text-xs text-gray-400 font-medium">Vendas realizadas</p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">{monthSummary?.count ?? 0}</p>
            </div>
          </div>
        </div>

        {/* Storefront link */}
        <div className="bg-gray-900 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <p className="text-white font-semibold text-sm">Sua vitrine</p>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Compartilhe o link da sua loja em grupos, Instagram e status do WhatsApp.
          </p>
          {storeUrl && (
            <div className="bg-white/[0.07] rounded-xl p-3 mb-4 border border-white/10 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-gray-200 text-sm font-semibold truncate">Cardapio publico ativo</p>
                <p className="text-gray-400 text-xs truncate">Link pronto para compartilhar</p>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={copyLink}
              className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copiar link
            </button>
            {storeUrl && (
              <a
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir vitrine
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Satisfacao da entrega</p>
            <h2 className="mt-1 text-lg font-black text-gray-900">Feedback dos clientes</h2>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-gray-900">{feedbackCount > 0 ? averageRating.toFixed(1) : "0.0"}</p>
            <p className="text-xs text-gray-400">media / 5</p>
          </div>
        </div>

        {lowRatingCount > 0 ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-red-500">Atenção</p>
            <p className="mt-1 text-sm font-semibold text-red-800">
              {lowRatingCount} entrega{lowRatingCount === 1 ? "" : "s"} com nota baixa precisam de revisão.
            </p>
          </div>
        ) : null}

        {feedbackCount === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center">
            <p className="text-sm font-medium text-gray-500">Ainda nao existe avaliacao de entrega confirmada.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {feedbackOrders.slice(0, 3).map((order) => (
              <div key={order.id} className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{order.customer_name}</p>
                    <p className="text-xs text-gray-500">
                      {order.customer_delivery_feedback_at ? new Date(order.customer_delivery_feedback_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : ""}
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-black text-violet-700">
                    {Number(order.customer_delivery_rating || 0).toFixed(1)}
                  </span>
                </div>
                {order.customer_delivery_feedback ? (
                  <p className="mt-2 text-sm leading-relaxed text-violet-800">{order.customer_delivery_feedback}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent products */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900 text-sm">{recentItemsLabel}</h2>
          </div>
          <button
            onClick={() => navigate("/dashboard/products")}
            className="text-xs text-red-600 font-semibold hover:underline flex items-center gap-1"
          >
            Ver todos <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {products.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm font-medium">{emptyItemsLabel}</p>
            <button
              onClick={() => navigate("/dashboard/products")}
              className="mt-3 text-sm text-red-600 font-semibold hover:underline"
            >
              {addFirstItemLabel}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {products.map((p) => {
              const sc = statusConfig[p.status] ?? statusConfig.disponivel;
              const photo = Array.isArray(p.photos) ? p.photos[0] : undefined;
              return (
                <div key={p.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200">
                    {photo ? (
                      <img src={photo} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                    {p.storage && <p className="text-xs text-gray-400">{p.storage}</p>}
                  </div>
                  <p className="text-sm font-bold text-gray-900 flex-shrink-0">{formatPrice(p.price)}</p>
                  <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg flex-shrink-0", sc.cls)}>
                    {sc.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
