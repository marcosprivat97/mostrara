export function normalizeWhatsAppNumber(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";

  if (!digits.startsWith("55") && digits.length <= 11) {
    return `55${digits}`;
  }

  return digits;
}

export function buildWhatsAppUrl(phone?: string | null, message?: string) {
  const normalizedPhone = normalizeWhatsAppNumber(phone);
  if (!normalizedPhone) return "";
  return `https://wa.me/${normalizedPhone}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}
