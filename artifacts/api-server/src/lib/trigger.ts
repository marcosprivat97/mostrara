import { configure } from "@trigger.dev/sdk";
import { env } from "./env.js";

configure({
  accessToken: env.trigger.apiKey,
});

export const triggerClient = {
  id: "mostrara",
} as const;
