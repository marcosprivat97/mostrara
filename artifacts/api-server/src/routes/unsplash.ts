import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.js";
import { env } from "../lib/env.js";

const router = Router();
router.use(authMiddleware);

type UnsplashSearchResponse = {
  results?: Array<{
    id: string;
    urls: {
      regular: string;
      thumb: string;
    };
    user: {
      name: string;
      links: {
        html: string;
      };
    };
  }>;
};

router.get("/search", async (req, res): Promise<void> => {
  try {
    const query = typeof req.query.query === "string" ? req.query.query : "";
    if (!query) {
      res.status(400).json({ error: "Termo de busca obrigatorio" });
      return;
    }

    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20&orientation=landscape`,
      {
        headers: {
          Authorization: `Client-ID ${env.unsplash.accessKey}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Falha ao buscar imagens no Unsplash");
    }

    const data = (await response.json()) as UnsplashSearchResponse;
    const photos = (data.results ?? []).map((img) => ({
      id: img.id,
      url: img.urls.regular,
      thumb: img.urls.thumb,
      user: {
        name: img.user.name,
        link: img.user.links.html,
      },
    }));

    res.json({ photos });
  } catch (err) {
    req.log.error({ err }, "UnsplashSearch error");
    res.status(500).json({ error: "Erro ao buscar imagens profissionais" });
  }
});

export default router;
