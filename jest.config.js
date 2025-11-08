/** @type {import('jest').Config} */
export default {
  // Use Node environment
  testEnvironment: "node",
  
  // Simplified ES modules support
  transform: {},
  
  // Module settings
  moduleFileExtensions: ["js", "mjs", "cjs", "jsx", "ts", "tsx", "json"],
  moduleNameMapper: {
    // Handle ES module imports properly
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Mock CSS and asset files
    '\\.css$': '<rootDir>/test/__mocks__/styleMock.js',
    '\\.(png|jpg|jpeg|gif|webp|svg)$': '<rootDir>/test/__mocks__/fileMock.js'
  },
  
  // Test discovery - include all comprehensive Jest tests
  testMatch: [
    "**/test-jest-compatible.js",
    "**/test-comprehensive-coverage.js"
  ],
  testPathIgnorePatterns: [
    "test-runner.js",
    "coverage-analysis.js",
    "/node_modules/",
    "/dist/",
    "/build/",
    "/coverage/"
  ],
  
  // Coverage settings
  coverageDirectory: "coverage",
  coverageReporters: [
    "text",
    "lcov",
    "text-summary",
    "html"
  ],
  collectCoverageFrom: [
    "css-optimizer.js",
    "error-handler.js", 
    "file-handler.js",
    "security.js",
    "media-query-combiner.js",
    "framework-optimizer.js",
    "!**/node_modules/**",
    "!test/**",
    "!**/*.test.js",
    "!**/*.spec.js",
    "!jest.config.js",
    "!**/*.config.js",
    "!test-runner.js",
    "!coverage-analysis.js"
  ],
  coverageThreshold: {
    global: {
      branches: 98,
      functions: 98,
      lines: 98,
      statements: 98
    }
  },
  
  // Setup files
  setupFilesAfterEnv: ["./test-setup.js"],
  
  // Performance settings
  maxWorkers: "50%",
  verbose: true,
  testTimeout: 15000,
  
  // Mock settings
  automock: false,
  clearMocks: true,
  restoreMocks: true,
  
  // Additional settings
  detectOpenHandles: true,
  forceExit: true,
  passWithNoTests: false
};