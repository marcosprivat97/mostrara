import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  CakeSlice,
  CheckCircle2,
  Coffee,
  Crown,
  Headphones,
  Lock,
  Menu,
  MessageCircle,
  Pizza,
  Scissors,
  Shield,
  Smartphone,
  Sparkles,
  Star,
  Store,
  Users,
  UtensilsCrossed,
  X,
  Zap,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

const NAV_ITEMS = [
  { href: "#produto", label: "Produto" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#nichos", label: "Nichos" },
  { href: "#precos", label: "Preços" },
  { href: "#faq", label: "FAQ" },
];

const STORE_ITEMS = [
  { icon: Coffee, label: "Acaí" },
  { icon: Pizza, label: "Pizzaria" },
  { icon: Smartphone, label: "Celulares" },
  { icon: UtensilsCrossed, label: "Quentinhas" },
  { icon: Scissors, label: "Manicure" },
  { icon: CakeSlice, label: "Doces" },
  { icon: Crown, label: "Hamburgueria" },
  { icon: Store, label: "Salgados" },
];

const FEATURES = [
  {
    icon: Store,
    title: "Multi-nicho de verdade",
    text: "Cada loja recebe campos, categorias e complementos certos para o seu tipo de negócio.",
  },
  {
    icon: MessageCircle,
    title: "Venda direto no WhatsApp",
    text: "O cliente monta o pedido, escolhe adicionais e envia tudo organizado para o seu atendimento.",
  },
  {
    icon: BarChart3,
    title: "Painel pronto para vender",
    text: "Catálogo, pedidos, cupons, configurações e indicadores reunidos em uma interface única.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Escolha o tipo da loja",
    text: "O cadastro ajusta automaticamente o painel para celular, açaí, pizzaria, hamburgueria, quentinhas, doces ou salão.",
  },
  {
    num: "02",
    title: "Cadastre produtos e extras",
    text: "Preço, fotos, categorias e adicionais entram no fluxo certo para o seu nicho.",
  },
  {
    num: "03",
    title: "Compartilhe o link e venda",
    text: "Sua loja abre no navegador com cara de aplicativo e você acompanha tudo pelo painel.",
  },
];

const TESTIMONIALS = [
  {
    name: "Ana Costa",
    role: "Açaí",
    quote: "Agora eu separo complementos, tamanhos e pedidos sem confusão. A loja parece feita para açaí desde o início.",
    image: "/acaiteria.png",
    loading: "lazy"
  },
  {
    name: "João Mendes",
    role: "Celulares",
    quote: "Meu catálogo ficou com cara de produto profissional, com painel claro e venda rápida no WhatsApp.",
    image: "/loja_celulares.png",
    loading: "lazy"
  },
  {
    name: "Carlos Silva",
    role: "Hamburgueria",
    quote: "Os campos de pães, carnes e adicionais fazem muito sentido. Não parece uma plataforma genérica.",
    image: "/hamburgueria.png",
    loading: "lazy"
  },
];

const HERO_CHIPS = [
  { icon: Shield, label: "Checkout seguro no WhatsApp e Mercado Pago" },
  { icon: Sparkles, label: "Loja visual adaptada para cada nicho" },
  { icon: Smartphone, label: "Painel pensado para celular" },
];

const FAQ_ITEMS = [
  {
    q: "Funciona para qualquer nicho?",
    a: "Sim. O sistema adapta o cadastro e o painel para lojas de celular, açaí, pizzaria, hamburgueria, quentinhas, doces, manicure e outros formatos suportados.",
  },
  {
    q: "O cliente precisa instalar aplicativo?",
    a: "Não. A loja abre direto no navegador com comportamento de app e envia o pedido por WhatsApp.",
  },
  {
    q: "Posso voltar para a landing mesmo logado?",
    a: "Não. Enquanto a conta estiver ativa, o app leva direto para o painel. A landing volta a aparecer quando a sessão for encerrada.",
  },
  {
    q: "Tem adicionais e complementos?",
    a: "Sim. O fluxo aceita complementos por produto e calcula tudo automaticamente no pedido e no total.",
  },
  {
    q: "Preciso pagar para começar?",
    a: "Não. O plano gratuito já inclui catálogo completo, checkout no WhatsApp e painel administrativo. Você só paga se quiser recursos avançados.",
  },
];

function SectionTitle({
  label,
  title,
  text,
  dark = false,
}: {
  label: string;
  title: string;
  text?: string;
  dark?: boolean;
}) {
  return (
    <div className="text-center max-w-3xl mx-auto">
      <div
        className={[
          "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]",
          dark ? "border border-white/10 bg-white/5 text-red-400" : "border border-red-100 bg-red-50 text-red-600",
        ].join(" ")}
      >
        {label}
      </div>
      <h2
        className={[
          "mt-4 font-display text-3xl md:text-5xl font-extrabold tracking-tight",
          dark ? "text-white" : "text-zinc-950",
        ].join(" ")}
      >
        {title}
      </h2>
      {text ? (
        <p
          className={[
            "mt-4 text-base md:text-lg leading-7",
            dark ? "text-zinc-300" : "text-zinc-600",
          ].join(" ")}
        >
          {text}
        </p>
      ) : null}
    </div>
  );
}

export function Landing() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!isLoading && user) navigate("/dashboard");
  }, [isLoading, navigate, user]);

  const heroStats = useMemo(
    () => [
      { value: "500+", label: "Lojas ativas" },
      { value: "12k+", label: "Pedidos por mês" },
      { value: "8", label: "Nichos suportados" },
    ],
    [],
  );

  const primaryAction = () => {
    setMobileMenuOpen(false);
    navigate("/register");
  };

  const secondaryAction = () => {
    setMobileMenuOpen(false);
    navigate("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-white text-zinc-900">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
          <p className="text-sm font-medium text-zinc-500">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-950">
      <header
        className={[
          "fixed inset-x-0 top-0 z-50 border-b transition-all duration-500",
          scrolled
            ? "border-white/10 bg-black/40 shadow-lg shadow-black/10 backdrop-blur-xl"
            : "border-transparent bg-transparent pt-2",
        ].join(" ")}
      >
        <div className="flex h-16 items-center justify-between px-6 sm:px-10 lg:px-14">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-3 group -ml-1"
          >
            <img
              src={encodeURI("/logo.png")}
              alt="Mostrara"
              className="h-10 w-10 rounded-xl object-cover ring-2 ring-white/15 transition-transform group-hover:scale-105"
            />
            <div className="hidden items-baseline gap-2 text-left sm:flex">
              <span className="text-lg font-extrabold tracking-tight text-white">Mostrara</span>
              <span className="text-[13px] font-medium text-white/60">| Loja pronta para vender</span>
            </div>
          </button>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-white/55 transition-all hover:bg-white/[0.06] hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2.5 lg:flex">
            <button
              type="button"
              onClick={secondaryAction}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-[13px] font-semibold text-white/75 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={primaryAction}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-[13px] font-bold text-white shadow-lg shadow-red-600/30 transition-all hover:-translate-y-0.5 hover:bg-red-500"
            >
              Começar grátis
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Abrir menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen ? (
          <div className="mx-4 mt-2 rounded-2xl border border-white/10 bg-zinc-950/90 px-4 pb-4 pt-3 backdrop-blur-2xl lg:hidden">
            <div className="flex flex-col gap-2">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white/80 transition-colors hover:bg-white/[0.08] hover:text-white"
                >
                  {item.label}
                </a>
              ))}
              <button
                type="button"
                onClick={secondaryAction}
                className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-left text-sm font-semibold text-white/80 transition-colors hover:bg-white/[0.08]"
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={primaryAction}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/25"
              >
                Começar grátis
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </header>

      <main className="pb-24 pt-16 lg:pb-0">
        <section className="relative flex min-h-[100dvh] items-center overflow-hidden bg-black text-white lg:min-h-0 lg:block">
          {/* Desktop Video - Senior Optimized with Cloudinary */}
          <video
            className="absolute inset-0 hidden h-full w-full object-cover md:block"
            src="https://res.cloudinary.com/dcztxllda/video/fetch/q_auto:best,f_auto/https://www.mostrara.shop/video%20hero.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="https://res.cloudinary.com/dcztxllda/video/fetch/q_auto,f_jpg,so_0/https://www.mostrara.shop/video%20hero.mp4"
          />
          {/* Mobile Video - High Performance Optimization */}
          <video
            className="absolute inset-0 block h-full w-full object-cover md:hidden"
            src="https://res.cloudinary.com/dcztxllda/video/fetch/w_480,vc_h264,br_500k,q_auto:eco,f_auto/https://www.mostrara.shop/VIDEO%20HERO%20CELULAR.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="https://res.cloudinary.com/dcztxllda/video/fetch/q_auto,f_jpg,so_0,w_480/https://www.mostrara.shop/VIDEO%20HERO%20CELULAR.mp4"
          />
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />

          <div className="relative mx-auto w-full px-4 py-16 sm:px-6 lg:px-8 lg:py-28">
            <div className="flex flex-col items-center justify-center lg:grid lg:grid-cols-[1fr_0.95fr] lg:gap-12">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="flex w-full max-w-[320px] flex-col items-center text-center sm:max-w-lg lg:max-w-2xl lg:items-start lg:text-left"
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] sm:px-4 sm:py-1.5 sm:text-[11px] font-bold uppercase tracking-[0.22em] text-white/80 shadow-sm">
                  <Sparkles className="h-3 sm:h-3.5 w-3 sm:w-3.5 shrink-0" />
                  <span>Catálogo digital para WhatsApp</span>
                </div>
                <h1 className="mt-5 font-display text-[1.75rem] leading-[1.15] font-black tracking-tight text-white sm:text-5xl lg:text-[3.5rem]">
                  Sua loja profissional para vender no WhatsApp
                </h1>
                <p className="mt-4 w-full text-[13px] leading-6 text-white/75 sm:mt-6 sm:text-base sm:leading-8 lg:max-w-xl">
                  Crie uma vitrine elegante e otimizada, com fluxo de pedido pensado para WhatsApp, checkout claro e painel completo para o lojista.
                </p>

                <div className="mt-8 flex w-full flex-col gap-3 sm:mt-10 sm:w-auto sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={primaryAction}
                    className="relative inline-flex w-full items-center justify-center gap-2 rounded-full bg-red-600 px-7 py-4 text-sm font-bold text-white shadow-[0_0_40px_-10px_rgba(220,38,38,0.5)] transition-all hover:-translate-y-0.5 hover:bg-red-500 hover:shadow-[0_0_60px_-15px_rgba(220,38,38,0.7)] sm:w-auto"
                  >
                    Criar loja agora
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={secondaryAction}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-4 text-sm font-semibold text-white transition-colors hover:border-white/30 hover:bg-white/15 sm:w-auto"
                  >
                    Já tenho conta
                  </button>
                </div>

                {/* Social Proof Avatars */}
                <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                  <div className="flex -space-x-3">
                    <img className="inline-block h-10 w-10 rounded-full ring-2 ring-zinc-950 grayscale transition-all hover:grayscale-0" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80" alt="Lojista" />
                    <img className="inline-block h-10 w-10 rounded-full ring-2 ring-zinc-950 grayscale transition-all hover:grayscale-0" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80" alt="Lojista" />
                    <img className="inline-block h-10 w-10 rounded-full ring-2 ring-zinc-950 grayscale transition-all hover:grayscale-0" src="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=100&q=80" alt="Lojista" />
                    <img className="inline-block h-10 w-10 rounded-full ring-2 ring-zinc-950 grayscale transition-all hover:grayscale-0" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" alt="Lojista" />
                  </div>
                  <div className="flex flex-col items-center sm:items-start text-sm">
                    <div className="flex items-center gap-1 text-amber-400">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <Star className="h-3.5 w-3.5 fill-current" />
                    </div>
                    <p className="mt-1 font-medium text-zinc-300">
                      Mais de <span className="font-bold text-white">2.500 lojistas</span> ativos.
                    </p>
                  </div>
                </div>

                <div className="mt-10 flex w-full flex-col gap-3 sm:grid sm:grid-cols-3">
                  {heroStats.map((stat) => (
                    <div key={stat.label} className="flex w-full flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl lg:items-start lg:justify-start">
                      <div className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">{stat.value}</div>
                      <div className="mt-1.5 text-[11px] uppercase tracking-[0.18em] text-center text-white/50 lg:text-left">{stat.label}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex w-full flex-col gap-3 sm:grid sm:grid-cols-3">
                  {HERO_CHIPS.map((item) => (
                    <div key={item.label} className="flex w-full flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-xl shadow-sm sm:flex-row sm:justify-start lg:items-start">
                      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left text-white lg:items-center">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-red-600/20 text-red-200">
                          <item.icon className="h-5 w-5" />
                        </div>
                        <p className="text-sm font-semibold">{item.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.55, delay: 0.08 }}
                className="relative hidden lg:block"
              >
                <div className="rounded-[2.25rem] border border-white/10 bg-white/5 p-1 shadow-2xl shadow-black/30">
                  <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/80 p-6">
                    <div className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-white/10 p-4 text-white sm:flex-row sm:items-center">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-red-400">Painel do lojista</p>
                        <h2 className="mt-2 text-2xl font-black">Açaí da Ana</h2>
                      </div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-600/15 text-red-300">
                        <TrendingUpIcon />
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-3xl bg-white/10 p-4">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-white/60">Faturamento</p>
                        <p className="mt-3 text-3xl font-display font-black text-white">R$ 1.240</p>
                        <p className="mt-2 text-xs text-emerald-300">+12% hoje</p>
                      </div>
                      <div className="rounded-3xl bg-white/10 p-4">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-white/60">Pedidos</p>
                        <p className="mt-3 text-3xl font-display font-black text-white">34</p>
                        <p className="mt-2 text-xs text-white/60">4 aguardando</p>
                      </div>
                    </div>

                    <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-col items-start gap-4 border-b border-white/10 pb-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-white/60">Mensagem pronta</p>
                          <p className="mt-2 text-base font-semibold text-white">Novo pedido via WhatsApp</p>
                        </div>
                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">5 min</span>
                      </div>
                      <div className="mt-4 space-y-3 text-sm text-white/80">
                        {[
                          ["Carlos", "Açaí 500ml + Morango", "R$ 28,90"],
                          ["Juliana", "Barca de Açaí", "R$ 45,00"],
                          ["Roberto", "Copo 300ml", "R$ 18,50"],
                        ].map((item) => (
                          <div key={item[0]} className="flex items-center justify-between gap-2 rounded-3xl bg-black/60 px-3 py-3">
                            <div>
                              <p className="font-semibold text-white">{item[0]}</p>
                              <p className="text-xs text-white/50">{item[1]}</p>
                            </div>
                            <p className="text-sm font-semibold text-white">{item[2]}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Logo Carousel for Credibility */}
            <div className="mt-10 overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 py-5 shadow-xl backdrop-blur-md">
              <div className="mb-5 px-6 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">Plataforma de Confiança</p>
                <p className="mt-1 text-[13px] text-white/70">Integrado com as melhores ferramentas do mercado</p>
              </div>

              {/* Marquee Container */}
              <div className="relative flex w-full overflow-hidden">
                {/* Fade masks for smooth edges */}
                <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 bg-gradient-to-r from-[#0d0d0d] to-transparent sm:w-24" />
                <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-[#0d0d0d] to-transparent sm:w-24" />

                {/* Scrolling Content */}
                <div className="animate-marquee flex w-max">
                  {/* Duplicated set for perfect infinite scroll effect */}
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex shrink-0 items-center gap-10 px-5 sm:gap-16 sm:px-8">
                      {/* Mostrara */}
                      <div className="flex items-center gap-2.5 transition-transform hover:scale-105">
                        <img src={encodeURI("/LOGOTIPO DO SITE.png")} alt="Mostrara" className="h-9 w-9 rounded-lg object-cover ring-1 ring-white/20" />
                        <span className="text-[17px] font-black tracking-tight text-white">Mostrara</span>
                      </div>

                      {/* WhatsApp */}
                      <div className="flex items-center gap-2.5 transition-transform hover:scale-105">
                        <img src={encodeURI("/wpp.png")} alt="WhatsApp" className="h-8 w-8" />
                        <span className="text-[15px] font-bold text-white">WhatsApp</span>
                      </div>

                      {/* Mercado Pago */}
                      <div className="flex items-center gap-2.5 transition-transform hover:scale-105">
                        <img src={encodeURI("/mp.png")} alt="Mercado Pago" className="h-8 w-8" />
                        <span className="text-[15px] font-bold text-white">Mercado Pago</span>
                      </div>

                      {/* Pix */}
                      <div className="flex items-center gap-2.5 transition-transform hover:scale-105">
                        <img src={encodeURI("/pix.png")} alt="Pix" className="h-7 w-7" />
                        <span className="text-[15px] font-bold text-white">Pix</span>
                      </div>

                      {/* Google */}
                      <div className="flex items-center gap-2.5 transition-transform hover:scale-105">
                        <img src={encodeURI("/google.png")} alt="Google" className="h-7 w-7" />
                        <span className="text-[15px] font-bold text-white">Google</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="nichos" className="border-y border-white/5 bg-zinc-950 py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap justify-center gap-3">
              {STORE_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="group flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-red-500/30 hover:bg-white/10 hover:shadow-lg hover:shadow-red-600/10"
                >
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-red-500/10 text-red-400 transition-colors group-hover:bg-red-600 group-hover:text-white">
                    <item.icon className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-sm font-semibold text-zinc-400 group-hover:text-white">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="produto" className="relative bg-zinc-950 py-20">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/10 via-zinc-950 to-zinc-950" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionTitle
              label="Produto"
              title="Um sistema feito sob medida para o seu negócio"
              text="O layout continua elegante, mas os campos e o fluxo se ajustam ao tipo de loja. Nada de cadastro solto — tudo pensado para converter."
              dark
            />

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {FEATURES.map((item, idx) => (
                <div
                  key={item.title}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-7 shadow-sm transition-all hover:-translate-y-1 hover:border-red-500/30 hover:bg-white/10 hover:shadow-xl hover:shadow-red-600/10"
                >
                  <div className="absolute -right-4 -top-4 text-[5rem] font-black leading-none text-white/[0.03] select-none">{String(idx + 1).padStart(2, "0")}</div>
                  <div className="relative">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-600/20">
                      <item.icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-xl font-extrabold tracking-tight text-white">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-[14px] leading-7 text-zinc-400">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="bg-zinc-950 py-20 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionTitle
              label="Como funciona"
              title="Três passos para começar a vender"
              text="Sem página confusa, sem tela branca e sem fluxo escondido."
              dark
            />

            <div className="mt-12 grid gap-5 lg:grid-cols-4 lg:grid-rows-2">
              {/* Card 1: Nichos (Large, spans 2 cols, 2 rows) */}
              <div className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-8 transition-all hover:border-red-500/30 hover:shadow-xl hover:shadow-red-600/10 lg:col-span-2 lg:row-span-2">
                <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative z-10 flex h-full flex-col">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-white ring-1 ring-white/10">
                    <span className="text-xl font-black">1</span>
                  </div>
                  <h3 className="mt-6 text-2xl font-extrabold tracking-tight text-white">A loja que entende você</h3>
                  <p className="mt-3 max-w-sm text-[15px] leading-7 text-zinc-400">
                    Esqueça sistemas complicados. Seja você uma hamburgueria, loja de roupas ou eletrônicos, a plataforma se molda sozinha para destacar o que você vende de melhor.
                  </p>
                  <div className="mt-8 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d] p-6 shadow-2xl">
                    <div className="flex flex-wrap gap-3">
                      <div className="flex h-10 items-center justify-center rounded-xl bg-red-600 px-4 text-xs font-bold text-white shadow-lg shadow-red-600/20">🍔 Food Delivery</div>
                      <div className="flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-semibold text-zinc-400">👗 Vestuário</div>
                      <div className="flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-semibold text-zinc-400">📱 Eletrônicos</div>
                    </div>
                    <div className="mt-8 space-y-4 opacity-30">
                      <div className="h-4 w-1/2 rounded-full bg-white/20" />
                      <div className="h-4 w-3/4 rounded-full bg-white/20" />
                      <div className="h-4 w-2/3 rounded-full bg-white/20" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Produtos (Spans 2 cols, 1 row) */}
              <div className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-8 transition-all hover:border-red-500/30 hover:shadow-xl hover:shadow-red-600/10 lg:col-span-2">
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-red-600/5 opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative z-10 flex h-full flex-col justify-between gap-6 sm:flex-row sm:items-center">
                  <div>
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white ring-1 ring-white/10">
                      <span className="font-black">2</span>
                    </div>
                    <h3 className="mt-5 text-xl font-extrabold tracking-tight text-white">Cadastre com facilidade</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      Gestão completa de fotos, complementos e tamanhos.
                    </p>
                  </div>
                  <div className="flex w-32 flex-col gap-3 rounded-xl border border-white/10 bg-[#0d0d0d] p-4 shadow-2xl sm:w-40">
                    <div className="aspect-square rounded-lg bg-zinc-800" />
                    <div className="h-2 w-full rounded-full bg-white/20" />
                    <div className="h-2 w-2/3 rounded-full bg-red-500/50" />
                  </div>
                </div>
              </div>

              {/* Card 3: Venda (Spans 2 cols, 1 row) */}
              <div className="group relative overflow-hidden rounded-[2rem] border border-red-500/20 bg-gradient-to-br from-red-600/10 to-transparent p-8 transition-all hover:border-red-500/40 hover:shadow-xl hover:shadow-red-600/20 lg:col-span-2">
                <div className="relative z-10 flex h-full flex-col justify-between gap-6 sm:flex-row sm:items-center">
                  <div>
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white shadow-lg shadow-red-600/30">
                      <span className="font-black">3</span>
                    </div>
                    <h3 className="mt-5 text-xl font-extrabold tracking-tight text-white">Venda no automático</h3>
                    <p className="mt-2 text-sm leading-6 text-red-200/80">
                      O cliente compra sozinho e o pedido chega pronto no WhatsApp.
                    </p>
                  </div>
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-green-500/30 bg-green-500/10 text-green-400 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                    <img src={encodeURI("/wpp.png")} alt="WhatsApp" className="h-8 w-8 transition-transform group-hover:scale-110 group-hover:rotate-6" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative bg-zinc-950 py-20">
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionTitle
              label="Depoimentos"
              title="Quem usa, recomenda"
              text="Veja o que lojistas reais estão dizendo sobre a experiência com a Mostrara."
              dark
            />

            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {TESTIMONIALS.map((item) => (
                <div key={item.name} className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-sm transition-all hover:-translate-y-1 hover:border-red-500/30 hover:shadow-xl hover:shadow-red-600/10">
                  <div className="relative h-48">
                    <img
                      src={item.image}
                      alt={item.role}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                    <div className="absolute bottom-4 left-4 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
                      {item.role}
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex gap-1 text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-current" />
                      ))}
                    </div>
                    <div className="relative mt-4">
                      <span className="absolute -left-1 -top-3 text-4xl font-black text-white/5 select-none">“</span>
                      <p className="pl-4 text-[14px] italic leading-7 text-zinc-300">{item.quote}</p>
                    </div>
                    <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
                      <div>
                        <div className="text-sm font-bold text-white">{item.name}</div>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          Lojista verificado
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="precos" className="border-t border-white/5 bg-zinc-950 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionTitle
              label="Preços"
              title="Comece grátis, evolua quando quiser"
              text="A estrutura de cadastro, vitrine e painel já nasce pronta para escalar o seu negócio."
              dark
            />

            <div className="mt-12 grid gap-5 lg:grid-cols-2">
              {[
                {
                  name: "Gratuito",
                  price: "R$ 0",
                  period: "para sempre",
                  highlight: false,
                  features: ["1 loja ativa", "Catálogo completo", "Checkout no WhatsApp", "Suporte essencial"],
                },
                {
                  name: "Pro",
                  price: "R$ 49",
                  period: "por mes",
                  highlight: true,
                  features: ["Lojas ilimitadas", "Campos avançados por nicho", "Complementos e adicionais", "Relatórios completos"],
                },
              ].map((plan) => (
                <div
                  key={plan.name}
                  className={[
                    "relative overflow-hidden rounded-[2rem] p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-red-600/10",
                    plan.highlight
                      ? "border border-red-500/30 bg-gradient-to-b from-red-950/20 to-zinc-950 text-white"
                      : "border border-white/10 bg-white/5 text-white",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
                        {plan.name}
                      </div>
                      <div className="mt-4 flex items-end gap-2">
                        <div className="font-display text-5xl font-extrabold tracking-tight text-white">
                          {plan.price}
                        </div>
                        <div className="pb-1 text-sm text-zinc-500">/{plan.period}</div>
                      </div>
                    </div>
                    {plan.highlight ? (
                      <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white shadow-lg shadow-red-600/30 ring-2 ring-red-400/20">
                        ⭐ Recomendado
                      </span>
                    ) : null}
                  </div>

                  <ul className="mt-8 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-sm">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={primaryAction}
                    className={[
                      "relative mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold transition-all",
                      plan.highlight
                        ? "bg-red-600 text-white shadow-[0_0_30px_-5px_rgba(220,38,38,0.4)] hover:bg-red-500 hover:shadow-[0_0_40px_-5px_rgba(220,38,38,0.5)]"
                        : "bg-white/10 text-white hover:bg-white/20",
                    ].join(" ")}
                  >
                    {plan.highlight ? "Começar no Pro" : "Começar grátis"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <p className="mt-4 text-center text-[11px] text-zinc-400">
                    Sem fidelidade • Cancele quando quiser
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Selos de Confiança */}
        <section className="bg-zinc-950 py-14">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { icon: Lock, label: "Dados protegidos", text: "Criptografia ponta a ponta" },
                { icon: Shield, label: "Checkout seguro", text: "Pagamento via WhatsApp" },
                { icon: Zap, label: "Sem fidelidade", text: "Cancele quando quiser" },
                { icon: Headphones, label: "Suporte humano", text: "Atendimento real e rápido" },
              ].map((seal) => (
                <div key={seal.label} className="flex flex-col items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 text-center">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-600/10 text-red-400">
                    <seal.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{seal.label}</p>
                    <p className="mt-1 text-[12px] text-zinc-500">{seal.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="border-t border-white/5 bg-zinc-950 py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <SectionTitle
              label="FAQ"
              title="Perguntas frequentes"
              text="As dúvidas mais comuns dos lojistas respondidas de forma direta."
              dark
            />

            <Accordion type="single" collapsible className="mt-10 space-y-3">
              {FAQ_ITEMS.map((item, index) => (
                <AccordionItem
                  key={item.q}
                  value={`faq-${index}`}
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 transition-all hover:border-red-500/30 hover:bg-white/10"
                >
                  <AccordionTrigger className="py-5 text-left text-base font-semibold text-white hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-sm leading-7 text-zinc-400">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section className="bg-zinc-950 py-20 text-white">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-red-400">
              <Shield className="h-3.5 w-3.5" />
              Pronto para produção
            </div>
            <h2 className="mt-6 font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
              Comece a vender hoje mesmo
            </h2>
            <p className="mt-5 text-[15px] leading-7 text-zinc-400 sm:text-base sm:leading-8">
              Crie sua conta gratuita e tenha sua loja pronta em minutos. Sem cartão de crédito.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={primaryAction}
                className="inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-600/25 transition-transform hover:-translate-y-0.5 hover:bg-red-700"
              >
                Criar minha loja grátis
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={secondaryAction}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white hover:bg-white/10"
              >
                Já tenho conta
              </button>
            </div>
            <div className="mt-6 text-xs text-zinc-500">
              Sessão salva no aparelho quando o usuário marcar "manter conectado".
            </div>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-white/10 bg-[#0a0a0a] pt-20 pb-10 text-white overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[800px] h-[200px] bg-red-600/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-12 xl:grid-cols-5 xl:gap-8">
            {/* Brand Column */}
            <div className="xl:col-span-2">
              <div className="flex items-center gap-3">
                <img src={encodeURI("/LOGOTIPO DO SITE.png")} alt="Mostrara" className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/10" />
                <span className="text-2xl font-bold tracking-tight">Mostrara</span>
              </div>
              <p className="mt-6 max-w-sm text-[15px] leading-7 text-zinc-400">
                A infraestrutura definitiva para quem vende no WhatsApp. Transforme seu negócio com um catálogo inteligente, painel de gestão e checkout automático.
              </p>

              {/* Trust Badges - Sleek version */}
              <div className="mt-8 flex flex-col gap-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">Integrações Oficiais</p>
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 transition-colors hover:bg-white/10 hover:border-white/20">
                    <img src={encodeURI("/wpp.png")} alt="WhatsApp" className="h-5 w-5 object-contain" />
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 transition-colors hover:bg-white/10 hover:border-white/20">
                    <img src={encodeURI("/mp.png")} alt="Mercado Pago" className="h-5 w-5 object-contain grayscale hover:grayscale-0 transition-all" />
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 transition-colors hover:bg-white/10 hover:border-white/20">
                    <img src={encodeURI("/pix.png")} alt="Pix" className="h-5 w-5 object-contain grayscale hover:grayscale-0 transition-all" />
                  </div>
                </div>
              </div>
            </div>

            {/* Links Columns */}
            <div className="grid grid-cols-2 gap-8 xl:col-span-3 sm:grid-cols-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Produto</h3>
                <ul className="mt-6 space-y-4">
                  <li><a href="#funcionalidades" className="text-sm text-zinc-400 transition-colors hover:text-red-400">Funcionalidades</a></li>
                  <li><a href="#nichos" className="text-sm text-zinc-400 transition-colors hover:text-red-400">Nichos Suportados</a></li>
                  <li><a href="#precos" className="text-sm text-zinc-400 transition-colors hover:text-red-400">Preços</a></li>
                  <li><a href="#faq" className="text-sm text-zinc-400 transition-colors hover:text-red-400">Dúvidas Frequentes</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Soluções</h3>
                <ul className="mt-6 space-y-4">
                  <li><a href="#" className="text-sm text-zinc-400 transition-colors hover:text-red-400">Para Restaurantes</a></li>
                  <li><a href="#" className="text-sm text-zinc-400 transition-colors hover:text-red-400">Para Lojas de Roupas</a></li>
                  <li><a href="#" className="text-sm text-zinc-400 transition-colors hover:text-red-400">Para Eletrônicos</a></li>
                  <li><a href="#" className="text-sm text-zinc-400 transition-colors hover:text-red-400">Para Serviços</a></li>
                </ul>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <h3 className="text-sm font-semibold text-white">Legal & Contato</h3>
                <ul className="mt-6 space-y-4">
                  <li><a href="#" className="text-sm text-zinc-400 transition-colors hover:text-red-400">Termos de Uso</a></li>
                  <li><a href="#" className="text-sm text-zinc-400 transition-colors hover:text-red-400">Privacidade</a></li>
                  <li><a href="#" className="text-sm text-zinc-400 transition-colors hover:text-red-400">Falar com Suporte</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-16 flex flex-col items-center justify-between gap-6 border-t border-white/10 pt-8 sm:flex-row">
            <p className="text-sm text-zinc-500">
              © {new Date().getFullYear()} Mostrara Tecnologia. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-5">
              <a href="#" className="text-zinc-500 transition-colors hover:text-white" aria-label="Instagram">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="#" className="text-zinc-500 transition-colors hover:text-white" aria-label="Twitter">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

function TrendingUpIcon() {
  return <BarChart3 className="h-4 w-4" />;
}

export default Landing;
