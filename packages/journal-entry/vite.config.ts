import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Library build config — used by `npm run build` (step 5, packaging).
// Not used during playground dev, which imports src/ directly for fast HMR.
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "JournalEntry",
      fileName: (format) => `journal-entry.${format === "es" ? "js" : "cjs"}`,
      formats: ["es", "cjs"],
    },
    cssCodeSplit: false,
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
        assetFileNames: (assetInfo) =>
          assetInfo.name === "style.css" ? "journal-entry.css" : (assetInfo.name ?? "[name][extname]"),
      },
    },
    sourcemap: true,
  },
});
