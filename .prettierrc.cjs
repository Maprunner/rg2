/** @type {import('prettier').Options} */
module.exports = {
  semi: false,
  trailingComma: "none",
  tabWidth: 2,
  bracketSpacing: true,
  singleQuote: false,
  arrowParens: "always",
  printWidth: 120,
  overrides: [
    {
      files: "*.txt",
      options: {
        // needed to prevent spurious line breaks in language files
        printWidth: 200
      }
    }
  ],
  bracketSameLine: true
}
