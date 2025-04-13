
/** @type {import('eslint').Linter.Config} */
export default {
  files: ["**/*.js"],
  languageOptions: {
    sourceType: "commonjs",
    globals: {
      // Add any global variables for Node.js environment here
    }
  },
  ignores: ["**/*"], // Ignore everything
  extends: [
    "plugin:js/recommended"
  ]
};