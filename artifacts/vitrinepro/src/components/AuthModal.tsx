import { useState } from "react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { Store, Eye, EyeOff, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoginForm {
  email: string;
  password: string;
}

interface RegisterForm {
  store_name: string;
  owner_name: string;
  email: string;
  password: string;
  phone: string;
  whatsapp: string;
  city: string;
}

function Input({ label, error, icon, className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; icon?: React.ReactNode }) {
  const [showPass, setShowPass] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          {...props}
          type={isPassword ? (showPass ? "text" : "password") : type}
          className={cn(
            "w-full bg-gray-50 border text-gray-900 placeholder-gray-400 rounded-xl px-3.5 py-2.5 text-sm transition-all outline-none",
            "focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/10",
            error ? "border-red-300 bg-red-50/30" : "border-gray-200 hover:border-gray-300",
            icon && "pl-9",
            isPassword && "pr-10",
            className
          )}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPass(v => !v)}
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
}

function LoginPanel({ onSwitch, onClose }: { onSwitch: () => void; onClose: () => void }) {
  const { login } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password);
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao entrar";
      setError("root", { message: msg });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="E-mail"
        type="email"
        placeholder="seu@email.com"
        error={errors.email?.message}
        {...register("email", { required: "E-mail obrigatório" })}
      />
      <Input
        label="Senha"
        type="password"
        placeholder="••••••••"
        error={errors.password?.message}
        {...register("password", { required: "Senha obrigatória" })}
      />
      {errors.root && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 font-medium">
          {errors.root.message}
        </p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</> : "Entrar"}
      </button>
      <p className="text-center text-sm text-gray-500">
        Não tem conta?{" "}
        <button type="button" onClick={onSwitch} className="text-red-600 font-semibold hover:underline">
          Criar agora
        </button>
      </p>
    </form>
  );
}

function RegisterPanel({ onSwitch, onClose }: { onSwitch: () => void; onClose: () => void }) {
  const { register: registerUser } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<RegisterForm>({
    defaultValues: { city: "Rio de Janeiro" },
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      await registerUser(data);
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao cadastrar";
      setError("root", { message: msg });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Nome da loja"
          placeholder="Minha Loja"
          error={errors.store_name?.message}
          {...register("store_name", { required: "Obrigatório" })}
        />
        <Input
          label="Seu nome"
          placeholder="João Silva"
          error={errors.owner_name?.message}
          {...register("owner_name", { required: "Obrigatório" })}
        />
      </div>
      <Input
        label="E-mail"
        type="email"
        placeholder="seu@email.com"
        error={errors.email?.message}
        {...register("email", { required: "Obrigatório" })}
      />
      <Input
        label="Senha"
        type="password"
        placeholder="Mínimo 6 caracteres"
        error={errors.password?.message}
        {...register("password", { required: "Obrigatório", minLength: { value: 6, message: "Mínimo 6 caracteres" } })}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Telefone"
          placeholder="(21) 99999-9999"
          error={errors.phone?.message}
          {...register("phone", { required: "Obrigatório" })}
        />
        <Input
          label="WhatsApp"
          placeholder="(21) 99999-9999"
          error={errors.whatsapp?.message}
          {...register("whatsapp", { required: "Obrigatório" })}
        />
      </div>
      <Input
        label="Cidade"
        placeholder="Rio de Janeiro"
        error={errors.city?.message}
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
        className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-1"
      >
        {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando conta...</> : "Criar conta grátis"}
      </button>
      <p className="text-center text-sm text-gray-500">
        Já tem conta?{" "}
        <button type="button" onClick={onSwitch} className="text-red-600 font-semibold hover:underline">
          Entrar
        </button>
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
  const [tab, setTab] = useState<"login" | "register">(defaultTab);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-0 shadow-2xl">
        <div className="bg-white rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gray-900 px-8 py-7 relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-bold text-lg">VitrinePro</span>
            </div>
            <h2 className="text-2xl font-bold text-white">
              {tab === "login" ? "Bem-vindo de volta" : "Crie sua vitrine"}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {tab === "login" ? "Entre na sua conta" : "Comece a vender agora, é grátis"}
            </p>
            {/* Tabs */}
            <div className="flex mt-5 gap-1 bg-white/[0.07] rounded-xl p-1 w-fit">
              <button
                onClick={() => setTab("login")}
                className={cn(
                  "px-5 py-1.5 rounded-lg text-sm font-semibold transition-all",
                  tab === "login" ? "bg-red-600 text-white shadow" : "text-gray-400 hover:text-white"
                )}
              >
                Entrar
              </button>
              <button
                onClick={() => setTab("register")}
                className={cn(
                  "px-5 py-1.5 rounded-lg text-sm font-semibold transition-all",
                  tab === "register" ? "bg-red-600 text-white shadow" : "text-gray-400 hover:text-white"
                )}
              >
                Cadastrar
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-8 py-6 max-h-[60vh] overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                {tab === "login" ? (
                  <LoginPanel onSwitch={() => setTab("register")} onClose={onClose} />
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
