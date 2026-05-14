import { useEffect } from "react";
import { useLocation } from "wouter";
import { clearAuthToken, storeAuthToken } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

export default function GoogleAuthCallback() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      navigate("/login?auth=google-error");
      return;
    }

    storeAuthToken(token, true);
    apiFetch("/auth/me", { token })
      .then(() => {
        window.location.replace("/dashboard");
      })
      .catch(() => {
        clearAuthToken();
        navigate("/login?auth=google-error");
      });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 rounded-full border-2 border-red-600 border-t-transparent animate-spin mx-auto" />
        <p className="text-sm font-semibold text-gray-700">Conectando conta...</p>
      </div>
    </div>
  );
}
