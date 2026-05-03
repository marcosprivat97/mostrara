import { TriggerClient } from "@trigger.dev/sdk";
import { env } from "./env.js";

export const triggerClient = new TriggerClient({
  id: "mostrara",
  apiKey: env.trigger.apiKey,
});
