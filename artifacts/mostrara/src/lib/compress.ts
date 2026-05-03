interface CompressOptions {
  maxWidth?: number;
  quality?: number;
}

export async function compressImage(
  file: File,
  options?: CompressOptions | number,
  qualityFallback?: number
): Promise<string> {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Formato de imagem invalido");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Imagem maior que 5MB");
  }

  const maxWidth = typeof options === "object" ? (options?.maxWidth ?? 800) : (options ?? 800);
  const quality = typeof options === "object" ? (options?.quality ?? 0.7) : (qualityFallback ?? 0.7);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
