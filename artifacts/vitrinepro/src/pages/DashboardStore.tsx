import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { ExternalLink, Copy, Store, Link2, Settings } from "lucide-react";
import { useToastSimple } from "@/hooks/useToastSimple";

export default function DashboardStore() {
  const { user } = useAuth();
  const { success } = useToastSimple();
  const [, navigate] = useLocation();

  const storeUrl = user?.store_slug
    ? `${window.location.origin}${import.meta.env.BASE_URL}loja/${user.store_slug}`
    : null;

  const copyLink = () => {
    if (!storeUrl) return;
    navigator.clipboard.writeText(storeUrl);
    success("Link copiado!");
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Minha Loja</h1>
        <p className="text-gray-500 text-sm mt-0.5">Sua vitrine pública</p>
      </div>

      {/* Store card */}
      <div className="bg-gray-900 rounded-2xl overflow-hidden mb-4">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            {user?.logo_url ? (
              <img
                src={user.logo_url}
                alt="Logo"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-600/30 flex items-center justify-center">
                <Store className="w-8 h-8 text-red-400" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-white">{user?.store_name}</h2>
              <p className="text-gray-400 text-sm">{user?.city}</p>
            </div>
          </div>

          {user?.description && (
            <p className="text-gray-400 text-sm mb-5 leading-relaxed">{user.description}</p>
          )}

          <div className="bg-white/[0.07] rounded-xl p-3 mb-4 border border-white/10 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <p className="text-gray-300 text-sm font-mono truncate flex-1">{storeUrl}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={copyLink}
              className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold py-3 rounded-xl transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copiar link
            </button>
            {storeUrl && (
              <a
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold py-3 rounded-xl transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Ver vitrine
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {[
          { label: "WhatsApp",     value: user?.whatsapp,    icon: "📱" },
          { label: "Telefone",     value: user?.phone,       icon: "📞" },
          { label: "Slug da loja", value: `@${user?.store_slug}`, icon: "🔗" },
          { label: "Cidade",       value: user?.city,        icon: "📍" },
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">{item.icon}</span>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{item.label}</p>
            </div>
            <p className="text-sm font-semibold text-gray-900 truncate">{item.value || "—"}</p>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate("/dashboard/settings")}
        className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 font-semibold text-sm py-3 rounded-2xl transition-colors"
      >
        <Settings className="w-4 h-4" />
        Editar dados da loja
      </button>
    </div>
  );
}
