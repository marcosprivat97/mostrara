import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Package, Copy, ExternalLink, TrendingUp, ArrowRight, Plus, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToastSimple } from "@/hooks/useToastSimple";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/formatters";
import { cn } from "@/lib/utils";

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
  const [loading, setLoading] = useState(true);

  const opts = useMemo(() => ({ token: token ?? undefined }), [token]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      apiFetch<Stats>("/dashboard/stats", opts),
      apiFetch<{ products: Product[] }>("/products", opts),
      apiFetch<{ current_month: MonthSummary }>("/sales/monthly-summary", opts),
    ])
      .then(([s, p, ms]) => {
        setStats(s);
        setProducts(p.products.slice(0, 6));
        setMonthSummary(ms.current_month);
      })
      .catch(() => toastError("Erro ao carregar painel"))
      .finally(() => setLoading(false));
  }, [token]);

  const storeUrl = user?.store_slug
    ? `${window.location.origin}${import.meta.env.BASE_URL}loja/${user.store_slug}`
    : null;

  const copyLink = () => {
    if (!storeUrl) return;
    navigator.clipboard.writeText(storeUrl);
    success("Link copiado!");
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
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Olá, {user?.owner_name?.split(" ")[0]} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Aqui está um resumo da sua loja</p>
        </div>
        <button
          onClick={() => navigate("/dashboard/products")}
          className="hidden sm:flex items-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo produto
        </button>
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
            <div className="bg-white/[0.07] rounded-xl p-3 mb-4 border border-white/10">
              <p className="text-gray-300 text-xs font-mono truncate">{storeUrl}</p>
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
                Abrir
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Recent products */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900 text-sm">Produtos recentes</h2>
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
            <p className="text-gray-400 text-sm font-medium">Nenhum produto cadastrado</p>
            <button
              onClick={() => navigate("/dashboard/products")}
              className="mt-3 text-sm text-red-600 font-semibold hover:underline"
            >
              Adicionar produto
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {products.map((p) => {
              const sc = statusConfig[p.status] ?? statusConfig.disponivel;
              const photo = p.photos?.[0];
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
