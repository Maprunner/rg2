import { defineConfig } from "cypress"
import codeCoverageTask from "@cypress/code-coverage/task"
import fs from "fs-extra"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  projectId: "vb97jp",
  // default screen size for testing
  viewportWidth: 1000,
  viewportHeight: 660,
  e2e: {
    setupNodeEvents(on, config) {
      codeCoverageTask(on, config)
      on("task", {
        setUpKartat: ({ config, php = "config-01" }) => {
          const kartatPath = path.join(root, "kartat")
          const setupPath = path.join(root, "cypress/fixtures", config)
          fs.rmSync(kartatPath, { recursive: true, force: true })
          fs.mkdirSync(kartatPath)
          if (fs.existsSync(setupPath)) {
            fs.copySync(setupPath, kartatPath)
          }
          // php config
          const sourceConfig = path.join(root, "cypress/fixtures/php", php + ".php")
          const destConfig = path.join(root, "rg2-config.php")
          fs.copyFileSync(sourceConfig, destConfig)
          return null
        }
      })
      return config
    },
    expose: {
      codeCoverage: {
        exclude: "cypress/**/*.*"
      }
    },
    component: {
      devServer: {
        bundler: "vite"
      },
      setupNodeEvents(on, config) {
        codeCoverageTask(on, config)

        return config
      }
    }
  }
})
