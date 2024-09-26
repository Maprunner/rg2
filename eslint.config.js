/* eslint-env node */
/** @type {import('eslint').Linter.Config} */
import globals from "globals"
import js from "@eslint/js"
//const eslintPluginPrettierRecommended = require("eslint-plugin-prettier/recommended")

export default [
  // not yet supported in ESLINT 9.0.0.....
  //extends: ["plugin:cypress/recommended"],
  js.configs.recommended,
  {
    ignores: ["src/js/lib/**/*", "dist", "node-modules", "lang", "cypress/**/*", "coverage/**/*", "cypress.config.cjs"]
  },
  {
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        rg2Config: "readonly",
        Chart: "readonly",
        agGrid: "readonly"
      }
    }
  },
  {
    rules: {
      "no-unused-vars": "warn"
    }
  }
  //eslintPluginPrettierRecommended
]
