import { useState, useRef, useEffect, useMemo, forwardRef } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import { useToastSimple } from "@/hooks/useToastSimple";
import { apiFetch } from "@/lib/api";
import { compressImage } from "@/lib/compress";
import { User, Lock, Store, ImagePlus, Loader2, Camera, Link2, Unlink, CheckCircle2, AlertTriangle, MapPin, Crown, MessageSquare, Clock, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { STORE_TYPE_OPTIONS } from "@/lib/store-types";
import { StoreMap } from "@/components/StoreMap";
import UpgradeModal from "@/components/UpgradeModal";
import { WhatsAppConnection } from "@/components/WhatsAppConnection";
import UnsplashSearchModal from "@/components/UnsplashSearchModal";

interface SettingsForm {
  store_name: string;
  owner_name: string;
  phone: string;
  whatsapp: string;
  store_type: string;
  description: string;
  city: string;
  state: string;
  store_cep: string;
  store_address: string;
  store_address_number: string;
  store_neighborhood: string;
  theme_primary: string;
  theme_secondary: string;
  theme_accent: string;
  is_open: boolean;
  store_hours: string;
  delivery_fee_type: "none" | "fixed" | "distance";
  delivery_fee_amount: number;
}

interface PasswordForm {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

const FormInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    error?: string;
    required?: boolean;
  }
>(function FormInput(
  { label, error, required, className, ...props },
  ref
) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        {...props}
        ref={ref}
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
});

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-red-600" />
        </div>
        <h2 className="font-bold text-gray-900">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function DashboardSettings() {
  const { user, token, refreshUser } = useAuth();
  const { success, error } = useToastSimple();
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [connectingMp, setConnectingMp] = useState(false);
  const [disconnectingMp, setDisconnectingMp] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const { canUseMercadoPago, isPremium } = usePlan();
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const [unsplashLogoOpen, setUnsplashLogoOpen] = useState(false);
  const [unsplashCoverOpen, setUnsplashCoverOpen] = useState(false);

  const opts = useMemo(() => ({ token: token ?? undefined }), [token]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SettingsForm>();

  const {
    register: regPwd,
    handleSubmit: handlePwd,
    reset: resetPwd,
    formState: { errors: errPwd, isSubmitting: isSavingPwd },
    setError: setErrPwd,
  } = useForm<PasswordForm>();

  useEffect(() => {
    if (user) {
      reset({
        store_name: user.store_name,
        owner_name: user.owner_name,
        phone: user.phone,
        whatsapp: user.whatsapp,
        store_type: user.store_type ?? "celulares",
        description: user.description ?? "",
        city: user.city ?? "Rio de Janeiro",
        state: user.state ?? "RJ",
        store_cep: user.store_cep ?? "",
        store_address: user.store_address ?? "",
        store_address_number: user.store_address_number ?? "",
        store_neighborhood: user.store_neighborhood ?? "",
        theme_primary: user.theme_primary ?? "#dc2626",
        theme_secondary: user.theme_secondary ?? "#111827",
        theme_accent: user.theme_accent ?? "#ffffff",
        is_open: user.is_open ?? true,
        store_hours: user.store_hours ?? "[]",
        delivery_fee_type: user.delivery_fee_type ?? "none",
        delivery_fee_amount: Number(user.delivery_fee_amount ?? 0),
      });
    }
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mp = params.get("mp");
    const reason = params.get("reason");
    if (mp === "connected") {
      success("Mercado Pago conectado!");
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (mp === "error") {
      error(reason ? `Nao foi possivel conectar Mercado Pago: ${reason}` : "Nao foi possivel conectar Mercado Pago");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [error, success]);

  const mpConnected = Boolean(user?.mp_connected_at && String(user.mp_connected_at) !== "null");
  const mpConnectedLabel = useMemo(() => {
    if (!mpConnected || !user?.mp_connected_at) return "";
    try {
      return new Date(String(user.mp_connected_at)).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return "";
    }
  }, [user?.mp_connected_at, mpConnected]);

  const connectMercadoPago = async () => {
    try {
      setConnectingMp(true);
      window.location.href = `/api/auth/mercadopago/start?redirect=${encodeURIComponent("/dashboard/settings")}`;
    } finally {
      setConnectingMp(false);
    }
  };

  const disconnectMercadoPago = async () => {
    try {
      setDisconnectingMp(true);
      await apiFetch("/settings/mercadopago/disconnect", {
        method: "POST",
        ...opts,
      });
      await refreshUser();
      success("Mercado Pago desconectado");
    } catch (e: unknown) {
      error(e instanceof Error ? e.message : "Nao foi possivel desconectar Mercado Pago");
    } finally {
      setDisconnectingMp(false);
    }
  };

  const onSubmitSettings = async (data: SettingsForm) => {
    try {
      await apiFetch("/settings", {
        method: "PUT",
        ...opts,
        body: JSON.stringify(data),
      });
      await refreshUser();
      success("Configurações salvas!");
    } catch {
      error("Erro ao salvar configurações");
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const compressed = await compressImage(file, { maxWidth: 1600, quality: 0.85 });
      await apiFetch("/settings/cover", {
        method: "POST",
        ...opts,
        body: JSON.stringify({ image: compressed, mimeType: file.type }),
      });
      await refreshUser();
      success("Capa atualizada!");
    } catch {
      error("Erro ao fazer upload da capa");
    } finally {
      setUploadingCover(false);
      if (coverRef.current) coverRef.current.value = "";
    }
  };

  const onSubmitPassword = async (data: PasswordForm) => {
    if (data.new_password !== data.confirm_password) {
      setErrPwd("confirm_password", { message: "Senhas não coincidem" });
      return;
    }
    try {
      await apiFetch("/settings/password", {
        method: "PUT",
        ...opts,
        body: JSON.stringify({
          current_password: data.current_password,
          new_password: data.new_password,
        }),
      });
      success("Senha atualizada!");
      resetPwd();
    } catch (e: unknown) {
      setErrPwd("current_password", {
        message: e instanceof Error ? e.message : "Erro ao atualizar senha",
      });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const compressed = await compressImage(file, { maxWidth: 512, quality: 0.85 });
      await apiFetch("/settings/logo", {
        method: "POST",
        ...opts,
        body: JSON.stringify({ image: compressed, mimeType: file.type }),
      });
      await refreshUser();
      success("Logo atualizado!");
    } catch {
      error("Erro ao fazer upload do logo");
    } finally {
      setUploadingLogo(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleUnsplashSelect = async (url: string, type: "logo" | "cover") => {
    const isLogo = type === "logo";
    if (isLogo) {
      setUploadingLogo(true);
      setUnsplashLogoOpen(false);
    } else {
      setUploadingCover(true);
      setUnsplashCoverOpen(false);
    }

    try {
      await apiFetch(isLogo ? "/settings/logo" : "/settings/cover", {
        method: "POST",
        ...opts,
        body: JSON.stringify({ imageUrl: url }),
      });
      await refreshUser();
      success(isLogo ? "Logo atualizado!" : "Capa atualizada!");
    } catch {
      error("Erro ao salvar imagem do Unsplash");
    } finally {
      if (isLogo) setUploadingLogo(false);
      else setUploadingCover(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-500 text-sm mt-0.5">Gerencie os dados da sua conta</p>
      </div>

      {/* Logo */}
      <Section icon={Camera} title="Logo da Loja">
        <div className="flex items-center gap-5">
          <div className="relative">
            {user?.logo_url ? (
              <img
                src={user.logo_url}
                alt="Logo"
                className="w-20 h-20 rounded-2xl object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                <Store className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Foto de perfil da loja</p>
            <p className="text-xs text-gray-400 mb-3">JPG, PNG ou WebP. Máx. 5MB.</p>
              {uploadingLogo ? "Enviando…" : "Alterar logo"}
            </button>
            <button
              type="button"
              onClick={() => setUnsplashLogoOpen(true)}
              disabled={uploadingLogo}
              className="inline-flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-60 ml-2"
            >
              <Search className="w-4 h-4" />
              Banco profissional
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </div>
        </div>
      </Section>

      <Section icon={Camera} title="Capa da Loja">
        <div className="space-y-4">
          <div className="h-36 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden">
            {user?.cover_url ? (
              <img src={user.cover_url} alt="Capa" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">Sem capa cadastrada</div>
            )}
          </div>
          <button
            type="button"
            onClick={() => coverRef.current?.click()}
            disabled={uploadingCover}
            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
          >
            {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            {uploadingCover ? "Enviando..." : "Alterar capa"}
          </button>
          <button
            type="button"
            onClick={() => setUnsplashCoverOpen(true)}
            disabled={uploadingCover}
            className="inline-flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-60 ml-2"
          >
            <Search className="w-4 h-4" />
            Banco profissional
          </button>
          <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
        </div>
      </Section>

      {/* Store info */}
      <Section icon={Store} title="Dados da Loja">
        <form onSubmit={handleSubmit(onSubmitSettings)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Nome da loja"
              required
              error={errors.store_name?.message}
              {...register("store_name", { required: "Obrigatório" })}
            />
            <FormInput
              label="Seu nome"
              required
              error={errors.owner_name?.message}
              {...register("owner_name", { required: "Obrigatório" })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
          <FormInput label="Telefone" {...register("phone")} />
          <FormInput label="WhatsApp" {...register("whatsapp")} />
        </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Tipo de loja
            </label>
            <select
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-500/10"
              {...register("store_type")}
            >
              {STORE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400">
              Isso muda rótulos, categorias e campos do cadastro de produtos.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Cidade" {...register("city")} />
            <FormInput label="UF" maxLength={2} {...register("state")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="CEP da loja" {...register("store_cep")} />
            <FormInput label="Número" {...register("store_address_number")} />
          </div>
          <FormInput label="Rua / endereço" {...register("store_address")} />
          <FormInput label="Bairro" {...register("store_neighborhood")} />
          <div className="grid grid-cols-3 gap-3">
            <FormInput label="Cor principal" type="color" {...register("theme_primary")} />
            <FormInput label="Cor secundaria" type="color" {...register("theme_secondary")} />
            <FormInput label="Cor destaque" type="color" {...register("theme_accent")} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Descrição da loja
            </label>
            <textarea
              {...register("description")}
              placeholder="Descreva sua loja…"
              rows={3}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-500/10 transition-all resize-none"
            />
          </div>

          <div className="h-px bg-gray-100 my-8" />
          
          <div className="flex items-center gap-2 mb-4 text-red-600 font-bold">
            <Clock className="w-5 h-5" />
            <h3>Funcionamento e Loja Aberta</h3>
          </div>
          
          <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                {...register("is_open")}
                className="w-5 h-5 text-red-600 rounded focus:ring-red-500 focus:ring-2"
              />
              <div>
                <span className="block font-bold text-gray-900">Loja Aberta para Pedidos</span>
                <span className="block text-xs text-gray-500">Desmarque para fechar a loja e impedir novos pedidos.</span>
              </div>
            </label>
          </div>

          <div className="h-px bg-gray-100 my-8" />
          
          <div className="flex items-center gap-2 mb-4 text-red-600 font-bold">
            <Truck className="w-5 h-5" />
            <h3>Taxa de Entrega</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Tipo de Cobrança
              </label>
              <select
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-500/10"
                {...register("delivery_fee_type")}
              >
                <option value="none">Frete Grátis</option>
                <option value="fixed">Taxa Fixa</option>
                <option value="distance">A Combinar (por distância)</option>
              </select>
            </div>
            
            <FormInput 
              label="Valor da Taxa (R$)" 
              type="number" 
              step="0.01"
              {...register("delivery_fee_amount")} 
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</>
              ) : (
                "Salvar alterações"
              )}
            </button>
          </div>
        </form>
      </Section>

      <Section icon={MapPin} title="Localização da Loja">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 leading-relaxed">
            O mapa usa o endereço salvo no cadastro da loja. Quando você atualiza CEP e endereço, o sistema tenta achar a posição automaticamente.
          </p>
          <StoreMap
            title="Pré-visualização"
            subtitle={[
              user?.store_address,
              user?.store_address_number ? `, ${user.store_address_number}` : "",
              user?.store_neighborhood ? ` - ${user.store_neighborhood}` : "",
              user?.city ? `, ${user.city}` : "",
              user?.state ? ` / ${user.state}` : "",
            ].join("").trim()}
            latitude={user?.store_latitude}
            longitude={user?.store_longitude}
          />
        </div>
      </Section>

      <Section icon={Link2} title="Mercado Pago">
        {!canUseMercadoPago ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-amber-600" />
            </div>
            <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold mb-3">
              <Crown className="w-3 h-3" />
              Exclusivo Premium
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Pix via Mercado Pago</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
              Receba pagamentos Pix direto na sua conta do Mercado Pago com aprovação automática. Assine o Premium para desbloquear.
            </p>
            <button
              onClick={() => setUpgradeOpen(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-amber-500/25 inline-flex items-center gap-2"
            >
              <Crown className="w-4 h-4" />
              Assinar Premium — R$ 49,99/mês
            </button>
          </div>
        ) : (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-900">
                {mpConnected ? "Conta conectada" : "Conta desconectada"}
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                {mpConnected
                  ? `Conectado em ${mpConnectedLabel}${user?.mp_user_id ? ` · ID ${user.mp_user_id}` : ""}`
                  : "Conecte a conta do lojista para gerar Pix direto no Mercado Pago e receber aprovação automática."}
              </p>
            </div>
            <div
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold",
                mpConnected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
              )}
            >
              {mpConnected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {mpConnected ? "Conectado" : "Pendente"}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {!mpConnected ? (
              <button
                type="button"
                onClick={connectMercadoPago}
                disabled={connectingMp}
                className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                {connectingMp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                Conectar Mercado Pago
              </button>
            ) : (
              <button
                type="button"
                onClick={disconnectMercadoPago}
                disabled={disconnectingMp}
                className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-60 text-gray-700 font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                {disconnectingMp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
                Desconectar
              </button>
            )}
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            O pagamento Pix usa o access token do lojista salvo com criptografia no banco. Quando o pagamento for aprovado, o pedido entra como confirmado automaticamente.
          </p>
        </div>
        )}
      </Section>


      {/* Account info */}
      <Section icon={User} title="Dados da Conta">
        <div className="space-y-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
          {[
            { label: "E-mail",      value: user?.email },
            { label: "Slug da loja", value: `@${user?.store_slug}` },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {item.label}
              </span>
              <span className="text-sm font-semibold text-gray-700">{item.value}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">E-mail e slug não podem ser alterados.</p>
      </Section>

      {/* WhatsApp Automacao */}
      <Section icon={MessageSquare} title="Automação do WhatsApp">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 mb-4">
            Conecte seu WhatsApp para enviar mensagens automáticas de confirmação de pedidos e andamento diretamente para os seus clientes.
          </p>
          <WhatsAppConnection />
        </div>
      </Section>

      {/* Password */}
      <Section icon={Lock} title="Alterar Senha">
        <form onSubmit={handlePwd(onSubmitPassword)} className="space-y-4">
          <FormInput
            label="Senha atual"
            type="password"
            placeholder="••••••••"
            error={errPwd.current_password?.message}
            {...regPwd("current_password", { required: "Obrigatório" })}
          />
          <FormInput
            label="Nova senha"
            type="password"
            placeholder="Mínimo 6 caracteres"
            error={errPwd.new_password?.message}
            {...regPwd("new_password", {
              required: "Obrigatório",
              minLength: { value: 6, message: "Mínimo 6 caracteres" },
            })}
          />
          <FormInput
            label="Confirmar nova senha"
            type="password"
            placeholder="••••••••"
            error={errPwd.confirm_password?.message}
            {...regPwd("confirm_password", { required: "Obrigatório" })}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSavingPwd}
              className="bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors flex items-center gap-2"
            >
              {isSavingPwd ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Atualizando…</>
              ) : (
                "Alterar senha"
              )}
            </button>
          </div>
        </form>
      </Section>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature="Pix via Mercado Pago" />
      
      <UnsplashSearchModal 
        open={unsplashLogoOpen} 
        onOpenChange={setUnsplashLogoOpen} 
        onSelect={(url) => handleUnsplashSelect(url, "logo")}
        title="Buscar Logo Profissional"
        token={token ?? undefined}
      />

      <UnsplashSearchModal 
        open={unsplashCoverOpen} 
        onOpenChange={setUnsplashCoverOpen} 
        onSelect={(url) => handleUnsplashSelect(url, "cover")}
        title="Buscar Capa Profissional"
        token={token ?? undefined}
      />
    </div>
  );
}
