import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  const proxyTarget =
    process.env.VITE_PROXY_TARGET ??
    loadEnv(mode, process.cwd(), "VITE_").VITE_PROXY_TARGET ??
    "http://localhost:5080";
  const proxy = { "/api": { target: proxyTarget, changeOrigin: true } };

  return {
    plugins: [react()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: { proxy },
    preview: { proxy },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      css: false,
    },
  };
});
