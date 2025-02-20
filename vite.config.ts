import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from Vite
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [react(), runtimeErrorOverlay(), themePlugin()],
    resolve: {
      alias: {
        "@db": path.resolve(__dirname, "db"),
        "@": path.resolve(__dirname, "client", "src"),
      },
    },
    root: path.resolve(__dirname, "client"),
    define: {
      "process.env": {
        JWT_SECRET: JSON.stringify(env.VITE_JWT_SECRET),
        SESSION_SECRET: JSON.stringify(env.VITE_SESSION_SECRET),
      },
    },
    build: {
      outDir: path.resolve(__dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      port: 5173, // Change if needed
      proxy: {
        "/api": {
          target: "http://localhost:5000", // Ensure backend is reachable
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});