import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [tsConfigPaths(), react()],
  server: {
    port: 3001,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
