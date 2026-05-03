// vite.config.ts
import { defineConfig } from "file:///C:/Users/marcos%20fernandes/Desktop/catalogozap/artifacts/mostrara/node_modules/.pnpm/vite@5.4.21_@types+node@20.19.40_lightningcss@1.32.0/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/marcos%20fernandes/Desktop/catalogozap/artifacts/mostrara/node_modules/.pnpm/@vitejs+plugin-react@4.7.0__44f712a746d802d84d01279f575dec95/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///C:/Users/marcos%20fernandes/Desktop/catalogozap/artifacts/mostrara/node_modules/.pnpm/@tailwindcss+vite@4.3.0_vit_8bcb4579542734ed3465a33e07c9e83f/node_modules/@tailwindcss/vite/dist/index.mjs";
import path from "path";
import { existsSync, readFileSync } from "node:fs";
var __vite_injected_original_dirname = "C:\\Users\\marcos fernandes\\Desktop\\catalogozap\\artifacts\\mostrara";
function loadRootEnv() {
  let currentDir = path.resolve(__vite_injected_original_dirname);
  let envPath = "";
  while (true) {
    const candidate = path.join(currentDir, ".env");
    if (existsSync(candidate)) {
      envPath = candidate;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }
  if (!envPath) return;
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const rawValue = trimmed.slice(eqIndex + 1).trim();
    if (process.env[key] !== void 0) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}
loadRootEnv();
var port = Number(process.env.VITE_PORT || "5173");
var apiPort = Number(process.env.VITE_API_PORT || process.env.API_PORT || "23131");
var basePath = process.env.BASE_PATH || "/";
var enableReplitPlugins = process.env.VITE_ENABLE_REPLIT_PLUGINS === "true";
var vite_config_default = defineConfig({
  base: basePath,
  envDir: path.resolve(__vite_injected_original_dirname, "..", ".."),
  plugins: [
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "src"),
      "@assets": path.resolve(__vite_injected_original_dirname, "..", "..", "attached_assets")
    },
    dedupe: ["react", "react-dom"]
  },
  root: path.resolve(__vite_injected_original_dirname),
  build: {
    outDir: path.resolve(__vite_injected_original_dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true
    },
    proxy: {
      "/api": {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxtYXJjb3MgZmVybmFuZGVzXFxcXERlc2t0b3BcXFxcY2F0YWxvZ296YXBcXFxcYXJ0aWZhY3RzXFxcXG1vc3RyYXJhXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxtYXJjb3MgZmVybmFuZGVzXFxcXERlc2t0b3BcXFxcY2F0YWxvZ296YXBcXFxcYXJ0aWZhY3RzXFxcXG1vc3RyYXJhXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9tYXJjb3MlMjBmZXJuYW5kZXMvRGVza3RvcC9jYXRhbG9nb3phcC9hcnRpZmFjdHMvbW9zdHJhcmEvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xyXG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0XCI7XHJcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tIFwiQHRhaWx3aW5kY3NzL3ZpdGVcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgZXhpc3RzU3luYywgcmVhZEZpbGVTeW5jIH0gZnJvbSBcIm5vZGU6ZnNcIjtcclxuXHJcbmZ1bmN0aW9uIGxvYWRSb290RW52KCkge1xyXG4gIGxldCBjdXJyZW50RGlyID0gcGF0aC5yZXNvbHZlKGltcG9ydC5tZXRhLmRpcm5hbWUpO1xyXG4gIGxldCBlbnZQYXRoID0gXCJcIjtcclxuXHJcbiAgd2hpbGUgKHRydWUpIHtcclxuICAgIGNvbnN0IGNhbmRpZGF0ZSA9IHBhdGguam9pbihjdXJyZW50RGlyLCBcIi5lbnZcIik7XHJcbiAgICBpZiAoZXhpc3RzU3luYyhjYW5kaWRhdGUpKSB7XHJcbiAgICAgIGVudlBhdGggPSBjYW5kaWRhdGU7XHJcbiAgICB9XHJcbiAgICBjb25zdCBwYXJlbnREaXIgPSBwYXRoLmRpcm5hbWUoY3VycmVudERpcik7XHJcbiAgICBpZiAocGFyZW50RGlyID09PSBjdXJyZW50RGlyKSBicmVhaztcclxuICAgIGN1cnJlbnREaXIgPSBwYXJlbnREaXI7XHJcbiAgfVxyXG5cclxuICBpZiAoIWVudlBhdGgpIHJldHVybjtcclxuXHJcbiAgY29uc3QgbGluZXMgPSByZWFkRmlsZVN5bmMoZW52UGF0aCwgXCJ1dGY4XCIpLnNwbGl0KC9cXHI/XFxuLyk7XHJcbiAgZm9yIChjb25zdCBsaW5lIG9mIGxpbmVzKSB7XHJcbiAgICBjb25zdCB0cmltbWVkID0gbGluZS50cmltKCk7XHJcbiAgICBpZiAoIXRyaW1tZWQgfHwgdHJpbW1lZC5zdGFydHNXaXRoKFwiI1wiKSkgY29udGludWU7XHJcbiAgICBjb25zdCBlcUluZGV4ID0gdHJpbW1lZC5pbmRleE9mKFwiPVwiKTtcclxuICAgIGlmIChlcUluZGV4IDw9IDApIGNvbnRpbnVlO1xyXG4gICAgY29uc3Qga2V5ID0gdHJpbW1lZC5zbGljZSgwLCBlcUluZGV4KS50cmltKCk7XHJcbiAgICBjb25zdCByYXdWYWx1ZSA9IHRyaW1tZWQuc2xpY2UoZXFJbmRleCArIDEpLnRyaW0oKTtcclxuICAgIGlmIChwcm9jZXNzLmVudltrZXldICE9PSB1bmRlZmluZWQpIGNvbnRpbnVlO1xyXG4gICAgcHJvY2Vzcy5lbnZba2V5XSA9IHJhd1ZhbHVlLnJlcGxhY2UoL15bXCInXXxbXCInXSQvZywgXCJcIik7XHJcbiAgfVxyXG59XHJcblxyXG5sb2FkUm9vdEVudigpO1xyXG5cclxuY29uc3QgcG9ydCA9IE51bWJlcihwcm9jZXNzLmVudi5WSVRFX1BPUlQgfHwgXCI1MTczXCIpO1xyXG5jb25zdCBhcGlQb3J0ID0gTnVtYmVyKHByb2Nlc3MuZW52LlZJVEVfQVBJX1BPUlQgfHwgcHJvY2Vzcy5lbnYuQVBJX1BPUlQgfHwgXCIyMzEzMVwiKTtcclxuY29uc3QgYmFzZVBhdGggPSBwcm9jZXNzLmVudi5CQVNFX1BBVEggfHwgXCIvXCI7XHJcbmNvbnN0IGVuYWJsZVJlcGxpdFBsdWdpbnMgPSBwcm9jZXNzLmVudi5WSVRFX0VOQUJMRV9SRVBMSVRfUExVR0lOUyA9PT0gXCJ0cnVlXCI7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIGJhc2U6IGJhc2VQYXRoLFxyXG4gIGVudkRpcjogcGF0aC5yZXNvbHZlKGltcG9ydC5tZXRhLmRpcm5hbWUsIFwiLi5cIiwgXCIuLlwiKSxcclxuICBwbHVnaW5zOiBbXHJcbiAgICByZWFjdCgpLFxyXG4gICAgdGFpbHdpbmRjc3MoKVxyXG4gIF0sXHJcbiAgcmVzb2x2ZToge1xyXG4gICAgYWxpYXM6IHtcclxuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShpbXBvcnQubWV0YS5kaXJuYW1lLCBcInNyY1wiKSxcclxuICAgICAgXCJAYXNzZXRzXCI6IHBhdGgucmVzb2x2ZShpbXBvcnQubWV0YS5kaXJuYW1lLCBcIi4uXCIsIFwiLi5cIiwgXCJhdHRhY2hlZF9hc3NldHNcIiksXHJcbiAgICB9LFxyXG4gICAgZGVkdXBlOiBbXCJyZWFjdFwiLCBcInJlYWN0LWRvbVwiXSxcclxuICB9LFxyXG4gIHJvb3Q6IHBhdGgucmVzb2x2ZShpbXBvcnQubWV0YS5kaXJuYW1lKSxcclxuICBidWlsZDoge1xyXG4gICAgb3V0RGlyOiBwYXRoLnJlc29sdmUoaW1wb3J0Lm1ldGEuZGlybmFtZSwgXCJkaXN0L3B1YmxpY1wiKSxcclxuICAgIGVtcHR5T3V0RGlyOiB0cnVlLFxyXG4gIH0sXHJcbiAgc2VydmVyOiB7XHJcbiAgICBwb3J0LFxyXG4gICAgc3RyaWN0UG9ydDogdHJ1ZSxcclxuICAgIGhvc3Q6IFwiMC4wLjAuMFwiLFxyXG4gICAgYWxsb3dlZEhvc3RzOiB0cnVlLFxyXG4gICAgZnM6IHtcclxuICAgICAgc3RyaWN0OiB0cnVlLFxyXG4gICAgfSxcclxuICAgIHByb3h5OiB7XHJcbiAgICAgIFwiL2FwaVwiOiB7XHJcbiAgICAgICAgdGFyZ2V0OiBgaHR0cDovL2xvY2FsaG9zdDoke2FwaVBvcnR9YCxcclxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXHJcbiAgICAgICAgc2VjdXJlOiBmYWxzZSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfSxcclxuICBwcmV2aWV3OiB7XHJcbiAgICBwb3J0LFxyXG4gICAgaG9zdDogXCIwLjAuMC4wXCIsXHJcbiAgICBhbGxvd2VkSG9zdHM6IHRydWUsXHJcbiAgfSxcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBa1ksU0FBUyxvQkFBb0I7QUFDL1osT0FBTyxXQUFXO0FBQ2xCLE9BQU8saUJBQWlCO0FBQ3hCLE9BQU8sVUFBVTtBQUNqQixTQUFTLFlBQVksb0JBQW9CO0FBSnpDLElBQU0sbUNBQW1DO0FBTXpDLFNBQVMsY0FBYztBQUNyQixNQUFJLGFBQWEsS0FBSyxRQUFRLGdDQUFtQjtBQUNqRCxNQUFJLFVBQVU7QUFFZCxTQUFPLE1BQU07QUFDWCxVQUFNLFlBQVksS0FBSyxLQUFLLFlBQVksTUFBTTtBQUM5QyxRQUFJLFdBQVcsU0FBUyxHQUFHO0FBQ3pCLGdCQUFVO0FBQUEsSUFDWjtBQUNBLFVBQU0sWUFBWSxLQUFLLFFBQVEsVUFBVTtBQUN6QyxRQUFJLGNBQWMsV0FBWTtBQUM5QixpQkFBYTtBQUFBLEVBQ2Y7QUFFQSxNQUFJLENBQUMsUUFBUztBQUVkLFFBQU0sUUFBUSxhQUFhLFNBQVMsTUFBTSxFQUFFLE1BQU0sT0FBTztBQUN6RCxhQUFXLFFBQVEsT0FBTztBQUN4QixVQUFNLFVBQVUsS0FBSyxLQUFLO0FBQzFCLFFBQUksQ0FBQyxXQUFXLFFBQVEsV0FBVyxHQUFHLEVBQUc7QUFDekMsVUFBTSxVQUFVLFFBQVEsUUFBUSxHQUFHO0FBQ25DLFFBQUksV0FBVyxFQUFHO0FBQ2xCLFVBQU0sTUFBTSxRQUFRLE1BQU0sR0FBRyxPQUFPLEVBQUUsS0FBSztBQUMzQyxVQUFNLFdBQVcsUUFBUSxNQUFNLFVBQVUsQ0FBQyxFQUFFLEtBQUs7QUFDakQsUUFBSSxRQUFRLElBQUksR0FBRyxNQUFNLE9BQVc7QUFDcEMsWUFBUSxJQUFJLEdBQUcsSUFBSSxTQUFTLFFBQVEsZ0JBQWdCLEVBQUU7QUFBQSxFQUN4RDtBQUNGO0FBRUEsWUFBWTtBQUVaLElBQU0sT0FBTyxPQUFPLFFBQVEsSUFBSSxhQUFhLE1BQU07QUFDbkQsSUFBTSxVQUFVLE9BQU8sUUFBUSxJQUFJLGlCQUFpQixRQUFRLElBQUksWUFBWSxPQUFPO0FBQ25GLElBQU0sV0FBVyxRQUFRLElBQUksYUFBYTtBQUMxQyxJQUFNLHNCQUFzQixRQUFRLElBQUksK0JBQStCO0FBRXZFLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLE1BQU07QUFBQSxFQUNOLFFBQVEsS0FBSyxRQUFRLGtDQUFxQixNQUFNLElBQUk7QUFBQSxFQUNwRCxTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQXFCLEtBQUs7QUFBQSxNQUM1QyxXQUFXLEtBQUssUUFBUSxrQ0FBcUIsTUFBTSxNQUFNLGlCQUFpQjtBQUFBLElBQzVFO0FBQUEsSUFDQSxRQUFRLENBQUMsU0FBUyxXQUFXO0FBQUEsRUFDL0I7QUFBQSxFQUNBLE1BQU0sS0FBSyxRQUFRLGdDQUFtQjtBQUFBLEVBQ3RDLE9BQU87QUFBQSxJQUNMLFFBQVEsS0FBSyxRQUFRLGtDQUFxQixhQUFhO0FBQUEsSUFDdkQsYUFBYTtBQUFBLEVBQ2Y7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOO0FBQUEsSUFDQSxZQUFZO0FBQUEsSUFDWixNQUFNO0FBQUEsSUFDTixjQUFjO0FBQUEsSUFDZCxJQUFJO0FBQUEsTUFDRixRQUFRO0FBQUEsSUFDVjtBQUFBLElBQ0EsT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBLFFBQ04sUUFBUSxvQkFBb0IsT0FBTztBQUFBLFFBQ25DLGNBQWM7QUFBQSxRQUNkLFFBQVE7QUFBQSxNQUNWO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQO0FBQUEsSUFDQSxNQUFNO0FBQUEsSUFDTixjQUFjO0FBQUEsRUFDaEI7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
