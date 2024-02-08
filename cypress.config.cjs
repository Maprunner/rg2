const { defineConfig } = require("cypress")
const fs = require("fs-extra")
const path = require("path")

module.exports = defineConfig({
  projectId: "vb97jp",
  e2e: {
    experimentalStudio: true,
    setupNodeEvents(on, config) {
      require("@cypress/code-coverage/task")(on, config)
      on("task", {
        setUpKartat: ({ config, php = "config-01" }) => {
          const kartatPath = path.join(__dirname, "kartat")
          const setupPath = path.join(__dirname, "cypress/fixtures", config)
          fs.rmSync(kartatPath, { recursive: true, force: true })
          fs.mkdirSync(kartatPath)
          if (fs.existsSync(setupPath)) {
            fs.copySync(setupPath, kartatPath)
          }
          // php config
          const sourceConfig = path.join(__dirname, "cypress/fixtures/php", php + ".php")
          const destConfig = path.join(__dirname, "rg2-config.php")
          fs.copyFileSync(sourceConfig, destConfig)
          return null
        }
      })
      return config
    },
    env: {
      codeCoverage: {
        exclude: "cypress/**/*.*"
      }
    },
    component: {
      devServer: {
        bundler: "vite"
      },
      setupNodeEvents(on, config) {
        require("@cypress/code-coverage/task")(on, config)

        return config
      }
    }
  }
})
