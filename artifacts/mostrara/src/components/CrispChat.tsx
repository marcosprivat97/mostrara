import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function CrispChat() {
  const { user } = useAuth();

  useEffect(() => {
    // Only load if not already loaded
    if (!(window as any).$crisp) {
      (window as any).$crisp = [];
      (window as any).CRISP_WEBSITE_ID = "f0eafad6-13e7-4a73-90fd-3b324d816941";
      
      const d = document;
      const s = d.createElement("script");
      s.src = "https://client.crisp.chat/l.js";
      s.async = true;
      d.getElementsByTagName("head")[0].appendChild(s);
    }

    // Set user info for support if logged in
    if (user && (window as any).$crisp) {
      (window as any).$crisp.push(["set", "user:email", [user.email]]);
      (window as any).$crisp.push(["set", "user:nickname", [user.owner_name || user.store_name]]);
      (window as any).$crisp.push(["set", "session:data", [[
        ["store_name", user.store_name],
        ["store_slug", user.store_slug],
        ["plan", user.plan || "free"]
      ]]]);
    }
  }, [user]);

  return null;
}
