import { useState, useRef, useEffect, useMemo, forwardRef, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import { useToastSimple } from "@/hooks/useToastSimple";
import { apiFetch, buildApiUrl } from "@/lib/api";
import { compressImage } from "@/lib/compress";
import {
  User,
  Lock,
  Store,
  ImagePlus,
  Loader2,
  Camera,
  Link2,
  Unlink,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Crown,
  MessageSquare,
  Clock,
  Truck,
  Search,
  Bike,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STORE_TYPE_OPTIONS, getStoreTypeConfig, resolveStoreTypeFromProfile } from "@/lib/store-types";
import { parseServiceHours, serializeServiceHours, type ServiceHourDay } from "@/lib/service-schedule";
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

interface CourierAccount {
  id: string;
  owner_name: string;
  email: string;
  phone: string;
  whatsapp: string;
  active?: boolean;
  last_login_at?: string | null;
}

function getStoreTypeHelper(mode: ReturnType<typeof getStoreTypeConfig>["mode"]) {
  if (mode === "booking") {
    return "Esse nicho ativa servicos com agendamento, sem frete por CEP e sem complementos no carrinho.";
  }
  if (mode === "food") {
    return "Esse nicho ativa cardapio com adicionais, sacola de pedido e entrega local.";
  }
  return "Esse nicho ativa venda de produtos fisicos com estoque, dimensoes e frete calculado por CEP.";
}

function getDeliveryHelper(mode: ReturnType<typeof getStoreTypeConfig>["mode"]) {
  if (mode === "booking") {
    return "Para servicos, use atendimento no local ou uma taxa fixa para visita a domicilio.";
  }
  if (mode === "food") {
    return "Para delivery local, use entrega gratis ou taxa fixa. Correios nao aparece para esse nicho.";
  }
  return "Para lojas de produtos fisicos, voce pode usar frete gratis, taxa fixa ou calculo por transportadora.";
}

const FormInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    error?: string;
    required?: boolean;
  }
