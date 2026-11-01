export default [
  {
    files: ["src/**/*.js", "tests/**/*.js", "scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: Object.fromEntries(
        [
          "L",
          "window",
          "document",
          "localStorage",
          "Element",
          "fetch",
          "console",
          "setTimeout",
          "location",
          "URL",
          "process",
          "Buffer",
        ].map((x) => [x, "readonly"]),
      ),
    },
    rules: {
      "no-undef": "error",
      "no-unreachable": "error",
      "no-duplicate-imports": "error",
      "no-constant-condition": "error",
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];
