import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The playground resolves `journal-entry` straight to the library's source
// (not its built dist/) so dev has full HMR without a separate watch/build
// step. `npm run build` in packages/journal-entry produces the real
// published artifact used by `dist`-based consumers.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "journal-entry": resolve(__dirname, "../packages/journal-entry/src/index.ts"),
    },
  },
});
