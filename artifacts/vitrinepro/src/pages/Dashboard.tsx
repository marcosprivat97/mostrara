import { useEffect } from "react";
import { useLocation, Switch, Route } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import DashboardOverview from "./DashboardOverview";
import DashboardProducts from "./DashboardProducts";
import DashboardSales from "./DashboardSales";
import DashboardStore from "./DashboardStore";
import DashboardSettings from "./DashboardSettings";

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
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

  if (!user) return null;

  return (
    <DashboardLayout>
      <Switch>
        <Route path="/dashboard" component={DashboardOverview} />
        <Route path="/dashboard/overview" component={DashboardOverview} />
        <Route path="/dashboard/products" component={DashboardProducts} />
        <Route path="/dashboard/sales" component={DashboardSales} />
        <Route path="/dashboard/store" component={DashboardStore} />
        <Route path="/dashboard/settings" component={DashboardSettings} />
      </Switch>
    </DashboardLayout>
  );
}
