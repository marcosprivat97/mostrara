export function generateDeliveryConfirmationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function normalizeDeliveryConfirmationCode(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/\D/g, "").slice(0, 6);
}
