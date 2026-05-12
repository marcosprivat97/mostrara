import { useEffect, useMemo, useState, forwardRef } from "react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Loader2, LogIn, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { STORE_TYPE_OPTIONS } from "@/lib/store-types";

interface LoginForm {
  email: string;
  password: string;
}

interface RegisterForm {
  store_name: string;
  store_slug: string;
  owner_name: string;
  email: string;
  password: string;
  phone: string;
  whatsapp: string;
  store_type: string;
  city: string;
}

interface RecoverForm {
  email: string;
}

const Field = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    error?: string;
    icon?: React.ReactNode;
  }
>(({ label, error, icon, type, className, ...props }, ref) => {
  const [showPass, setShowPass] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>
        )}
        <input
          {...props}
          ref={ref}
          type={isPassword ? (showPass ? "text" : "password") : type}
          className={cn(
            "w-full bg-gray-50 border text-gray-900 placeholder-gray-400 rounded-xl px-3.5 py-2.5 text-sm transition-all outline-none",
            "focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/10",
            error ? "border-red-300 bg-red-50/30" : "border-gray-200 hover:border-gray-300",
            icon && "pl-9",
            isPassword && "pr-10",
            className,
          )}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
});

Field.displayName = "Field";

function GoogleButton() {
  return (
    <button
      type="button"
      onClick={() => {
        window.location.href = "/api/auth/google/start";
      }}
      className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-800 font-semibold py-3 rounded-xl transition-all shadow-sm"
    >
      <LogIn className="w-4 h-4" />
      Entrar com Google
    </button>
  );
}

function LoginPanel({
  onSwitch,
  onRecover,
  onClose,
}: {
  onSwitch: () => void;
  onRecover: () => void;
  onClose: () => void;
}) {
  const { login } = useAuth();
  const [remember, setRemember] = useState(true);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password, remember);
      onClose();
    } catch (e: unknown) {
      setError("root", { message: e instanceof Error ? e.message : "Erro ao entrar" });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <GoogleButton />
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-[11px] uppercase tracking-[0.2em] text-gray-400 font-semibold">ou</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>
      <Field
        label="E-mail"
        type="email"
        placeholder="seu@email.com"
        error={errors.email?.message}
        autoComplete="email"
        {...register("email", { required: "E-mail obrigatório" })}
      />
      <Field
        label="Senha"
        type="password"
        placeholder="••••••••"
        error={errors.password?.message}
        autoComplete="current-password"
        {...register("password", { required: "Senha obrigatória" })}
      />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
          <span
            className={cn(
              "w-4 h-4 rounded border flex items-center justify-center transition-colors",
              remember ? "bg-red-600 border-red-600 text-white" : "bg-white border-gray-300",
            )}
          >
            {remember && <Check className="w-3 h-3" />}
          </span>
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="sr-only"
          />
          Manter conectado
        </label>
        <span className="text-xs text-gray-400">Entrar direto neste aparelho</span>
      </div>
      {errors.root && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 font-medium">
          {errors.root.message}
        </p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Entrando...
          </>
        ) : (
          "Entrar (Versão Render)"
        )}
      </button>
      <div className="flex items-center justify-between gap-3 text-sm">
        <button
          type="button"
          onClick={onRecover}
          className="text-gray-500 hover:text-gray-800 font-medium"
        >
          Esqueci minha senha
        </button>
        <button
          type="button"
          onClick={onSwitch}
          className="text-red-600 font-semibold hover:underline inline-flex items-center gap-1"
        >
          Criar agora <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </form>
  );
}

