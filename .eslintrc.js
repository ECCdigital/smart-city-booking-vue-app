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
  overrides: [
    {
      // A plain object as state is one object for every store built from the
      // module, so stores in tests share it. `user.js` stays an object: the
      // permission services read `user.state` from the module directly.
      files: ["src/store/modules/**/*.js"],
      excludedFiles: ["src/store/modules/user.js"],
      rules: {
        "no-restricted-syntax": [
          "error",
          {
            selector:
              "VariableDeclarator[id.name='state'][init.type='ObjectExpression']",
            message:
              "Write the state as a factory: `const state = () => ({ … })`.",
          },
          {
            selector:
              "ExportDefaultDeclaration > ObjectExpression > Property[key.name='state'][value.type='ObjectExpression']",
            message: "Write the state as a factory: `state: () => ({ … })`.",
          },
        ],
      },
    },
  ],
};
