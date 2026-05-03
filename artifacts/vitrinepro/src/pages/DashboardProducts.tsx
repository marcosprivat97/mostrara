import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/contexts/AuthContext";
import { useToastSimple } from "@/hooks/useToastSimple";
import { apiFetch } from "@/lib/api";
import { compressImage } from "@/lib/compress";
import { formatPrice } from "@/lib/formatters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Search, Plus, Pencil, Trash2, Loader2, Package, X, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: string; name: string; category: string; storage: string; price: number;
  condition: string; battery: string; warranty: string; status: string;
  description: string; photos: string[];
}

interface ProductForm {
  name: string; category: string; storage: string; price: number;
  condition: string; battery: string; warranty: string; status: string; description: string;
}

const CATEGORIES = ["iPhone", "Samsung", "Xiaomi", "Motorola", "Acessórios", "Outro"];
const CONDITIONS = ["Vitrine", "Novo", "Usado A+", "Usado A", "Usado B"];
const STATUSES = [
  { value: "disponivel", label: "Disponível" },
  { value: "reservado", label: "Reservado" },
  { value: "vendido", label: "Vendido" },
];

const statusCfg: Record<string, { label: string; cls: string }> = {
  disponivel: { label: "Disponível", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  reservado: { label: "Reservado", cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  vendido: { label: "Vendido", cls: "bg-gray-100 text-gray-500 border border-gray-200" },
};

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

export default function DashboardProducts() {
  const { token } = useAuth();
  const { success, error } = useToastSimple();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const headers = { Authorization: `Bearer ${token}` };

  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<ProductForm>({
    defaultValues: { category: "iPhone", condition: "Vitrine", status: "disponivel" },
  });

  const load = () => {
    setLoading(true);
    apiFetch<{ products: Product[] }>("/products", { headers })
      .then(d => setProducts(d.products))
      .catch(() => error("Erro ao carregar produtos"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token]);

  const openCreate = () => {
    setEditingProduct(null);
    setPhotos([]);
    reset({ category: "iPhone", condition: "Vitrine", status: "disponivel" });
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setPhotos(p.photos || []);
    reset({
      name: p.name, category: p.category, storage: p.storage, price: p.price,
      condition: p.condition, battery: p.battery, warranty: p.warranty,
      status: p.status, description: p.description,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: ProductForm) => {
    try {
      const body = { ...data, price: Number(data.price), photos };
      if (editingProduct) {
        await apiFetch(`/products/${editingProduct.id}`, {
          method: "PUT", headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        success("Produto atualizado!");
      } else {
        await apiFetch("/products", {
          method: "POST", headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        success("Produto criado!");
      }
      setDialogOpen(false);
      load();
    } catch { error("Erro ao salvar produto"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este produto?")) return;
    setDeletingId(id);
    try {
      await apiFetch(`/products/${id}`, { method: "DELETE", headers });
      success("Produto excluído");
      load();
    } catch { error("Erro ao excluir"); }
    finally { setDeletingId(null); }
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingPhoto(true);
    try {
      for (const file of files) {
        const compressed = await compressImage(file);
        const res = await apiFetch<{ url: string }>("/products/upload-photo", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ image: compressed, mimeType: file.type }),
        });
        setPhotos(p => [...p, res.url]);
      }
    } catch { error("Erro ao fazer upload da foto"); }
    finally { setUploadingPhoto(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    const matchCat = filterCat === "Todos" || p.category === filterCat;
    const matchStatus = filterStatus === "todos" || p.status === filterStatus;
    return matchSearch && matchCat && matchStatus;
  });

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
          <p className="text-gray-500 text-sm mt-0.5">{products.length} produto{products.length !== 1 ? "s" : ""} no catálogo</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo produto
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-500/10 transition-all"
          />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-36 bg-gray-50 border-gray-200 rounded-xl text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todas as categorias</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 bg-gray-50 border-gray-200 rounded-xl text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Products grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-56 skeleton rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-20 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">{search ? "Nenhum resultado" : "Nenhum produto cadastrado"}</p>
          {!search && (
            <button onClick={openCreate} className="mt-3 text-sm text-red-600 font-semibold hover:underline">
              Cadastrar primeiro produto
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => {
            const sc = statusCfg[p.status] || statusCfg.disponivel;
            const photo = p.photos?.[0];
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-gray-300 transition-all group">
                <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                  {photo ? (
                    <img src={photo} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg", sc.cls)}>{sc.label}</span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="font-semibold text-gray-900 truncate">{p.name}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                    <span>{p.category}</span>
                    {p.storage && <><span>·</span><span>{p.storage}</span></>}
                    {p.condition && <><span>·</span><span>{p.condition}</span></>}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-lg font-black text-gray-900">{formatPrice(p.price)}</p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        disabled={deletingId === p.id}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {deletingId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-0 shadow-2xl">
          <div className="bg-white rounded-2xl overflow-hidden">
            {/* Dialog header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editingProduct ? "Editar produto" : "Novo produto"}
              </h2>
              <button
                onClick={() => setDialogOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
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
                      <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group">
                        <img src={ph} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}
                          className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploadingPhoto || photos.length >= 5}
                      className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 hover:border-red-300 hover:bg-red-50 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-red-500 transition-all disabled:opacity-50"
                    >
                      {uploadingPhoto ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ImagePlus className="w-5 h-5" /><span className="text-xs font-medium">Foto</span></>}
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhoto} />
                  </div>
                </div>

                <FormInput label="Nome do produto" placeholder="iPhone 14 Pro Max 256GB" required
                  error={errors.name?.message}
                  {...register("name", { required: "Nome obrigatório" })}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoria</label>
                    <Select value={undefined} onValueChange={v => setValue("category", v)} defaultValue="iPhone">
                      <SelectTrigger className="bg-gray-50 border-gray-200 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <FormInput label="Armazenamento" placeholder="256GB" {...register("storage")} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormInput label="Preço (R$)" type="number" step="0.01" placeholder="3499.00" required
                    error={errors.price?.message}
                    {...register("price", { required: "Preço obrigatório", min: { value: 0.01, message: "Deve ser maior que 0" } })}
                  />
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Condição</label>
                    <Select defaultValue="Vitrine" onValueChange={v => setValue("condition", v)}>
                      <SelectTrigger className="bg-gray-50 border-gray-200 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormInput label="Bateria" placeholder="95%" {...register("battery")} />
                  <FormInput label="Garantia" placeholder="6 meses" {...register("warranty")} />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</label>
                  <Select defaultValue="disponivel" onValueChange={v => setValue("status", v)}>
                    <SelectTrigger className="bg-gray-50 border-gray-200 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Descrição</label>
                  <textarea
                    {...register("description")}
                    placeholder="Detalhes adicionais do produto..."
                    rows={3}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-500/10 transition-all resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
                <button type="button" onClick={() => setDialogOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                  {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : editingProduct ? "Salvar alterações" : "Criar produto"}
                </button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
