import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

if (process.env.NODE_ENV !== "production") {
  let currentDir = path.resolve(process.cwd());
  let envPath = "";

  while (true) {
    const candidate = path.join(currentDir, ".env");
    if (existsSync(candidate)) {
      envPath = candidate;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }

  if (envPath) {
    const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex <= 0) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const rawValue = trimmed.slice(eqIndex + 1).trim();
      if (process.env[key] !== undefined) continue;
      process.env[key] = rawValue.replace(/^["']|["']$/g, "");
    }
  }
}
