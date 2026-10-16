/* eslint-disable */
import path from "path"
import { readFileSync } from "node:fs"
import { defineConfig } from "vite"
import istanbul from "vite-plugin-istanbul"
import { visualizer } from "rollup-plugin-visualizer"
import { rg2BuildPlugin } from "./vite-plugin-rg2-build.js"

const root = import.meta.dirname
const packageJson = JSON.parse(readFileSync(path.resolve(root, "package.json"), "utf8"))

export default defineConfig(({ command, mode, ssrBuild }) => {
  const managerSource = [
    "manager.js",
    "courseparser.js",
    "resultparseriofv2.js",
    "resultparseriofv3.js",
    "resultparsercsv.js",
    "resultparser.js",
    "managerui.js",
    "managerutils.js"
  ]
  return {
    define: {
      "import.meta.env.VITE_RG2_VERSION": JSON.stringify(packageJson.version)
    },
    base: "/rg2/",
    experimental: {
      renderBuiltUrl(filename, { hostType }) {
        if (hostType === "js") {
          return { runtime: `window.assetUrl(${JSON.stringify(filename)})` }
        }
        return { relative: true }
      }
    },
    build: {
      outDir: "./dist",
      emptyOutDir: true,
      manifest: true,
      sourcemap: true,
      rollupOptions: {
        input: path.resolve(import.meta.dirname, "src/js/main.js"),
        output: {
          manualChunks: (id) => {
            if (managerSource.some((module) => id.includes(module))) {
              return "manager"
            }
            if (
              id.includes("leaflet") ||
              id.includes("proj4") ||
              id.includes("wkt-parser") ||
              id.includes("mgrs") ||
              id.includes("vanillajs-datepicker")
            ) {
              return "manager-utils"
            }
            if (id.includes("ag-grid-community")) {
              return "grid"
            }
            if (id.includes("node_modules")) {
              return "node-modules"
            }
            return "main"
          }
        }
      }
    },
    // suppress Bootstrap warnings until it is updated
    css: {
      preprocessorOptions: {
        scss: { silenceDeprecations: ["color-functions", "legacy-js-api", "import", "global-builtin", "if-function"] }
      }
    },
    resolve: {
      alias: {
        "~ag-grid-community": path.resolve(import.meta.dirname, "node_modules/ag-grid-community"),
        "~bootstrap": path.resolve(import.meta.dirname, "node_modules/bootstrap"),
        "~bootstrap-icons": path.resolve(import.meta.dirname, "node_modules/bootstrap-icons"),
        "~datepicker": path.resolve(import.meta.dirname, "node_modules/vanillajs-datepicker")
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
      hmr: { port: 5174, host: "127.0.0.1" }
    },
    preview: { port: 5173, strictPort: true },
    open: true,
    plugins: [
      visualizer(),
      rg2BuildPlugin({ root, mode, version: packageJson.version }),
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
