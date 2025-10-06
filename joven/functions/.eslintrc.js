module.exports = {
  env: {
    es2021: true, // latest ECMAScript features
    node: true,   // enable Node.js globals like require, module, process
  },
  parserOptions: {
    ecmaVersion: 12, // equivalent to ES2021
  },
  extends: [
    "eslint:recommended", // basic linting
    "google",             // keep Google style if you like
  ],
  rules: {
    "no-restricted-globals": "off", // don’t block "name" or "length"
    "prefer-arrow-callback": "off", // allow normal functions (needed in Firebase functions)
    "quotes": ["error", "double", { "allowTemplateLiterals": true }],
    "no-unused-vars": ["warn"], // downgrade unused vars from error → warning
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
    },
  ],
};
