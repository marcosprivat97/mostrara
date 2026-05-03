let app;

export default async function handler(req, res) {
  try {
    if (!app) {
      const mod = await import("../artifacts/api-server/dist/app.mjs");
      app = mod.default || mod;
    }
    return app(req, res);
  } catch (err) {
    console.error("Failed to initialize app:", err);
    res.status(500).json({
      error: "Server initialization failed",
      message: err.message,
      stack: err.stack,
    });
  }
}
