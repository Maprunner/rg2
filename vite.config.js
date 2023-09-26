/* eslint-disable */
import path from "path"
import { defineConfig } from "vite"
import istanbul from "vite-plugin-istanbul"

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
        input: path.resolve(__dirname, "src/js/main.js")
        // output: {
        //   manualChunks: (id) => {
        //     if (id.includes("leaflet")) return "manager"
        //     if (id.includes("proj4")) return "manager"
        //     if (id.includes("vanillajs-datepicker")) return "manager"
        //   }
        // }
      }
    },
    resolve: {
      alias: {
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
    open: true,
    plugins: [
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
