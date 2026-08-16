import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The playground resolves `@s195640/content-editor` straight to the library's
// source (not its built dist/) so dev has full HMR without a separate
// watch/build step. `npm run build` in packages/content-editor produces the
// real published artifact used by `dist`-based consumers.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@s195640/content-editor": resolve(__dirname, "../packages/content-editor/src/index.ts"),
    },
  },
});
