import { z } from "zod";

const optionalTrimmed = z
  .string()
  .trim()
  .max(1000)
  .optional()
  .default("");
const optionalTrimmedNoDefault = z.string().trim().max(1000).optional();

const money = z.coerce
  .number()
  .finite()
  .positive("Deve ser maior que zero");

const phone = z.string().trim().min(8).max(32);
const storeType = z
  .enum([
    "celulares",
    "acai",
    "hamburgueria",
    "pizzaria",
    "pastelaria",
    "salgadinhos",
    "marmitex",
    "manicure",
    "salao",
    "doces",
  ])
  .optional()
  .default("celulares");

export const registerSchema = z.object({
  store_name: z.string().trim().min(2).max(120),
  store_slug: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minusculas, numeros e hifens")
    .optional(),
  owner_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254).transform((v) => v.toLowerCase()),
  password: z.string().min(6).max(128),
  phone,
  whatsapp: phone,
  store_type: storeType,
  city: z.string().trim().min(2).max(120).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(128),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().email().max(254).transform((v) => v.toLowerCase()),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().trim().min(20).max(256),
  new_password: z.string().min(6).max(128),
});

export const productSchema = z.object({
  name: z.string().trim().min(2).max(180),
  category: z.string().trim().min(1).max(80).optional().default("iPhone"),
  storage: z.string().trim().max(80).optional().default(""),
  price: money,
  condition: z.string().trim().min(1).max(80).optional().default("Vitrine"),
  battery: z.string().trim().max(80).optional().default(""),
  warranty: z.string().trim().max(120).optional().default(""),
  stock: z.coerce.number().int().min(0).max(999999).optional().default(1),
  unlimited_stock: z.boolean().optional().default(true),
  status: z.enum(["disponivel", "reservado", "vendido"]).optional().default("disponivel"),
  description: optionalTrimmed,
  options: z
    .array(z.object({
      name: z.string().trim().min(1).max(80),
      price: z.coerce.number().finite().min(0).max(100000).optional().default(0),
    }))
    .max(40)
    .optional()
    .default([]),
  photos: z.array(z.string().min(1).max(3_500_000)).max(5).optional().default([]),
  width: z.coerce.number().min(0.1).max(1000).optional().default(11),
  height: z.coerce.number().min(0.1).max(1000).optional().default(2),
  length: z.coerce.number().min(0.1).max(1000).optional().default(16),
  weight: z.coerce.number().min(0.01).max(1000).optional().default(0.3),
});

export const productUpdateSchema = productSchema.partial().extend({
  photos: z.array(z.string().min(1).max(3_500_000)).max(5).optional(),
});

export const uploadImageSchema = z.object({
  image: z.string().min(100).max(3_500_000),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional().default("image/jpeg"),
});

export const saleSchema = z.object({
  product_id: z.string().trim().max(120).optional().nullable(),
  product_name: z.string().trim().min(2).max(180),
  customer_name: z.string().trim().min(2).max(120),
  customer_whatsapp: z.string().trim().max(32).optional().default(""),
  sale_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  product_price: money,
  amount_paid: money,
  payment_method: z
    .enum(["pix", "dinheiro", "cartao_credito", "cartao_debito", "transferencia"])
    .optional()
    .default("pix"),
  notes: optionalTrimmed,
  mark_as_sold: z.boolean().optional().default(false),
});

export const settingsSchema = z.object({
  store_name: z.string().trim().min(2).max(120).optional(),
  owner_name: z.string().trim().min(2).max(120).optional(),
  phone: phone.optional(),
  whatsapp: phone.optional(),
  store_type: storeType.optional(),
  description: optionalTrimmedNoDefault,
  city: z.string().trim().min(2).max(120).optional(),
  state: z.string().trim().min(2).max(2).transform((v) => v.toUpperCase()).optional(),
  store_cep: z.string().trim().max(12).optional(),
  store_address: z.string().trim().max(180).optional(),
  store_address_number: z.string().trim().max(30).optional(),
  store_neighborhood: z.string().trim().max(120).optional(),
  store_latitude: z.string().trim().max(40).optional(),
  store_longitude: z.string().trim().max(40).optional(),
  cover_url: z.string().trim().max(1000).optional(),
  theme_primary: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  theme_secondary: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  theme_accent: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  is_open: z.boolean().optional(),
  store_hours: z.string().trim().optional(),
  delivery_fee_type: z.enum(["none", "fixed", "distance"]).optional(),
  delivery_fee_amount: z.coerce.number().finite().min(0).max(1000).optional(),
});