function RegisterPanel({ onSwitch, onClose }: { onSwitch: () => void; onClose: () => void }) {
  const { register: registerUser } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterForm>({ defaultValues: { city: "Rio de Janeiro", store_type: "celulares" } });

  const onSubmit = async (data: RegisterForm) => {
    try {
      await registerUser(data);
      onClose();
    } catch (e: unknown) {
      setError("root", { message: e instanceof Error ? e.message : "Erro ao cadastrar" });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Nome da loja"
          placeholder="Minha Loja"
          error={errors.store_name?.message}
          autoComplete="organization"
          {...register("store_name", { required: "Obrigatório" })}
        />
        <Field
          label="Seu nome"
          placeholder="João Silva"
          error={errors.owner_name?.message}
          autoComplete="name"
          {...register("owner_name", { required: "Obrigatório" })}
        />
      </div>
      <Field
        label="E-mail"
        type="email"
        placeholder="seu@email.com"
        error={errors.email?.message}
        autoComplete="email"
        {...register("email", { required: "Obrigatório" })}
      />
      <Field
        label="Senha"
        type="password"
        placeholder="Mínimo 6 caracteres"
        error={errors.password?.message}
        autoComplete="new-password"
        {...register("password", {
          required: "Obrigatório",
          minLength: { value: 6, message: "Mínimo 6 caracteres" },
        })}
      />
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Tipo de loja
        </label>
        <select
          className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/10"
          {...register("store_type", { required: "Obrigatorio" })}
        >
          {STORE_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Telefone"
          placeholder="(21) 99999-9999"
          error={errors.phone?.message}
          autoComplete="tel"
          {...register("phone", { required: "Obrigatório" })}
        />
        <Field
          label="WhatsApp"
          placeholder="(21) 99999-9999"
          error={errors.whatsapp?.message}
          autoComplete="tel"
          {...register("whatsapp", { required: "Obrigatório" })}
        />
      </div>
      <Field
        label="Cidade"
        placeholder="Rio de Janeiro"
        {...register("city")}
      />
      {errors.root && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 font-medium">
          {errors.root.message}
        </p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-1"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Criando conta...
          </>
        ) : (
          "Criar conta grátis"
        )}
      </button>
      <p className="text-center text-sm text-gray-500">
        Já tem conta?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="text-red-600 font-semibold hover:underline"
        >
          Entrar
        </button>
      </p>
    </form>
  );
}

function RecoverPanel({ onBack }: { onBack: () => void }) {
  const { requestPasswordReset } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<RecoverForm>();
  const [sent, setSent] = useState<string | null>(null);

  const onSubmit = async (data: RecoverForm) => {
    try {
      const debugUrl = await requestPasswordReset(data.email);
      setSent(debugUrl ?? "sent");
      reset();
    } catch (e: unknown) {
      setError("root", { message: e instanceof Error ? e.message : "Erro ao enviar recuperação" });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>
      <Field
        label="E-mail da conta"
        type="email"
        placeholder="seu@email.com"
        error={errors.email?.message}
        autoComplete="email"
        {...register("email", { required: "E-mail obrigatório" })}
      />
      {errors.root && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 font-medium">
          {errors.root.message}
        </p>
      )}
      {sent && (
        <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 font-medium">
          {sent === "sent" ? "Link de recuperação enviado. Verifique seu e-mail." : "Link de recuperação gerado em modo de teste."}
        </div>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
          </>
        ) : (
          "Enviar link"
        )}
      </button>
      <p className="text-xs text-gray-400 leading-relaxed">
        Se o e-mail estiver cadastrado, você receberá um link para definir uma nova senha.
      </p>
    </form>
  );
}

export default function AuthModal({
  open,
  onClose,
  defaultTab = "login",
}: {
  open: boolean;
  onClose: () => void;
  defaultTab?: "login" | "register";
}) {
  const [tab, setTab] = useState<"login" | "register" | "recover">(defaultTab);

  useEffect(() => {
    if (open) setTab(defaultTab);
  }, [defaultTab, open]);

  const title = useMemo(() => {
    if (tab === "login") return "Bem-vindo de volta";
    if (tab === "recover") return "Recuperar senha";
    return "Crie sua vitrine";
  }, [tab]);

  const description = useMemo(() => {
    if (tab === "login") return "Entre na sua conta";
    if (tab === "recover") return "Receba um link para redefinir sua senha";
    return "Comece a vender agora, é grátis";
  }, [tab]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[920px] w-[95vw] sm:w-full max-h-[90dvh] p-0 overflow-hidden border-0 shadow-2xl bg-transparent flex flex-col">
        <div className="grid md:grid-cols-[0.92fr_1fr] bg-white rounded-2xl flex-1 overflow-y-auto md:overflow-hidden">
          <div className="relative bg-gray-950 px-6 py-8 md:px-8 md:py-7 md:min-h-[260px] flex flex-col justify-between overflow-hidden shrink-0">
            <div
              className="absolute inset-0 opacity-35 bg-cover bg-center"
              style={{ backgroundImage: "url('https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=900&q=80')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-950/90 to-red-950/80" />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors bg-black/20 backdrop-blur-sm md:bg-transparent"
              aria-label="Fechar"
            >
              <X className="w-5 h-5 md:w-4 md:h-4" />
            </button>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4 md:mb-5">
                <img src="/mostrara-logo.png" alt="Mostrara" className="h-12 md:h-16 w-40 md:w-56 object-contain object-left brightness-0 invert" />
              </div>
              <DialogTitle className="text-2xl md:text-3xl font-bold text-white tracking-tight">{title}</DialogTitle>
              <DialogDescription className="text-gray-300 text-sm mt-1.5 md:mt-2 max-w-xs">{description}</DialogDescription>
              <div className="flex mt-6 md:mt-8 gap-1 bg-white/[0.08] rounded-xl p-1 w-full max-w-[280px] md:max-w-xs">
                {(["login", "register"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cn(
                      "flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                      tab === t ? "bg-white text-gray-950 shadow" : "text-gray-300 hover:text-white",
                    )}
                  >
                    {t === "login" ? "Entrar" : "Cadastrar"}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative z-10 hidden md:block mt-10 space-y-3 text-sm text-gray-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-red-300" />
                Sessão salva neste aparelho.
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-red-300" />
                Painel abre direto enquanto logado.
              </div>
            </div>
          </div>

          <div className="px-5 py-6 sm:px-8 sm:py-7 md:max-h-[90dvh] md:overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                {tab === "login" ? (
                  <LoginPanel
                    onSwitch={() => setTab("register")}
                    onRecover={() => setTab("recover")}
                    onClose={onClose}
                  />
                ) : tab === "recover" ? (
                  <RecoverPanel onBack={() => setTab("login")} />
                ) : (
                  <RegisterPanel onSwitch={() => setTab("login")} onClose={onClose} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
