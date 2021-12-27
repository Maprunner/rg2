/** @type {import('stylelint').Config} */
module.exports = {
  extends: ["stylelint-config-standard", "stylelint-config-prettier"],
  ignoreFiles: ["**/*.min.css"],
  rules: {
    "property-no-vendor-prefix": null,
    "no-descending-specificity": null,
  }
};
