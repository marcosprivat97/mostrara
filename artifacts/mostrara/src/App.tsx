import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import CrispChat from "@/components/CrispChat";

// Lazy-load all top-level routes for faster initial paint
const Landing = lazy(() => import("@/pages/Landing"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Storefront = lazy(() => import("@/pages/Storefront"));
const OrderTracking = lazy(() => import("@/pages/OrderTracking"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Suspense fallback={<PageLoader />}>
          <Switch>
            <Route path="/" component={Landing} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/dashboard/*" component={Dashboard} />
            <Route path="/loja/:storeSlug/pedido/:orderId" component={OrderTracking} />
            <Route path="/loja/:storeSlug" component={Storefront} />
            <Route path="/reset-password" component={ResetPassword} />
            <Route>
              <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-gray-900 mb-4">Página não encontrada</h1>
                  <p className="text-gray-600 mb-8">A página que você procura não existe.</p>
                  <a href="/" className="text-blue-600 hover:text-blue-700 underline">Voltar para o início</a>
                </div>
              </div>
            </Route>
          </Switch>
        </Suspense>
        <Toaster />
        <CrispChat />
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
