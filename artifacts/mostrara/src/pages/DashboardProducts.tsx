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
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Package,
  X,
  ImagePlus,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getStoreTypeConfig, resolveStoreTypeFromProfile } from "@/lib/store-types";
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

const DEFAULT_PRODUCT_DIMENSIONS = {
  width: 11,
  height: 2,
  length: 16,
  weight: 0.3,
} as const;

const STATUS_CLASSES: Record<string, string> = {
  disponivel: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  reservado: "bg-amber-50 text-amber-700 border border-amber-200",
  vendido: "bg-gray-100 text-gray-500 border border-gray-200",
};

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
    status: storeConfig.statusOptions[0]?.value || "disponivel",
    description: "",
    options_text: "",
    stock: 1,
    unlimited_stock: true,
    ...DEFAULT_PRODUCT_DIMENSIONS,
  };
}

function normalizeProduct(p: Partial<Product>): Product {
  return {
    id: String(p.id ?? crypto.randomUUID()),
    name: String(p.name ?? "Item sem nome"),
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

function getStatusView(status: string, storeConfig: ReturnType<typeof getStoreTypeConfig>) {
  return {
    label: storeConfig.statusLabels[status as keyof typeof storeConfig.statusLabels] || storeConfig.statusLabels.disponivel,
    cls: STATUS_CLASSES[status] || STATUS_CLASSES.disponivel,
  };
}

function getSearchPlaceholder(storeConfig: ReturnType<typeof getStoreTypeConfig>) {
  return `Buscar ${storeConfig.productPlural}...`;
}

function getNamePlaceholder(storeConfig: ReturnType<typeof getStoreTypeConfig>) {
  if (storeConfig.mode === "booking") return "Servico premium com horario flexivel";
  if (storeConfig.mode === "food") return "Combo especial da casa";
  return "Combo especial da casa";
}

function getOptionsPlaceholder(storeConfig: ReturnType<typeof getStoreTypeConfig>) {
  if (storeConfig.mode === "food") {
    return "Uma opcao por linha. Ex:\nLeite em po | 2\nMorango | 3\nBorda recheada | 8";
  }
  return "Uma opcao por linha. Ex:\nAplicacao premium | 20\nAtendimento express | 35";
}

function buildCatalogCountLabel(count: number, storeConfig: ReturnType<typeof getStoreTypeConfig>) {
  const singular = storeConfig.productLabel.toLowerCase();
  const plural = storeConfig.productPlural;
  return `${count} ${count === 1 ? singular : plural} no catalogo`;
}

function buildProductPayload(
  data: ProductForm,
  photos: string[],
  storeConfig: ReturnType<typeof getStoreTypeConfig>,
) {
  return {
    name: data.name,
    category: data.category,
    storage: data.storage,
    price: Number(data.price),
    condition: data.condition,
    battery: data.battery,
    warranty: data.warranty,
    status: data.status,
    description: data.description,
    options: storeConfig.capabilities.productOptions ? parseOptionsText(data.options_text || "") : [],
    photos: Array.isArray(photos) ? photos.filter(Boolean) : [],
    stock: storeConfig.capabilities.inventory ? Number(data.stock || 0) : 1,
    unlimited_stock: storeConfig.capabilities.inventory ? Boolean(data.unlimited_stock) : true,
    width: storeConfig.capabilities.shippingDimensions
      ? normalizePositiveNumber(data.width, DEFAULT_PRODUCT_DIMENSIONS.width, 0.1)
      : DEFAULT_PRODUCT_DIMENSIONS.width,
    height: storeConfig.capabilities.shippingDimensions
      ? normalizePositiveNumber(data.height, DEFAULT_PRODUCT_DIMENSIONS.height, 0.1)
      : DEFAULT_PRODUCT_DIMENSIONS.height,
    length: storeConfig.capabilities.shippingDimensions
      ? normalizePositiveNumber(data.length, DEFAULT_PRODUCT_DIMENSIONS.length, 0.1)
      : DEFAULT_PRODUCT_DIMENSIONS.length,
    weight: storeConfig.capabilities.shippingDimensions
      ? normalizePositiveNumber(data.weight, DEFAULT_PRODUCT_DIMENSIONS.weight, 0.01)
      : DEFAULT_PRODUCT_DIMENSIONS.weight,
  };
}

function FormField({
  label,
  error,
  required,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        {...props}
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
}

export default function DashboardProducts() {
  const { token, user } = useAuth();
  const { isPremium, maxProducts } = usePlan();
  const { success, error: toastError } = useToastSimple();
  const storeConfig = getStoreTypeConfig(resolveStoreTypeFromProfile(user));
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
  const productLabelLower = storeConfig.productLabel.toLowerCase();
  const atLimit = !isPremium && products.length >= maxProducts;

  const requireCatalogSlot = () => {
    if (!atLimit) return true;
    setUpgradeOpen(true);
    toastError(`O plano atual permite ate ${maxProducts} ${storeConfig.productPlural}.`);
    return false;
  };

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
      .then((data) => setProducts(Array.isArray(data.products) ? data.products.map(normalizeProduct) : []))
      .catch(() => toastError("Erro ao carregar itens"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [token]);

  const openCreate = () => {
    if (!requireCatalogSlot()) return;
    setEditingProduct(null);
    setPhotos([]);
    reset(buildDefaultProductFormValues(storeConfig));
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setPhotos(product.photos ?? []);
    reset({
      name: product.name,
      category: product.category,
      storage: product.storage,
      price: product.price,
      condition: product.condition,
      battery: product.battery,
      warranty: product.warranty,
      status: product.status,
      description: product.description,
      options_text: formatOptionsText(product.options),
      stock: product.stock ?? 1,
      unlimited_stock: product.unlimited_stock ?? true,
      width: product.width ?? DEFAULT_PRODUCT_DIMENSIONS.width,
      height: product.height ?? DEFAULT_PRODUCT_DIMENSIONS.height,
      length: product.length ?? DEFAULT_PRODUCT_DIMENSIONS.length,
      weight: product.weight ?? DEFAULT_PRODUCT_DIMENSIONS.weight,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: ProductForm) => {
    try {
      if (!editingProduct && !requireCatalogSlot()) return;
      const body = buildProductPayload(data, photos, storeConfig);
      if (editingProduct) {
        await apiFetch(`/products/${editingProduct.id}`, {
          method: "PUT",
          ...opts,
          body: JSON.stringify(body),
        });
        success(`${storeConfig.productLabel} atualizado!`);
      } else {
        await apiFetch("/products", {
          method: "POST",
          ...opts,
          body: JSON.stringify(body),
        });
        success(`${storeConfig.productLabel} criado!`);
      }
      setDialogOpen(false);
      load();
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : `Erro ao salvar ${productLabelLower}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Excluir este ${productLabelLower}?`)) return;
    setDeletingId(id);
    try {
      await apiFetch(`/products/${id}`, { method: "DELETE", ...opts });
      success(`${storeConfig.productLabel} excluido`);
      load();
    } catch {
      toastError("Erro ao excluir");
    } finally {
      setDeletingId(null);
    }
  };

  const duplicateProduct = async (product: Product) => {
    try {
      if (!requireCatalogSlot()) return;
      await apiFetch("/products", {
        method: "POST",
        ...opts,
        body: JSON.stringify({
          name: `${product.name} (copia)`,
          category: product.category,
          storage: product.storage,
          price: product.price,
          condition: product.condition,
          battery: product.battery,
          warranty: product.warranty,
          status: storeConfig.statusOptions[0]?.value || "disponivel",
          description: product.description,
          options: storeConfig.capabilities.productOptions ? product.options ?? [] : [],
          photos: Array.isArray(product.photos) ? product.photos.filter(Boolean) : [],
          stock: storeConfig.capabilities.inventory ? product.stock ?? 1 : 1,
          unlimited_stock: storeConfig.capabilities.inventory ? product.unlimited_stock ?? true : true,
          width: storeConfig.capabilities.shippingDimensions ? product.width ?? DEFAULT_PRODUCT_DIMENSIONS.width : DEFAULT_PRODUCT_DIMENSIONS.width,
          height: storeConfig.capabilities.shippingDimensions ? product.height ?? DEFAULT_PRODUCT_DIMENSIONS.height : DEFAULT_PRODUCT_DIMENSIONS.height,
          length: storeConfig.capabilities.shippingDimensions ? product.length ?? DEFAULT_PRODUCT_DIMENSIONS.length : DEFAULT_PRODUCT_DIMENSIONS.length,
          weight: storeConfig.capabilities.shippingDimensions ? product.weight ?? DEFAULT_PRODUCT_DIMENSIONS.weight : DEFAULT_PRODUCT_DIMENSIONS.weight,
        }),
      });
      success(`${storeConfig.productLabel} duplicado`);
      load();
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : "Erro ao duplicar");
    }
  };

  const markAsSold = async (product: Product) => {
    try {
      await apiFetch(`/products/${product.id}`, {
        method: "PUT",
        ...opts,
        body: JSON.stringify({ status: "vendido" }),
      });
      success(`${storeConfig.productLabel} marcado como ${storeConfig.statusLabels.vendido.toLowerCase()}`);
      load();
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : "Erro ao atualizar status");
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
        setPhotos((current) => [...current, res.url]);
      }
    } catch {
      toastError("Erro ao fazer upload da foto");
    } finally {
      setUploadingPhoto(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleRemoveBg = async (idx: number) => {
    if (!storeConfig.capabilities.backgroundRemoval) return;
    const photo = photos[idx];
    setRemovingBgIdx(idx);
    try {
      const res = await apiFetch<{ url: string }>("/products/remove-bg", {
        method: "POST",
        ...opts,
        body: JSON.stringify({ image: photo }),
      });
      const nextPhotos = [...photos];
      nextPhotos[idx] = res.url;
      setPhotos(nextPhotos);
      success("Fundo removido!");
    } catch (e: any) {
      toastError(e.message || "Erro ao remover fundo");
    } finally {
      setRemovingBgIdx(null);
    }
  };

  const filtered = products.filter((product) => {
    const q = search.toLowerCase();
    const name = String(product.name ?? "").toLowerCase();
    const category = String(product.category ?? "").toLowerCase();
    return (
      (!q || name.includes(q) || category.includes(q)) &&
      (filterCat === "Todos" || product.category === filterCat) &&
      (filterStatus === "todos" || product.status === filterStatus)
    );
  });

  const categoryVal = watch("category") || storeConfig.categories[0];
  const conditionVal = watch("condition") || storeConfig.conditions[0];
  const statusVal = watch("status") || storeConfig.statusOptions[0]?.value || "disponivel";

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{storeConfig.productPlural}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{buildCatalogCountLabel(products.length, storeConfig)}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo {productLabelLower}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={getSearchPlaceholder(storeConfig)}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-500/10 transition-all"
          />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-44 bg-gray-50 border-gray-200 rounded-xl text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todas as categorias</SelectItem>
            {storeConfig.categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44 bg-gray-50 border-gray-200 rounded-xl text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {storeConfig.statusOptions.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, idx) => (
            <div key={idx} className="h-56 skeleton rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-20 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">
            {search ? "Nenhum resultado encontrado" : `Nenhum ${productLabelLower} cadastrado`}
          </p>
          {!search && (
            <button onClick={openCreate} className="mt-3 text-sm text-red-600 font-semibold hover:underline">
              Cadastrar primeiro {productLabelLower}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((product) => {
            const status = getStatusView(product.status, storeConfig);
            const photo = Array.isArray(product.photos) ? product.photos[0] : undefined;
            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-gray-300 transition-all group"
              >
                <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                  {photo ? (
                    <img
                      src={photo}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg", status.cls)}>
                      {status.label}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="font-semibold text-gray-900 truncate">{product.name}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                    <span>{product.category}</span>
                    {product.storage && (
                      <>
                        <span>·</span>
                        <span>{product.storage}</span>
                      </>
                    )}
                    {product.condition && (
                      <>
                        <span>·</span>
                        <span>{product.condition}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-lg font-black text-gray-900">{formatPrice(product.price)}</p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(product)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        aria-label="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => duplicateProduct(product)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        aria-label="Duplicar"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      {product.status !== "vendido" && (
                        <button
                          onClick={() => markAsSold(product)}
                          className="p-2 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          aria-label={`Marcar como ${storeConfig.statusLabels.vendido.toLowerCase()}`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(product.id)}
                        disabled={deletingId === product.id}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        aria-label="Excluir"
                      >
                        {deletingId === product.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false); }}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-0 shadow-2xl">
          <div className="bg-white rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <DialogTitle className="text-lg font-bold text-gray-900">
                {editingProduct ? `Editar ${productLabelLower}` : `Novo ${productLabelLower}`}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {editingProduct ? "Editar informacoes" : `Adicionar novo ${productLabelLower} ao catalogo`}
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
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Fotos
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {photos.map((photo, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group">
                        <img src={photo} alt="" className="w-full h-full object-cover" />
                        {removingBgIdx === idx ? (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          </div>
                        ) : (
                          <>
                            {storeConfig.capabilities.backgroundRemoval && (
                              <button
                                type="button"
                                onClick={() => handleRemoveBg(idx)}
                                className="absolute top-0.5 left-0.5 w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                title="Remover fundo"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setPhotos((current) => current.filter((_, photoIdx) => photoIdx !== idx))}
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
                        {uploadingPhoto ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <ImagePlus className="w-5 h-5" />
                            <span className="text-xs font-medium">Foto</span>
                          </>
                        )}
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
                  label={`Nome do ${productLabelLower}`}
                  placeholder={getNamePlaceholder(storeConfig)}
                  required
                  error={errors.name?.message}
                  {...register("name", { required: "Nome obrigatorio" })}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {storeConfig.categoryLabel}
                    </label>
                    <Select value={categoryVal} onValueChange={(value) => setValue("category", value, { shouldDirty: true })}>
                      <SelectTrigger className="bg-gray-50 border-gray-200 rounded-xl text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {storeConfig.categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
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
                    label="Preco (R$)"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="49.90"
                    required
                    error={errors.price?.message}
                    {...register("price", {
                      required: "Preco obrigatorio",
                      min: { value: 0.01, message: "Deve ser maior que 0" },
                    })}
                  />
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {storeConfig.conditionLabel}
                    </label>
                    <Select value={conditionVal} onValueChange={(value) => setValue("condition", value, { shouldDirty: true })}>
                      <SelectTrigger className="bg-gray-50 border-gray-200 rounded-xl text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {storeConfig.conditions.map((condition) => (
                          <SelectItem key={condition} value={condition}>
                            {condition}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    label={storeConfig.detailLabel}
                    placeholder={storeConfig.detailPlaceholder}
                    {...register("battery")}
                  />
                  <FormField
                    label={storeConfig.warrantyLabel}
                    placeholder={storeConfig.warrantyPlaceholder}
                    {...register("warranty")}
                  />
                </div>

                {storeConfig.capabilities.inventory ? (
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      label={storeConfig.inventoryLabel}
                      type="number"
                      min="0"
                      placeholder="5"
                      {...register("stock")}
                    />
                    <label className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 mt-6">
                      <input type="checkbox" {...register("unlimited_stock")} />
                      {storeConfig.inventoryUnlimitedLabel}
                    </label>
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-800">
                    Este nicho trabalha com agenda e disponibilidade. O item fica livre por padrao e pode ser pausado pelo status.
                  </div>
                )}

                {storeConfig.capabilities.shippingDimensions && (
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-4">
                    <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
                      <Package className="w-4 h-4" />
                      Dimensoes para Frete
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
                      Usado para calcular o valor exato da entrega no carrinho.
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </label>
                  <Select value={statusVal} onValueChange={(value) => setValue("status", value, { shouldDirty: true })}>
                    <SelectTrigger className="bg-gray-50 border-gray-200 rounded-xl text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {storeConfig.statusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
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

                {storeConfig.capabilities.productOptions && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {storeConfig.optionsLabel}
                    </label>
                    <textarea
                      {...register("options_text")}
                      placeholder={getOptionsPlaceholder(storeConfig)}
                      rows={4}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-500/10 transition-all resize-none"
                    />
                    <p className="text-xs text-gray-400">
                      O cliente escolhe esses adicionais na vitrine; o preco soma no carrinho e no pedido.
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
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                    </>
                  ) : editingProduct ? (
                    "Salvar alteracoes"
                  ) : (
                    `Criar ${productLabelLower}`
                  )}
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
