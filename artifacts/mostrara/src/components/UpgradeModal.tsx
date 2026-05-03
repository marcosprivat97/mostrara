import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Crown, Sparkles, Zap, Bot, CreditCard, BadgeCheck, Package, X } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
}

const features = [
  { icon: Package, label: "Produtos ilimitados", desc: "Sem limite de 10 produtos" },
  { icon: Bot, label: "IA Mostrara", desc: "Assistente inteligente para vendas" },
  { icon: CreditCard, label: "Pix via Mercado Pago", desc: "Receba pagamentos direto na conta" },
  { icon: BadgeCheck, label: "Selo de verificado", desc: "Destaque na vitrine" },
  { icon: Zap, label: "Suporte prioritário", desc: "Atendimento mais rápido" },
  { icon: Sparkles, label: "Todas as ferramentas", desc: "Acesso completo ao app" },
];

export default function UpgradeModal({ open, onOpenChange, feature }: UpgradeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-0 shadow-2xl">
        <div className="relative overflow-hidden">
          {/* Premium gradient header */}
          <div className="relative bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 px-6 pt-8 pb-10 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_60%)]" />
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="relative flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black">Mostrara Premium</h2>
                <p className="text-white/80 text-sm">Desbloqueie todo o potencial da sua loja</p>
              </div>
            </div>
            {feature && (
              <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-2.5 text-sm">
                <Sparkles className="w-4 h-4 inline mr-2" />
                <strong>{feature}</strong> é exclusivo do plano Premium
              </div>
            )}
          </div>

          {/* Features list */}
          <div className="px-6 py-6 space-y-3">
            {features.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{f.label}</p>
                  <p className="text-xs text-gray-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Price + CTA */}
          <div className="px-6 pb-6 space-y-4">
            <div className="bg-gradient-to-r from-gray-50 to-amber-50/50 rounded-2xl p-4 border border-amber-100">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-gray-900">R$ 49,99</span>
                <span className="text-sm text-gray-500 font-medium">/mês</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Cancele quando quiser • Sem fidelidade
              </p>
            </div>
            <button
              onClick={() => {
                // TODO: Stripe checkout integration
                window.open("https://wa.me/5521999999999?text=Quero%20assinar%20o%20plano%20Premium%20do%20Mostrara!", "_blank");
                onOpenChange(false);
              }}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 text-sm"
            >
              <Crown className="w-4 h-4" />
              Assinar Premium
            </button>
            <p className="text-center text-xs text-gray-400 mt-2">
              Chame no WhatsApp para liberar o acesso imediato.
            </p>
          </div>
        </div>
      </DialogContent>
      <DialogTitle className="sr-only">Upgrade para Premium</DialogTitle>
      <DialogDescription className="sr-only">Veja os benefícios do plano Premium</DialogDescription>
    </Dialog>
  );
}
