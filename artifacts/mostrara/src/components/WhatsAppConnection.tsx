import { useState, useEffect, useCallback, useRef } from "react";
import {
  MessageSquare,
  Loader2,
  Unlink,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  QrCode,
  Smartphone,
  Copy,
  Check,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToastSimple } from "@/hooks/useToastSimple";
import { cn } from "@/lib/utils";

type ConnectionStatus =
  | "loading"
  | "qrcode"
  | "connected"
  | "disconnected"
  | "error";

type ConnectionMode = "qr" | "code";

const POLL_INTERVAL_QR = 8000;
const POLL_INTERVAL_GENERATING = 5000;
const MAX_NULL_QR_RETRIES = 15;

export function WhatsAppConnection() {
  const { token } = useAuth();
  const { success, error: toastError } = useToastSimple();
  const [status, setStatus] = useState<ConnectionStatus>("loading");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [mode, setMode] = useState<ConnectionMode>("qr");
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const nullQrCountRef = useRef(0);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!isMountedRef.current || isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      const data = await apiFetch<{
        status: string;
        qr?: string;
        pairingCode?: string;
        message?: string;
        error?: string;
      }>("/whatsapp/status", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!isMountedRef.current) return;

      if (data.status === "connected") {
        setStatus("connected");
        setQrCode(null);
        setPairingCode(null);
        setProcessingMessage(null);
        nullQrCountRef.current = 0;
        stopPolling();
        return;
      }

      if (data.status === "processing") {
        setProcessingMessage(data.message || "Configurando servidor...");
        // Keep current status (loading or qrcode) but show the message
        return;
      }

      if (data.status === "qrcode") {
        if (data.pairingCode) {
          setPairingCode(data.pairingCode);
        }

        if (data.qr) {
          setQrCode(data.qr);
          setStatus("qrcode");
          nullQrCountRef.current = 0;
        } else {
          nullQrCountRef.current += 1;

          if (nullQrCountRef.current >= MAX_NULL_QR_RETRIES) {
            setStatus("error");
            stopPolling();
            return;
          }

          setStatus("qrcode");
          setQrCode(null);
        }
        return;
      }

      if (data.status === "error") {
        setStatus("error");
        stopPolling();
        return;
      }

      setStatus("disconnected");
      setProcessingMessage(null);
    } catch (err) {
      console.error("WhatsApp status fetch error:", err);
      if (!isMountedRef.current) return;

      // If it's a network error or timeout, don't count it as a "null QR" retry immediately
      // unless it's persistent.
      nullQrCountRef.current += 1;
      if (nullQrCountRef.current >= MAX_NULL_QR_RETRIES) {
        setStatus("error");
        stopPolling();
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [token, stopPolling]);

  const startPolling = useCallback(
    (interval: number) => {
      stopPolling();
      pollingRef.current = setInterval(fetchStatus, interval);
    },
    [fetchStatus, stopPolling],
  );

  useEffect(() => {
    isMountedRef.current = true;
    fetchStatus();
    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status === "connected" || status === "disconnected" || status === "error") {
      stopPolling();
    } else if (status === "qrcode" && qrCode) {
      startPolling(POLL_INTERVAL_QR);
    } else if (status === "qrcode" && !qrCode) {
      startPolling(POLL_INTERVAL_GENERATING);
    } else if (status === "loading") {
      startPolling(POLL_INTERVAL_GENERATING);
    }

    return () => stopPolling();
  }, [status, qrCode, startPolling, stopPolling]);

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true);
      await apiFetch("/whatsapp/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      success("WhatsApp desconectado com sucesso");
      setStatus("disconnected");
      setQrCode(null);
      setPairingCode(null);
      nullQrCountRef.current = 0;
    } catch (err) {
      toastError("Erro ao desconectar WhatsApp");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleRefresh = () => {
    nullQrCountRef.current = 0;
    setQrCode(null);
    setPairingCode(null);
    setStatus("loading");
    fetchStatus();
  };

  const handleCopyCode = async () => {
    if (!pairingCode) return;
    try {
      await navigator.clipboard.writeText(pairingCode);
      setCopied(true);
      success("Código copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toastError("Erro ao copiar código");
    }
  };

  // Format pairing code with dash for readability: ABCD-EFGH
  const formattedCode = pairingCode
    ? pairingCode.length === 8
      ? `${pairingCode.slice(0, 4)}-${pairingCode.slice(4)}`
      : pairingCode
    : "";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-gray-900">
            {status === "connected"
              ? "WhatsApp conectado"
              : "WhatsApp desconectado"}
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            {status === "connected"
              ? "Seu WhatsApp está pronto para enviar confirmações automáticas de pedidos aos clientes."
              : "Conecte seu WhatsApp para habilitar o envio automático de pedidos."}
          </p>
        </div>
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold shrink-0",
            status === "connected"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700",
          )}
        >
          {status === "connected" ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}
          {status === "connected" ? "Conectado" : "Pendente"}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-2xl">
        {/* Loading state */}
        {status === "loading" && (
          <div className="flex flex-col items-center justify-center space-y-3 py-8">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            <p className="text-sm text-gray-500 font-medium">
              {processingMessage || "Carregando status do WhatsApp..."}
            </p>
          </div>
        )}

        {/* QR code / Pairing code area - tabs ALWAYS visible when in qrcode state */}
        {status === "qrcode" && (
          <div className="flex flex-col items-center justify-center space-y-4 w-full">
            {/* Mode toggle tabs */}
            <div className="flex bg-gray-100 rounded-xl p-1 w-full max-w-xs">
              <button
                type="button"
                onClick={() => setMode("qr")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all",
                  mode === "qr"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700",
                )}
              >
                <QrCode className="w-3.5 h-3.5" />
                QR Code
              </button>
              <button
                type="button"
                onClick={() => setMode("code")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all",
                  mode === "code"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700",
                )}
              >
                <Smartphone className="w-3.5 h-3.5" />
                Código
              </button>
            </div>

            {/* QR Code mode */}
            {mode === "qr" && (
              <div className="flex flex-col items-center space-y-3">
                {qrCode ? (
                  <>
                    <div className="p-2 bg-white rounded-2xl shadow-sm border border-gray-100">
                      <img
                        src={qrCode}
                        alt="WhatsApp QR Code"
                        className="w-64 h-64"
                      />
                    </div>
                    <p className="text-sm text-gray-500 font-medium text-center max-w-sm">
                      Abra o WhatsApp no celular → <strong>Aparelhos Conectados</strong> → Aponte a câmera para o QR Code.
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col items-center space-y-3 py-6">
                    <Loader2 className="w-7 h-7 animate-spin text-red-500" />
                    <p className="text-sm text-gray-500 font-medium">
                      {processingMessage || "Gerando QR Code..."}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Pairing Code mode */}
            {mode === "code" && (
              <div className="flex flex-col items-center space-y-4 w-full max-w-sm">
                {pairingCode ? (
                  <>
                    <div className="w-full bg-gray-900 rounded-2xl p-6 text-center">
                      <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wider">
                        Código de pareamento
                      </p>
                      <p className="text-3xl font-black text-white tracking-[0.3em] font-mono">
                        {formattedCode}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      {copied ? "Copiado!" : "Copiar código"}
                    </button>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 w-full">
                      <p className="text-xs text-amber-800 font-semibold mb-1.5">
                        📱 Como usar no celular:
                      </p>
                      <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside leading-relaxed">
                        <li>Abra o <strong>WhatsApp</strong> no celular</li>
                        <li>Vá em <strong>Aparelhos conectados</strong></li>
                        <li>Toque em <strong>Conectar um aparelho</strong></li>
                        <li>Toque em <strong>"Conectar com número de telefone"</strong></li>
                        <li>Digite o código acima</li>
                      </ol>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center space-y-3 py-6">
                    <Loader2 className="w-7 h-7 animate-spin text-red-500" />
                    <p className="text-sm text-gray-500 font-medium">
                      Gerando código de pareamento...
                    </p>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 text-sm font-semibold mt-2"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </button>
          </div>
        )}



        {/* Disconnected state */}
        {status === "disconnected" && (
          <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">
                Nenhum aparelho conectado
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Clique abaixo para iniciar a integração com o WhatsApp.
              </p>
            </div>
            <button
              onClick={handleRefresh}
              className="bg-gray-900 hover:bg-black text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-colors mt-2"
            >
              Conectar WhatsApp
            </button>
          </div>
        )}

        {/* Connected state */}
        {status === "connected" && (
          <div className="flex flex-col items-center justify-center space-y-4 py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <MessageSquare className="w-8 h-8" />
            </div>
            <p className="text-sm text-gray-500 font-medium text-center">
              Seu número do WhatsApp está conectado ao Mostrara.
            </p>
            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-60 text-gray-700 font-semibold px-5 py-2.5 rounded-xl transition-colors mt-2"
            >
              {isDisconnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Unlink className="w-4 h-4" />
              )}
              Desconectar WhatsApp
            </button>
          </div>
        )}

        {/* Error state */}
        {status === "error" && (
          <div className="flex flex-col items-center justify-center space-y-3 py-8">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            <p className="text-sm text-gray-700 font-semibold">
              Falha ao conectar
            </p>
            <p className="text-xs text-gray-500 text-center max-w-xs">
              O servidor WhatsApp pode estar temporariamente indisponível. Tente
              novamente em alguns segundos.
            </p>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Tentar Novamente
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 leading-relaxed text-center mt-2">
        A automação WhatsApp envia automaticamente uma mensagem com o resumo do
        pedido para o cliente e uma notificação detalhada para você assim que um pedido é finalizado.
      </p>
    </div>
  );
}
