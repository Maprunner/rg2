/* eslint-env node */
/** @type {import('eslint').Linter.Config} */
module.exports = {
  env: {
    browser: true,
    es6: true
  },
  extends: ["eslint:recommended", "prettier", "plugin:cypress/recommended"],
  ignorePatterns: ["src/js/lib/**/*", "dist", "node-modules", "lang"],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module"
  },
  globals: {
    rg2Config: "readonly",
    // Chart and AgGrid loaded via Promise if required
    Chart: "readonly",
    agGrid: "readonly"
  }
}
