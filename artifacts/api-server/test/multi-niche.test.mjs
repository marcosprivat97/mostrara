import assert from "node:assert/strict";
import test from "node:test";

const base = process.env.MVP_BASE_URL || "https://www.mostrara.shop";
const api = `${base}/api`;

const storeTypes = [
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
];

async function jsonFetch(path, options = {}) {
  const res = await fetch(`${api}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || `${res.status} ${path}`);
  return data;
}

test("all store types can register, create item, expose storefront, and create option order", async () => {
  const stamp = Date.now();
  const created = [];

  try {
    for (const [index, store_type] of storeTypes.entries()) {
      const slug = `qa-${store_type}-${stamp}-${index}`;
      const auth = await jsonFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          store_name: `QA ${store_type}`,
          store_slug: slug,
          owner_name: "QA",
          email: `${slug}@mostrara.test`,
          password: "12345678",
          phone: "21999999999",
          whatsapp: "21988888888",
          store_type,
          city: "Rio de Janeiro",
        }),
      });
      created.push(auth.token);
      assert.equal(auth.user.store_type, store_type);

      const product = await jsonFetch("/products", {
        method: "POST",
        headers: { authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({
          name: `Item ${store_type}`,
          category: store_type === "celulares" ? "iPhone" : "Combo",
          storage: store_type === "celulares" ? "256GB" : "Tamanho medio",
          price: 20,
          condition: store_type === "celulares" ? "Vitrine" : "Especial",
          battery: store_type === "celulares" ? "95%" : "Complemento base",
          warranty: store_type === "celulares" ? "6 meses" : "30 min",
          status: "disponivel",
          description: "Produto QA multi-nicho",
          options: [
            { name: "Extra 1", price: 2 },
            { name: "Extra 2", price: 3 },
          ],
          photos: [],
          stock: 5,
          unlimited_stock: false,
        }),
      });
      assert.equal(product.product.options.length, 2);

      const storefront = await jsonFetch(`/store/${slug}`);
      assert.equal(storefront.store.store_type, store_type);
      assert.equal(storefront.products.length, 1);
      assert.equal(storefront.products[0].options.length, 2);

      const order = await jsonFetch(`/store/${slug}/orders`, {
        method: "POST",
        body: JSON.stringify({
          customer_name: "Cliente QA",
          customer_whatsapp: "21977777777",
          payment_method: "pix",
          notes: "Sem cebola",
          items: [
            {
              product_id: product.product.id,
              quantity: 2,
              selected_options: ["Extra 1", "Extra 2"],
            },
          ],
        }),
      });
      assert.equal(order.order.total, 50);
      assert.equal(order.order.items[0].price, 25);
      assert.equal(order.order.items[0].selected_options.length, 2);
    }
  } finally {
    await Promise.all(
      created.map((token) =>
        jsonFetch("/settings/delete-account", {
          method: "DELETE",
          headers: { authorization: `Bearer ${token}` },
        }).catch(() => {}),
      ),
    );
  }
});
