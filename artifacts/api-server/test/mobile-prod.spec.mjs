import { test, expect, devices } from "@playwright/test";

const base = process.env.MVP_BASE_URL || "https://www.mostrara.shop";
const api = `${base}/api`;

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

test.use({ ...devices["Pixel 5"], browserName: "chromium" });

test("mobile catalog creates pending WhatsApp order", async ({ page }) => {
  const stamp = Date.now();
  const email = `mobile-${stamp}@mostrara.test`;
  const slug = `mobile-mostrara-${stamp}`;
  let token = "";

  try {
    const auth = await jsonFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        store_name: "Mobile Mostrara QA",
        store_slug: slug,
        owner_name: "Mobile QA",
        email,
        password: "12345678",
        phone: "21999999999",
        whatsapp: "21988888888",
        city: "Rio de Janeiro",
      }),
    });
    token = auth.token;

    await jsonFetch("/products", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: "Produto Mobile Mostrara",
        category: "Bazar",
        storage: "Unico",
        price: 39.9,
        condition: "Novo",
        battery: "100%",
        warranty: "7 dias",
        status: "disponivel",
        description: "Produto do teste mobile",
        photos: [],
        stock: 3,
        unlimited_stock: false,
      }),
    });

    await page.route("https://wa.me/**", (route) => route.fulfill({ status: 200, body: "ok" }));
    await page.goto(`${base}/loja/${slug}`, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Mobile Mostrara QA" })).toBeVisible();
    await expect(page.getByText("Produto Mobile Mostrara")).toBeVisible();

    await page.getByText("Produto Mobile Mostrara").click();
    await page.getByRole("button", { name: /Adicionar ao carrinho|No carrinho/ }).click();
    await page.getByRole("button", { name: "Abrir carrinho" }).click();
    await page.getByRole("button", { name: "Enviar pelo WhatsApp" }).click();
    await page.getByPlaceholder(/Jo/i).fill("Cliente Mobile");
    await page.getByPlaceholder("(21) 99999-9999").fill("21977777777");
    await page.getByRole("button", { name: "Ir ao WhatsApp" }).click();

    await expect.poll(async () => {
      const orders = await jsonFetch("/orders?status=pendente", {
        headers: { authorization: `Bearer ${token}` },
      });
      return orders.orders.length;
    }).toBe(1);
  } finally {
    if (token) {
      await jsonFetch("/settings/delete-account", {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }
});
