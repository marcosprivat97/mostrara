import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { useToastSimple } from "@/hooks/useToastSimple";
import { MessageSquare, Loader2 } from "lucide-react";

interface Ticket {
  id: string;
  type: string;
  title: string;
  message: string;
  status: string;
  admin_note?: string;
  created_at: string;
}

interface TicketForm {
  type: string;
  title: string;
  message: string;
}

export default function DashboardSupport() {
  const { token } = useAuth();
  const { success, error } = useToastSimple();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const opts = useMemo(() => ({ token: token ?? undefined }), [token]);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<TicketForm>({
    defaultValues: { type: "melhoria" },
  });

  const load = () => {
    setLoading(true);
    apiFetch<{ tickets: Ticket[] }>("/support", opts)
      .then((data) => setTickets(data.tickets))
      .catch(() => error("Erro ao carregar suporte"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [token]);

  const submit = async (data: TicketForm) => {
    try {
      await apiFetch("/support", { method: "POST", ...opts, body: JSON.stringify(data) });
      reset({ type: "melhoria", title: "", message: "" });
      success("Mensagem enviada");
      load();
    } catch (e: unknown) {
      error(e instanceof Error ? e.message : "Erro ao enviar");
    }
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Suporte</h1>
        <p className="text-sm text-gray-500 mt-1">Reporte erro, ideia ou melhoria direto para o painel dev.</p>
      </div>
      <form onSubmit={handleSubmit(submit)} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
        <select {...register("type")} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
          <option value="erro">Erro</option>
          <option value="melhoria">Melhoria</option>
          <option value="duvida">Duvida</option>
          <option value="financeiro">Financeiro</option>
        </select>
        <input {...register("title", { required: true })} placeholder="Titulo" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
        <textarea {...register("message", { required: true })} rows={5} placeholder="Explique o que aconteceu ou a melhoria que voce quer" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none" />
        <button disabled={isSubmitting} className="bg-red-600 text-white rounded-xl px-5 py-2.5 font-bold text-sm flex items-center gap-2">
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
          Enviar
        </button>
      </form>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {loading ? <div className="p-6 text-sm text-gray-400">Carregando...</div> : tickets.map((ticket) => (
          <div key={ticket.id} className="p-4 border-b border-gray-100 last:border-b-0">
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-gray-900">{ticket.title}</p>
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-600">{ticket.status}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">{ticket.message}</p>
            {ticket.admin_note && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-3 mt-3">{ticket.admin_note}</p>}
          </div>
        ))}
        {!loading && tickets.length === 0 && <div className="p-10 text-center text-gray-400">Nenhuma mensagem enviada.</div>}
      </div>
    </div>
  );
}