export const mercadoPagoConnectionSchema = z.object({
  redirect: z.string().trim().max(120).optional(),
});

export const orderItemSchema = z.object({
  product_id: z.string().trim().min(1).max(120),
  quantity: z.coerce.number().int().min(1).max(99),
  selected_options: z.array(z.string().trim().min(1).max(80)).max(40).optional().default([]),
});

export const publicOrderSchema = z.object({
  customer_name: z.string().trim().min(2).max(120),
  customer_whatsapp: z.string().trim().min(8).max(32),
  delivery_method: z.enum(["delivery", "pickup"]).optional().default("delivery"),
  cep: z.string().trim().max(12).optional().default(""),
  street: z.string().trim().max(180).optional().default(""),
  number: z.string().trim().max(30).optional().default(""),
  complement: z.string().trim().max(120).optional().default(""),
  neighborhood: z.string().trim().max(120).optional().default(""),
  city: z.string().trim().max(120).optional().default(""),
  state: z.string().trim().max(2).optional().default(""),
  reference: z.string().trim().max(180).optional().default(""),
  payment_method: z
    .enum(["pix", "dinheiro", "cartao_credito", "cartao_debito", "transferencia"])
    .optional()
    .default("pix"),
  payment_provider: z.enum(["whatsapp", "mercadopago_pix"]).optional().default("whatsapp"),
  customer_email: z.union([z.literal(""), z.string().trim().email()]).optional().default(""),
  customer_document: z.string().trim().max(20).optional().default(""),
  notes: optionalTrimmed,
  coupon_code: z.string().trim().max(40).optional().default(""),
  items: z.array(orderItemSchema).min(1).max(30),
});

export const supportTicketSchema = z.object({
  type: z.enum(["erro", "melhoria", "duvida", "financeiro"]).optional().default("melhoria"),
  title: z.string().trim().min(3).max(140),
  message: z.string().trim().min(10).max(3000),
});

export const supportTicketUpdateSchema = z.object({
  status: z.enum(["aberto", "em_analise", "resolvido", "fechado"]).optional(),
  admin_note: z.string().trim().max(3000).optional(),
});

export const couponSchema = z.object({
  code: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9_-]+$/).transform((v) => v.toUpperCase()),
  type: z.enum(["percent", "fixed"]).optional().default("percent"),
  value: z.coerce.number().finite().positive().max(100000),
  active: z.boolean().optional().default(true),
  max_uses: z.coerce.number().int().min(1).max(100000).optional().nullable(),
  expires_at: z.string().datetime().optional().nullable(),
});

export const aiChatSchema = z.object({
  area: z.enum(["merchant", "stock", "sales", "catalog"]).optional().default("merchant"),
  message: z.string().trim().min(3).max(1200),
});

export const adminCreateUserSchema = z.object({
  store_name: z.string().trim().min(2).max(120),
  store_slug: z.string().trim().min(3).max(80).regex(/^[a-z0-9-]+$/),
  owner_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254).transform((v) => v.toLowerCase()),
  password: z.string().min(6).max(128),
  phone,
  whatsapp: phone,
  store_type: storeType,
  city: z.string().trim().min(2).max(120).optional(),
  free_forever: z.boolean().optional().default(true),
});

export const adminUpdatePlanSchema = z.object({
  plan: z.enum(["free", "premium"]).optional(),
  free_forever: z.boolean().optional(),
  verified_badge: z.boolean().optional(),
  plan_expires_at: z.string().datetime().optional().nullable(),
});

export const passwordSchema = z.object({
  current_password: z.string().min(1).max(128),
  new_password: z.string().min(6).max(128),
});

export function parseBody<T extends z.ZodTypeAny>(
  schema: T,
  body: unknown,
): z.infer<T> {
  const parsedBody = typeof body === "string" ? JSON.parse(body) : body;
  return schema.parse(parsedBody);
}

export function validationError(error: unknown) {
  if (!(error instanceof z.ZodError)) return null;
  return {
    error: "Dados invalidos",
    fields: error.flatten().fieldErrors,
    form: error.flatten().formErrors,
  };
}
