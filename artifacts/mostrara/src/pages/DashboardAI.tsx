import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import { apiFetch } from "@/lib/api";
import { useToastSimple } from "@/hooks/useToastSimple";
import { Bot, Loader2, Send, Crown, Lock, Sparkles } from "lucide-react";
import UpgradeModal from "@/components/UpgradeModal";

interface Message {
  role: "user" | "ai";
  text: string;
}

export default function DashboardAI() {
  const { token } = useAuth();
  const { canUseAI } = usePlan();
  const { error } = useToastSimple();
  const [area, setArea] = useState("merchant");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: "Sou a IA do Mostrara. Posso ajudar com estoque, vendas, catalogo, atendimento e ideias para vender mais." },
  ]);
  const [loading, setLoading] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const opts = useMemo(() => ({ token: token ?? undefined }), [token]);

  const send = async () => {
    const message = input.trim();
    if (!message || loading) return;
    setInput("");
    setMessages((old) => [...old, { role: "user", text: message }]);
    setLoading(true);
    try {
      const data = await apiFetch<{ answer: string; remaining: number }>("/ai/chat", {
        method: "POST",
        ...opts,
        body: JSON.stringify({ area, message }),
      });
      setMessages((old) => [...old, { role: "ai", text: `${data.answer}\n\nRestam ${data.remaining} mensagens de IA hoje.` }]);
    } catch (e: unknown) {
      error(e instanceof Error ? e.message : "Erro na IA");
    } finally {
      setLoading(false);
    }
  };

  // Premium upgrade wall for free users
  if (!canUseAI) {
    return (
      <div className="max-w-4xl">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">IA Mostrara</h1>
          <p className="text-sm text-gray-500 mt-1">Assistente para vendas, estoque, catalogo e atendimento.</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="relative px-6 py-16 text-center">
            <div className="absolute inset-0 bg-gradient-to-b from-amber-50/50 to-transparent" />
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-200/50">
                <Bot className="w-10 h-10 text-amber-600" />
              </div>
              <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold mb-4">
                <Crown className="w-3 h-3" />
                Exclusivo Premium
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">IA exclusiva para Premium</h2>
              <p className="text-gray-500 max-w-md mx-auto mb-8 leading-relaxed">
                Desbloqueie o assistente de inteligência artificial para receber insights sobre vendas, 
                estoque, catálogo e atendimento. A IA analisa seus dados e dá sugestões personalizadas.
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto mb-8 text-left">
                {[
                  "Análise de vendas",
                  "Dicas de estoque",
                  "Sugestões de preço",
                  "Atendimento inteligente",
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setUpgradeOpen(true)}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg shadow-amber-500/25 flex items-center gap-2 mx-auto"
              >
                <Crown className="w-4 h-4" />
                Assinar Premium — R$ 49,99/mês
              </button>
            </div>
          </div>
        </div>
        <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature="IA Mostrara" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl h-[calc(100vh-7rem)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">IA Mostrara</h1>
        <p className="text-sm text-gray-500 mt-1">Assistente para vendas, estoque, catalogo e atendimento.</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl flex-1 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-gray-100">
          <select value={area} onChange={(e) => setArea(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm">
            <option value="merchant">Geral</option>
            <option value="stock">Estoque</option>
            <option value="sales">Vendas</option>
            <option value="catalog">Catalogo</option>
          </select>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((message, index) => (
            <div key={index} className={message.role === "user" ? "text-right" : "text-left"}>
              <div className={message.role === "user"
                ? "inline-block max-w-[85%] bg-red-600 text-white rounded-2xl px-4 py-3 text-sm text-left whitespace-pre-line"
                : "inline-block max-w-[85%] bg-gray-100 text-gray-800 rounded-2xl px-4 py-3 text-sm whitespace-pre-line"}
              >
                {message.role === "ai" && <Bot className="w-4 h-4 inline-block mr-2 text-red-600" />}
                {message.text}
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-gray-100 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder="Ex: quais produtos preciso repor?"
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm"
          />
          <button onClick={send} disabled={loading} className="bg-red-600 text-white rounded-xl px-4 flex items-center justify-center">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
