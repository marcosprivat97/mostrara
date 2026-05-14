import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation, Switch, Route } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import OnboardingModal from "@/components/OnboardingModal";

// Lazy-load each dashboard page — only loads when user navigates to it
const DashboardOverview = lazy(() => import("./DashboardOverview"));
const DashboardProducts = lazy(() => import("./DashboardProducts"));
const DashboardSales = lazy(() => import("./DashboardSales"));
const DashboardStore = lazy(() => import("./DashboardStore"));
const DashboardSettings = lazy(() => import("./DashboardSettings"));
const DashboardCoupons = lazy(() => import("./DashboardCoupons"));
const DashboardSupport = lazy(() => import("./DashboardSupport"));
const DashboardAI = lazy(() => import("./DashboardAI"));
const DashboardAdmin = lazy(() => import("./DashboardAdmin"));
const DashboardOrdersKanban = lazy(() => import("./DashboardOrdersKanban"));

function PageSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

function DashboardNotFound() {
  const [, navigate] = useLocation();

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
        <div className="w-6 h-6 rounded-full border-2 border-red-300 border-dashed" />
      </div>
      <h2 className="text-xl font-bold text-gray-900">Area do painel nao encontrada</h2>
      <p className="text-sm text-gray-500 mt-2">Esse caminho nao existe no painel do lojista.</p>
      <button
        type="button"
        onClick={() => navigate("/dashboard")}
        className="mt-5 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
      >
        Voltar para a visao geral
      </button>
    </div>
  );
}

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      setRedirecting(true);
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">
            {redirecting ? "Voltando para o login..." : "Abrindo painel..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <DashboardLayout>
        <Suspense fallback={<PageSpinner />}>
          <Switch>
            <Route path="/dashboard" component={DashboardOverview} />
            <Route path="/dashboard/overview" component={DashboardOverview} />
            <Route path="/dashboard/orders" component={DashboardOrdersKanban} />
            <Route path="/dashboard/products" component={DashboardProducts} />
            <Route path="/dashboard/sales" component={DashboardSales} />
            <Route path="/dashboard/coupons" component={DashboardCoupons} />
            <Route path="/dashboard/ai" component={DashboardAI} />
            <Route path="/dashboard/store" component={DashboardStore} />
            <Route path="/dashboard/support" component={DashboardSupport} />
            <Route path="/dashboard/settings" component={DashboardSettings} />
            <Route path="/dashboard/admin" component={DashboardAdmin} />
            <Route component={DashboardNotFound} />
          </Switch>
        </Suspense>
      </DashboardLayout>
      <OnboardingModal />
    </>
  );
}
