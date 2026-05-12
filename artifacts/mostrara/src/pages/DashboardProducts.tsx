import { useState, useEffect, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import { useToastSimple } from "@/hooks/useToastSimple";
import { apiFetch } from "@/lib/api";
import { compressImage } from "@/lib/compress";
import { formatPrice } from "@/lib/formatters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, Plus, Pencil, Trash2, Loader2, Package, X, ImagePlus, Copy, CheckCircle2, Crown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStoreTypeConfig } from "@/lib/store-types";
import UpgradeModal from "@/components/UpgradeModal";

interface Product {
  id: string;
  name: string;
  category: string;
  storage: string;
  price: number;
  condition: string;
  battery: string;
  warranty: string;
  status: string;
  description: string;
  options?: ProductOption[];
  photos: string[];
  stock?: number;
  unlimited_stock?: boolean;
  width?: number;
  height?: number;
  length?: number;
  weight?: number;
}

interface ProductForm {
  name: string;
  category: string;
  storage: string;
  price: number;
  condition: string;
  battery: string;
  warranty: string;
  status: string;
  description: string;
  options_text: string;
  stock: number;
  unlimited_stock: boolean;
  width: number;
  height: number;
  length: number;
  weight: number;
}

interface ProductOption {
  name: string;
  price: number;
}

const CATEGORIES = ["iPhone", "Samsung", "Xiaomi", "Motorola", "Acessórios", "Outro"];
const DEFAULT_PRODUCT_DIMENSIONS = {
  width: 11,
  height: 2,
  length: 16,
  weight: 0.3,
} as const;

function normalizePositiveNumber(value: unknown, fallback: number, min: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= min ? numeric : fallback;
}

function buildDefaultProductFormValues(storeConfig: ReturnType<typeof getStoreTypeConfig>): ProductForm {
  return {
    name: "",
    category: storeConfig.categories[0],
    storage: "",
    price: 0,
    condition: storeConfig.conditions[0],
    battery: "",
    warranty: "",
    status: "disponivel",
    description: "",
    options_text: "",
    stock: 1,
    unlimited_stock: true,
    ...DEFAULT_PRODUCT_DIMENSIONS,
  };
}

const CONDITIONS = ["Vitrine", "Novo", "Usado A+", "Usado A", "Usado B"];
const STATUSES = [
  { value: "disponivel", label: "Disponível" },
  { value: "reservado",  label: "Reservado"  },
  { value: "vendido",    label: "Vendido"    },
];

const statusCfg: Record<string, { label: string; cls: string }> = {
  disponivel: { label: "Disponível", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  reservado:  { label: "Reservado",  cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  vendido:    { label: "Vendido",    cls: "bg-gray-100 text-gray-500 border border-gray-200" },
};

function normalizeProduct(p: Partial<Product>): Product {
  return {
    id: String(p.id ?? crypto.randomUUID()),
    name: String(p.name ?? "Produto sem nome"),
    category: String(p.category ?? "Outro"),
    storage: String(p.storage ?? ""),
    price: Number(p.price ?? 0),
    condition: String(p.condition ?? ""),
    battery: String(p.battery ?? ""),
    warranty: String(p.warranty ?? ""),
    status: String(p.status ?? "disponivel"),
    description: String(p.description ?? ""),
    options: Array.isArray(p.options)
      ? p.options
          .map((option) => ({ name: String(option?.name ?? ""), price: Number(option?.price ?? 0) }))
          .filter((option) => option.name)
      : [],
    photos: Array.isArray(p.photos) ? p.photos.filter(Boolean) : [],
    stock: Number(p.stock ?? 0),
    unlimited_stock: Boolean(p.unlimited_stock),
    width: normalizePositiveNumber(p.width, DEFAULT_PRODUCT_DIMENSIONS.width, 0.1),
    height: normalizePositiveNumber(p.height, DEFAULT_PRODUCT_DIMENSIONS.height, 0.1),
    length: normalizePositiveNumber(p.length, DEFAULT_PRODUCT_DIMENSIONS.length, 0.1),
    weight: normalizePositiveNumber(p.weight, DEFAULT_PRODUCT_DIMENSIONS.weight, 0.01),
  };
}

function parseOptionsText(value: string): ProductOption[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, rawPrice = "0"] = line.split("|").map((part) => part.trim());
      const price = Number(rawPrice.replace(",", ".").replace(/[^\d.]/g, ""));
      return { name, price: Number.isFinite(price) ? price : 0 };
    })
    .filter((option) => option.name);
}

