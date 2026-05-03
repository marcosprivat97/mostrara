import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, Loader2, Image as ImageIcon, ExternalLink, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToastSimple } from "@/hooks/useToastSimple";

interface UnsplashPhoto {
  id: string;
  url: string;
  thumb: string;
  user: {
    name: string;
    link: string;
  };
}

interface UnsplashSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (imageUrl: string) => void;
  title?: string;
  token?: string;
}

export default function UnsplashSearchModal({ open, onOpenChange, onSelect, title = "Buscar Imagem Profissional", token }: UnsplashSearchModalProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const { error } = useToastSimple();

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const data = await apiFetch<{ photos: UnsplashPhoto[] }>(`/unsplash/search?query=${encodeURIComponent(query)}`, {
        token,
      });
      setPhotos(data.photos);
    } catch (err: any) {
      error(err.message || "Erro ao buscar imagens");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 border-0 shadow-2xl overflow-hidden rounded-3xl">
        <div className="bg-white flex flex-col max-h-[85dvh]">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <DialogTitle className="font-bold text-gray-900">{title}</DialogTitle>
              <DialogDescription className="text-xs text-gray-500 mt-1">Imagens profissionais gratuitas via Unsplash</DialogDescription>
            </div>
            <button onClick={() => onOpenChange(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            <form onSubmit={handleSearch} className="relative mb-6">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Ex: Hambúrguer, Moda, Eletrônicos..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-24 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/10 transition-all"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-black transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Buscar"}
              </button>
            </form>

            <div className="flex-1 overflow-y-auto min-h-[300px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <p className="text-sm">Buscando fotos profissionais...</p>
                </div>
              ) : photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photos.map((photo) => (
                    <div key={photo.id} className="group relative aspect-video rounded-xl overflow-hidden cursor-pointer bg-gray-100 border border-gray-100 hover:border-red-400 transition-all shadow-sm hover:shadow-md" onClick={() => onSelect(photo.url)}>
                      <img src={photo.thumb} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-xs font-bold bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/30">Selecionar</span>
                      </div>
                      <a 
                        href={photo.user.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="absolute bottom-1 right-1 text-[10px] text-white/70 hover:text-white flex items-center gap-0.5 bg-black/20 backdrop-blur-sm px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {photo.user.name} <ExternalLink className="w-2 h-2" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : query && !loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
                  <p className="text-sm">Nenhuma foto encontrada para "{query}"</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
                  <p className="text-sm">Busque por temas para ver fotos incríveis</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
