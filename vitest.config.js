import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue2";

// Runs beside the Vue CLI/webpack toolchain; it does not replace it.
// `@/` resolves the same way it does in the app, so tests import like `src/`
// does; `@tests/` reaches the shared helpers under `tests/`.
export default defineConfig({
  plugins: [vue()],
  resolve: {
    // The app imports single-file components without their extension
    // (`@/components/Navbar`), which webpack resolves and vite does not
    // unless `.vue` is listed here.
    extensions: [".mjs", ".js", ".jsx", ".json", ".vue"],
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@tests": fileURLToPath(new URL("./tests", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.spec.js"],
    setupFiles: ["tests/unit/setup.js"],
    restoreMocks: true,
  },
});
