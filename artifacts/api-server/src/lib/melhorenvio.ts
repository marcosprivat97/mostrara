import { env } from "./env.js";

interface ShippingPackage {
  width: number;
  height: number;
  length: number;
  weight: number;
}

interface ShippingCalculateParams {
  from: string; // CEP origem
  to: string;   // CEP destino
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

export const melhorenvioService = {
  async calculate(params: ShippingCalculateParams) {
    const url = env.melhorenvio.isSandbox 
      ? "https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate"
      : "https://www.melhorenvio.com.br/api/v2/me/shipment/calculate";

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.melhorenvio.token}`,
          "User-Agent": "Mostrara SaaS (sevenbeatx@gmail.com)"
        },
        body: JSON.stringify({
          from: { postal_code: params.from.replace(/\D/g, "") },
          to: { postal_code: params.to.replace(/\D/g, "") },
          products: params.products.map(p => ({
            id: p.id,
            width: p.width || 11, // Padrão mínimo Correios
            height: p.height || 2,
            length: p.length || 16,
            weight: p.weight || 0.3,
            insurance_value: p.insurance_value || 0,
            quantity: p.quantity || 1
          }))
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Falha ao calcular frete");
      }

      const data = await response.json();
      
      // Filtrar apenas serviços que não deram erro
      return (Array.isArray(data) ? data : []).filter(s => !s.error).map(s => ({
        id: s.id,
        name: s.name,
        price: Number(s.price),
        custom_price: Number(s.custom_price),
        delivery_range: {
          min: s.delivery_range?.min,
          max: s.delivery_range?.max
        },
        company: {
          name: s.company?.name,
          picture: s.company?.picture
        }
      }));
    } catch (error) {
      console.error("Melhor Envio Error:", error);
      throw error;
    }
  }
};
