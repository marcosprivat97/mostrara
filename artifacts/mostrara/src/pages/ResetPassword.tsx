import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, CheckCircle2, AlertTriangle, Lock } from "lucide-react";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const { confirmPasswordReset } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Token de redefinição não encontrado. Solicite um novo link.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(token, password);
      setSuccess(true);
      setTimeout(() => navigate("/"), 3000);
    } catch (err: any) {
      setError(err.message || "Erro ao redefinir senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/mostrara-logo.png" alt="Mostrara" className="h-10 mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-black text-gray-900">Redefinir senha</h1>
          <p className="text-sm text-gray-500 mt-1">Digite sua nova senha abaixo.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          {success ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Senha alterada!</h2>
              <p className="text-sm text-gray-500">Redirecionando para o login...</p>
            </div>
          ) : !token ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Link inválido</h2>
              <p className="text-sm text-gray-500">Este link expirou. Solicite um novo.</p>
              <button onClick={() => navigate("/")} className="bg-gray-900 hover:bg-black text-white font-bold px-6 py-2.5 rounded-xl transition-colors">
                Voltar ao início
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Nova senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder-gray-400 outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-500/10 transition-all"
                    autoComplete="new-password" required minLength={6} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Confirmar senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repita a senha"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder-gray-400 outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-500/10 transition-all"
                    autoComplete="new-password" required />
                </div>
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 font-medium">{error}</p>
              )}
              <button type="submit" disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Redefinindo...</> : "Redefinir senha"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
