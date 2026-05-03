import { Router } from "express";

const router = Router();

router.get("/viacep/:cep", async (req, res) => {
  try {
    const cep = String(req.params.cep || "").replace(/\D/g, "");
    if (cep.length !== 8) {
      res.status(400).json({ error: "CEP invalido" });
      return;
    }

    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data: any = await response.json().catch(() => ({}));
    if (!response.ok || data?.erro) {
      res.status(404).json({ error: "CEP nao encontrado" });
      return;
    }

    res.json({
      cep: String(data?.cep || cep),
      street: String(data?.logradouro || ""),
      neighborhood: String(data?.bairro || ""),
      city: String(data?.localidade || ""),
      state: String(data?.uf || ""),
      ibge: String(data?.ibge || ""),
      gia: String(data?.gia || ""),
      ddd: String(data?.ddd || ""),
    });
  } catch (err) {
    req.log.error({ err }, "ViaCepLookup error");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
