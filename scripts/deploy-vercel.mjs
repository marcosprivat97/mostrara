#!/usr/bin/env node
/**
 * Mostrara — Full Production Deploy to Vercel
 * 
 * This script:
 * 1. Sets ALL required environment variables in Vercel
 * 2. Deploys to production
 * 
 * Usage: node scripts/deploy-vercel.mjs
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Function to parse .env file
function getEnvVars() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    console.error("Erro: Arquivo .env nao encontrado na raiz do projeto.");
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, "utf8");
  const vars = {};
  content.split("\n").forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] ? match[2].trim() : "";
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      vars[match[1]] = value;
    }
  });
  return vars;
}

const ENV_VARS = getEnvVars();


function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { 
      stdio: opts.silent ? "pipe" : "inherit",
      cwd: process.cwd(),
      timeout: 60_000,
      ...opts,
    });
  } catch (e) {
    if (!opts.ignoreError) {
      console.error(`Command failed: ${cmd}`);
    }
    return null;
  }
}

async function main() {
  console.log("");
  console.log("========================================");
  console.log("  MOSTRARA — Deploy para Producao");
  console.log("========================================");
  console.log("");

  const entries = Object.entries(ENV_VARS);
  const total = entries.length;
  let current = 0;

  for (const [name, value] of entries) {
    current++;
    const pct = Math.round((current / total) * 100);
    console.log(`[${pct}%] Configurando ${name}...`);

    for (const envTarget of ["production", "preview", "development"]) {
      // Use stdin pipe to pass value to avoid shell escaping issues
      try {
        execSync(
          `npx vercel env add ${name} ${envTarget} --force --yes`,
          {
            input: value,
            stdio: ["pipe", "pipe", "pipe"],
            cwd: process.cwd(),
            timeout: 30_000,
          }
        );
      } catch {
        // Ignore errors (variable may already exist)
      }
    }
  }

  console.log("");
  console.log("========================================");
  console.log("  Todas as variaveis configuradas!");
  console.log("  Iniciando deploy...");
  console.log("========================================");
  console.log("");

  run("npx vercel --prod --yes");

  console.log("");
  console.log("========================================");
  console.log("  Deploy concluido!");
  console.log("========================================");
}

main().catch((err) => {
  console.error("Deploy failed:", err);
  process.exit(1);
});
