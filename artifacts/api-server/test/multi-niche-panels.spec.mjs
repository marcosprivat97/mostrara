import { test, expect } from "@playwright/test";

const base = process.env.MVP_BASE_URL || "https://www.mostrara.shop";
const api = `${base}/api`;

const cases = [
  ["celulares", "Armazenamento", "Bateria", "Garantia"],
  ["acai", "Base", "Complementos", "Tempo medio"],
  ["hamburgueria", "Pao/proteina", "Ingredientes", "Tempo medio"],
  ["pizzaria", "Sabor/borda", "Ingredientes", "Tempo medio"],
  ["pastelaria", "Tamanho/massa", "Recheio", "Tempo medio"],
  ["salgadinhos", "Quantidade", "Sabores", "Prazo"],
  ["marmitex", "Proteina", "Acompanhamentos", "Entrega"],
  ["manicure", "Duracao", "Inclui", "Agenda"],
  ["salao", "Duracao", "Inclui", "Agenda"],
  ["doces", "Sabor/tamanho", "Ingredientes", "Prazo"],
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

test("product panel adapts fields for every store type", async ({ page }) => {
  const stamp = Date.now();
  const created = [];

  try {
    for (const [index, [store_type, variantLabel, detailLabel, warrantyLabel]] of cases.entries()) {
      const slug = `panel-${store_type}-${stamp}-${index}`;
      const auth = await jsonFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          store_name: `Panel ${store_type}`,
          store_slug: slug,
          owner_name: "Panel QA",
          email: `${slug}@mostrara.test`,
          password: "12345678",
          phone: "21999999999",
          whatsapp: "21988888888",
          store_type,
          city: "Rio de Janeiro",
        }),
      });
      created.push(auth.token);

      await page.goto(base);
      await page.evaluate((token) => localStorage.setItem("mostrara_token", token), auth.token);
      await page.goto(`${base}/dashboard/products`, { waitUntil: "networkidle" });
      await page.getByLabel("Pular tutorial").click().catch(() => {});
      await page.getByRole("button", { name: /Novo/i }).click();
      await expect(page.getByText(variantLabel, { exact: true })).toBeVisible();
      await expect(page.getByText(detailLabel, { exact: true })).toBeVisible();
      await expect(page.getByText(warrantyLabel, { exact: true })).toBeVisible();
      if (store_type !== "celulares") {
        await expect(page.getByText("Adicionais e complementos", { exact: true })).toBeVisible();
      }
      await page.keyboard.press("Escape");
      await page.evaluate(() => localStorage.removeItem("mostrara_token"));
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
