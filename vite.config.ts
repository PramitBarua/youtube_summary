import { crx } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import manifest from "./src/manifest";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), crx({ manifest }), tailwindcss()],
  build: {
    sourcemap: false,
    minify: false,
  },
});
