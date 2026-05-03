import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken } from "../lib/auth.js";
import type { AuthRequest } from "../middlewares/auth.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function generateSlug(storeName: string): string {
  const base = slugify(storeName);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

function sanitizeUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    store_name: user.store_name,
    owner_name: user.owner_name,
    email: user.email,
    phone: user.phone,
    whatsapp: user.whatsapp,
    store_slug: user.store_slug,
    description: user.description,
    city: user.city,
    logo_url: user.logo_url,
    created_at: user.created_at,
  };
}

router.post("/register", async (req, res) => {
  const { store_name, owner_name, email, password, phone, whatsapp, city } = req.body;

  if (!store_name || !owner_name || !email || !password || !phone || !whatsapp) {
    res.status(400).json({ error: "Todos os campos obrigatórios devem ser preenchidos" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });
    return;
  }

  try {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (existing.length > 0) {
      res.status(409).json({ error: "E-mail já cadastrado" });
      return;
    }

    const password_hash = await bcrypt.hash(password, 10);
    const store_slug = generateSlug(store_name);
    const id = uuidv4();

    const [user] = await db.insert(usersTable).values({
      id,
      store_name,
      owner_name,
      email,
      password_hash,
      phone,
      whatsapp,
      store_slug,
      city: city || "Rio de Janeiro",
      description: "",
      logo_url: "",
      active: true,
    }).returning();

    const token = signToken(user.id);
    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    req.log.error({ err }, "Register error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "E-mail e senha são obrigatórios" });
    return;
  }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (!user) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Credenciais inválidas" });
      return;
    }

    const token = signToken(user.id);
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.get("/me", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    if (!user) {
      res.status(401).json({ error: "Usuário não encontrado" });
      return;
    }
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    req.log.error({ err }, "GetMe error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
