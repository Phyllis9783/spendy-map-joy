import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(async ({ mode }) => {
  // Load dev-only plugin lazily to avoid requiring it in production/build
  let taggerPlugin: any = null;
  if (mode === "development") {
    try {
      const mod = await import("lovable-tagger");
      taggerPlugin = mod.componentTagger?.();
    } catch (e) {
      // Optional dev helper not installed or failed to load; ignore silently
    }
  }

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react(), taggerPlugin].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
      // Safe even if the package isn't installed
      exclude: ["lovable-tagger"],
    },
    build: {
      commonjsOptions: {
        include: [/node_modules/],
      },
    },
  };
});
