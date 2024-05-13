/* eslint-disable */
import path from "path"
import { defineConfig } from "vite"
import istanbul from "vite-plugin-istanbul"
import { visualizer } from "rollup-plugin-visualizer"

export default defineConfig(({ command, mode, ssrBuild }) => {
  return {
    base: "/rg2/",
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
      // needed for vite and Cypress to work together
      // see https://stackoverflow.com/questions/72324704/cypress-cant-load-assets-from-vites-devserver
      host: "127.0.0.1",
      strictPort: true,
      hot: true,
      hmr: {
        port: 5174,
        host: "127.0.0.1"
      }
    },
    preview: {
      port: 5173,
      strictPort: true
    },
    open: true,
    plugins: [
      visualizer(),
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
