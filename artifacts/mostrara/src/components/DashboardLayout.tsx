import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import {
  LayoutDashboard, Package, TrendingUp, Store, Settings, LogOut, Menu,
  ExternalLink, ChevronRight, Copy, MessageSquare, TicketPercent, Bot, Shield,
  Crown, Lock, ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToastSimple } from "@/hooks/useToastSimple";
import { copyTextToClipboard } from "@/lib/clipboard";
import { buildStoreUrl } from "@/lib/urls";

const baseNavItems = [
  { label: "Visao Geral", icon: LayoutDashboard, path: "/dashboard", premiumOnly: false },
  { label: "Gestao de Pedidos", icon: ClipboardList, path: "/dashboard/orders", premiumOnly: false },
  { label: "Produtos", icon: Package, path: "/dashboard/products", premiumOnly: false },
  { label: "Vendas", icon: TrendingUp, path: "/dashboard/sales", premiumOnly: false },
  { label: "Cupons", icon: TicketPercent, path: "/dashboard/coupons", premiumOnly: false },
  { label: "IA Mostrara", icon: Bot, path: "/dashboard/ai", premiumOnly: true },
  { label: "Minha Loja", icon: Store, path: "/dashboard/store", premiumOnly: false },
  { label: "Suporte", icon: MessageSquare, path: "/dashboard/support", premiumOnly: false },
  { label: "Configuracoes", icon: Settings, path: "/dashboard/settings", premiumOnly: false },
];

type NavItem = (typeof baseNavItems)[0];

function NavLink({ item, active, locked, onClick }: { item: NavItem; active: boolean; locked?: boolean; onClick?: () => void }) {
  const [, navigate] = useLocation();
  return (
    <button
      onClick={() => { navigate(item.path); onClick?.(); }}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
        active
          ? "bg-red-600 text-white shadow-md shadow-red-900/30"
          : "text-gray-400 hover:text-white hover:bg-white/[0.07]",
      )}
    >
      <item.icon className="w-4 h-4 flex-shrink-0" />
      {item.label}
      {locked && <Lock className="w-3 h-3 ml-auto text-gray-600" />}
      {active && !locked && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
    </button>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { isPremium, plan } = usePlan();
  const { success, error } = useToastSimple();
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    ...baseNavItems,
    ...(user?.email?.toLowerCase() === "sevenbeatx@gmail.com"
      ? [{ label: "Dev", icon: Shield, path: "/dashboard/admin", premiumOnly: false }]
      : []),
  ];

  const storeUrl = user?.store_slug ? buildStoreUrl(user.store_slug) : null;

  const copyStoreUrl = async () => {
    if (!storeUrl) return;
    try {
      await copyTextToClipboard(storeUrl);
      success("Link da loja copiado");
    } catch {
      error("Nao foi possivel copiar o link da loja");
    }
  };

  const mobileNavItems = [
    baseNavItems[0], // Visao Geral
    baseNavItems[1], // Gestao de Pedidos
    baseNavItems[2], // Produtos
    baseNavItems[6], // Minha Loja
  ];

  const SidebarContent = ({ onNavClick }: { onNavClick?: () => void }) => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 pl-2 pr-4 py-4 min-h-20 border-b border-white/[0.07]">
        <img src={user?.logo_url || "/mostrara-logo.png"} alt="Mostrara" className="h-16 w-44 object-contain object-left flex-shrink-0" />
        <div>
          <p className="text-white font-bold text-sm leading-tight sr-only">Mostrara</p>
          <p className="text-gray-500 text-xs leading-tight">Painel</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            item={item}
            active={item.path === "/dashboard"
              ? location === "/dashboard" || location === "/dashboard/"
              : location.startsWith(item.path)}
            locked={item.premiumOnly && !isPremium}
            onClick={onNavClick}
          />
        ))}
      </nav>

      <div className="px-3 py-4 space-y-2 border-t border-white/[0.07]">
        {storeUrl && (
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.07] rounded-xl transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              Ver vitrine
            </a>
            <button
              type="button"
              onClick={copyStoreUrl}
              className="px-3 py-2.5 text-gray-400 hover:text-white hover:bg-white/[0.07] rounded-xl transition-all"
              aria-label="Copiar link da vitrine"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Plan badge */}
        <div className={cn(
          "mx-1 px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-bold",
          isPremium
            ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/20"
            : "bg-white/[0.05] text-gray-500 border border-white/[0.07]"
        )}>
          {isPremium ? <Crown className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />}
          {isPremium ? "Premium ✨" : "Plano Free"}
          {!isPremium && (
            <button
              onClick={() => navigate("/dashboard/settings")}
              className="ml-auto text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md hover:bg-amber-500/30 transition-colors"
            >
              Upgrade
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-red-600/20 border border-red-600/30 flex items-center justify-center flex-shrink-0">
            <span className="text-red-400 font-semibold text-xs">
              {user?.store_name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.store_name}</p>
            <p className="text-gray-500 text-xs truncate">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-gray-50 flex overflow-x-hidden w-full relative">
      <aside className="hidden lg:flex flex-col w-60 bg-gray-900 fixed inset-y-0 left-0 z-40">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform duration-300 ease-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent onNavClick={() => setMobileOpen(false)} />
      </aside>

      <main className="flex-1 lg:ml-60 flex flex-col min-h-dvh max-w-[100vw] overflow-x-hidden">
        <div className="lg:hidden flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 bg-white/95 backdrop-blur border-b border-gray-200 sticky top-0 z-30">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100" aria-label="Abrir menu">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src={user?.logo_url || "/mostrara-logo.png"} alt="Mostrara" className="h-12 w-44 object-contain object-left" />
          </div>
          <div className="w-9" />
        </div>

        <div className="flex-1 p-4 pb-28 sm:p-6 lg:pb-6 w-full max-w-full overflow-x-hidden">
          {children}
        </div>

        <nav className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-xl px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
          <div className="grid grid-cols-4 gap-1">
            {mobileNavItems.map((item) => {
              const active = item.path === "/dashboard"
                ? location === "/dashboard" || location === "/dashboard/"
                : location.startsWith(item.path);
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "h-14 rounded-2xl flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition-all",
                    active ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "text-gray-500 active:bg-gray-100",
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="max-w-full truncate px-1">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </main>
    </div>
  );
}
