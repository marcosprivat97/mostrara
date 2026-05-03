import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Link2, ShoppingBag, BarChart2, MessageCircle,
  Smartphone, CheckCircle2, TrendingUp, ArrowRight, Store, Zap,
} from "lucide-react";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/contexts/AuthContext";

export default function Landing() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("register");
  const [, navigate] = useLocation();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) navigate("/dashboard");
  }, [user, isLoading]);

  if (isLoading || user) return null;

  const features = [
    {
      icon: Link2,
      label: "Vitrine própria",
      title: "Seu link. Sua identidade.",
      desc: "Cada loja tem um link exclusivo para compartilhar onde quiser — grupos, Instagram, status.",
    },
    {
      icon: Smartphone,
      label: "Catálogo profissional",
      title: "Fotos, specs e preços",
      desc: "Cadastre modelos com fotos, armazenamento, condição e bateria. Tudo que o cliente precisa saber.",
    },
    {
      icon: MessageCircle,
      label: "WhatsApp nativo",
      title: "Pedido formatado no zap",
      desc: "O cliente escolhe, preenche os dados e o pedido chega completo direto no seu WhatsApp.",
    },
    {
      icon: TrendingUp,
      label: "Controle de vendas",
      title: "Faturamento por mês",
      desc: "Registre cada venda com cliente e valor pago. Histórico mensal completo.",
    },
    {
      icon: BarChart2,
      label: "Painel intuitivo",
      title: "Tudo em um só lugar",
      desc: "Gerencie estoque, visualize métricas e controle vendas sem planilha.",
    },
    {
      icon: ShoppingBag,
      label: "Formas de pagamento",
      title: "Pix, dinheiro ou cartão",
      desc: "O cliente escolhe como pagar na hora do pedido. Simples para ele, fácil para você.",
    },
  ];

  const steps = [
    { n: "01", title: "Crie sua conta", sub: "Gratuito, em 2 minutos" },
    { n: "02", title: "Cadastre os produtos", sub: "Com fotos e detalhes" },
    { n: "03", title: "Compartilhe o link", sub: "Grupos, redes, status" },
    { n: "04", title: "Receba pedidos", sub: "Direto no WhatsApp" },
  ];

  const fadeUp = {
    hidden: { opacity: 0, y: 28 },
    show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
              <Store className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-gray-900">VitrinePro</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setAuthTab("login"); setAuthOpen(true); }}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-4 py-2"
            >
              Entrar
            </button>
            <button
              onClick={() => { setAuthTab("register"); setAuthOpen(true); }}
              className="text-sm font-semibold bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Começar grátis
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" animate="show" className="text-center">
            <motion.div
              custom={0} variants={fadeUp}
              className="inline-flex items-center gap-2 bg-red-50 text-red-700 text-xs font-semibold px-4 py-2 rounded-full mb-8 border border-red-100"
            >
              <Zap className="w-3.5 h-3.5" />
              Plataforma para lojistas de celular no Rio
            </motion.div>

            <motion.h1
              custom={1} variants={fadeUp}
              className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 tracking-tight leading-[1.06] mb-6"
            >
              Sua vitrine digital
              <br />
              <span className="text-red-600">no WhatsApp</span>
            </motion.h1>

            <motion.p
              custom={2} variants={fadeUp}
              className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              Crie seu catálogo de iPhones e celulares em minutos.
              Compartilhe o link, receba pedidos formatados direto no zap.
            </motion.p>

            <motion.div custom={3} variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => { setAuthTab("register"); setAuthOpen(true); }}
                className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-base px-8 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-red-600/20"
              >
                Criar minha vitrine grátis
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setAuthTab("login"); setAuthOpen(true); }}
                className="inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-base px-8 py-3.5 rounded-xl transition-colors"
              >
                Já tenho conta
              </button>
            </motion.div>

            <motion.p custom={4} variants={fadeUp} className="text-sm text-gray-400 mt-5">
              Sem cartão de crédito · Sem taxa de setup · Começa em 2 min
            </motion.p>
          </motion.div>

          {/* Hero visual */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="mt-20 relative"
          >
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 p-6 shadow-xl">
              {/* Mock dashboard preview */}
              <div className="flex gap-4 h-64">
                {/* Sidebar mock */}
                <div className="w-48 bg-gray-900 rounded-xl p-4 flex flex-col gap-2 flex-shrink-0">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-red-600 rounded-lg" />
                    <div className="w-20 h-2.5 bg-white/20 rounded" />
                  </div>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={`h-8 rounded-lg flex items-center gap-2 px-3 ${i === 0 ? 'bg-red-600/20' : 'bg-white/5'}`}>
                      <div className={`w-3 h-3 rounded ${i === 0 ? 'bg-red-400' : 'bg-white/20'}`} />
                      <div className={`h-2 rounded ${i === 0 ? 'bg-white/50 w-16' : 'bg-white/15 w-12'}`} />
                    </div>
                  ))}
                </div>
                {/* Main content mock */}
                <div className="flex-1 flex flex-col gap-3">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Produtos", val: "47", color: "text-red-600" },
                      { label: "Vendas", val: "12", color: "text-gray-900" },
                      { label: "Faturamento", val: "R$47k", color: "text-gray-900" },
                    ].map((s, i) => (
                      <div key={i} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                        <p className="text-[10px] text-gray-400 font-medium">{s.label}</p>
                        <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.val}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 bg-white rounded-xl border border-gray-100 p-3 shadow-sm overflow-hidden">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex-shrink-0" />
                        <div className="flex-1">
                          <div className="h-2 bg-gray-200 rounded w-32 mb-1.5" />
                          <div className="h-1.5 bg-gray-100 rounded w-20" />
                        </div>
                        <div className="w-12 h-2 bg-red-100 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -inset-4 bg-red-600/5 rounded-3xl blur-2xl -z-10" />
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <p className="text-sm font-semibold text-red-600 uppercase tracking-widest mb-3">Funcionalidades</p>
            <h2 className="text-4xl font-bold text-gray-900 tracking-tight">Tudo que você precisa</h2>
            <p className="text-gray-500 mt-3 text-lg max-w-xl mx-auto">Ferramentas pensadas para o lojista de celular que quer vender mais e trabalhar menos.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.5 }}
                className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-red-200 hover:shadow-lg hover:shadow-red-600/5 transition-all duration-300 group"
              >
                <div className="w-11 h-11 rounded-xl bg-red-50 group-hover:bg-red-100 flex items-center justify-center mb-4 transition-colors">
                  <f.icon className="w-5 h-5 text-red-600" />
                </div>
                <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">{f.label}</span>
                <h3 className="text-lg font-bold text-gray-900 mt-1 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <p className="text-sm font-semibold text-red-600 uppercase tracking-widest mb-3">Como funciona</p>
            <h2 className="text-4xl font-bold text-gray-900 tracking-tight">Em 4 passos simples</h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-gray-900 text-white flex items-center justify-center mx-auto mb-4 text-xl font-black">
                  {s.n}
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-gray-900">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
          >
            <div className="w-14 h-14 rounded-2xl bg-red-600 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">
              Pronto para vender mais?
            </h2>
            <p className="text-gray-400 text-lg mb-8">
              Crie sua vitrine agora e comece a receber pedidos ainda hoje.
            </p>
            <button
              onClick={() => { setAuthTab("register"); setAuthOpen(true); }}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-base px-8 py-4 rounded-xl transition-colors shadow-xl shadow-red-900/30"
            >
              Criar minha vitrine grátis
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-gray-900 border-t border-gray-800">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-red-600 flex items-center justify-center">
              <Store className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white text-sm">VitrinePro</span>
          </div>
          <p className="text-gray-500 text-sm">© {new Date().getFullYear()} VitrinePro. Feito para lojistas do Rio.</p>
        </div>
      </footer>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} defaultTab={authTab} />
    </div>
  );
}
