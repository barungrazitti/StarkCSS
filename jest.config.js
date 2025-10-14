/** @type {import('jest').Config} */
export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  testMatch: ["**/test-*.js"],
  testPathIgnorePatterns: ["test-setup.js"],
  moduleFileExtensions: ["js", "mjs", "cjs", "jsx", "ts", "tsx"],
  setupFilesAfterEnv: ["./test-setup.js"],
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "css-optimizer.js",
    "security.js",
    "!**/node_modules/**",
  ],
  transform: {
    "^.+\\.js$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          allowJs: true,
          esModuleInterop: true,
        },
      },
    ],
  },
};