>(function FormInput({ label, error, required, className, ...props }, ref) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        {...props}
        ref={ref}
        className={cn(
          "w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none transition-all",
          "focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-500/10",
          error && "border-red-300 bg-red-50/30",
          className,
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
  const [couriers, setCouriers] = useState<CourierAccount[]>([]);
  const [courierForm, setCourierForm] = useState({ name: "", email: "", phone: "", whatsapp: "", password: "" });
  const [loadingCouriers, setLoadingCouriers] = useState(false);
  const [savingCourier, setSavingCourier] = useState(false);
  const { canUseMercadoPago } = usePlan();
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const [unsplashLogoOpen, setUnsplashLogoOpen] = useState(false);
  const [unsplashCoverOpen, setUnsplashCoverOpen] = useState(false);
  const [serviceHours, setServiceHours] = useState<ServiceHourDay[]>(() => parseServiceHours("[]"));

  const opts = useMemo(() => ({ token: token ?? undefined }), [token]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
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
    if (!user) return;
    reset({
      store_name: user.store_name,
      owner_name: user.owner_name,
      phone: user.phone,
      whatsapp: user.whatsapp,
      store_type: user.store_type ?? user.canonical_niche ?? "celulares",
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
    setServiceHours(parseServiceHours(user.store_hours));
  }, [reset, user]);

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

  const selectedStoreType = watch("store_type") || resolveStoreTypeFromProfile(user);
  const selectedStoreConfig = getStoreTypeConfig(selectedStoreType);
  const selectedDeliveryType = watch("delivery_fee_type") || "none";
  const previewStreet = watch("store_address") || user?.store_address || "";
  const previewNumber = watch("store_address_number") || user?.store_address_number || "";
  const previewNeighborhood = watch("store_neighborhood") || user?.store_neighborhood || "";
  const previewCity = watch("city") || user?.city || "";
  const previewState = watch("state") || user?.state || "";
  const previewAddress = [
    previewStreet,
    previewNumber ? `, ${previewNumber}` : "",
    previewNeighborhood ? ` - ${previewNeighborhood}` : "",
    previewCity ? `, ${previewCity}` : "",
    previewState ? ` / ${previewState}` : "",
  ].join("").trim();
  const mpConnected = Boolean(user?.mp_connected_at && String(user.mp_connected_at) !== "null");
  const isCourier = (user?.account_role ?? "merchant") === "courier";

  useEffect(() => {
    if (!selectedStoreConfig.deliveryFeeOptions.some((option) => option.value === selectedDeliveryType)) {
      setValue("delivery_fee_type", selectedStoreConfig.deliveryFeeOptions[0]?.value ?? "none");
    }
  }, [selectedDeliveryType, selectedStoreConfig, setValue]);

  const mpConnectedLabel = useMemo(() => {
    if (!mpConnected || !user?.mp_connected_at) return "";
    try {
      return new Date(String(user.mp_connected_at)).toLocaleString("pt-BR", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return "";
    }
  }, [mpConnected, user?.mp_connected_at]);

  const loadCouriers = async () => {
    if (isCourier) return;
    setLoadingCouriers(true);
    try {
      const data = await apiFetch<{ couriers: CourierAccount[] }>("/couriers", opts);
      setCouriers(Array.isArray(data.couriers) ? data.couriers : []);
    } catch {
      setCouriers([]);
    } finally {
      setLoadingCouriers(false);
    }
  };

  useEffect(() => {
    if (!user || isCourier) return;
    loadCouriers();
  }, [isCourier, user]);

  const connectMercadoPago = async () => {
    try {
      setConnectingMp(true);
      const url = new URL(buildApiUrl("/auth/mercadopago/start"));
      url.searchParams.set("redirect", "/dashboard/settings");
      window.location.href = url.toString();
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
      if (selectedStoreConfig.mode === "booking") {
        const invalidHour = serviceHours.some((item) => item.enabled && item.start >= item.end);
        if (invalidHour) {
          error("Revise a agenda de atendimento: a hora final precisa ser maior que a inicial");
          return;
        }
      }

      const supportsSelectedDeliveryType = selectedStoreConfig.deliveryFeeOptions.some(
        (option) => option.value === data.delivery_fee_type,
      );
      const normalizedDeliveryType = supportsSelectedDeliveryType
        ? data.delivery_fee_type
        : Number(data.delivery_fee_amount || 0) > 0
        ? "fixed"
        : "none";

      await apiFetch("/settings", {
        method: "PUT",
        ...opts,
        body: JSON.stringify({
          ...data,
          store_hours: serializeServiceHours(serviceHours),
          delivery_fee_type: normalizedDeliveryType,
          delivery_fee_amount: Number(data.delivery_fee_amount || 0),
        }),
      });
      await refreshUser();
      success("Configuracoes salvas!");
    } catch {
      error("Erro ao salvar configuracoes");
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
      setErrPwd("confirm_password", { message: "Senhas nao coincidem" });
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
      success("Logo atualizada!");
    } catch {
      error("Erro ao fazer upload da logo");
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
      success(isLogo ? "Logo atualizada!" : "Capa atualizada!");
    } catch {
      error("Erro ao salvar imagem do banco profissional");
    } finally {
      if (isLogo) setUploadingLogo(false);
      else setUploadingCover(false);
    }
  };

  const createCourier = async (event: FormEvent) => {
    event.preventDefault();
    if (!courierForm.name.trim() || !courierForm.email.trim() || !courierForm.password.trim()) {
      error("Preencha nome, e-mail e senha do entregador");
      return;
    }

    try {
      setSavingCourier(true);
      await apiFetch("/couriers", {
        method: "POST",
        ...opts,
        body: JSON.stringify(courierForm),
      });
      success("Entregador criado");
      setCourierForm({ name: "", email: "", phone: "", whatsapp: "", password: "" });
      await loadCouriers();
    } catch (e: unknown) {
      error(e instanceof Error ? e.message : "Nao foi possivel criar o entregador");
    } finally {
      setSavingCourier(false);
    }
  };

  const updateServiceHour = (
    day: number,
    field: "enabled" | "start" | "end",
    value: boolean | string,
  ) => {
    setServiceHours((current) =>
      current.map((item) => (item.day === day ? { ...item, [field]: value } : item)),
    );
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuracoes</h1>
        <p className="text-gray-500 text-sm mt-0.5">Gerencie os dados da sua conta</p>
      </div>

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
            <p className="text-xs text-gray-400 mb-3">JPG, PNG ou WebP. Max. 5MB.</p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingLogo}
              className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
            >
              {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
              {uploadingLogo ? "Enviando..." : "Alterar logo"}
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
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
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

      <Section icon={Store} title="Dados da Loja">
        <form onSubmit={handleSubmit(onSubmitSettings)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Nome da loja"
              required
              error={errors.store_name?.message}
              {...register("store_name", { required: "Obrigatorio" })}
            />
            <FormInput
              label="Seu nome"
              required
              error={errors.owner_name?.message}
              {...register("owner_name", { required: "Obrigatorio" })}
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
            <p className="text-xs text-gray-400">{getStoreTypeHelper(selectedStoreConfig.mode)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Cidade" {...register("city")} />
            <FormInput label="UF" maxLength={2} {...register("state")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormInput label="CEP da loja" {...register("store_cep")} />
            <FormInput label="Numero" {...register("store_address_number")} />
          </div>

          <FormInput label="Rua / endereco" {...register("store_address")} />
          <FormInput label="Bairro" {...register("store_neighborhood")} />

          <div className="grid grid-cols-3 gap-3">
            <FormInput label="Cor principal" type="color" {...register("theme_primary")} />
            <FormInput label="Cor secundaria" type="color" {...register("theme_secondary")} />
            <FormInput label="Cor destaque" type="color" {...register("theme_accent")} />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Descricao da loja
            </label>
            <textarea
              {...register("description")}
              placeholder="Descreva sua loja..."
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
                <span className="block font-bold text-gray-900">Loja aberta para pedidos</span>
                <span className="block text-xs text-gray-500">Desmarque para fechar a loja e impedir novos pedidos.</span>
              </div>
            </label>
          </div>

          {selectedStoreConfig.mode === "booking" && (
            <div className="space-y-4 mb-6">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-800">
                Defina os dias e horarios que podem receber agendamento. A vitrine so oferece horarios livres dentro dessa agenda.
              </div>
              <div className="space-y-3">
                {serviceHours.map((item) => (
                  <div
                    key={item.day}
                    className="grid grid-cols-[72px_1fr_1fr] items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={(event) => updateServiceHour(item.day, "enabled", event.target.checked)}
                      />
                      {item.label}
                    </label>
                    <input
                      type="time"
                      value={item.start}
                      disabled={!item.enabled}
                      onChange={(event) => updateServiceHour(item.day, "start", event.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-all focus:border-red-400 focus:ring-2 focus:ring-red-500/10 disabled:opacity-50"
                    />
                    <input
                      type="time"
                      value={item.end}
                      disabled={!item.enabled}
                      onChange={(event) => updateServiceHour(item.day, "end", event.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-all focus:border-red-400 focus:ring-2 focus:ring-red-500/10 disabled:opacity-50"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="h-px bg-gray-100 my-8" />

          <div className="flex items-center gap-2 mb-4 text-red-600 font-bold">
            <Truck className="w-5 h-5" />
            <h3>Taxa de Entrega</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Tipo de cobranca
              </label>
              <select
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-500/10"
                {...register("delivery_fee_type")}
              >
                {selectedStoreConfig.deliveryFeeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <FormInput
              label={selectedStoreConfig.mode === "booking" ? "Taxa de visita (R$)" : "Valor da taxa (R$)"}
              type="number"
              step="0.01"
              disabled={selectedDeliveryType === "distance"}
              placeholder={selectedDeliveryType === "distance" ? "Calculado no checkout" : "0.00"}
              {...register("delivery_fee_amount")}
            />
          </div>

          <p className="text-xs text-gray-400">{getDeliveryHelper(selectedStoreConfig.mode)}</p>

          {selectedDeliveryType === "distance" && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800">
              O cliente vai informar o CEP e o sistema vai calcular o frete no carrinho com base nas dimensoes do produto.
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                </>
              ) : (
                "Salvar alteracoes"
              )}
            </button>
          </div>
        </form>
      </Section>

      {!isCourier && (
        <Section icon={Bike} title="Entregadores da Loja">
          <div className="space-y-5">
            <form onSubmit={createCourier} className="grid gap-3 sm:grid-cols-2">
              <FormInput
                label="Nome do entregador"
                required
                value={courierForm.name}
                onChange={(event) => setCourierForm((current) => ({ ...current, name: event.target.value }))}
              />
              <FormInput
                label="E-mail"
                required
                type="email"
                value={courierForm.email}
                onChange={(event) => setCourierForm((current) => ({ ...current, email: event.target.value }))}
              />
              <FormInput
                label="Telefone"
                value={courierForm.phone}
                onChange={(event) => setCourierForm((current) => ({ ...current, phone: event.target.value }))}
              />
              <FormInput
                label="WhatsApp"
                value={courierForm.whatsapp}
                onChange={(event) => setCourierForm((current) => ({ ...current, whatsapp: event.target.value }))}
              />
              <FormInput
                label="Senha inicial"
                type="password"
                required
                value={courierForm.password}
                onChange={(event) => setCourierForm((current) => ({ ...current, password: event.target.value }))}
              />
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={savingCourier}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
                >
                  {savingCourier ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bike className="h-4 w-4" />}
                  Criar entregador
                </button>
              </div>
            </form>

            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Contas criadas</p>
                  <p className="text-xs text-gray-500">Esses acessos entram no painel /courier e veem apenas as entregas atribuídas.</p>
                </div>
                <button
                  type="button"
                  onClick={loadCouriers}
                  className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50"
                >
                  Atualizar lista
                </button>
              </div>

              {loadingCouriers ? (
                <div className="space-y-2">
                  <div className="h-14 rounded-xl skeleton" />
                  <div className="h-14 rounded-xl skeleton" />
                </div>
              ) : couriers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-6 text-sm text-gray-500">
                  Nenhum entregador cadastrado ainda.
                </div>
              ) : (
                <div className="space-y-2">
                  {couriers.map((courier) => (
                    <div key={courier.id} className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{courier.owner_name}</p>
                        <p className="text-xs text-gray-500">{courier.email}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className={cn(
                          "rounded-full px-2.5 py-1 font-semibold",
                          courier.active === false ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700",
                        )}>
                          {courier.active === false ? "Inativo" : "Ativo"}
                        </span>
                        {courier.last_login_at && (
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 font-semibold">
                            Ultimo acesso {new Date(String(courier.last_login_at)).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Section>
      )}

      <Section icon={MapPin} title="Localizacao da Loja">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 leading-relaxed">
            O mapa usa o endereco salvo no cadastro da loja. Quando voce atualiza CEP e endereco, o sistema tenta achar a posicao automaticamente.
          </p>
          <StoreMap
            title="Pre-visualizacao"
            subtitle={previewAddress}
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
              Receba pagamentos Pix direto na sua conta do Mercado Pago com aprovacao automatica. Assine o Premium para desbloquear.
            </p>
            <button
              onClick={() => setUpgradeOpen(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-amber-500/25 inline-flex items-center gap-2"
            >
              <Crown className="w-4 h-4" />
              Assinar Premium - R$ 49,99/mes
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
                    : "Conecte a conta do lojista para gerar Pix direto no Mercado Pago e receber aprovacao automatica."}
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

      <Section icon={User} title="Dados da Conta">
        <div className="space-y-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
          {[
            { label: "E-mail", value: user?.email },
            { label: "Slug da loja", value: `@${user?.store_slug}` },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {item.label}
              </span>
              <span className="text-sm font-semibold text-gray-700">{item.value}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">E-mail e slug nao podem ser alterados.</p>
      </Section>

      <Section icon={MessageSquare} title="Automacao do WhatsApp">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 mb-4">
            Conecte seu WhatsApp para enviar mensagens automaticas de confirmacao de pedidos e andamento diretamente para os seus clientes.
          </p>
          <WhatsAppConnection />
        </div>
      </Section>

      <Section icon={Lock} title="Alterar Senha">
        <form onSubmit={handlePwd(onSubmitPassword)} className="space-y-4">
          <FormInput
            label="Senha atual"
            type="password"
            placeholder="********"
            error={errPwd.current_password?.message}
            {...regPwd("current_password", { required: "Obrigatorio" })}
          />
          <FormInput
            label="Nova senha"
            type="password"
            placeholder="Minimo 6 caracteres"
            error={errPwd.new_password?.message}
            {...regPwd("new_password", {
              required: "Obrigatorio",
              minLength: { value: 6, message: "Minimo 6 caracteres" },
            })}
          />
          <FormInput
            label="Confirmar nova senha"
            type="password"
            placeholder="********"
            error={errPwd.confirm_password?.message}
            {...regPwd("confirm_password", { required: "Obrigatorio" })}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSavingPwd}
              className="bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors flex items-center gap-2"
            >
              {isSavingPwd ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Atualizando...
                </>
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
