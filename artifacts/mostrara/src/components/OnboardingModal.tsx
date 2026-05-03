import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, ChevronRight, CircleCheck, Loader2, Package, Store, TrendingUp, X } from "lucide-react";

export default function OnboardingModal() {
  const { user, completeOnboarding } = useAuth();
  const [open, setOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [forced, setForced] = useState(false);

  const completed = Boolean(user?.onboarding_completed_at);

  useEffect(() => {
    const handle = () => {
      setForced(true);
      setOpen(true);
    };
    window.addEventListener("mostrara-tutorial-open", handle);
    return () => window.removeEventListener("mostrara-tutorial-open", handle);
  }, []);

  useEffect(() => {
    if (!completed) setForced(false);
  }, [completed]);

  if (!user || (!forced && completed) || !open) return null;

  const finish = async () => {
    setSaving(true);
    try {
      await completeOnboarding();
      setForced(false);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    {
      icon: Store,
      title: "Complete a vitrine",
      text: "Adicione logo, capa, cores e dados da loja para deixar o catálogo com cara de loja real.",
    },
    {
      icon: Package,
      title: "Cadastre produtos",
      text: "Crie produtos com estoque, fotos, preço e status para vender sem depender de planilha.",
    },
    {
      icon: TrendingUp,
      title: "Acompanhe pedidos",
      text: "Todo clique no WhatsApp e toda venda confirmada entra no painel para controle diário.",
    },
  ];

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-white/20">
        <div className="flex items-start justify-between gap-4 p-6 sm:p-7 bg-gradient-to-br from-gray-900 to-gray-800">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.25em] text-red-300 font-semibold">Primeiro acesso</p>
            <h2 className="text-2xl font-black text-white">Bem-vindo à Mostrara</h2>
            <p className="text-sm text-gray-300 max-w-xl">
              Em poucos passos você deixa a loja pronta para operar no dia a dia.
            </p>
          </div>
          <button
          onClick={() => {
            setForced(false);
            setOpen(false);
          }}
          className="text-gray-300 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
          aria-label="Pular tutorial"
        >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 sm:p-7 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.title} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center">
                  <step.icon className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{step.title}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{step.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "Logo e capa aparecem no catálogo",
              "Estoque e vendas ficam centralizados",
              "Link da loja é compartilhável no WhatsApp",
              "Pedidos do WhatsApp entram no painel",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3">
                <CircleCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700">{item}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center pt-2">
            <p className="text-xs text-gray-400 leading-relaxed max-w-xl">
              Depois você encontra os atalhos no painel. Se quiser, pode fechar agora e voltar a qualquer momento.
            </p>
            <button
              onClick={finish}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold px-5 py-3 rounded-xl transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Concluir tutorial
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
