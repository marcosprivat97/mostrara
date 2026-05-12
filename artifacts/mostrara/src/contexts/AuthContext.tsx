import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { apiFetch } from "@/lib/api";
import { identifyAnalytics, resetAnalytics, trackAnalytics } from "@/lib/analytics";
import { clearSentryUser, setSentryUser } from "@/lib/sentry";

interface User {
  id: string;
  store_name: string;
  owner_name: string;
  email: string;
  phone: string;
  whatsapp: string;
  store_slug: string;
  store_type?: string;
  description?: string;
  city?: string;
  state?: string;
  store_cep?: string;
  store_address?: string;
  store_address_number?: string;
  store_neighborhood?: string;
  store_latitude?: string;
  store_longitude?: string;
  logo_url?: string;
  cover_url?: string;
  theme_primary?: string;
  theme_secondary?: string;
  theme_accent?: string;
  plan?: string;
  free_forever?: boolean;
  verified_badge?: boolean;
  plan_started_at?: string | null;
  plan_expires_at?: string | null;
  mp_connected_at?: string | null;
  mp_user_id?: string | null;
  mp_access_token_expires_at?: string | null;
  mp_refresh_token_expires_at?: string | null;
  onboarding_completed_at?: string | null;
  is_open?: boolean;
  store_hours?: string;
  delivery_fee_type?: "none" | "fixed" | "distance";
  delivery_fee_amount?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<string | null>;
  confirmPasswordReset: (token: string, newPassword: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  store_name: string;
  store_slug?: string;
  owner_name: string;
  email: string;
  password: string;
  phone: string;
  whatsapp: string;
  store_type?: string;
  city?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const TOKEN_KEY = "mostrara_token";

function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

export function storeAuthToken(token: string, remember = true) {
  const primary = remember ? localStorage : sessionStorage;
  const secondary = remember ? sessionStorage : localStorage;
  primary.setItem(TOKEN_KEY, token);
  secondary.removeItem(TOKEN_KEY);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    const t = getStoredToken();
    if (!t) return;
    try {
      const data = await apiFetch<{ user: User }>("/auth/me", { token: t });
      setUser(data.user);
      identifyAnalytics({
        id: data.user.id,
        email: data.user.email,
        store_name: data.user.store_name,
        store_type: data.user.store_type,
      });
      setSentryUser(data.user);
    } catch {
      clearAuthToken();
      setToken(null);
      setUser(null);
      resetAnalytics();
    }
  };

  useEffect(() => {
    const t = getStoredToken();
    if (!t) {
      setIsLoading(false);
      return;
    }
    apiFetch<{ user: User }>("/auth/me", { token: t })
      .then((data) => {
        setUser(data.user);
        setToken(t);
        identifyAnalytics({
          id: data.user.id,
          email: data.user.email,
          store_name: data.user.store_name,
          store_type: data.user.store_type,
        });
        setSentryUser(data.user);
      })
      .catch(() => {
        clearAuthToken();
        setToken(null);
        resetAnalytics();
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string, remember = true) => {
    const data = await apiFetch<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    storeAuthToken(data.token, remember);
    setToken(data.token);
    setUser(data.user);
    identifyAnalytics({
      id: data.user.id,
      email: data.user.email,
      store_name: data.user.store_name,
      store_type: data.user.store_type,
    });
    setSentryUser(data.user);
    trackAnalytics("login", {
      remember,
      store_type: data.user.store_type,
    });
  };

  const register = async (body: RegisterData) => {
    const data = await apiFetch<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    });
    storeAuthToken(data.token, true);
    setToken(data.token);
    setUser(data.user);
    identifyAnalytics({
      id: data.user.id,
      email: data.user.email,
      store_name: data.user.store_name,
      store_type: data.user.store_type,
    });
    setSentryUser(data.user);
    trackAnalytics("register", {
      store_type: data.user.store_type,
      city: data.user.city,
    });
  };

  const requestPasswordReset = async (email: string) => {
    const data = await apiFetch<{ success: boolean; reset_url?: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    return data.reset_url ?? null;
  };

  const confirmPasswordReset = async (token: string, newPassword: string) => {
    await apiFetch("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  };

  const completeOnboarding = async () => {
    const data = await apiFetch<{ user: User }>("/settings/onboarding/complete", {
      method: "POST",
      token: getStoredToken() ?? undefined,
    });
    setUser(data.user);
    trackAnalytics("onboarding_complete", {
      store_type: data.user.store_type,
    });
  };

  const logout = () => {
    trackAnalytics("logout");
    clearAuthToken();
    setToken(null);
    setUser(null);
    resetAnalytics();
    clearSentryUser();
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      login,
      register,
      requestPasswordReset,
      confirmPasswordReset,
      completeOnboarding,
      logout,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export type { User };
