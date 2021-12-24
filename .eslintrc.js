/* eslint-env node */
/** @type {import('eslint').Linter.Config} */
module.exports = {
  env: {
    browser: true,
    jquery: true,
  },
  extends: ["eslint:recommended", "prettier"],
  ignorePatterns: "js/lib/**/*",
  parserOptions: {
    ecmaVersion: 6,
  },
};
