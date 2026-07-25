import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// @ts-ignore
import path from "path";

const apiTarget = "http://127.0.0.1:3001";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // @ts-ignore
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
      },
      "/uploads": {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
      },
      "/socket.io": {
        target: apiTarget,
        changeOrigin: true,
        ws: true,
        secure: false,
      },
    },
  },
});
