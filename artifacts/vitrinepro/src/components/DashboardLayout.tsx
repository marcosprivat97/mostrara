import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Package, TrendingUp, Store, Settings,
  LogOut, Menu, X, ExternalLink, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Visão Geral", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Produtos", icon: Package, path: "/dashboard/products" },
  { label: "Vendas", icon: TrendingUp, path: "/dashboard/sales" },
  { label: "Minha Loja", icon: Store, path: "/dashboard/store" },
  { label: "Configurações", icon: Settings, path: "/dashboard/settings" },
];

function NavLink({
  item,
  active,
  onClick,
}: {
  item: (typeof navItems)[0];
  active: boolean;
  onClick?: () => void;
}) {
  const [, navigate] = useLocation();
  return (
    <button
      onClick={() => { navigate(item.path); onClick?.(); }}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
        active
          ? "bg-red-600 text-white shadow-md shadow-red-900/30"
          : "text-gray-400 hover:text-white hover:bg-white/[0.07]"
      )}
    >
      <item.icon className="w-4 h-4 flex-shrink-0" />
      {item.label}
      {active && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
    </button>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const storeUrl = user?.store_slug
    ? `${window.location.origin}${import.meta.env.BASE_URL}loja/${user.store_slug}`
    : null;

  const SidebarContent = ({ onNavClick }: { onNavClick?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-white/[0.07]">
        <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center flex-shrink-0">
          <Store className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">VitrinePro</p>
          <p className="text-gray-500 text-xs leading-tight">Painel</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            item={item}
            active={item.path === "/dashboard"
              ? location === "/dashboard" || location === "/dashboard/"
              : location.startsWith(item.path)}
            onClick={onNavClick}
          />
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 space-y-2 border-t border-white/[0.07]">
        {storeUrl && (
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.07] rounded-xl transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            Ver minha vitrine
          </a>
        )}

        {/* User */}
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-red-600/20 border border-red-600/30 flex items-center justify-center flex-shrink-0">
            <span className="text-red-400 font-semibold text-xs">
              {user?.store_name?.charAt(0).toUpperCase()}
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-gray-900 fixed inset-y-0 left-0 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform duration-300 ease-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent onNavClick={() => setMobileOpen(false)} />
      </aside>

      {/* Main */}
      <main className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-red-600 flex items-center justify-center">
              <Store className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">VitrinePro</span>
          </div>
          <div className="w-9" />
        </div>

        {/* Page content */}
        <div className="flex-1 p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
