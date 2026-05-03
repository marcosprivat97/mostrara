import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/contexts/AuthContext";
import { useToastSimple } from "@/hooks/useToastSimple";
import { apiFetch } from "@/lib/api";
import { compressImage } from "@/lib/compress";
import { User, Lock, Store, ImagePlus, Loader2, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsForm {
  store_name: string;
  owner_name: string;
  phone: string;
  whatsapp: string;
  description: string;
  city: string;
}

interface PasswordForm {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

function FormInput({ label, error, required, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        {...props}
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
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
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
  const fileRef = useRef<HTMLInputElement>(null);
  const headers = { Authorization: `Bearer ${token}` };

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SettingsForm>();
  const { register: regPwd, handleSubmit: handlePwd, reset: resetPwd, formState: { errors: errPwd, isSubmitting: isSavingPwd }, setError: setErrPwd } = useForm<PasswordForm>();

  useEffect(() => {
    if (user) {
      reset({
        store_name: user.store_name,
        owner_name: user.owner_name,
        phone: user.phone,
        whatsapp: user.whatsapp,
        description: user.description || "",
        city: user.city || "Rio de Janeiro",
      });
    }
  }, [user]);

  const onSubmitSettings = async (data: SettingsForm) => {
    try {
      await apiFetch("/settings", {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      await refreshUser();
      success("Configurações salvas!");
    } catch { error("Erro ao salvar configurações"); }
  };

  const onSubmitPassword = async (data: PasswordForm) => {
    if (data.new_password !== data.confirm_password) {
      setErrPwd("confirm_password", { message: "Senhas não coincidem" });
      return;
    }
    try {
      await apiFetch("/settings/password", {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: data.current_password, new_password: data.new_password }),
      });
      success("Senha atualizada!");
      resetPwd();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao atualizar senha";
      setErrPwd("current_password", { message: msg });
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
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ image: compressed, mimeType: file.type }),
      });
      await refreshUser();
      success("Logo atualizado!");
    } catch { error("Erro ao fazer upload do logo"); }
    finally { setUploadingLogo(false); if (fileRef.current) fileRef.current.value = ""; }
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
              <img src={user.logo_url} alt="Logo" className="w-20 h-20 rounded-2xl object-cover border-2 border-gray-200" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                <Store className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Foto de perfil da loja</p>
            <p className="text-xs text-gray-400 mb-3">JPG, PNG ou WebP. Máx. 5MB.</p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingLogo}
              className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
            >
              {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
              {uploadingLogo ? "Enviando..." : "Alterar logo"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </div>
        </div>
      </Section>

      {/* Store info */}
      <Section icon={Store} title="Dados da Loja">
        <form onSubmit={handleSubmit(onSubmitSettings)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Nome da loja" required error={errors.store_name?.message}
              {...register("store_name", { required: "Obrigatório" })}
            />
            <FormInput label="Seu nome" required error={errors.owner_name?.message}
              {...register("owner_name", { required: "Obrigatório" })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Telefone" {...register("phone")} />
            <FormInput label="WhatsApp" {...register("whatsapp")} />
          </div>
          <FormInput label="Cidade" {...register("city")} />
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Descrição da loja</label>
            <textarea
              {...register("description")}
              placeholder="Descreva sua loja..."
              rows={3}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-500/10 transition-all resize-none"
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={isSubmitting} className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors flex items-center gap-2">
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : "Salvar alterações"}
            </button>
          </div>
        </form>
      </Section>

      {/* Account */}
      <Section icon={User} title="Dados da Conta">
        <div className="space-y-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
          {[
            { label: "E-mail", value: user?.email },
            { label: "Slug da loja", value: `@${user?.store_slug}` },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{item.label}</span>
              <span className="text-sm font-semibold text-gray-700">{item.value}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">E-mail e slug não podem ser alterados.</p>
      </Section>

      {/* Password */}
      <Section icon={Lock} title="Alterar Senha">
        <form onSubmit={handlePwd(onSubmitPassword)} className="space-y-4">
          <FormInput label="Senha atual" type="password" placeholder="••••••••"
            error={errPwd.current_password?.message}
            {...regPwd("current_password", { required: "Obrigatório" })}
          />
          <FormInput label="Nova senha" type="password" placeholder="Mínimo 6 caracteres"
            error={errPwd.new_password?.message}
            {...regPwd("new_password", { required: "Obrigatório", minLength: { value: 6, message: "Mínimo 6 caracteres" } })}
          />
          <FormInput label="Confirmar nova senha" type="password" placeholder="••••••••"
            error={errPwd.confirm_password?.message}
            {...regPwd("confirm_password", { required: "Obrigatório" })}
          />
          <div className="flex justify-end">
            <button type="submit" disabled={isSavingPwd} className="bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors flex items-center gap-2">
              {isSavingPwd ? <><Loader2 className="w-4 h-4 animate-spin" /> Atualizando...</> : "Alterar senha"}
            </button>
          </div>
        </form>
      </Section>
    </div>
  );
}
