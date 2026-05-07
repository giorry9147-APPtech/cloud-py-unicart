import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: resolve(__dirname, "src"),
  publicDir: resolve(__dirname, "public"),
  define: {
    "import.meta.env.VITE_API_BASE": JSON.stringify(
      process.env.VITE_API_BASE || "https://unicart-web.vercel.app"
    ),
  },
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/popup.html"),
      },
    },
  },
});

