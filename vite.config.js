/* eslint-disable */
import path from "path"
import { defineConfig, splitVendorChunkPlugin } from "vite"
import istanbul from "vite-plugin-istanbul"
import { visualizer } from "rollup-plugin-visualizer"

export default defineConfig(({ command, mode, ssrBuild }) => {
  base = "/rg2/"
  return {
    base: base,
    build: {
      outDir: "./dist",
      emptyOutDir: true,
      minify: "esbuild",
      manifest: true,
      sourcemap: true,
      rollupOptions: {
        input: path.resolve(__dirname, "src/js/main.js"),
        output: {
          manualChunks: (id) => {
            if (
              id.includes("leaflet") ||
              id.includes("proj4") ||
              id.includes("wkt-parser") ||
              id.includes("mgrs") ||
              id.includes("vanillajs-datepicker")
            ) {
              return "manager"
            }
            if (id.includes("ag-grid-community")) {
              return "grid"
            }
          }
        }
      }
    },
    resolve: {
      alias: {
        "~ag-grid-community": path.resolve(__dirname, "node_modules/ag-grid-community"),
        "~bootstrap": path.resolve(__dirname, "node_modules/bootstrap"),
        "~bootstrap-icons": path.resolve(__dirname, "node_modules/bootstrap-icons"),
        "~datepicker": path.resolve(__dirname, "node_modules/vanillajs-datepicker")
      }
    },
    server: {
      origin: "http://localhost",
      port: 5173,
      strictPort: true,
      hot: true,
      hmr: {
        port: 5174
      }
    },
    preview: {
      port: 5173,
      strictPort: true
    },
    open: true,
    plugins: [
      visualizer(),
      splitVendorChunkPlugin(),
      istanbul({
        cypress: true,
        include: "src/*",
        exclude: ["node_modules", "test/"],
        extension: [".js"],
        requireEnv: true
      })
    ]
  }
})
