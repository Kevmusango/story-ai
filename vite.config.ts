import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig(({ command }) => ({
  esbuild: {
    jsx: "automatic",
  },
  css: {
    postcss: { plugins: [] },
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths(),
    ...(command === "build" ? [cloudflare({ viteEnvironment: { name: "ssr" } })] : []),
    tanstackStart({
      server: { entry: "server" },
    }),
    react(),
  ],
}));
