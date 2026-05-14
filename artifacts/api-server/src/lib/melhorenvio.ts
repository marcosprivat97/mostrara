import { env } from "./env.js";

interface ShippingAddress {
  postalCode: string;
  address?: string;
  number?: string;
  city?: string;
  state?: string;
}

interface ShippingCalculateParams {
  from: ShippingAddress;
  to: ShippingAddress;
  products: {
    id: string;
    width: number;
    height: number;
    length: number;
    weight: number;
    insurance_value: number;
    quantity: number;
  }[];
}

function cleanOptionalText(value?: string | null) {
  const normalized = String(value || "").trim();
  return normalized.length > 0 ? normalized : undefined;
}

function buildAddressPayload(address: ShippingAddress) {
  return {
    postal_code: address.postalCode.replace(/\D/g, ""),
    ...(cleanOptionalText(address.address) ? { address: cleanOptionalText(address.address) } : {}),
    ...(cleanOptionalText(address.number) ? { number: cleanOptionalText(address.number) } : {}),
    ...(cleanOptionalText(address.city) ? { city: cleanOptionalText(address.city) } : {}),
    ...(cleanOptionalText(address.state) ? { state: cleanOptionalText(address.state)?.toUpperCase() } : {}),
  };
}

function extractMelhorEnvioMessage(data: unknown) {
  if (Array.isArray(data)) {
    const serviceErrors = [...new Set(
      data
        .map((item) => (typeof item?.error === "string" ? item.error.trim() : ""))
        .filter(Boolean),
    )];
    if (serviceErrors.length > 0) return serviceErrors[0];
  }

  if (data && typeof data === "object") {
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message.trim();

    const error = (data as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error.trim();
  }

  return "";
}

export const melhorenvioService = {
  async calculate(params: ShippingCalculateParams) {
    const url = env.melhorenvio.isSandbox
      ? "https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate"
      : "https://www.melhorenvio.com.br/api/v2/me/shipment/calculate";

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.melhorenvio.token}`,
          "User-Agent": "Mostrara SaaS (sevenbeatx@gmail.com)",
        },
        body: JSON.stringify({
          from: buildAddressPayload(params.from),
          to: buildAddressPayload(params.to),
          products: params.products.map((product) => ({
            id: product.id,
            width: product.width || 11,
            height: product.height || 2,
            length: product.length || 16,
            weight: product.weight || 0.3,
            insurance_value: product.insurance_value || 0,
            quantity: product.quantity || 1,
          })),
        }),
      });

      if (!response.ok) {
        const errData: unknown = await response.json().catch(() => ({}));
        const message = extractMelhorEnvioMessage(errData);
        if (response.status >= 500 || /unauthenticated|unauthorized/i.test(message)) {
          throw new Error("Frete indisponivel no momento. Tente novamente em instantes.");
        }
        throw new Error(message || "Falha ao calcular frete");
      }

      const data: unknown = await response.json();
      const services = Array.isArray(data) ? data : [];
      const successfulServices = services.filter((service) => !service?.error);

      if (successfulServices.length === 0) {
        const message = extractMelhorEnvioMessage(services);
        if (message) {
          throw new Error(message);
        }
        return [];
      }

      return successfulServices.map((service) => ({
        id: service.id,
        name: service.name,
        price: Number(service.custom_price ?? service.price),
        custom_price: Number(service.custom_price ?? service.price),
        delivery_range: {
          min: service.custom_delivery_range?.min ?? service.delivery_range?.min,
          max: service.custom_delivery_range?.max ?? service.delivery_range?.max,
        },
        company: {
          name: service.company?.name,
          picture: service.company?.picture,
        },
      }));
    } catch (error) {
      console.error("Melhor Envio Error:", error);
      throw error;
    }
  },
};
