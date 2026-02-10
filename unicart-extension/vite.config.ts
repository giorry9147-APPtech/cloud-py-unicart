import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/popup.html"),
        // later (optioneel) kun je meer entries toevoegen:
        // background: resolve(__dirname, "src/background.ts"),
      },
    },
  },
});

