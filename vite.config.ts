import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine if we're running on Replit
const isReplit = process.env.REPL_ID !== undefined;

export default defineConfig({
  plugins: [react(), themePlugin(), runtimeErrorOverlay()],
  server: {
    host: '0.0.0.0',
    port: 5174
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: "automatic",
      jsxImportSource: "react",
    }),
    runtimeErrorOverlay(),
    themePlugin(),
  ],
  resolve: {
    alias: {
      "@db": path.resolve(__dirname, "db"),
      "@": path.resolve(__dirname, "client", "src"),
      "@components": path.resolve(__dirname, "client", "src", "components"),
      "@lib": path.resolve(__dirname, "client", "src", "lib"),
      "@hooks": path.resolve(__dirname, "client", "src", "hooks"),
      "@server": path.resolve(__dirname, "server"),
      "@types": path.resolve(__dirname, "client", "src", "types")
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    // Enable source maps in development only
    sourcemap: process.env.NODE_ENV === 'development',
    // Optimize build for Replit
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-query'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
        }
      }
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  server: {
    // Optimize dev server for Replit
    host: '0.0.0.0',
    port: 5000,
    hmr: {
      // Optimize HMR for Replit
      clientPort: 443,
      protocol: 'wss'
    },
    // Handle CORS for Replit
    cors: true,
    // Optimize middleware for Replit
    middlewareMode: isReplit
  },
  // Optimize dependency optimization
  optimizeDeps: {
    include: ['react', 'react-dom', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
    exclude: ['@replit/vite-plugin-shadcn-theme-json']
  }
});
