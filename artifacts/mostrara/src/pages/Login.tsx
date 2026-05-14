import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import {
  LoginPanel,
  RecoverPanel,
  RegisterPanel,
} from "@/components/AuthModal";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type AuthPageTab = "login" | "register" | "recover";

const AUTH_MESSAGES: Record<string, { title: string; description: string }> = {
  disabled: {
    title: "Conta desativada",
    description: "Crie uma nova conta ou fale com o suporte para reativar o acesso.",
  },
  "google-error": {
    title: "Falha no login com Google",
    description: "Nao foi possivel concluir a autenticacao. Tente novamente.",
  },
  "google-invalid": {
    title: "Sessao invalida",
    description: "O retorno do Google expirou ou ficou inconsistente. Inicie o login outra vez.",
  },
  "google-unavailable": {
    title: "Google indisponivel",
    description: "O login com Google nao esta configurado neste ambiente no momento.",
  },
};

function resolveTab(pathname: string, search: string): AuthPageTab {
  const requestedTab = new URLSearchParams(search).get("tab");
  if (requestedTab === "login" || requestedTab === "register" || requestedTab === "recover") {
    return requestedTab;
  }

  if (pathname === "/register") {
    return "register";
  }

  return "login";
}

export default function Login() {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  const [tab, setTab] = useState<AuthPageTab>(() =>
    resolveTab(window.location.pathname, window.location.search),
  );

  useEffect(() => {
    setTab(resolveTab(window.location.pathname, window.location.search));
  }, [location]);

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/dashboard");
    }
  }, [isLoading, navigate, user]);

  const authMessage = useMemo(() => {
    const code = new URLSearchParams(window.location.search).get("auth");
    return code ? AUTH_MESSAGES[code] ?? null : null;
  }, [location]);

  const goToTab = (nextTab: AuthPageTab) => {
    setTab(nextTab);

    if (nextTab === "register") {
      navigate("/register");
      return;
    }

    if (nextTab === "recover") {
      navigate("/login?tab=recover");
      return;
    }

    navigate("/login");
  };

  const handleClose = () => {
    navigate("/");
  };

  const title =
    tab === "login"
      ? "Bem-vindo de volta"
      : tab === "recover"
        ? "Recuperar senha"
        : "Crie sua vitrine";

  const description =
    tab === "login"
      ? "Entre na sua conta para abrir o painel."
      : tab === "recover"
        ? "Receba um link para definir uma nova senha."
        : "Comece a vender agora com sua loja pronta.";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-white">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
          <p className="text-sm text-white/70">Validando sessao...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(220,38,38,0.16),_transparent_32%),linear-gradient(180deg,#09090b_0%,#111827_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <button
          type="button"
          onClick={handleClose}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o inicio
        </button>
        <img
          src="/mostrara-logo.png"
          alt="Mostrara"
          className="hidden h-10 object-contain brightness-0 invert sm:block"
        />
      </div>

      <div className="mx-auto mt-6 grid max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl shadow-black/30 md:grid-cols-[0.92fr_1fr]">
        <div className="relative flex flex-col justify-between overflow-hidden bg-gray-950 px-6 py-8 md:min-h-[720px] md:px-8 md:py-10">
          <div
            className="absolute inset-0 opacity-35 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=1200&q=80')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-950/92 to-red-950/80" />

          <div className="relative z-10">
            <img
              src="/mostrara-logo.png"
              alt="Mostrara"
              className="h-12 w-40 object-contain object-left brightness-0 invert md:h-16 md:w-56"
            />
            <p className="mt-8 text-xs font-bold uppercase tracking-[0.24em] text-red-300">
              Painel do lojista
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
              {title}
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-7 text-gray-300 md:text-base">
              {description}
            </p>

            <div className="mt-8 flex max-w-xs gap-1 rounded-xl bg-white/[0.08] p-1">
              {(["login", "register"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => goToTab(option)}
                  className={cn(
                    "flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                    tab === option
                      ? "bg-white text-gray-950 shadow"
                      : "text-gray-300 hover:text-white",
                  )}
                >
                  {option === "login" ? "Entrar" : "Cadastrar"}
                </button>
              ))}
            </div>
          </div>

          <div className="relative z-10 mt-10 space-y-4 text-sm text-gray-200">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-red-500/15 text-red-200">
                <ShieldCheck className="h-4 w-4" />
              </span>
              Sessao protegida com acesso direto ao painel.
            </div>
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-red-500/15 text-red-200">
                <Check className="h-4 w-4" />
              </span>
              Catalogo, pedidos e configuracoes no mesmo lugar.
            </div>
          </div>
        </div>

        <div className="px-5 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10">
          {authMessage ? (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">{authMessage.title}</p>
              <p className="mt-1 text-amber-800">{authMessage.description}</p>
            </div>
          ) : null}

          {tab === "login" ? (
            <LoginPanel
              onSwitch={() => goToTab("register")}
              onRecover={() => goToTab("recover")}
              onClose={() => navigate("/dashboard")}
            />
          ) : tab === "recover" ? (
            <RecoverPanel onBack={() => goToTab("login")} />
          ) : (
            <RegisterPanel
              onSwitch={() => goToTab("login")}
              onClose={() => navigate("/dashboard")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
