module.exports = {
  root: true,
  env: {
    node: true,
  },
  globals: {
    _: true,
    ApiClient: true,
  },
  ignorePatterns: ["bff/node_modules/", "dist/", "public/cdn/"],
  extends: ["plugin:vue/essential", "eslint:recommended"],
  parserOptions: {
    parser: "@babel/eslint-parser",
  },
  rules: {
    "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
    indent: ["error", 2],
    quotes: ["error", "double"],
    "vue/multi-word-component-names": "off",
    "vue/valid-v-slot": "off",
  },
};
