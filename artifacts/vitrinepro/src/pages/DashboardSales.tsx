import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/contexts/AuthContext";
import { useToastSimple } from "@/hooks/useToastSimple";
import { apiFetch } from "@/lib/api";
import { formatPrice } from "@/lib/formatters";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, TrendingUp, X, Loader2, ChevronLeft, ChevronRight, Receipt, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Sale {
  id: string;
  product_name: string;
  customer_name: string;
  customer_whatsapp: string;
  sale_date: string;
  product_price: number;
  amount_paid: number;
  payment_method: string;
  notes: string;
}

interface SaleForm {
  product_name: string;
  customer_name: string;
  customer_whatsapp: string;
  sale_date: string;
  product_price: number;
  amount_paid: number;
  payment_method: string;
  notes: string;
}

interface MonthSummary {
  month: string;
  year: string;
  label: string;
  total: number;
  count: number;
}

const PAYMENT_METHODS = [
  { value: "pix", label: "Pix" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "cartao_debito", label: "Cartão de Débito" },
  { value: "transferencia", label: "Transferência" },
];

const paymentLabel = (v: string) => PAYMENT_METHODS.find(m => m.value === v)?.label || v;

function FormInput({ label, error, required, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        {...props}
        className={cn(
          "w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition-all",
          "focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-500/10",
          error && "border-red-300 bg-red-50/30",
          className
        )}
      />
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}

export default function DashboardSales() {
  const { token } = useAuth();
  const { success, error } = useToastSimple();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const headers = { Authorization: `Bearer ${token}` };

  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<SaleForm>({
    defaultValues: { payment_method: "pix", sale_date: new Date().toISOString().split("T")[0] },
  });

  const load = () => {
    setLoading(true);
    const { year, month } = currentMonth;
    Promise.all([
      apiFetch<{ sales: Sale[] }>(`/sales?year=${year}&month=${month}`, { headers }),
      apiFetch<{ current_month: MonthSummary; months: MonthSummary[] }>("/sales/monthly-summary", { headers }),
    ]).then(([s, ms]) => {
      setSales(s.sales);
      setSummary(ms.months.find(m => m.month === String(month).padStart(2, "0") && m.year === String(year)) || null);
    }).catch(() => error("Erro ao carregar vendas")).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token, currentMonth]);

  const prevMonth = () => setCurrentMonth(({ year, month }) =>
    month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
  );
  const nextMonth = () => {
    const d = new Date();
    const isCurrent = currentMonth.year === d.getFullYear() && currentMonth.month === d.getMonth() + 1;
    if (isCurrent) return;
    setCurrentMonth(({ year, month }) =>
      month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
    );
  };

  const monthLabel = new Date(currentMonth.year, currentMonth.month - 1).toLocaleString("pt-BR", { month: "long", year: "numeric" });

  const onSubmit = async (data: SaleForm) => {
    try {
      await apiFetch("/sales", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, product_price: Number(data.product_price), amount_paid: Number(data.amount_paid) }),
      });
      success("Venda registrada!");
      setDialogOpen(false);
      reset({ payment_method: "pix", sale_date: new Date().toISOString().split("T")[0] });
      load();
    } catch { error("Erro ao registrar venda"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta venda?")) return;
    setDeletingId(id);
    try {
      await apiFetch(`/sales/${id}`, { method: "DELETE", headers });
      success("Venda excluída");
      load();
    } catch { error("Erro ao excluir venda"); }
    finally { setDeletingId(null); }
  };

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendas</h1>
          <p className="text-gray-500 text-sm mt-0.5">Histórico e registro de vendas</p>
        </div>
        <button
          onClick={() => { reset({ payment_method: "pix", sale_date: new Date().toISOString().split("T")[0] }); setDialogOpen(true); }}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Registrar venda
        </button>
      </div>

      {/* Month nav */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-base font-bold text-gray-900 capitalize min-w-[180px] text-center">{monthLabel}</h2>
            <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-red-600 rounded-xl p-4 text-white">
            <p className="text-red-100 text-xs font-semibold uppercase tracking-wider mb-1">Faturamento</p>
            <p className="text-2xl font-black">{summary ? formatPrice(summary.total) : "R$ 0,00"}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Vendas</p>
            <p className="text-2xl font-black text-gray-900">{summary?.count ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Sales list */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-gray-400" />
          <h2 className="font-semibold text-gray-900 text-sm">Vendas do mês</h2>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}
          </div>
        ) : sales.length === 0 ? (
          <div className="py-16 text-center">
            <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm font-medium">Nenhuma venda neste mês</p>
            <button
              onClick={() => setDialogOpen(true)}
              className="mt-3 text-sm text-red-600 font-semibold hover:underline"
            >
              Registrar primeira venda
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {sales.map(s => (
              <div key={s.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                  <Receipt className="w-4 h-4 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{s.product_name}</p>
                  <p className="text-xs text-gray-400">{s.customer_name} · {new Date(s.sale_date + "T00:00:00").toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-black text-gray-900">{formatPrice(s.amount_paid)}</p>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg">{paymentLabel(s.payment_method)}</span>
                </div>
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={deletingId === s.id}
                  className="p-2 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 transition-colors ml-1 disabled:opacity-50"
                >
                  {deletingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New sale dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-0 shadow-2xl">
          <div className="bg-white rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Registrar venda</h2>
              <button onClick={() => setDialogOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="px-6 py-5 space-y-4">
                <FormInput label="Produto / Modelo" placeholder="iPhone 14 Pro Max 256GB" required
                  error={errors.product_name?.message}
                  {...register("product_name", { required: "Obrigatório" })}
                />
                <FormInput label="Nome do cliente" placeholder="João Silva" required
                  error={errors.customer_name?.message}
                  {...register("customer_name", { required: "Obrigatório" })}
                />
                <FormInput label="WhatsApp do cliente" placeholder="(21) 99999-9999"
                  {...register("customer_whatsapp")}
                />
                <FormInput label="Data da venda" type="date" required
                  error={errors.sale_date?.message}
                  {...register("sale_date", { required: "Obrigatório" })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormInput label="Preço (R$)" type="number" step="0.01" placeholder="3499.00" required
                    error={errors.product_price?.message}
                    {...register("product_price", { required: "Obrigatório" })}
                  />
                  <FormInput label="Valor pago (R$)" type="number" step="0.01" placeholder="3499.00" required
                    error={errors.amount_paid?.message}
                    {...register("amount_paid", { required: "Obrigatório" })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Forma de pagamento</label>
                  <Select defaultValue="pix" onValueChange={v => setValue("payment_method", v)}>
                    <SelectTrigger className="bg-gray-50 border-gray-200 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Observações</label>
                  <textarea
                    {...register("notes")}
                    placeholder="Observações opcionais..."
                    rows={2}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-500/10 transition-all resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
                <button type="button" onClick={() => setDialogOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                  {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
