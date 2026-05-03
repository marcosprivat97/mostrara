import { createRoot } from "react-dom/client";
import App from "./App";
import ErrorBoundary from "@/components/ErrorBoundary";
import "./index.css";
import { initSentry } from "@/lib/sentry";
import { installClientErrorReporting } from "@/lib/client-errors";
import { initAnalytics } from "@/lib/analytics";

initSentry();
installClientErrorReporting();
initAnalytics();
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
