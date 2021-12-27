/* eslint-env node */
/** @type {import('eslint').Linter.Config} */
module.exports = {
  env: {
    browser: true,
    jquery: true,
  },
  extends: ["eslint:recommended", "prettier"],
  ignorePatterns: ["js/lib/**/*", "*.min.js"],
  parserOptions: {
    ecmaVersion: 6,
  },
  globals: {
    rg2: "writable",
    rg2Config: "readonly"
},
};
