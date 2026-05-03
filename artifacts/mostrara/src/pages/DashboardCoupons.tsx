import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { useToastSimple } from "@/hooks/useToastSimple";
import { formatPrice } from "@/lib/formatters";
import { TicketPercent, Plus, Trash2, Loader2 } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  active: boolean;
  max_uses?: number | null;
  used_count?: number | null;
  expires_at?: string | null;
}

interface CouponForm {
  code: string;
  type: "percent" | "fixed";
  value: number;
  max_uses?: number;
}

export default function DashboardCoupons() {
  const { token } = useAuth();
  const { success, error } = useToastSimple();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const opts = useMemo(() => ({ token: token ?? undefined }), [token]);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<CouponForm>({
    defaultValues: { type: "percent", value: 10 },
  });

  const load = () => {
    setLoading(true);
    apiFetch<{ coupons: Coupon[] }>("/coupons", opts)
      .then((data) => setCoupons(data.coupons))
      .catch(() => error("Erro ao carregar cupons"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token]);

  const createCoupon = async (data: CouponForm) => {
    try {
      await apiFetch("/coupons", {
        method: "POST",
        ...opts,
        body: JSON.stringify({
          ...data,
          value: Number(data.value),
          max_uses: data.max_uses ? Number(data.max_uses) : null,
          active: true,
        }),
      });
      reset({ type: "percent", value: 10, code: "", max_uses: undefined });
      success("Cupom criado");
      load();
    } catch (e: unknown) {
      error(e instanceof Error ? e.message : "Erro ao criar cupom");
    }
  };

  const removeCoupon = async (id: string) => {
    setBusy(id);
    try {
      await apiFetch(`/coupons/${id}`, { method: "DELETE", ...opts });
      success("Cupom removido");
      load();
    } catch {
      error("Erro ao remover cupom");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cupons</h1>
        <p className="text-sm text-gray-500 mt-1">Crie descontos para o cliente usar na sacola do catalogo.</p>
      </div>

      <form onSubmit={handleSubmit(createCoupon)} className="bg-white border border-gray-200 rounded-2xl p-4 grid gap-3 sm:grid-cols-[1fr_150px_140px_140px_auto]">
        <input {...register("code", { required: true })} placeholder="CODIGO" className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm uppercase" />
        <select {...register("type")} className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
          <option value="percent">Porcentagem</option>
          <option value="fixed">Valor fixo</option>
        </select>
        <input {...register("value", { required: true })} type="number" step="0.01" min="0" placeholder="Valor" className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
        <input {...register("max_uses")} type="number" min="1" placeholder="Usos max." className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
        <button disabled={isSubmitting} className="bg-red-600 text-white rounded-xl px-4 py-2.5 font-bold text-sm flex items-center justify-center gap-2">
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Criar
        </button>
      </form>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-gray-400">Carregando...</div>
        ) : coupons.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <TicketPercent className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            Nenhum cupom criado.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {coupons.map((coupon) => (
              <div key={coupon.id} className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <TicketPercent className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="font-black text-gray-900">{coupon.code}</p>
                  <p className="text-xs text-gray-400">
                    {coupon.type === "percent" ? `${coupon.value}%` : formatPrice(coupon.value)} · usado {coupon.used_count || 0}{coupon.max_uses ? `/${coupon.max_uses}` : ""}
                  </p>
                </div>
                <button onClick={() => removeCoupon(coupon.id)} disabled={busy === coupon.id} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600">
                  {busy === coupon.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
