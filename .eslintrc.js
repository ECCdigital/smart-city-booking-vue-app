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
  // "prettier" last: Prettier owns the formatting, ESLint the rest.
  extends: ["plugin:vue/essential", "eslint:recommended", "prettier"],
  parserOptions: {
    parser: "@babel/eslint-parser",
  },
  rules: {
    "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
    "vue/multi-word-component-names": "off",
    "vue/valid-v-slot": "off",
  },
};
