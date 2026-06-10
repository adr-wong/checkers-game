import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [tsConfigPaths(), react()],
  server: {
    host: '0.0.0.0',
    port: 3001,
    proxy: {
      "/api": process.env.API_URL || "http://localhost:3000",
    },
  },
});
