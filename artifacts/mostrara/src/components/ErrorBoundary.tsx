import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { captureClientException } from "@/lib/sentry";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    captureClientException(error, {
      source: "react.error-boundary",
      stack: error.stack ?? undefined,
      path: window.location.pathname,
      componentStack: info.componentStack ?? undefined,
    });
  }

  private recover = () => {
    this.setState({ error: null });
    const target = window.location.pathname.startsWith("/dashboard") ? "/dashboard" : "/";
    window.location.assign(target);
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-dvh bg-gray-950 text-white flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-red-600/20 text-red-300 flex items-center justify-center mb-5">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black">Algo travou a tela.</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-300">
            O app nao vai ficar em branco. Volte para o painel e continue usando.
          </p>
          <button
            type="button"
            onClick={this.recover}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-500 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Voltar ao painel
          </button>
        </div>
      </div>
    );
  }
}
