import { useEffect, useMemo, useState } from "react";
import { useAuth, storeAuthToken } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { useToastSimple } from "@/hooks/useToastSimple";
import { formatPrice } from "@/lib/formatters";
import { Shield, Trash2, Loader2, Crown, BadgeCheck, Gift, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface StoreRow {
  id: string;
  store_name: string;
  email: string;
  whatsapp: string;
  store_slug: string;
  plan?: string;
  free_forever?: boolean;
  verified_badge?: boolean;
  active?: boolean;
  last_login_at?: string | null;
  products_count: number;
  sales_count: number;
  orders_count: number;
  revenue: number;
}

interface Summary {
  stores: number;
  products: number;
  sales: number;
  orders: number;
  open_tickets: number;
}

interface Ticket {
  id: string;
  title: string;
  message: string;
  status: string;
  store_name: string;
  email: string;
}

export default function DashboardAdmin() {
  const { token, user } = useAuth();
  const { success, error } = useToastSimple();
  const opts = useMemo(() => ({ token: token ?? undefined }), [token]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreRow | null>(null);

  const isAdmin = user?.email?.toLowerCase() === "sevenbeatx@gmail.com";
  const load = () => {
    if (!isAdmin) return;
    Promise.all([
      apiFetch<Summary>("/admin/summary", opts),
      apiFetch<{ stores: StoreRow[] }>("/admin/stores", opts),
      apiFetch<{ tickets: Ticket[] }>("/admin/tickets", opts),
    ]).then(([summaryData, storesData, ticketsData]) => {
      setSummary(summaryData);
      setStores(storesData.stores);
      setTickets(ticketsData.tickets);
    }).catch(() => error("Erro ao carregar painel dev"));
  };
  useEffect(() => { load(); }, [token, isAdmin]);

  const deleteStore = async (id: string) => {
    if (!confirm("Excluir lojista e todos os dados dele? Esta acao e permanente.")) return;
    setBusy(id);
    try {
      await apiFetch(`/admin/stores/${id}`, { method: "DELETE", ...opts });
      success("Lojista excluido");
      load();
    } catch {
      error("Erro ao excluir lojista");
    } finally {
      setBusy(null);
    }
  };

  const updatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStore) return;
    setBusy(editingStore.id);
    try {
      await apiFetch(`/admin/stores/${editingStore.id}/plan`, {
        method: "PUT",
        ...opts,
        body: JSON.stringify({
          plan: editingStore.plan,
          free_forever: editingStore.free_forever,
          verified_badge: editingStore.verified_badge,
        }),
      });
      success("Plano atualizado!");
      setPlanModalOpen(false);
      load();
    } catch {
      error("Erro ao atualizar plano");
    } finally {
      setBusy(null);
    }
  };

  const impersonateStore = async (storeId: string) => {
    setBusy(`impersonate_${storeId}`);
    try {
      const data = await apiFetch<{ token: string }>(`/admin/impersonate`, {
        method: "POST",
        ...opts,
        body: JSON.stringify({ store_id: storeId }),
      });
      storeAuthToken(data.token, true);
      success("Logado como lojista. Redirecionando...");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    } catch {
      error("Erro ao tentar acessar a loja");
      setBusy(null);
    }
  };

  const closeTicket = async (ticketId: string) => {
    setBusy(`ticket_${ticketId}`);
    try {
      await apiFetch(`/admin/tickets/${ticketId}`, {
        method: "PUT",
        ...opts,
        body: JSON.stringify({ status: "resolved" }),
      });
      success("Ticket resolvido!");
      load();
    } catch {
      error("Erro ao resolver ticket");
    } finally {
      setBusy(null);
    }
  };

  if (!isAdmin) {
    return <div className="text-sm text-gray-500">Acesso de desenvolvedor negado.</div>;
  }

  return (
    <div className="max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Painel Dev</h1>
        <p className="text-sm text-gray-500 mt-1">Controle de lojistas, performance e suporte.</p>
      </div>
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            ["Lojas", summary.stores],
            ["Produtos", summary.products],
            ["Vendas", summary.sales],
            ["Pedidos", summary.orders],
            ["Tickets", summary.open_tickets],
          ].map(([label, value]) => (
            <div key={label} className="bg-white border border-gray-200 rounded-2xl p-4">
              <p className="text-xs text-gray-400 font-bold uppercase">{label}</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <Shield className="w-4 h-4 text-red-600" />
          <h2 className="font-bold text-gray-900">Lojistas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left p-3">Loja</th>
                <th className="text-left p-3">Dados</th>
                <th className="text-left p-3">Plano</th>
                <th className="text-left p-3">Performance</th>
                <th className="text-left p-3">Login</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => (
                <tr key={store.id} className="border-t border-gray-100">
                  <td className="p-3 font-bold text-gray-900">{store.store_name}<br /><span className="text-xs text-gray-400 font-normal">@{store.store_slug}</span></td>
                  <td className="p-3 text-gray-500">{store.email}<br />{store.whatsapp}</td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1 items-start">
                      {store.plan === "premium" || store.free_forever ? (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-bold">
                          <Crown className="w-3 h-3" /> Premium
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-xs font-bold">
                          Free
                        </span>
                      )}
                      {store.free_forever && (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
                          Vitalício
                        </span>
                      )}
                      {store.verified_badge && (
                        <span className="inline-flex items-center gap-1 text-blue-600 text-[10px] font-bold uppercase tracking-wider">
                          <BadgeCheck className="w-3 h-3" /> Verificado
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-gray-500">{store.products_count} produtos · {store.orders_count} pedidos · {store.sales_count} vendas<br />{formatPrice(Number(store.revenue || 0))}</td>
                  <td className="p-3 text-gray-500">{store.last_login_at ? new Date(store.last_login_at).toLocaleDateString("pt-BR") : "Nunca"}</td>
                  <td className="p-3 text-right space-x-1">
                    <button
                      onClick={() => impersonateStore(store.id)}
                      disabled={busy === `impersonate_${store.id}`}
                      className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"
                      title="Acessar painel"
                    >
                      {busy === `impersonate_${store.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => {
                        setEditingStore(store);
                        setPlanModalOpen(true);
                      }}
                      className="p-2 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600"
                      title="Editar Plano"
                    >
                      <Gift className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteStore(store.id)} disabled={busy === store.id} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600">
                      {busy === store.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 font-bold text-gray-900">Tickets recentes</div>
        {tickets.slice(0, 8).map((ticket) => (
          <div key={ticket.id} className="p-4 border-b border-gray-100 last:border-b-0 flex justify-between items-start gap-4">
            <div className="flex-1">
              <p className="font-bold text-gray-900">
                {ticket.title} <span className="text-xs text-gray-400">· {ticket.store_name}</span>
                {ticket.status === "resolved" && (
                  <span className="ml-2 inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                    Resolvido
                  </span>
                )}
              </p>
              <p className="text-sm text-gray-500 mt-1">{ticket.message}</p>
            </div>
            {ticket.status !== "resolved" && (
              <button
                onClick={() => closeTicket(ticket.id)}
                disabled={busy === `ticket_${ticket.id}`}
                className="flex-shrink-0 text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                {busy === `ticket_${ticket.id}` ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : "Marcar resolvido"}
              </button>
            )}
          </div>
        ))}
      </div>

      <Dialog open={planModalOpen} onOpenChange={setPlanModalOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Gerenciar Plano</DialogTitle>
          {editingStore && (
            <form onSubmit={updatePlan} className="space-y-4 pt-4">
              <div className="bg-gray-50 p-3 rounded-lg text-sm mb-4 border border-gray-100">
                <p className="font-bold text-gray-900">{editingStore.store_name}</p>
                <p className="text-gray-500">@{editingStore.store_slug}</p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <Crown className="w-5 h-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-bold text-gray-900">Plano Premium</p>
                      <p className="text-xs text-gray-500">Acesso completo (IA, Mercado Pago, Ilimitado)</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editingStore.plan === "premium"}
                    onChange={(e) => setEditingStore({ ...editingStore, plan: e.target.checked ? "premium" : "free" })}
                    className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <Gift className="w-5 h-5 text-emerald-500" />
                    <div>
                      <p className="text-sm font-bold text-gray-900">Premium Vitalício</p>
                      <p className="text-xs text-gray-500">Nao cobra assinatura (free_forever)</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editingStore.free_forever}
                    onChange={(e) => setEditingStore({ ...editingStore, free_forever: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <BadgeCheck className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-bold text-gray-900">Selo de Verificado</p>
                      <p className="text-xs text-gray-500">Mostra selo de confianca na vitrine</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editingStore.verified_badge}
                    onChange={(e) => setEditingStore({ ...editingStore, verified_badge: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setPlanModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" disabled={Boolean(busy)} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 flex items-center gap-2">
                  {busy === editingStore.id && <Loader2 className="w-4 h-4 animate-spin" />}
                  Salvar Alterações
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
