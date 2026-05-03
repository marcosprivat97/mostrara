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

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      setRedirecting(true);
      navigate("/");
    }
  }, [user, isLoading]);

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
            {redirecting ? "Voltando para a landing..." : "Abrindo painel..."}
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
          </Switch>
        </Suspense>
      </DashboardLayout>
      <OnboardingModal />
    </>
  );
}
