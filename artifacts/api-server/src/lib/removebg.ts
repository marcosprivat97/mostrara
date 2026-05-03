import { removeBackgroundFromImageBase64 } from "remove.bg";
import { env } from "./env.js";

export const removeBgService = {
  async removeBackground(base64Image: string): Promise<string> {
    // base64Image comes with data:image/jpeg;base64,... prefix
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

    try {
      const result = await removeBackgroundFromImageBase64({
        base64img: base64Data,
        apiKey: env.removeBg.apiKey,
        size: "auto",
        type: "product",
      });

      return `data:image/png;base64,${result.base64img}`;
    } catch (error) {
      console.error("Remove.bg Error:", error);
      throw new Error("Falha ao remover fundo da imagem");
    }
  }
};
