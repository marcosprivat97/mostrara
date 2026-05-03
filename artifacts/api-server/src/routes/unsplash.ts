import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { env } from "../lib/env.js";

const router = Router();
router.use(authMiddleware);

router.get("/search", async (req, res) => {
  try {
    const query = req.query.query as string;
    if (!query) {
      return res.status(400).json({ error: "Termo de busca obrigatorio" });
    }

    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20&orientation=landscape`,
      {
        headers: {
          Authorization: `Client-ID ${env.unsplash.accessKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Falha ao buscar imagens no Unsplash");
    }

    const data = await response.json();
    
    const photos = data.results.map((img: any) => ({
      id: img.id,
      url: img.urls.regular,
      thumb: img.urls.thumb,
      user: {
        name: img.user.name,
        link: img.user.links.html,
      }
    }));

    res.json({ photos });
  } catch (err) {
    req.log.error({ err }, "UnsplashSearch error");
    res.status(500).json({ error: "Erro ao buscar imagens profissionais" });
  }
});

export default router;