function formatOptionsText(options?: ProductOption[]) {
  return (options ?? []).map((option) => `${option.name} | ${option.price}`).join("\n");
}

function FormField({
  label,
  error,
  required,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; required?: boolean }) {
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

export default function DashboardProducts() {
  const { token, user } = useAuth();
  const { isPremium, maxProducts } = usePlan();
  const { success, error: toastError } = useToastSimple();
  const storeConfig = getStoreTypeConfig(user?.store_type);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [removingBgIdx, setRemovingBgIdx] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const opts = useMemo(() => ({ token: token ?? undefined }), [token]);

  const atLimit = !isPremium && products.length >= maxProducts;
  const usagePercent = !isPremium ? Math.min((products.length / 10) * 100, 100) : 0;

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductForm>({
    defaultValues: buildDefaultProductFormValues(storeConfig),
  });

  const load = () => {
    setLoading(true);
    apiFetch<{ products: Product[] }>("/products", opts)
      .then((d) => setProducts(Array.isArray(d.products) ? d.products.map(normalizeProduct) : []))
      .catch(() => toastError("Erro ao carregar produtos"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token]);

  const openCreate = () => {
    if (atLimit) {
      setUpgradeOpen(true);
      return;
    }
    setEditingProduct(null);
    setPhotos([]);
    reset(buildDefaultProductFormValues(storeConfig));
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setPhotos(p.photos ?? []);
    reset({
      name: p.name,
      category: p.category,
      storage: p.storage,
      price: p.price,
      condition: p.condition,
      battery: p.battery,
      warranty: p.warranty,
      status: p.status,
      description: p.description,
      options_text: formatOptionsText(p.options),
      stock: p.stock ?? 1,
      unlimited_stock: p.unlimited_stock ?? true,
      width: p.width ?? DEFAULT_PRODUCT_DIMENSIONS.width,
      height: p.height ?? DEFAULT_PRODUCT_DIMENSIONS.height,
      length: p.length ?? DEFAULT_PRODUCT_DIMENSIONS.length,
      weight: p.weight ?? DEFAULT_PRODUCT_DIMENSIONS.weight,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: ProductForm) => {
    try {
      const body = {
        ...data,
        price: Number(data.price),
        stock: Number(data.stock || 0),
        options: parseOptionsText(data.options_text || ""),
        photos: Array.isArray(photos) ? photos.filter(Boolean) : [],
      };
      if (editingProduct) {
        await apiFetch(`/products/${editingProduct.id}`, { method: "PUT", ...opts, body: JSON.stringify(body) });
        success("Produto atualizado!");
      } else {
        await apiFetch("/products", { method: "POST", ...opts, body: JSON.stringify(body) });
        success("Produto criado!");
      }
      setDialogOpen(false);
      load();
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : "Erro ao salvar produto");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este produto?")) return;
    setDeletingId(id);
    try {
      await apiFetch(`/products/${id}`, { method: "DELETE", ...opts });
      success("Produto excluído");
      load();
    } catch {
      toastError("Erro ao excluir");
    } finally {
      setDeletingId(null);
    }
  };

  const duplicateProduct = async (p: Product) => {
    try {
      await apiFetch("/products", {
        method: "POST",
        ...opts,
        body: JSON.stringify({
          name: `${p.name} (copia)`,
          category: p.category,
          storage: p.storage,
          price: p.price,
          condition: p.condition,
          battery: p.battery,
          warranty: p.warranty,
          status: "disponivel",
          description: p.description,
          options: p.options ?? [],
          photos: Array.isArray(p.photos) ? p.photos.filter(Boolean) : [],
          stock: p.stock ?? 1,
          unlimited_stock: p.unlimited_stock ?? true,
        }),
      });
      success("Produto duplicado");
      load();
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : "Erro ao duplicar produto");
    }
  };

  const markAsSold = async (p: Product) => {
    try {
      await apiFetch(`/products/${p.id}`, {
        method: "PUT",
        ...opts,
        body: JSON.stringify({ status: "vendido" }),
      });
      success("Produto marcado como vendido");
      load();
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : "Erro ao atualizar produto");
    }
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadingPhoto(true);
    try {
      for (const file of files) {
        const compressed = await compressImage(file);
        const res = await apiFetch<{ url: string }>("/products/upload-photo", {
          method: "POST",
          ...opts,
          body: JSON.stringify({ image: compressed, mimeType: file.type }),
        });
        setPhotos((p) => [...p, res.url]);
      }
    } catch {
      toastError("Erro ao fazer upload da foto");
    } finally {
      setUploadingPhoto(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleRemoveBg = async (idx: number) => {
    const photo = photos[idx];
    setRemovingBgIdx(idx);
    try {
      const res = await apiFetch<{ url: string }>("/products/remove-bg", {
        method: "POST",
        ...opts,
        body: JSON.stringify({ image: photo }),
      });
      const newPhotos = [...photos];
      newPhotos[idx] = res.url;
      setPhotos(newPhotos);
      success("Fundo removido!");
    } catch (e: any) {
      toastError(e.message || "Erro ao remover fundo");
    } finally {
      setRemovingBgIdx(null);
    }
  };

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    const name = String(p.name ?? "").toLowerCase();
    const category = String(p.category ?? "").toLowerCase();
    return (
      (!q || name.includes(q) || category.includes(q)) &&
      (filterCat === "Todos" || p.category === filterCat) &&
      (filterStatus === "todos" || p.status === filterStatus)
    );
  });

  const categoryVal = watch("category") || storeConfig.categories[0];
  const conditionVal = watch("condition") || storeConfig.conditions[0];
  const statusVal    = watch("status")    || "disponivel";

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{storeConfig.productPlural}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {products.length} produto{products.length !== 1 ? "s" : ""} no catálogo
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo {storeConfig.productLabel.toLowerCase()}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto…"
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-500/10 transition-all"
          />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-44 bg-gray-50 border-gray-200 rounded-xl text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todas as categorias</SelectItem>
            {storeConfig.categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 bg-gray-50 border-gray-200 rounded-xl text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-56 skeleton rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-20 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">
            {search ? "Nenhum resultado encontrado" : "Nenhum produto cadastrado"}
          </p>
          {!search && (
            <button onClick={openCreate} className="mt-3 text-sm text-red-600 font-semibold hover:underline">
              Cadastrar primeiro produto
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const sc = statusCfg[p.status] ?? statusCfg.disponivel;
            const photo = Array.isArray(p.photos) ? p.photos[0] : undefined;
            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-gray-300 transition-all group"
              >
                <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                  {photo ? (
                    <img
                      src={photo}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg", sc.cls)}>
                      {sc.label}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="font-semibold text-gray-900 truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                    <span>{p.category}</span>
                    {p.storage   && <><span>·</span><span>{p.storage}</span></>}
                    {p.condition && <><span>·</span><span>{p.condition}</span></>}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-lg font-black text-gray-900">{formatPrice(p.price)}</p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        aria-label="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => duplicateProduct(p)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        aria-label="Duplicar"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      {p.status !== "vendido" && (
                        <button
                          onClick={() => markAsSold(p)}
                          className="p-2 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          aria-label="Marcar como vendido"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(p.id)}
                        disabled={deletingId === p.id}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        aria-label="Excluir"
                      >
                        {deletingId === p.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) setDialogOpen(false); }}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-0 shadow-2xl">
          <div className="bg-white rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <DialogTitle className="text-lg font-bold text-gray-900">
                {editingProduct ? `Editar ${storeConfig.productLabel.toLowerCase()}` : `Novo ${storeConfig.productLabel.toLowerCase()}`}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {editingProduct ? "Editar informacoes" : "Adicionar novo item ao catalogo"}
              </DialogDescription>
              <button
                onClick={() => setDialogOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Photos */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Fotos
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {photos.map((ph, i) => (
                      <div
                        key={i}
                        className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group"
                      >
                        <img src={ph} alt="" className="w-full h-full object-cover" />
                        {removingBgIdx === i ? (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleRemoveBg(i)}
                              className="absolute top-0.5 left-0.5 w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                              title="Remover fundo"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                              className="absolute top-0.5 right-0.5 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                              aria-label="Remover foto"
                            >
                              <X className="w-3.5 h-3.5 text-white" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                    {photos.length < 5 && (
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 hover:border-red-300 hover:bg-red-50 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-red-500 transition-all disabled:opacity-50"
                      >
                        {uploadingPhoto
                          ? <Loader2 className="w-5 h-5 animate-spin" />
                          : <><ImagePlus className="w-5 h-5" /><span className="text-xs font-medium">Foto</span></>}
                      </button>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handlePhoto}
                    />
                  </div>
                </div>

                <FormField
                  label={`Nome do ${storeConfig.productLabel.toLowerCase()}`}
                  placeholder="iPhone 14 Pro Max 256GB"
                  required
                  error={errors.name?.message}
                  {...register("name", { required: "Nome obrigatório" })}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {storeConfig.categoryLabel}
                    </label>
                    <Select value={categoryVal} onValueChange={(v) => setValue("category", v, { shouldDirty: true })}>
                      <SelectTrigger className="bg-gray-50 border-gray-200 rounded-xl text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {storeConfig.categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormField
                    label={storeConfig.variantLabel}
                    placeholder={storeConfig.variantPlaceholder}
                    {...register("storage")}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    label="Preço (R$)"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="3499.00"
                    required
                    error={errors.price?.message}
                    {...register("price", {
                      required: "Preço obrigatório",
                      min: { value: 0.01, message: "Deve ser maior que 0" },
                    })}
                  />
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Condição
                    </label>
                    <Select value={conditionVal} onValueChange={(v) => setValue("condition", v, { shouldDirty: true })}>
                      <SelectTrigger className="bg-gray-50 border-gray-200 rounded-xl text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {storeConfig.conditions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField label={storeConfig.detailLabel} placeholder={storeConfig.detailPlaceholder} {...register("battery")} />
                  <FormField label={storeConfig.warrantyLabel} placeholder={storeConfig.warrantyPlaceholder} {...register("warranty")} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Estoque" type="number" min="0" placeholder="5" {...register("stock")} />
                  <label className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 mt-6">
                    <input type="checkbox" {...register("unlimited_stock")} />
                    Estoque livre
                  </label>
                </div>

                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
                    <Package className="w-4 h-4" />
                    Dimensões para Frete (Melhor Envio)
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Peso (kg)" type="number" step="0.001" placeholder="0.300" {...register("weight")} />
                    <FormField label="Comprimento (cm)" type="number" placeholder="16" {...register("length")} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Largura (cm)" type="number" placeholder="11" {...register("width")} />
                    <FormField label="Altura (cm)" type="number" placeholder="2" {...register("height")} />
                  </div>
                  <p className="text-[10px] text-emerald-600 font-medium">
                    * Usado para calcular o valor exato da entrega no carrinho.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </label>
                  <Select value={statusVal} onValueChange={(v) => setValue("status", v, { shouldDirty: true })}>
                    <SelectTrigger className="bg-gray-50 border-gray-200 rounded-xl text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {storeConfig.descriptionLabel}
                  </label>
                  <textarea
                    {...register("description")}
                    placeholder={storeConfig.descriptionPlaceholder}
                    rows={3}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-500/10 transition-all resize-none"
                  />
                </div>

                {storeConfig.value !== "celulares" && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Adicionais e complementos
                    </label>
                    <textarea
                      {...register("options_text")}
                      placeholder={"Uma opcao por linha. Ex:\nLeite em po | 2\nMorango | 3\nBorda recheada | 8"}
                      rows={4}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-500/10 transition-all resize-none"
                    />
                    <p className="text-xs text-gray-400">
                      Cliente escolhe estes adicionais na vitrine; preço soma no carrinho e no pedido.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</>
                    : editingProduct ? "Salvar alterações" : "Criar produto"}
                </button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature="Produtos ilimitados" />
    </div>
  );
}
